-- In Frauenheilkunde und Hebammenhilfe sind Patientinnen per Definition weiblich;
-- bestehende Datensätze ohne Angabe werden entsprechend ergänzt. In anderen
-- Fächern bleibt das Geschlecht leer, bis die Praxis es einträgt.
UPDATE "Patient" p SET "geschlecht" = 'W'
FROM "Practice" pr
WHERE p."practiceId" = pr.id AND pr."specialty" IN ('gyn', 'hebamme') AND p."geschlecht" IS NULL;
