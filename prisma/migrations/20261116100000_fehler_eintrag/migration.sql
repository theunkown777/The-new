-- Fehler aus dem Betrieb (Server und Browser), bereinigt gespeichert; Ansicht /betrieb nur für das Sorrida-Team.
CREATE TABLE "FehlerEintrag" (
    "id" TEXT NOT NULL,
    "fingerabdruck" TEXT NOT NULL,
    "quelle" TEXT NOT NULL,
    "ort" TEXT NOT NULL,
    "meldung" TEXT NOT NULL,
    "stack" TEXT,
    "zaehler" INTEGER NOT NULL DEFAULT 1,
    "practiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zuletztAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erledigtAt" TIMESTAMP(3),

    CONSTRAINT "FehlerEintrag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FehlerEintrag_fingerabdruck_key" ON "FehlerEintrag"("fingerabdruck");
CREATE INDEX "FehlerEintrag_zuletztAt_idx" ON "FehlerEintrag"("zuletztAt");
CREATE INDEX "FehlerEintrag_createdAt_idx" ON "FehlerEintrag"("createdAt");
