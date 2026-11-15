-- Lese-Link für Vertrauenspersonen (vom Patienten erzeugt, nur Hash des Tokens)
CREATE TABLE "LeseLink" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "quelle" TEXT NOT NULL DEFAULT 'LINK',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeseLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeseLink_tokenHash_key" ON "LeseLink"("tokenHash");
CREATE INDEX "LeseLink_proposalId_idx" ON "LeseLink"("proposalId");
ALTER TABLE "LeseLink" ADD CONSTRAINT "LeseLink_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "TreatmentProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
