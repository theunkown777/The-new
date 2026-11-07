-- Amtliche Leistungsverzeichnisse (EBM, GOÄ, GOZ, BEMA, Heilmittel, Hebammenhilfe, Pflege, pDL, Hilfsmittel, OPS)
CREATE TABLE "AmtlicheLeistung" (
    "id" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hinweis" TEXT,
    "kapitel" TEXT,
    "abschnitt" TEXT,
    "punkte" INTEGER,
    "euroCent" INTEGER,
    "faecher" TEXT[],
    "arztgruppen" TEXT[],
    "gueltigAb" TIMESTAMP(3),
    "gueltigBis" TIMESTAMP(3),
    "stand" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AmtlicheLeistung_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AmtlicheLeistung_system_code_key" ON "AmtlicheLeistung"("system", "code");
CREATE INDEX "AmtlicheLeistung_system_idx" ON "AmtlicheLeistung"("system");
