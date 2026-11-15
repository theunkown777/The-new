-- Recall-Kette: Termine, die ein Patient online gebucht hat, nachdem die Praxis ihn an die Vorsorge erinnert hat
ALTER TABLE "Appointment" ADD COLUMN "nachErinnerung" BOOLEAN NOT NULL DEFAULT false;
