-- Empfangsmodus: vierstellige Empfangs-PIN der Praxis (nur als Hash) und Sperre nach Fehlversuchen
ALTER TABLE "Practice" ADD COLUMN "empfangPinHash" TEXT;
ALTER TABLE "Practice" ADD COLUMN "empfangPinFehlversuche" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Practice" ADD COLUMN "empfangPinSperren" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Practice" ADD COLUMN "empfangPinGesperrtBis" TIMESTAMP(3);
