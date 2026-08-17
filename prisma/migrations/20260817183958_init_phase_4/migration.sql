-- CreateTable
CREATE TABLE "DrawingDocument" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "drawingNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingRevision" (
    "id" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "revisionNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "isSuperseded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrawingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingTransmittal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "transmittalNumber" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawingTransmittal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransmittalItem" (
    "id" TEXT NOT NULL,
    "transmittalId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,

    CONSTRAINT "TransmittalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WbsWorkPackage" (
    "id" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "drawingRevisionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WbsWorkPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItpInspectionRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "drawingRevisionId" TEXT,
    "inspectorUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resultComment" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItpInspectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformanceReport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "inspectionRequestId" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "wbsNodeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MINOR',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "disposition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NonConformanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DrawingDocument_projectId_drawingNumber_key" ON "DrawingDocument"("projectId", "drawingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingRevision_drawingId_revisionNumber_key" ON "DrawingRevision"("drawingId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingTransmittal_workspaceId_transmittalNumber_key" ON "DrawingTransmittal"("workspaceId", "transmittalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TransmittalItem_transmittalId_revisionId_key" ON "TransmittalItem"("transmittalId", "revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "WbsWorkPackage_wbsNodeId_drawingRevisionId_key" ON "WbsWorkPackage"("wbsNodeId", "drawingRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformanceReport_inspectionRequestId_key" ON "NonConformanceReport"("inspectionRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "NonConformanceReport_workspaceId_ncrNumber_key" ON "NonConformanceReport"("workspaceId", "ncrNumber");

-- AddForeignKey
ALTER TABLE "DrawingDocument" ADD CONSTRAINT "DrawingDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingDocument" ADD CONSTRAINT "DrawingDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "DrawingDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTransmittal" ADD CONSTRAINT "DrawingTransmittal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingTransmittal" ADD CONSTRAINT "DrawingTransmittal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransmittalItem" ADD CONSTRAINT "TransmittalItem_transmittalId_fkey" FOREIGN KEY ("transmittalId") REFERENCES "DrawingTransmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransmittalItem" ADD CONSTRAINT "TransmittalItem_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DrawingRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsWorkPackage" ADD CONSTRAINT "WbsWorkPackage_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WbsNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsWorkPackage" ADD CONSTRAINT "WbsWorkPackage_drawingRevisionId_fkey" FOREIGN KEY ("drawingRevisionId") REFERENCES "DrawingRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItpInspectionRequest" ADD CONSTRAINT "ItpInspectionRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItpInspectionRequest" ADD CONSTRAINT "ItpInspectionRequest_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WbsNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItpInspectionRequest" ADD CONSTRAINT "ItpInspectionRequest_drawingRevisionId_fkey" FOREIGN KEY ("drawingRevisionId") REFERENCES "DrawingRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItpInspectionRequest" ADD CONSTRAINT "ItpInspectionRequest_inspectorUserId_fkey" FOREIGN KEY ("inspectorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformanceReport" ADD CONSTRAINT "NonConformanceReport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformanceReport" ADD CONSTRAINT "NonConformanceReport_inspectionRequestId_fkey" FOREIGN KEY ("inspectionRequestId") REFERENCES "ItpInspectionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformanceReport" ADD CONSTRAINT "NonConformanceReport_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WbsNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
