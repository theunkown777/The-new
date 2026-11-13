-- S5: Geburtsdatum-Prüfung vor bindenden Handlungen im Patientenportal.
-- Nachweis an Vereinbarung und Lastschriftmandat, Fehlversuche/Sperre je Portal-Link.
ALTER TABLE "TreatmentProposal" ADD COLUMN "agreedGeprueftAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "sepaGeprueftAt" TIMESTAMP(3);

CREATE TABLE "PortalPruefung" (
    "linkHash" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fehler" INTEGER NOT NULL DEFAULT 0,
    "sperren" INTEGER NOT NULL DEFAULT 0,
    "gesperrtBis" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalPruefung_pkey" PRIMARY KEY ("linkHash")
);

CREATE INDEX "PortalPruefung_patientId_idx" ON "PortalPruefung"("patientId");
CREATE INDEX "PortalPruefung_updatedAt_idx" ON "PortalPruefung"("updatedAt");

ALTER TABLE "PortalPruefung" ADD CONSTRAINT "PortalPruefung_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
