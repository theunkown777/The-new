-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "practiceName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "dentists" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
