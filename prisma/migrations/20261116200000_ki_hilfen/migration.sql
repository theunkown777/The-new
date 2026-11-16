-- KI-Hilfen je Praxis: Standard aus. Erst nach dem Einschalten durch die Praxisleitung gehen Texte an den KI-Dienst.
ALTER TABLE "Practice" ADD COLUMN "kiHilfen" BOOLEAN NOT NULL DEFAULT false;
