-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "geschlecht" TEXT;

-- AlterTable
ALTER TABLE "ServiceCatalogItem" ADD COLUMN     "fach" TEXT;

-- AlterTable
ALTER TABLE "ServiceTemplate" ADD COLUMN     "fach" TEXT;

-- Bestehende globale Vorlagen und Positionen stammen aus dem zahnärztlichen Seed.
UPDATE "ServiceTemplate" SET "fach" = 'zahn' WHERE "practiceId" IS NULL AND "fach" IS NULL;
UPDATE "ServiceCatalogItem" SET "fach" = 'zahn' WHERE "practiceId" IS NULL AND "fach" IS NULL;
