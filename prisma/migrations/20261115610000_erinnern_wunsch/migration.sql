-- „Erinnern Sie mich“: vom Patienten gewählter Tag am Vorschlag
ALTER TABLE "TreatmentProposal" ADD COLUMN "erinnernAm" TIMESTAMP(3);
ALTER TABLE "TreatmentProposal" ADD COLUMN "erinnernGemeldetAt" TIMESTAMP(3);
CREATE INDEX "TreatmentProposal_erinnernAm_idx" ON "TreatmentProposal"("erinnernAm");
