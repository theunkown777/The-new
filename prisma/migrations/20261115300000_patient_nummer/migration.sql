-- Patientenliste einlesen (3.12): Patientennummer aus der eingelesenen Liste,
-- zum Erkennen schon vorhandener Patienten beim nächsten Einlesen.
ALTER TABLE "Patient" ADD COLUMN "patientNummer" TEXT;

CREATE INDEX "Patient_practiceId_patientNummer_idx" ON "Patient"("practiceId", "patientNummer");
