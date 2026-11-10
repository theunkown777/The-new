-- Eingang: Rückmeldungen der Patienten gesammelt für die Praxis
CREATE TABLE "Eingang" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "art" TEXT NOT NULL,
    "entityId" TEXT,
    "hinweis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erledigtAt" TIMESTAMP(3),
    "erledigtVon" TEXT,
    CONSTRAINT "Eingang_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Eingang_practiceId_erledigtAt_createdAt_idx" ON "Eingang"("practiceId", "erledigtAt", "createdAt");
CREATE INDEX "Eingang_patientId_idx" ON "Eingang"("patientId");
ALTER TABLE "Eingang" ADD CONSTRAINT "Eingang_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Eingang" ADD CONSTRAINT "Eingang_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Was heute schon offen ist, einmalig übernehmen (damit der Eingang nicht leer startet)
INSERT INTO "Eingang" ("id", "practiceId", "patientId", "art", "entityId", "hinweis", "createdAt")
SELECT 'ein' || md5(random()::text || i."id"), i."practiceId", i."patientId", 'ZAHLUNG_GEMELDET', i."id", 'Rechnung ' || i."number", COALESCE(i."reportedPaidAt", CURRENT_TIMESTAMP)
FROM "Invoice" i WHERE i."status" = 'GEMELDET';

INSERT INTO "Eingang" ("id", "practiceId", "patientId", "art", "entityId", "hinweis", "createdAt")
SELECT 'ein' || md5(random()::text || i."id" || 'r'), i."practiceId", i."patientId", 'RATEN', i."id", 'Rechnung ' || i."number", CURRENT_TIMESTAMP
FROM "Invoice" i WHERE i."status" = 'OFFEN' AND i."wantsInstallments" = true;

INSERT INTO "Eingang" ("id", "practiceId", "patientId", "art", "entityId", "hinweis", "createdAt")
SELECT 'ein' || md5(random()::text || i."id" || 'l'), i."practiceId", i."patientId", 'LASTSCHRIFT', i."id", 'Rechnung ' || i."number", i."sepaMandatAt"
FROM "Invoice" i WHERE i."status" = 'OFFEN' AND i."sepaMandatAt" IS NOT NULL AND i."sepaExportedAt" IS NULL;

INSERT INTO "Eingang" ("id", "practiceId", "patientId", "art", "entityId", "createdAt")
SELECT 'ein' || md5(random()::text || a."id"), a."practiceId", a."patientId", 'ANAMNESE', a."id", a."submittedAt"
FROM "AnamnesisForm" a WHERE a."submittedAt" > CURRENT_TIMESTAMP - INTERVAL '14 days';

INSERT INTO "Eingang" ("id", "practiceId", "patientId", "art", "entityId", "createdAt")
SELECT 'ein' || md5(random()::text || p."id"), p."practiceId", p."patientId", CASE WHEN p."patientResponse" = 'RUECKRUF' THEN 'VORSCHLAG_RUECKRUF' ELSE 'VORSCHLAG_INTERESSE' END, p."id", p."patientRespondedAt"
FROM "TreatmentProposal" p WHERE p."patientId" IS NOT NULL AND p."patientRespondedAt" > CURRENT_TIMESTAMP - INTERVAL '14 days' AND p."status" IN ('ENTWURF', 'BESPROCHEN');

INSERT INTO "Eingang" ("id", "practiceId", "patientId", "art", "entityId", "createdAt")
SELECT 'ein' || md5(random()::text || t."id"), t."practiceId", t."patientId", 'TERMIN_GEBUCHT', t."id", t."createdAt"
FROM "Appointment" t WHERE t."quelle" = 'PATIENT' AND t."start" > CURRENT_TIMESTAMP AND t."status" IN ('GEPLANT', 'BESTAETIGT');
