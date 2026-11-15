-- Warteliste für frei gewordene Termine
CREATE TABLE "Warteliste" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "anlass" TEXT NOT NULL,
    "vonTag" TIMESTAMP(3),
    "bisTag" TIMESTAMP(3),
    "zeit" TEXT,
    "notiz" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "angebotenAt" TIMESTAMP(3),
    "erledigtAt" TIMESTAMP(3),

    CONSTRAINT "Warteliste_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Warteliste_practiceId_erledigtAt_createdAt_idx" ON "Warteliste"("practiceId", "erledigtAt", "createdAt");
CREATE INDEX "Warteliste_patientId_idx" ON "Warteliste"("patientId");
ALTER TABLE "Warteliste" ADD CONSTRAINT "Warteliste_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Warteliste" ADD CONSTRAINT "Warteliste_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
