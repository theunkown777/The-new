-- AlterTable
ALTER TABLE "TreatmentProposal" ADD COLUMN "patientChoices" JSONB,
ADD COLUMN "patientNote" TEXT,
ADD COLUMN "patientRespondedAt" TIMESTAMP(3),
ADD COLUMN "patientResponse" TEXT,
ADD COLUMN "patientViewedAt" TIMESTAMP(3),
ADD COLUMN "shareExpiresAt" TIMESTAMP(3),
ADD COLUMN "shareTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentProposal_shareTokenHash_key" ON "TreatmentProposal"("shareTokenHash");
