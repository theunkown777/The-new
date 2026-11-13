-- Morgen-Mail an die Praxis: nur Zahlen (offene Rückmeldungen, gemeldete Zahlungen, ungeöffnete Links), keine Namen
ALTER TABLE "Practice" ADD COLUMN "morgenMail" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Practice" ADD COLUMN "morgenMailAn" TEXT;
ALTER TABLE "Practice" ADD COLUMN "morgenMailZuletzt" TIMESTAMP(3);
