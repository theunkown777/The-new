-- Fehler aus Demo-Praxen (Gastzugang) kennzeichnen: Sie zählen nicht für den Statusbericht.
ALTER TABLE "FehlerEintrag" ADD COLUMN "demo" BOOLEAN NOT NULL DEFAULT false;
