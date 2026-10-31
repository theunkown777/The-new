-- AlterTable
ALTER TABLE "Practice" ADD COLUMN     "customOffers" JSONB,
ADD COLUMN     "medPrices" JSONB,
ADD COLUMN     "specialty" TEXT NOT NULL DEFAULT 'zahn';

