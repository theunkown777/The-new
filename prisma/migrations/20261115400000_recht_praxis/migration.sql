-- Rechtliche Vorprüfung (A4, A29, A33):
-- Registrierung speichert, wann die Pflichthinweise bestätigt wurden; die Praxis bekommt Stammdaten
-- (Anschrift, Telefon, Impressum, Datenschutzhinweise) für den Fuß von Patientenportal und Patienten-E-Mails.
ALTER TABLE "Practice" ADD COLUMN "unternehmerBestaetigtAt" TIMESTAMP(3);
ALTER TABLE "Practice" ADD COLUMN "vertragstexteBestaetigtAt" TIMESTAMP(3);
ALTER TABLE "Practice" ADD COLUMN "vertragstexteFassung" TEXT;
ALTER TABLE "Practice" ADD COLUMN "stammdaten" JSONB;
