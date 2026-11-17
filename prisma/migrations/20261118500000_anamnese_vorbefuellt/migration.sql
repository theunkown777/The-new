-- Stand der Angaben, die der Patient von seinem Gerät übernommen und geprüft hat (nur das Datum, keine Herkunft)
ALTER TABLE "AnamnesisForm" ADD COLUMN "vorbefuelltStand" TIMESTAMP(3);
