-- Rechtliche Vorprüfung (A31, A32): eigene Einwilligung für Erinnerungen an offene Vorschläge und
-- je Einwilligung der Vermerk, wer sie aufgenommen hat und auf welchem Weg.
ALTER TABLE "Patient" ADD COLUMN "nachfassConsentAt" TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN "einwilligungVermerk" JSONB;
