-- Nachfass-Liste: wann die Praxis einen offenen Vorschlag nachgefasst hat und ob der Heil- und Kostenplan bei der Kasse eingereicht ist
ALTER TABLE "TreatmentProposal" ADD COLUMN "nachgefasstAt" TIMESTAMP(3);
ALTER TABLE "TreatmentProposal" ADD COLUMN "hkpEingereichtAt" TIMESTAMP(3);
