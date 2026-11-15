-- Terminbuchung für neue Patienten: öffentliche Seite /t/<kennung>, Anfragen statt fertiger Termine
ALTER TABLE "Practice" ADD COLUMN "neupatientenBuchung" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Practice" ADD COLUMN "buchungKennung" TEXT;
ALTER TABLE "Practice" ADD COLUMN "buchungAnlaesse" JSONB;
CREATE UNIQUE INDEX "Practice_buchungKennung_key" ON "Practice"("buchungKennung");

CREATE TABLE "Terminanfrage" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "anlass" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFEN',
    "reserviertBis" TIMESTAMP(3) NOT NULL,
    "datenschutzAt" TIMESTAMP(3) NOT NULL,
    "beispiel" BOOLEAN NOT NULL DEFAULT false,
    "patientId" TEXT,
    "appointmentId" TEXT,
    "bearbeitetAt" TIMESTAMP(3),
    "bearbeitetVon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Terminanfrage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Terminanfrage_practiceId_status_createdAt_idx" ON "Terminanfrage"("practiceId", "status", "createdAt");
CREATE INDEX "Terminanfrage_practiceId_start_idx" ON "Terminanfrage"("practiceId", "start");
ALTER TABLE "Terminanfrage" ADD CONSTRAINT "Terminanfrage_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
