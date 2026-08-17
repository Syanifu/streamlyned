"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// GSTIN Regex validation (15 characters)
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function validateGstin(gstin: string | undefined): boolean {
  if (!gstin) return true; // Optional field
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

/**
 * Creates a new Item Master record.
 */
export async function createItemAction(data: {
  code: string;
  name: string;
  description?: string;
  uom: string;
  group: string;
  costingRule?: string;
  hsnCode?: string;
  reorderLevel?: number;
  reorderQty?: number;
}) {
  try {
    const session = await requireSession();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins can manage master data.");
    }

    const codeClean = data.code.trim().toUpperCase();
    const nameClean = data.name.trim();

    // Check for duplicates
    const duplicate = await db.itemMaster.findUnique({
      where: {
        workspaceId_code: {
          workspaceId: session.workspace.id,
          code: codeClean,
        },
      },
    });

    if (duplicate) {
      throw new Error(`An item with code "${codeClean}" already exists.`);
    }

    const item = await db.itemMaster.create({
      data: {
        workspaceId: session.workspace.id,
        code: codeClean,
        name: nameClean,
        description: data.description?.trim() || null,
        uom: data.uom.trim().toUpperCase(),
        group: data.group.trim().toUpperCase(),
        costingRule: data.costingRule || "MOVING_AVERAGE",
        hsnCode: data.hsnCode?.trim().toUpperCase() || null,
        reorderLevel: data.reorderLevel ?? null,
        reorderQty: data.reorderQty ?? null,
      },
    });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "ITEM_MASTER",
        entityId: item.id,
        userId: session.user.id,
        action: "CREATE",
        description: `Created item master "${item.name}" (Code: ${item.code})`,
      },
    });

    revalidatePath("/dashboard/settings"); // Or relevant dashboard route
    return { success: true, item };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Updates an Item Master record.
 */
export async function updateItemAction(
  id: string,
  data: {
    name?: string;
    description?: string;
    uom?: string;
    group?: string;
    costingRule?: string;
    hsnCode?: string;
    reorderLevel?: number;
    reorderQty?: number;
    isActive?: boolean;
  }
) {
  try {
    const session = await requireSession();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins can manage master data.");
    }

    const item = await db.itemMaster.findUnique({
      where: { id },
    });

    if (!item || item.workspaceId !== session.workspace.id) {
      throw new Error("Item not found.");
    }

    const updatedItem = await db.itemMaster.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description.trim() || null : undefined,
        uom: data.uom !== undefined ? data.uom.trim().toUpperCase() : undefined,
        group: data.group !== undefined ? data.group.trim().toUpperCase() : undefined,
        costingRule: data.costingRule !== undefined ? data.costingRule : undefined,
        hsnCode: data.hsnCode !== undefined ? data.hsnCode.trim().toUpperCase() || null : undefined,
        reorderLevel: data.reorderLevel !== undefined ? data.reorderLevel : undefined,
        reorderQty: data.reorderQty !== undefined ? data.reorderQty : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "ITEM_MASTER",
        entityId: item.id,
        userId: session.user.id,
        action: "UPDATE",
        description: `Updated item master "${item.name}"`,
      },
    });

    return { success: true, item: updatedItem };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Creates a Supplier Master record.
 */
export async function createSupplierAction(data: {
  code: string;
  name: string;
  gstin?: string;
  email?: string;
  phone?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
}) {
  try {
    const session = await requireSession();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins can manage master data.");
    }

    if (data.gstin && !validateGstin(data.gstin)) {
      throw new Error("Invalid Indian GSTIN format. Must be 15 alphanumeric characters.");
    }

    const codeClean = data.code.trim().toUpperCase();
    const nameClean = data.name.trim();

    // Check for duplicates
    const duplicate = await db.supplierMaster.findFirst({
      where: {
        workspaceId: session.workspace.id,
        OR: [
          { code: codeClean },
          { name: { equals: nameClean, mode: "insensitive" } },
        ],
      },
    });

    if (duplicate) {
      if (duplicate.code === codeClean) {
        throw new Error(`A supplier with code "${codeClean}" already exists.`);
      } else {
        throw new Error(`A supplier with name "${nameClean}" already exists (Fuzzy duplicate prevention).`);
      }
    }

    const supplier = await db.supplierMaster.create({
      data: {
        workspaceId: session.workspace.id,
        code: codeClean,
        name: nameClean,
        gstin: data.gstin?.trim().toUpperCase() || null,
        email: data.email?.trim().toLowerCase() || null,
        phone: data.phone?.trim() || null,
        bankName: data.bankName?.trim() || null,
        bankAccount: data.bankAccount?.trim() || null,
        bankIfsc: data.bankIfsc?.trim().toUpperCase() || null,
      },
    });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "SUPPLIER_MASTER",
        entityId: supplier.id,
        userId: session.user.id,
        action: "CREATE",
        description: `Created supplier "${supplier.name}" (Code: ${supplier.code})`,
      },
    });

    return { success: true, supplier };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Updates a Supplier Master record.
 */
export async function updateSupplierAction(
  id: string,
  data: {
    name?: string;
    gstin?: string;
    email?: string;
    phone?: string;
    bankName?: string;
    bankAccount?: string;
    bankIfsc?: string;
    isActive?: boolean;
  }
) {
  try {
    const session = await requireSession();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins can manage master data.");
    }

    if (data.gstin && !validateGstin(data.gstin)) {
      throw new Error("Invalid Indian GSTIN format. Must be 15 alphanumeric characters.");
    }

    const supplier = await db.supplierMaster.findUnique({
      where: { id },
    });

    if (!supplier || supplier.workspaceId !== session.workspace.id) {
      throw new Error("Supplier not found.");
    }

    const updatedSupplier = await db.supplierMaster.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        gstin: data.gstin !== undefined ? data.gstin.trim().toUpperCase() || null : undefined,
        email: data.email !== undefined ? data.email.trim().toLowerCase() || null : undefined,
        phone: data.phone !== undefined ? data.phone.trim() : undefined,
        bankName: data.bankName !== undefined ? data.bankName.trim() : undefined,
        bankAccount: data.bankAccount !== undefined ? data.bankAccount.trim() : undefined,
        bankIfsc: data.bankIfsc !== undefined ? data.bankIfsc.trim().toUpperCase() || null : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "SUPPLIER_MASTER",
        entityId: supplier.id,
        userId: session.user.id,
        action: "UPDATE",
        description: `Updated supplier "${supplier.name}"`,
      },
    });

    return { success: true, supplier: updatedSupplier };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Creates a Customer Master record.
 */
export async function createCustomerAction(data: {
  code: string;
  name: string;
  gstin?: string;
  creditLimit?: number;
}) {
  try {
    const session = await requireSession();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins can manage master data.");
    }

    if (data.gstin && !validateGstin(data.gstin)) {
      throw new Error("Invalid Indian GSTIN format. Must be 15 alphanumeric characters.");
    }

    const codeClean = data.code.trim().toUpperCase();
    const nameClean = data.name.trim();

    // Check for duplicates
    const duplicate = await db.customerMaster.findFirst({
      where: {
        workspaceId: session.workspace.id,
        OR: [
          { code: codeClean },
          { name: { equals: nameClean, mode: "insensitive" } },
        ],
      },
    });

    if (duplicate) {
      if (duplicate.code === codeClean) {
        throw new Error(`A customer with code "${codeClean}" already exists.`);
      } else {
        throw new Error(`A customer with name "${nameClean}" already exists (Fuzzy duplicate prevention).`);
      }
    }

    const customer = await db.customerMaster.create({
      data: {
        workspaceId: session.workspace.id,
        code: codeClean,
        name: nameClean,
        gstin: data.gstin?.trim().toUpperCase() || null,
        creditLimit: data.creditLimit ?? null,
      },
    });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "CUSTOMER_MASTER",
        entityId: customer.id,
        userId: session.user.id,
        action: "CREATE",
        description: `Created customer "${customer.name}" (Code: ${customer.code})`,
      },
    });

    return { success: true, customer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Updates a Customer Master record.
 */
export async function updateCustomerAction(
  id: string,
  data: {
    name?: string;
    gstin?: string;
    creditLimit?: number;
    isActive?: boolean;
  }
) {
  try {
    const session = await requireSession();

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      throw new Error("Access Denied: Only admins can manage master data.");
    }

    if (data.gstin && !validateGstin(data.gstin)) {
      throw new Error("Invalid Indian GSTIN format. Must be 15 alphanumeric characters.");
    }

    const customer = await db.customerMaster.findUnique({
      where: { id },
    });

    if (!customer || customer.workspaceId !== session.workspace.id) {
      throw new Error("Customer not found.");
    }

    const updatedCustomer = await db.customerMaster.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        gstin: data.gstin !== undefined ? data.gstin.trim().toUpperCase() || null : undefined,
        creditLimit: data.creditLimit !== undefined ? data.creditLimit : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    await db.auditLog.create({
      data: {
        workspaceId: session.workspace.id,
        entityType: "CUSTOMER_MASTER",
        entityId: customer.id,
        userId: session.user.id,
        action: "UPDATE",
        description: `Updated customer "${customer.name}"`,
      },
    });

    return { success: true, customer: updatedCustomer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
