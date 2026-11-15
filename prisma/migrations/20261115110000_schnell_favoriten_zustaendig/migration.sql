-- Schnellvorschlag ohne Akte, Vorschlag-Favoriten, Zuständigkeit im Eingang
ALTER TABLE "Patient" ADD COLUMN "ohneAkte" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Practice" ADD COLUMN "vorschlagFavoriten" JSONB;
ALTER TABLE "Eingang" ADD COLUMN "zustaendigId" TEXT;
ALTER TABLE "Eingang" ADD COLUMN "zustaendigName" TEXT;
