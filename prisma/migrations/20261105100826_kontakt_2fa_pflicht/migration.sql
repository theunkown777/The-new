-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "contactConsentAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Practice" ADD COLUMN     "require2faAll" BOOLEAN NOT NULL DEFAULT false;
