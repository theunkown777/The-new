-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "reminderLevel" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TreatmentProposal" ADD COLUMN     "agreedText" TEXT;
