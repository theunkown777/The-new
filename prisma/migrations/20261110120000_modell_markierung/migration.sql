-- Anatomie-Modelle: Markierungen der Praxis je Patient
CREATE TABLE "ModellMarkierung" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "modell" TEXT NOT NULL,
    "teil" TEXT NOT NULL,
    "notiz" TEXT NOT NULL DEFAULT '',
    "erstelltVon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModellMarkierung_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ModellMarkierung_patientId_modell_teil_key" ON "ModellMarkierung"("patientId", "modell", "teil");
CREATE INDEX "ModellMarkierung_practiceId_idx" ON "ModellMarkierung"("practiceId");
ALTER TABLE "ModellMarkierung" ADD CONSTRAINT "ModellMarkierung_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModellMarkierung" ADD CONSTRAINT "ModellMarkierung_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
