-- CreateTable
CREATE TABLE "ClientContract" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "advanceRecoveryPct" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "retentionPct" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaBill" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "cumulativeClaimed" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "cumulativeCertified" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "retentionDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "advanceRecovery" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "billingDate" TIMESTAMP(3) NOT NULL,
    "certifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaBillItem" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "claimedQty" DOUBLE PRECISION NOT NULL,
    "certifiedQty" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RaBillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "poId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PurchaseInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodLock" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "lockDate" TIMESTAMP(3) NOT NULL,
    "lockedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientContract_workspaceId_contractNumber_key" ON "ClientContract"("workspaceId", "contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RaBill_projectId_billNumber_key" ON "RaBill"("projectId", "billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_workspaceId_supplierCode_invoiceNumber_key" ON "PurchaseInvoice"("workspaceId", "supplierCode", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodLock_workspaceId_key" ON "PeriodLock"("workspaceId");

-- AddForeignKey
ALTER TABLE "ClientContract" ADD CONSTRAINT "ClientContract_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContract" ADD CONSTRAINT "ClientContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaBill" ADD CONSTRAINT "RaBill_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaBill" ADD CONSTRAINT "RaBill_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaBill" ADD CONSTRAINT "RaBill_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ClientContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaBillItem" ADD CONSTRAINT "RaBillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "RaBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaBillItem" ADD CONSTRAINT "RaBillItem_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WbsNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodLock" ADD CONSTRAINT "PeriodLock_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
