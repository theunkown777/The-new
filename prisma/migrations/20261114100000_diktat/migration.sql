-- Diktat: Erkennung über den Sprachdienst des Browsers nur, wenn die Praxisleitung es erlaubt
ALTER TABLE "Practice" ADD COLUMN "diktatCloud" BOOLEAN NOT NULL DEFAULT false;
-- Bestehende Demo-Praxen behalten das Diktat zum Ausprobieren
UPDATE "Practice" SET "diktatCloud" = true WHERE "isDemo" = true;
