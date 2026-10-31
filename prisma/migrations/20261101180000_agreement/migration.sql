-- AlterTable
ALTER TABLE "TreatmentProposal" ADD COLUMN     "agreedAt" TIMESTAMP(3),
ADD COLUMN     "agreedChoices" JSONB,
ADD COLUMN     "agreedName" TEXT,
ADD COLUMN     "agreedSignature" TEXT;
