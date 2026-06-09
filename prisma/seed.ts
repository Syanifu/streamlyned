import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.user.deleteMany({});
  await prisma.workspace.deleteMany({});

  // 1. Create Users
  const owner = await prisma.user.create({
    data: {
      email: "owner@streamlyned.com",
      name: "Olivia Owner",
      avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=olivia",
      planTier: "premium+",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@streamlyned.com",
      name: "Alex Admin",
      avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=alex",
      planTier: "premium",
    },
  });

  const member = await prisma.user.create({
    data: {
      email: "member@streamlyned.com",
      name: "Marcus Member",
      avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=marcus",
      planTier: "standard",
    },
  });

  const client = await prisma.user.create({
    data: {
      email: "client@streamlyned.com",
      name: "Catherine Client",
      avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=catherine",
      planTier: "standard",
    },
  });

  console.log("Created test users.");

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Acme Agency",
      slug: "acme-agency",
    },
  });

  console.log("Created workspace Acme Agency.");

  // 3. Create Workspace Memberships
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: owner.id, role: "OWNER" },
      { workspaceId: workspace.id, userId: admin.id, role: "ADMIN" },
      { workspaceId: workspace.id, userId: member.id, role: "MEMBER" },
      { workspaceId: workspace.id, userId: client.id, role: "CLIENT" },
    ],
  });

  // 4. Create Project 1: Website Redesign (All tools enabled)
  const project1 = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Website Redesign",
      description: "Overhaul the corporate website to improve conversion rates by 25%.",
      tools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]),
    },
  });

  // 5. Create Project 2: Marketing Campaign (Tasks, Discussions, Chat)
  const project2 = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Q3 Campaign",
      description: "Execute the Q3 social and search advertising campaigns.",
      tools: JSON.stringify(["tasks", "discussions", "chat"]),
    },
  });

  console.log("Created projects.");

  // 6. Assign users to Projects
  // Staff are assigned to both projects
  await prisma.projectMember.createMany({
    data: [
      { projectId: project1.id, userId: owner.id, visibleTools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]) },
      { projectId: project1.id, userId: admin.id, visibleTools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]) },
      { projectId: project1.id, userId: member.id, visibleTools: JSON.stringify(["tasks", "discussions", "chat", "docs", "calendar"]) },
      
      // Client is ONLY in project1, and can only see Tasks and Discussions (Not Chat, Docs, or Calendar)
      { projectId: project1.id, userId: client.id, visibleTools: JSON.stringify(["tasks", "discussions"]) },

      { projectId: project2.id, userId: owner.id, visibleTools: JSON.stringify(["tasks", "discussions", "chat"]) },
      { projectId: project2.id, userId: admin.id, visibleTools: JSON.stringify(["tasks", "discussions", "chat"]) },
      { projectId: project2.id, userId: member.id, visibleTools: JSON.stringify(["tasks", "discussions", "chat"]) },
    ],
  });

  // 7. Setup Task Lists and Tasks for Project 1
  const backlog = await prisma.taskList.create({
    data: { projectId: project1.id, name: "Backlog", position: 1000.0 },
  });

  const inProgress = await prisma.taskList.create({
    data: { projectId: project1.id, name: "In Progress", position: 2000.0 },
  });

  const done = await prisma.taskList.create({
    data: { projectId: project1.id, name: "Done", position: 3000.0 },
  });

  // Tasks in Done
  const task1 = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      taskListId: done.id,
      projectId: project1.id,
      title: "Set up Google Analytics tracking code",
      notes: "Ensure tag manager is installed on index.html and event triggers work on CTA buttons.",
      isCompleted: true,
      completedAt: new Date(),
      position: 1000.0,
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: task1.id, userId: owner.id } });

  // Tasks in In Progress
  const task2 = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      taskListId: inProgress.id,
      projectId: project1.id,
      title: "Design main website wireframes",
      notes: "Create mobile and desktop wireframes for Home page, Pricing page, and Contact page.",
      dueDateStart: new Date(),
      dueDateEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // due in 4 days
      position: 1000.0,
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: task2.id, userId: member.id } });

  const task3 = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      taskListId: inProgress.id,
      projectId: project1.id,
      title: "Review copy options for homepage banner",
      notes: "Please write 3 alternatives targeting small agencies. Client requested it by tomorrow.",
      dueDateEnd: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // due tomorrow
      position: 2000.0,
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: task3.id, userId: admin.id } });

  // Tasks in Backlog
  const task4 = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      taskListId: backlog.id,
      projectId: project1.id,
      title: "Integrate stripe subscription payment",
      notes: "Set up webhooks and checkout flow for monthly flat pricing.",
      dueDateEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // due in 10 days
      position: 1000.0,
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: task4.id, userId: member.id } });

  // Threaded comments on Task 3
  const comment1 = await prisma.comment.create({
    data: {
      workspaceId: workspace.id,
      taskId: task3.id,
      userId: owner.id,
      content: "Let's make sure the tagline emphasizes the 'calm-work' approach.",
    },
  });

  const comment2 = await prisma.comment.create({
    data: {
      workspaceId: workspace.id,
      taskId: task3.id,
      userId: client.id,
      content: "We'd love to see something that feels professional but friendly.",
      isClientComment: true,
    },
  });

  console.log("Created tasks and comments.");

  // 8. Create Discussion on Project 1
  const discussion = await prisma.discussion.create({
    data: {
      workspaceId: workspace.id,
      projectId: project1.id,
      title: "Design direction for the new website",
      content: "Hey team! Let's use this thread to compile inspiration for the new site. We want to avoid dense, monday-style dashboards. The focus should be on clean typography, generous margins, and simple colors.",
      userId: owner.id,
      isPinned: true,
    },
  });

  await prisma.comment.create({
    data: {
      workspaceId: workspace.id,
      discussionId: discussion.id,
      userId: member.id,
      content: "Agreed. I love the iA Writer and Things 3 aesthetic. Let's stick to system fonts and subtle lines rather than heavy boxes.",
    },
  });

  await prisma.discussionSubscription.createMany({
    data: [
      { discussionId: discussion.id, userId: owner.id },
      { discussionId: discussion.id, userId: member.id },
      { discussionId: discussion.id, userId: client.id },
    ],
  });

  console.log("Created discussions.");

  // 9. Docs
  const doc = await prisma.doc.create({
    data: {
      workspaceId: workspace.id,
      projectId: project1.id,
      title: "Product Specs & Principles",
      content: "# Brand Principles\n\n1. **Calm by design**: Do not trigger notifications unless absolutely necessary.\n2. **Clean layouts**: Keep typography readable with system fonts.\n3. **Citations in search**: Always link to the original files.\n\nMore notes to follow.",
    },
  });

  await prisma.docVersion.create({
    data: {
      docId: doc.id,
      title: doc.title,
      content: doc.content,
      version: 1,
      createdById: owner.id,
    },
  });

  console.log("Created docs.");

  // 10. Chat Room Messages
  await prisma.chatMessage.createMany({
    data: [
      { workspaceId: workspace.id, projectId: project1.id, userId: owner.id, content: "Welcome to the Project Chat! Use this room for quick synchronous checks." },
      { workspaceId: workspace.id, projectId: project1.id, userId: member.id, content: "Sounds good, Olivia. I will post progress here daily." },
    ],
  });

  console.log("Created project chat messages.");

  // 11. DM Group (Owner + Admin)
  const dmGroup = await prisma.dmGroup.create({
    data: {
      workspaceId: workspace.id,
    },
  });

  await prisma.dmGroupMember.createMany({
    data: [
      { dmGroupId: dmGroup.id, userId: owner.id },
      { dmGroupId: dmGroup.id, userId: admin.id },
    ],
  });

  await prisma.chatMessage.create({
    data: {
      workspaceId: workspace.id,
      dmGroupId: dmGroup.id,
      userId: owner.id,
      content: "Hey Alex, are we set for the board meeting next week?",
    },
  });

  await prisma.chatMessage.create({
    data: {
      workspaceId: workspace.id,
      dmGroupId: dmGroup.id,
      userId: admin.id,
      content: "Yes Olivia, I'm compile-ranking the performance reports today.",
    },
  });

  console.log("Created direct messages.");

  // 12. Calendar Events
  await prisma.calendarEvent.create({
    data: {
      workspaceId: workspace.id,
      projectId: project1.id,
      title: "Weekly Design Review",
      description: "Review prototype wireframes with Marcus and the client.",
      startAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // in 2 days
      endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
      videoCallLink: "https://meet.google.com/abc-defg-hij",
    },
  });

  // 13. Notifications
  await prisma.notification.create({
    data: {
      workspaceId: workspace.id,
      userId: admin.id,
      type: "ASSIGNMENT",
      title: "New Task Assigned",
      message: "Olivia assigned you the task: Review copy options for homepage banner",
      targetUrl: `/dashboard/projects/${project1.id}?tab=tasks`,
    },
  });

  // 14. AI Settings default
  await prisma.aiSettings.create({
    data: {
      workspaceId: workspace.id,
      provider: "openai",
      embeddingsModel: "text-embedding-3-small",
      completionModel: "gpt-4o-mini",
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
