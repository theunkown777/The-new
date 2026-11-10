-- Kalender übertragen und Online-Terminbuchung
ALTER TABLE "Practice" ADD COLUMN "buchungAktiv" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Practice" ADD COLUMN "sprechzeiten" JSONB;
ALTER TABLE "Practice" ADD COLUMN "buchungMinuten" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Practice" ADD COLUMN "buchungVorlaufStd" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "Practice" ADD COLUMN "buchungTageVoraus" INTEGER NOT NULL DEFAULT 28;
ALTER TABLE "Practice" ADD COLUMN "kalenderUrl" TEXT;
ALTER TABLE "Practice" ADD COLUMN "kalenderSyncAt" TIMESTAMP(3);
ALTER TABLE "Practice" ADD COLUMN "kalenderSyncFehler" TEXT;
ALTER TABLE "Practice" ADD COLUMN "kalenderFeedHash" TEXT;
CREATE UNIQUE INDEX "Practice_kalenderFeedHash_key" ON "Practice"("kalenderFeedHash");
ALTER TABLE "Appointment" ADD COLUMN "quelle" TEXT NOT NULL DEFAULT 'PRAXIS';

CREATE TABLE "KalenderBelegung" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3) NOT NULL,
    "ganztag" BOOLEAN NOT NULL DEFAULT false,
    "quelle" TEXT NOT NULL DEFAULT 'abo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KalenderBelegung_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KalenderBelegung_practiceId_start_idx" ON "KalenderBelegung"("practiceId", "start");
ALTER TABLE "KalenderBelegung" ADD CONSTRAINT "KalenderBelegung_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
