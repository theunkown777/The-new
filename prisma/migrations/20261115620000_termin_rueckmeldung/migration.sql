-- Eine Frage nach dem Termin (Patientenportal) und Link zum Google-Profil der Praxis
ALTER TABLE "Practice" ADD COLUMN "googleProfilUrl" TEXT;
CREATE TABLE "TerminRueckmeldung" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "stufe" INTEGER NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerminRueckmeldung_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TerminRueckmeldung_appointmentId_key" ON "TerminRueckmeldung"("appointmentId");
CREATE INDEX "TerminRueckmeldung_practiceId_createdAt_idx" ON "TerminRueckmeldung"("practiceId", "createdAt");
ALTER TABLE "TerminRueckmeldung" ADD CONSTRAINT "TerminRueckmeldung_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TerminRueckmeldung" ADD CONSTRAINT "TerminRueckmeldung_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
