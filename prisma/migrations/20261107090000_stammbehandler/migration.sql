-- Stammbehandler/in je Patient für die persönliche Seite "Mein Bereich"
ALTER TABLE "Patient" ADD COLUMN "behandlerId" TEXT;
CREATE INDEX "Patient_behandlerId_idx" ON "Patient"("behandlerId");
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_behandlerId_fkey" FOREIGN KEY ("behandlerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
