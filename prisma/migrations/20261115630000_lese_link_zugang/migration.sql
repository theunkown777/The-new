-- Lese-Link: Hash des Zugangs (Patienten- bzw. Portal-Link), über den er erzeugt wurde; endet mit diesem Zugang
ALTER TABLE "LeseLink" ADD COLUMN "zugangHash" TEXT NOT NULL DEFAULT '';
