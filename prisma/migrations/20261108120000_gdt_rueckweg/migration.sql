-- Rückweg in die Arzt-Praxissoftware (GDT 6310) und Connector-Rückmeldung
ALTER TABLE "ConnectorKey" ADD COLUMN "gdtKennung" TEXT;
ALTER TABLE "ConnectorKey" ADD COLUMN "connectorInfo" TEXT;

CREATE TABLE "GdtAuslieferung" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "art" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "keyId" TEXT,
    "reserviertAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geliefertAt" TIMESTAMP(3),
    "weg" TEXT,
    CONSTRAINT "GdtAuslieferung_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GdtAuslieferung_art_refId_key" ON "GdtAuslieferung"("art", "refId");
CREATE INDEX "GdtAuslieferung_practiceId_idx" ON "GdtAuslieferung"("practiceId");
ALTER TABLE "GdtAuslieferung" ADD CONSTRAINT "GdtAuslieferung_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
