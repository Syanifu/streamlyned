"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface TaggedEntity {
  id: string;
  entityType: "PROJECT" | "ITEM" | "EMPLOYEE" | "SUPPLIER" | "CUSTOMER" | "COA" | "GL";
  code: string;
  name: string;
  tags: { id: string; label: string }[];
  route: string;
}

export async function getWorkspaceTagsData() {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    // Fetch all master data in parallel
    const [
      tags,
      projects,
      items,
      employees,
      suppliers,
      customers,
      coa,
      glEntries
    ] = await Promise.all([
      db.tag.findMany({
        where: { workspaceId },
        select: { id: true, entityType: true, entityId: true, code: true, label: true },
      }),
      db.project.findMany({
        where: { workspaceId, deletedAt: null },
        select: { id: true, name: true },
      }),
      db.itemMaster.findMany({
        where: { workspaceId },
        select: { id: true, code: true, name: true },
      }),
      db.employee.findMany({
        where: { workspaceId },
        select: { id: true, email: true, name: true },
      }),
      db.supplierMaster.findMany({
        where: { workspaceId },
        select: { id: true, code: true, name: true },
      }),
      db.customerMaster.findMany({
        where: { workspaceId },
        select: { id: true, code: true, name: true },
      }),
      db.chartOfAccounts.findMany({
        where: { workspaceId },
        select: { id: true, code: true, name: true, type: true },
      }),
      db.generalLedgerEntry.findMany({
        where: { workspaceId },
        select: { id: true, coaCode: true, debit: true, credit: true },
        take: 50, // cap ledger entries
      }),
    ]);

    // Create a tags lookup map: entityType_entityId -> list of { id, label }
    const tagsMap = new Map<string, { id: string; label: string }[]>();
    tags.forEach((t) => {
      const key = `${t.entityType}_${t.entityId}`;
      const current = tagsMap.get(key) || [];
      current.push({ id: t.id, label: t.label });
      tagsMap.set(key, current);
    });

    const entities: TaggedEntity[] = [];

    // 1. Projects
    projects.forEach((p) => {
      const key = `PROJECT_${p.id}`;
      entities.push({
        id: p.id,
        entityType: "PROJECT",
        code: `PRJ-${p.name.replace(/\s+/g, "-").toUpperCase().slice(0, 8)}`,
        name: p.name,
        tags: tagsMap.get(key) || [],
        route: `/dashboard/projects/${p.id}`,
      });
    });

    // 2. Items
    items.forEach((i) => {
      const key = `ITEM_${i.id}`;
      entities.push({
        id: i.id,
        entityType: "ITEM",
        code: i.code,
        name: i.name,
        tags: tagsMap.get(key) || [],
        route: `/dashboard/inventory?tab=stock`,
      });
    });

    // 3. Employees
    employees.forEach((e) => {
      const key = `EMPLOYEE_${e.id}`;
      entities.push({
        id: e.id,
        entityType: "EMPLOYEE",
        code: e.email,
        name: e.name,
        tags: tagsMap.get(key) || [],
        route: `/dashboard/payroll?tab=directory`,
      });
    });

    // 4. Suppliers
    suppliers.forEach((s) => {
      const key = `SUPPLIER_${s.id}`;
      entities.push({
        id: s.id,
        entityType: "SUPPLIER",
        code: s.code,
        name: s.name,
        tags: tagsMap.get(key) || [],
        route: `/dashboard/inventory?tab=suppliers`,
      });
    });

    // 5. Customers
    customers.forEach((c) => {
      const key = `CUSTOMER_${c.id}`;
      entities.push({
        id: c.id,
        entityType: "CUSTOMER",
        code: c.code,
        name: c.name,
        tags: tagsMap.get(key) || [],
        route: `/dashboard/accounts?tab=sales`,
      });
    });

    // 6. Chart of Accounts
    coa.forEach((c) => {
      const key = `COA_${c.id}`;
      entities.push({
        id: c.id,
        entityType: "COA",
        code: c.code,
        name: `${c.name} (${c.type})`,
        tags: tagsMap.get(key) || [],
        route: `/dashboard/accounts?tab=coa`,
      });
    });

    // 7. General Ledger Entries
    glEntries.forEach((e) => {
      const key = `GL_${e.id}`;
      entities.push({
        id: e.id,
        entityType: "GL",
        code: `GL-${e.id.slice(-6).toUpperCase()}`,
        name: `COA: ${e.coaCode} • Debit: ₹${e.debit} Credit: ₹${e.credit}`,
        tags: tagsMap.get(key) || [],
        route: `/dashboard/accounts?tab=gl`,
      });
    });

    return {
      success: true,
      entities,
      allTagsList: Array.from(new Set(tags.map((t) => t.label))),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addTagAction(
  entityType: TaggedEntity["entityType"],
  entityId: string,
  code: string,
  label: string
) {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    await db.tag.upsert({
      where: {
        workspaceId_entityType_entityId_label: {
          workspaceId,
          entityType,
          entityId,
          label: label.trim(),
        },
      },
      update: {},
      create: {
        workspaceId,
        entityType,
        entityId,
        code,
        label: label.trim(),
      },
    });

    revalidatePath("/dashboard/tags");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function removeTagAction(tagId: string) {
  try {
    await db.tag.delete({
      where: { id: tagId },
    });

    revalidatePath("/dashboard/tags");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
