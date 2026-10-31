ALTER TABLE "Practice" ADD COLUMN "installments" JSONB;
ALTER TABLE "TreatmentProposal" ADD COLUMN "shareCreatedAt" TIMESTAMP(3),
ADD COLUMN "patientWantsInstallments" BOOLEAN NOT NULL DEFAULT false;
-- Bestehende Links zählen als versendet.
UPDATE "TreatmentProposal" SET "shareCreatedAt" = "updatedAt" WHERE "shareTokenHash" IS NOT NULL;
