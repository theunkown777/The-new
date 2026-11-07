-- Zweitmeinung zum Vergleich im Patientenportal
CREATE TABLE "Zweitmeinung" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "praxis" TEXT,
    "leistung" TEXT NOT NULL,
    "eigenanteilCent" INTEGER NOT NULL,
    "gesamtCent" INTEGER,
    "notiz" TEXT,
    "geteiltAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Zweitmeinung_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Zweitmeinung_proposalId_idx" ON "Zweitmeinung"("proposalId");
ALTER TABLE "Zweitmeinung" ADD CONSTRAINT "Zweitmeinung_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "TreatmentProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
