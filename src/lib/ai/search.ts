import { db } from "../db";
import { aiGateway } from "./gateway";

export interface SearchResult {
  id: string; // entityId
  type: string; // "TASK" | "DISCUSSION" | "DOC" | "COMMENT" | "CHAT"
  title: string;
  excerpt: string;
  targetUrl: string;
  projectName: string;
  score: number;
}

/**
 * Calculates cosine similarity between two float arrays
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  const len = Math.min(vecA.length, vecB.length);

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0.0 || normB === 0.0) return 0.0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Indexes any text item in the pgvector-simulated SQLite Embedding table
 */
export async function indexEntity(
  workspaceId: string,
  entityType: "TASK" | "DISCUSSION" | "DOC" | "COMMENT" | "CHAT",
  entityId: string,
  projectId: string | null,
  text: string
) {
  try {
    const vector = await aiGateway.embed(workspaceId, text);

    // Update or insert embedding
    const existing = await db.embedding.findFirst({
      where: { workspaceId, entityType, entityId },
    });

    if (existing) {
      await db.embedding.update({
        where: { id: existing.id },
        data: {
          projectId,
          text,
          vector: JSON.stringify(vector),
        },
      });
    } else {
      await db.embedding.create({
        data: {
          workspaceId,
          entityType,
          entityId,
          projectId,
          text,
          vector: JSON.stringify(vector),
        },
      });
    }
  } catch (e) {
    console.error(`Failed to index entity ${entityType} ${entityId}:`, e);
  }
}

/**
 * Executes the secure multi-tenant hybrid search pipeline
 */
export async function executeHybridSearch(
  workspaceId: string,
  userId: string,
  role: string,
  query: string
): Promise<{
  answer: string;
  results: SearchResult[];
}> {
  // 1. Get query embedding
  const queryVector = await aiGateway.embed(workspaceId, query);

  // 2. Fetch all embeddings for this workspace
  const embeddings = await db.embedding.findMany({
    where: { workspaceId },
  });

  const candidates: SearchResult[] = [];

  // 3. Permission Filter at Query Time
  for (const emb of embeddings) {
    let hasAccess = false;
    let title = "";
    let targetUrl = "";
    let projectName = "Global";

    // A. Verify Project boundaries
    if (emb.projectId) {
      // Check if user is a member of the project
      const projMember = await db.projectMember.findFirst({
        where: { projectId: emb.projectId, userId },
      });

      if (!projMember) {
        continue; // No access to project -> skip
      }

      // Check if CLIENT has access to specific tools
      if (role === "CLIENT") {
        const allowedTools = JSON.parse(projMember.visibleTools) as string[];
        const toolMap: Record<string, string> = {
          TASK: "tasks",
          DISCUSSION: "discussions",
          DOC: "docs",
          CHAT: "chat",
          COMMENT: "tasks", // comments inherit permissions from tasks/docs
        };
        const neededTool = toolMap[emb.entityType];
        if (neededTool && !allowedTools.includes(neededTool)) {
          continue; // Client has no access to this tool -> skip
        }
      }

      const proj = await db.project.findUnique({ where: { id: emb.projectId } });
      projectName = proj?.name || "Global";
    }

    // B. Verify DM Chat boundaries (DMs have null projectId)
    if (emb.entityType === "CHAT" && !emb.projectId) {
      const chatMsg = await db.chatMessage.findUnique({
        where: { id: emb.entityId },
      });
      
      if (chatMsg && chatMsg.dmGroupId) {
        // Check if user is a member of this DM group
        const dmMember = await db.dmGroupMember.findUnique({
          where: {
            dmGroupId_userId: {
              dmGroupId: chatMsg.dmGroupId,
              userId,
            },
          },
        });
        if (!dmMember) {
          continue; // User is not in this DM conversation -> skip
        }
      }
    }

    // C. Retrieve Entity details for excerpt and links
    try {
      if (emb.entityType === "TASK") {
        const t = await db.task.findUnique({ where: { id: emb.entityId } });
        if (!t) continue;
        title = `Task: ${t.title}`;
        targetUrl = `/dashboard/projects/${t.projectId}?tab=tasks&task=${t.id}`;
      } else if (emb.entityType === "DISCUSSION") {
        const d = await db.discussion.findUnique({ where: { id: emb.entityId } });
        if (!d) continue;
        title = `Discussion: ${d.title}`;
        targetUrl = `/dashboard/projects/${d.projectId}?tab=discussions&id=${d.id}`;
      } else if (emb.entityType === "DOC") {
        const doc = await db.doc.findUnique({ where: { id: emb.entityId } });
        if (!doc) continue;
        title = `Doc: ${doc.title}`;
        targetUrl = `/dashboard/projects/${doc.projectId}?tab=docs&id=${doc.id}`;
      } else if (emb.entityType === "CHAT") {
        const chat = await db.chatMessage.findUnique({ 
          where: { id: emb.entityId },
          include: { user: true }
        });
        if (!chat) continue;
        title = `Chat Message by ${chat.user.name}`;
        targetUrl = chat.projectId 
          ? `/dashboard/projects/${chat.projectId}?tab=chat`
          : `/dashboard/dm?id=${chat.dmGroupId}`;
      } else {
        continue;
      }
    } catch {
      continue;
    }

    // 4. Calculate Vector similarity
    const embVector = JSON.parse(emb.vector) as number[];
    const similarity = cosineSimilarity(queryVector, embVector);

    // Apply a similarity cutoff (confidence threshold)
    if (similarity > 0.35) {
      candidates.push({
        id: emb.entityId,
        type: emb.entityType,
        title,
        excerpt: emb.text.substring(0, 150) + (emb.text.length > 150 ? "..." : ""),
        targetUrl,
        projectName,
        score: similarity,
      });
    }
  }

  // 5. Sort by similarity score descending
  candidates.sort((a, b) => b.score - a.score);
  const topResults = candidates.slice(0, 5);

  // 6. Synthesis pipeline
  let answer = "No confident match found.";
  if (topResults.length > 0 && topResults[0].score > 0.45) {
    const contextText = topResults
      .map((r, i) => `[Source ${i + 1} - ${r.title} in project ${r.projectName}]:\n${r.excerpt}`)
      .join("\n\n");

    const prompt = `You are an AI-native workspace search synthesiser. Based strictly on the following cited sources, answer the query: "${query}".\n\nContext:\n${contextText}\n\nRules:\n1. Answer concisely.\n2. Cite sources using [Source 1], [Source 2] based on where you found the details.\n3. Do not invent any facts. If the information is missing, say "No confident match found".`;
    
    const response = await aiGateway.complete(workspaceId, prompt);
    answer = response.text || "No confident match found.";
  }

  return {
    answer,
    results: topResults,
  };
}
