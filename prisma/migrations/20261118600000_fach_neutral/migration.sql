-- Fach neutral statt Zahnmedizin als stiller Standard.
-- Nur der Standardwert für neue Praxen ändert sich; bestehende Zeilen bleiben unverändert.
ALTER TABLE "Practice" ALTER COLUMN "specialty" SET DEFAULT 'andere';

-- Partner-Schlüssel: Fachrichtung, für die der Schlüssel ausgestellt ist (leer bei bestehenden Schlüsseln).
ALTER TABLE "ApiClient" ADD COLUMN "fach" TEXT;
