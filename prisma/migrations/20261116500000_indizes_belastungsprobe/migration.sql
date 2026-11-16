-- Belastungsprobe vom 16.11.2026 (scripts/lasttest.ts): fehlende Indizes.
-- Verknüpfte Daten lädt Prisma ohne Praxis-Filter nach (WHERE "proposalId" IN (…), WHERE "patientId" IN (…)).
-- Ohne Index las Postgres dafür jedes Mal die ganze Tabelle aller Praxen: die Antwortzeit wäre mit der Zahl
-- aller Rechnungen, Anamnesebögen und Akteneinträge gewachsen, nicht mit der Größe der einzelnen Praxis.
CREATE INDEX "Invoice_proposalId_idx" ON "Invoice"("proposalId");
CREATE INDEX "AnamnesisForm_patientId_idx" ON "AnamnesisForm"("patientId");
CREATE INDEX "PatientEntry_patientId_idx" ON "PatientEntry"("patientId");
CREATE INDEX "PatientDocument_patientId_idx" ON "PatientDocument"("patientId");
-- Team einer Praxis (Einstellungen, Zuständigkeiten, KI-Hilfen: Namen des Teams)
CREATE INDEX "User_practiceId_idx" ON "User"("practiceId");
