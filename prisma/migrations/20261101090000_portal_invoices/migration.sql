-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'pilot',
ADD COLUMN     "message" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "portalExpiresAt" TIMESTAMP(3),
ADD COLUMN     "portalTokenHash" TEXT,
ADD COLUMN     "portalViewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Practice" ADD COLUMN     "accountHolder" TEXT,
ADD COLUMN     "bic" TEXT,
ADD COLUMN     "iban" TEXT;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "proposalId" TEXT,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountCent" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "wantsInstallments" BOOLEAN NOT NULL DEFAULT false,
    "reportedPaidAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "remindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_practiceId_status_idx" ON "Invoice"("practiceId", "status");

-- CreateIndex
CREATE INDEX "Invoice_patientId_idx" ON "Invoice"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_practiceId_number_key" ON "Invoice"("practiceId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_portalTokenHash_key" ON "Patient"("portalTokenHash");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "TreatmentProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

