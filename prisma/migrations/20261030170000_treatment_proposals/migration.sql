-- AlterTable
ALTER TABLE "Practice" ADD COLUMN "proposalPrices" JSONB;

-- CreateTable
CREATE TABLE "TreatmentProposal" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENTWURF',
    "input" JSONB NOT NULL,
    "choices" JSONB NOT NULL,
    "baseTotalCent" INTEGER NOT NULL,
    "planTotalCent" INTEGER NOT NULL,
    "eigenanteilCent" INTEGER NOT NULL,
    "letterText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreatmentProposal_practiceId_idx" ON "TreatmentProposal"("practiceId");

-- CreateIndex
CREATE INDEX "TreatmentProposal_patientId_idx" ON "TreatmentProposal"("patientId");

-- AddForeignKey
ALTER TABLE "TreatmentProposal" ADD CONSTRAINT "TreatmentProposal_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentProposal" ADD CONSTRAINT "TreatmentProposal_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentProposal" ADD CONSTRAINT "TreatmentProposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
