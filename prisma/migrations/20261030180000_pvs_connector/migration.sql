-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "externalId" TEXT,
ADD COLUMN "externalSource" TEXT;

-- CreateTable
CREATE TABLE "ConnectorKey" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ConnectorKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaunchToken" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "view" TEXT NOT NULL DEFAULT 'bericht',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaunchToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectorKey_keyHash_key" ON "ConnectorKey"("keyHash");

-- CreateIndex
CREATE INDEX "ConnectorKey_practiceId_idx" ON "ConnectorKey"("practiceId");

-- CreateIndex
CREATE UNIQUE INDEX "LaunchToken_tokenHash_key" ON "LaunchToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LaunchToken_practiceId_idx" ON "LaunchToken"("practiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_practiceId_externalSource_externalId_key" ON "Patient"("practiceId", "externalSource", "externalId");

-- AddForeignKey
ALTER TABLE "ConnectorKey" ADD CONSTRAINT "ConnectorKey_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchToken" ADD CONSTRAINT "LaunchToken_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchToken" ADD CONSTRAINT "LaunchToken_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
