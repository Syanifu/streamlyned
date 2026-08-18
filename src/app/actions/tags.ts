"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface TaggedEntity {
  id: string;
  entityType: "PROJECT" | "WBS" | "ITEM" | "EMPLOYEE" | "SUPPLIER" | "CUSTOMER" | "COA" | "GL";
  code: string;
  name: string;
  tags: { id: string; label: string }[];
  route: string;
}

// System Tag Types Names
export const SYSTEM_TAG_TYPES = {
  ACCOUNT: "Account / Organization",
  PROJECT: "Project",
  WBS: "WBS / Work Package",
  COST_CODE: "Cost Code",
  COMPANY: "Company / Party",
  DEPARTMENT: "Department / Function",
  LOCATION: "Location / Site",
  ASSET_SYSTEM: "Asset / System",
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. RBAC & AUDIT LOG HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function assertWriterAccess() {
  const session = await requireSession();
  const workspaceId = session.workspace.id;
  
  // Verify permissions (only OWNER, ADMIN, or workspace MANAGER role can write)
  const isAuthorized =
    session.role === "OWNER" ||
    session.role === "ADMIN" ||
    session.role === "super_admin";

  if (!isAuthorized) {
    throw new Error("Unauthorized. Only Workspace Owners, Admins, and Managers can modify classifications.");
  }

  return { session, workspaceId };
}

async function writeAuditLog(
  tx: any,
  workspaceId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue: any,
  newValue: any
) {
  await tx.tagAuditLog.create({
    data: {
      workspaceId,
      userId,
      action,
      entityType,
      entityId,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SEED SYSTEM TAG TYPES
// ─────────────────────────────────────────────────────────────────────────────

export async function seedSystemTagTypes(workspaceId: string, tx?: any) {
  const client = tx || db;

  for (const name of Object.values(SYSTEM_TAG_TYPES)) {
    await client.tagType.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
      update: {},
      create: {
        workspaceId,
        name,
        isSystem: true,
        description: `Default system-managed classification for ${name}`,
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DOMAIN AUTO-SYNCHRONIZATION LAYER
// ─────────────────────────────────────────────────────────────────────────────

export async function syncDomainEntitiesToTags() {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    // Seed tag types if not present
    await seedSystemTagTypes(workspaceId, db);

    const [
      types,
      projects,
      wbsNodes,
      suppliers,
      customers,
      employees,
      coa
    ] = await Promise.all([
      db.tagType.findMany({ where: { workspaceId } }),
      db.project.findMany({ where: { workspaceId, deletedAt: null } }),
      db.wbsNode.findMany({
        where: { project: { workspaceId } },
        include: { project: true },
      }),
      db.supplierMaster.findMany({ where: { workspaceId } }),
      db.customerMaster.findMany({ where: { workspaceId } }),
      db.employee.findMany({ where: { workspaceId } }),
      db.chartOfAccounts.findMany({ where: { workspaceId } }),
    ]);

    const typeMap = new Map(types.map((t) => [t.name, t.id]));

    await db.$transaction(async (tx) => {
      // 1. Sync Projects
      const projectTypeId = typeMap.get(SYSTEM_TAG_TYPES.PROJECT);
      if (projectTypeId) {
        for (const p of projects) {
          const code = `PRJ-${p.name.replace(/\s+/g, "-").toUpperCase().slice(0, 8)}`;
          await tx.tag.upsert({
            where: {
              workspaceId_tagTypeId_code: {
                workspaceId,
                tagTypeId: projectTypeId,
                code,
              },
            },
            update: { name: p.name },
            create: {
              workspaceId,
              tagTypeId: projectTypeId,
              code,
              name: p.name,
              entityType: "PROJECT",
              entityId: p.id,
              status: "ACTIVE",
            },
          });
        }
      }

      // 2. Sync WBS Nodes (maintain parent-child references dynamically)
      const wbsTypeId = typeMap.get(SYSTEM_TAG_TYPES.WBS);
      if (wbsTypeId) {
        // First pass: upsert all nodes
        for (const node of wbsNodes) {
          const projectCode = node.project.name.replace(/\s+/g, "-").toUpperCase().slice(0, 8);
          const wbsCode = `WBS-${projectCode}-${node.code}`;
          await tx.tag.upsert({
            where: {
              workspaceId_tagTypeId_code: {
                workspaceId,
                tagTypeId: wbsTypeId,
                code: wbsCode,
              },
            },
            update: { name: node.name },
            create: {
              workspaceId,
              tagTypeId: wbsTypeId,
              code: wbsCode,
              name: node.name,
              entityType: "WBS",
              entityId: node.id,
              status: "ACTIVE",
            },
          });
        }

        // Second pass: wire parent-child relationships
        const tags = await tx.tag.findMany({
          where: { workspaceId, tagTypeId: wbsTypeId },
        });
        const tagMap = new Map(tags.map((t) => [t.code, t.id]));

        for (const node of wbsNodes) {
          if (node.parentCode) {
            const projectCode = node.project.name.replace(/\s+/g, "-").toUpperCase().slice(0, 8);
            const childId = tagMap.get(`WBS-${projectCode}-${node.code}`);
            const parentId = tagMap.get(`WBS-${projectCode}-${node.parentCode}`);
            if (childId && parentId) {
              await tx.tag.update({
                where: { id: childId },
                data: { parentTagId: parentId },
              });
            }
          }
        }
      }

      // 3. Sync Suppliers & Customers into "Company / Party"
      const compTypeId = typeMap.get(SYSTEM_TAG_TYPES.COMPANY);
      if (compTypeId) {
        for (const s of suppliers) {
          const supplierCode = `SPL-${s.code}`;
          await tx.tag.upsert({
            where: {
              workspaceId_tagTypeId_code: {
                workspaceId,
                tagTypeId: compTypeId,
                code: supplierCode,
              },
            },
            update: { name: s.name },
            create: {
              workspaceId,
              tagTypeId: compTypeId,
              code: supplierCode,
              name: s.name,
              entityType: "SUPPLIER",
              entityId: s.id,
              status: s.isActive ? "ACTIVE" : "INACTIVE",
            },
          });
        }
        for (const c of customers) {
          const customerCode = `CST-${c.code}`;
          await tx.tag.upsert({
            where: {
              workspaceId_tagTypeId_code: {
                workspaceId,
                tagTypeId: compTypeId,
                code: customerCode,
              },
            },
            update: { name: c.name },
            create: {
              workspaceId,
              tagTypeId: compTypeId,
              code: customerCode,
              name: c.name,
              entityType: "CUSTOMER",
              entityId: c.id,
              status: c.isActive ? "ACTIVE" : "INACTIVE",
            },
          });
        }
      }

      // 4. Sync Employees into "Department / Function"
      const deptTypeId = typeMap.get(SYSTEM_TAG_TYPES.DEPARTMENT);
      if (deptTypeId) {
        for (const emp of employees) {
          await tx.tag.upsert({
            where: {
              workspaceId_tagTypeId_code: {
                workspaceId,
                tagTypeId: deptTypeId,
                code: emp.email,
              },
            },
            update: { name: emp.name },
            create: {
              workspaceId,
              tagTypeId: deptTypeId,
              code: emp.email,
              name: emp.name,
              entityType: "EMPLOYEE",
              entityId: emp.id,
              status: emp.isActive ? "ACTIVE" : "INACTIVE",
            },
          });
        }
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CLASSIFICATIONS & RELATIONSHIPS CORE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getTagsSettingsData() {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    // Trigger auto-sync to align master registers
    await syncDomainEntitiesToTags();

    const [types, tags, relations, allowedRelations, auditLogs] = await Promise.all([
      db.tagType.findMany({
        where: { workspaceId },
        orderBy: { name: "asc" },
      }),
      db.tag.findMany({
        where: { workspaceId },
        include: {
          parentTag: { select: { name: true, code: true } },
          tagType: { select: { name: true } },
        },
        orderBy: { code: "asc" },
      }),
      db.tagRelationship.findMany({
        where: { workspaceId },
        include: {
          sourceTag: { select: { code: true, name: true } },
          targetTag: { select: { code: true, name: true } },
        },
      }),
      db.tagAllowedRelation.findMany({
        where: { workspaceId },
        include: {
          sourceType: { select: { name: true } },
          targetType: { select: { name: true } },
        },
      }),
      db.tagAuditLog.findMany({
        where: { workspaceId },
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { timestamp: "desc" },
        take: 100,
      }),
    ]);

    const result = {
      success: true,
      types,
      tags,
      relations,
      allowedRelations,
      auditLogs: auditLogs.map((log) => {
        let parsedOld = null;
        let parsedNew = null;
        try {
          parsedOld = log.oldValue ? JSON.parse(log.oldValue) : null;
        } catch {
          parsedOld = log.oldValue;
        }
        try {
          parsedNew = log.newValue ? JSON.parse(log.newValue) : null;
        } catch {
          parsedNew = log.newValue;
        }
        return {
          id: log.id,
          userName: log.user.name,
          email: log.user.email,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          oldValue: parsedOld,
          newValue: parsedNew,
          timestamp: log.timestamp.toISOString(),
        };
      }),
      role: session.role,
    };

    return JSON.parse(JSON.stringify(result));
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createCustomTagTypeAction(name: string, description: string) {
  try {
    const { session, workspaceId } = await assertWriterAccess();

    const existing = await db.tagType.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      throw new Error(`A Tag Type named "${name}" already exists.`);
    }

    await db.$transaction(async (tx) => {
      const type = await tx.tagType.create({
        data: {
          workspaceId,
          name: name.trim(),
          description: description.trim(),
          isSystem: false,
        },
      });

      await writeAuditLog(
        tx,
        workspaceId,
        session.user.id,
        "TAG_TYPE_CREATED",
        "TAG_TYPE",
        type.id,
        null,
        type
      );
    });

    revalidatePath("/dashboard/settings/tags");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createTagAction(
  tagTypeId: string,
  code: string,
  name: string,
  description: string,
  parentTagId?: string
) {
  try {
    const { session, workspaceId } = await assertWriterAccess();

    const normalizedCode = code.trim().toUpperCase();
    const normalizedName = name.trim().toLowerCase();

    // 1. Check duplicate code
    const dupCode = await db.tag.findUnique({
      where: {
        workspaceId_tagTypeId_code: {
          workspaceId,
          tagTypeId,
          code: normalizedCode,
        },
      },
      include: { tagType: true },
    });

    if (dupCode) {
      return {
        success: false,
        error: `Duplicate Tag Code: "${normalizedCode}" already registered in "${dupCode.tagType.name}".`,
      };
    }

    // 2. Fuzzy name check
    const dupName = await db.tag.findFirst({
      where: {
        workspaceId,
        tagTypeId,
        name: { equals: name.trim(), mode: "insensitive" },
      },
    });

    if (dupName) {
      return {
        success: false,
        isWarning: true,
        warningMessage: `Possible duplicate tag name found: "${dupName.name}" already registered with code "${dupName.code}".`,
      };
    }

    // 3. Save tag
    await db.$transaction(async (tx) => {
      const tag = await tx.tag.create({
        data: {
          workspaceId,
          tagTypeId,
          code: normalizedCode,
          name: name.trim(),
          description: description.trim(),
          parentTagId: parentTagId || null,
          status: "ACTIVE",
          createdById: session.user.id,
        },
      });

      await writeAuditLog(
        tx,
        workspaceId,
        session.user.id,
        "TAG_CREATED",
        "TAG",
        tag.id,
        null,
        tag
      );
    });

    revalidatePath("/dashboard/settings/tags");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTagAction(
  tagId: string,
  name: string,
  description: string,
  parentTagId?: string
) {
  try {
    const { session, workspaceId } = await assertWriterAccess();

    const oldTag = await db.tag.findUnique({ where: { id: tagId } });
    if (!oldTag) throw new Error("Tag not found.");

    await db.$transaction(async (tx) => {
      const updated = await tx.tag.update({
        where: { id: tagId },
        data: {
          name: name.trim(),
          description: description.trim(),
          parentTagId: parentTagId || null,
          updatedById: session.user.id,
        },
      });

      await writeAuditLog(
        tx,
        workspaceId,
        session.user.id,
        "TAG_UPDATED",
        "TAG",
        tagId,
        oldTag,
        updated
      );
    });

    revalidatePath("/dashboard/settings/tags");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function setTagStatusAction(tagId: string, status: "ACTIVE" | "INACTIVE") {
  try {
    const { session, workspaceId } = await assertWriterAccess();

    const oldTag = await db.tag.findUnique({ where: { id: tagId } });
    if (!oldTag) throw new Error("Tag not found.");

    await db.$transaction(async (tx) => {
      const updated = await tx.tag.update({
        where: { id: tagId },
        data: { status },
      });

      await writeAuditLog(
        tx,
        workspaceId,
        session.user.id,
        status === "ACTIVE" ? "TAG_REACTIVATED" : "TAG_DEACTIVATED",
        "TAG",
        tagId,
        oldTag,
        updated
      );
    });

    revalidatePath("/dashboard/settings/tags");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONFIGURABLE RELATIONSHIPS ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function addAllowedRelationAction(
  sourceTypeId: string,
  targetTypeId: string,
  relationshipType: string
) {
  try {
    const { session, workspaceId } = await assertWriterAccess();

    await db.$transaction(async (tx) => {
      const relation = await tx.tagAllowedRelation.create({
        data: {
          workspaceId,
          sourceTypeId,
          targetTypeId,
          relationshipType: relationshipType.trim().toUpperCase(),
        },
      });

      await writeAuditLog(
        tx,
        workspaceId,
        session.user.id,
        "ALLOWED_RELATION_ADDED",
        "ALLOWED_RELATION",
        relation.id,
        null,
        relation
      );
    });

    revalidatePath("/dashboard/settings/tags");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function removeAllowedRelationAction(relationId: string) {
  try {
    const { session, workspaceId } = await assertWriterAccess();

    const oldRelation = await db.tagAllowedRelation.findUnique({ where: { id: relationId } });
    if (!oldRelation) throw new Error("Config relation not found.");

    await db.$transaction(async (tx) => {
      await tx.tagAllowedRelation.delete({ where: { id: relationId } });
      await writeAuditLog(
        tx,
        workspaceId,
        session.user.id,
        "ALLOWED_RELATION_REMOVED",
        "ALLOWED_RELATION",
        relationId,
        oldRelation,
        null
      );
    });

    revalidatePath("/dashboard/settings/tags");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addTagRelationshipAction(
  sourceTagId: string,
  targetTagId: string,
  relationshipType: string
) {
  try {
    const { session, workspaceId } = await assertWriterAccess();

    // Verify if Tag Types relation is configured
    const [sourceTag, targetTag] = await Promise.all([
      db.tag.findUnique({ where: { id: sourceTagId } }),
      db.tag.findUnique({ where: { id: targetTagId } }),
    ]);

    if (!sourceTag || !targetTag) {
      throw new Error("Source or target tag not found.");
    }

    const isAllowed = await db.tagAllowedRelation.findFirst({
      where: {
        workspaceId,
        sourceTypeId: sourceTag.tagTypeId,
        targetTypeId: targetTag.tagTypeId,
        relationshipType: relationshipType.toUpperCase(),
      },
    });

    if (!isAllowed) {
      throw new Error(`Relationship type "${relationshipType}" is not configured/allowed between these two classifications.`);
    }

    await db.$transaction(async (tx) => {
      const relation = await tx.tagRelationship.create({
        data: {
          workspaceId,
          sourceTagId,
          targetTagId,
          relationshipType: relationshipType.toUpperCase(),
        },
      });

      await writeAuditLog(
        tx,
        workspaceId,
        session.user.id,
        "RELATIONSHIP_ADDED",
        "RELATIONSHIP",
        relation.id,
        null,
        relation
      );
    });

    revalidatePath("/dashboard/settings/tags");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function removeTagRelationshipAction(relationshipId: string) {
  try {
    const { session, workspaceId } = await assertWriterAccess();

    const oldRelation = await db.tagRelationship.findUnique({ where: { id: relationshipId } });
    if (!oldRelation) throw new Error("Relationship not found.");

    await db.$transaction(async (tx) => {
      await tx.tagRelationship.delete({ where: { id: relationshipId } });
      await writeAuditLog(
        tx,
        workspaceId,
        session.user.id,
        "RELATIONSHIP_REMOVED",
        "RELATIONSHIP",
        relationshipId,
        oldRelation,
        null
      );
    });

    revalidatePath("/dashboard/settings/tags");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. TAG INHERITANCE TRAVERSAL INDEX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively resolves parent lineages for inherited tag filters.
 * Walking up WBS parent links, Location nodes, etc.
 */
export async function getTagInheritedLineage(tagId: string): Promise<string[]> {
  const ancestorIds: string[] = [tagId];
  let currentId = tagId;

  while (true) {
    const tag = await db.tag.findUnique({
      where: { id: currentId },
      select: { parentTagId: true },
    });
    if (!tag || !tag.parentTagId) break;
    ancestorIds.push(tag.parentTagId);
    currentId = tag.parentTagId;
  }

  return ancestorIds;
}
