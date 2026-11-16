-- Empfangsmodus: geparkte Praxis-Sitzungen auf dem Server führen (nur Hash der Kennung aus dem Cookie).
-- Nach dem Entsperren und nach zu vielen Fehlversuchen wird die Zeile gelöscht; ein kopierter Cookie-Wert gilt dann nicht mehr.
CREATE TABLE "EmpfangParkung" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpfangParkung_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmpfangParkung_practiceId_idx" ON "EmpfangParkung"("practiceId");
CREATE INDEX "EmpfangParkung_expiresAt_idx" ON "EmpfangParkung"("expiresAt");
ALTER TABLE "EmpfangParkung" ADD CONSTRAINT "EmpfangParkung_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
