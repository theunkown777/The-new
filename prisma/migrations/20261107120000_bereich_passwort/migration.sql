-- Eigenes Passwort je Konto für die persönliche Seite "Mein Bereich"
ALTER TABLE "User" ADD COLUMN "bereichPinHash" TEXT;
ALTER TABLE "User" ADD COLUMN "bereichPinFehlversuche" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "bereichPinGesperrtBis" TIMESTAMP(3);
