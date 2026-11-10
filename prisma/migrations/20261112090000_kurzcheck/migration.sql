-- Kurz-Fragebogen vor dem Termin: höchstens fünf Fragen mit Bildern, vom Patienten im Patientenlink ausgefüllt
CREATE TABLE "Kurzcheck" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "antworten" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Kurzcheck_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Kurzcheck_patientId_createdAt_idx" ON "Kurzcheck"("patientId", "createdAt");
CREATE INDEX "Kurzcheck_practiceId_idx" ON "Kurzcheck"("practiceId");
ALTER TABLE "Kurzcheck" ADD CONSTRAINT "Kurzcheck_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Kurzcheck" ADD CONSTRAINT "Kurzcheck_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
