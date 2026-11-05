-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "sepaExportedAt" TIMESTAMP(3),
ADD COLUMN     "sepaIban" TEXT,
ADD COLUMN     "sepaMandatAt" TIMESTAMP(3),
ADD COLUMN     "sepaName" TEXT;

-- AlterTable
ALTER TABLE "Practice" ADD COLUMN     "glaeubigerId" TEXT;
