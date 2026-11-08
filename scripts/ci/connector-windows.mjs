// Hilfsskript für den Windows-Test des Sorrida-Connectors (.github/workflows/connector-windows.yml).
// Legt Testdaten an und prüft die Ergebnisse in der Datenbank. Nur für die Test-Datenbank in CI.
//   node scripts/ci/connector-windows.mjs vorbereiten   → gibt den Connector-Schlüssel aus
//   node scripts/ci/connector-windows.mjs patienten     → prüft die über den Connector angelegten Patienten
//   node scripts/ci/connector-windows.mjs bericht       → gibt einen Bericht für den GDT-Patienten frei
//   node scripts/ci/connector-windows.mjs gdt <Datei>   → prüft eine 6310-Datei aus dem Importordner
//   node scripts/ci/connector-windows.mjs geliefert     → prüft, dass der Bericht als geliefert gilt
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import fs from "fs";

const prisma = new PrismaClient();
const PRAXIS = "CI Windows-Testpraxis";
const fehler = (m) => { console.error("FEHLER: " + m); process.exitCode = 1; };

const cmd = process.argv[2];
if (cmd === "vorbereiten") {
  const practice = await prisma.practice.create({ data: { name: PRAXIS } });
  await prisma.user.create({ data: { email: "ci-windows@sorrida.test", name: "CI Windows", role: "staff", practiceId: practice.id, passwordHash: "x" } });
  const key = "sor_conn_" + crypto.randomBytes(32).toString("hex");
  await prisma.connectorKey.create({ data: { practiceId: practice.id, name: "Windows-Runner", keyHash: crypto.createHash("sha256").update(key).digest("hex"), keyPrefix: key.slice(0, 15) } });
  process.stdout.write(key);
} else if (cmd === "patienten") {
  const practice = await prisma.practice.findFirstOrThrow({ where: { name: PRAXIS } });
  const pats = await prisma.patient.findMany({ where: { practiceId: practice.id }, orderBy: { externalSource: "asc" } });
  for (const p of pats) console.log(`${p.externalSource} | ${p.externalId} | ${p.lastName}, ${p.firstName} | ${p.birthDate?.toISOString().slice(0, 10) ?? "-"} | ${p.geschlecht ?? "-"}`);
  const erwartet = {
    DSWIN: ["4711", "Müller-Lüdenscheidt", "Jürgen", "M"], Z1: ["4711", "Müller-Lüdenscheidt", "Jürgen", "M"], CHARLY: ["4711", "Müller-Lüdenscheidt", "Jürgen", "M"], EVIDENT: ["4711", "Müller-Lüdenscheidt", "Jürgen", "W"],
    "GDT-MEDISTAR": ["A-1205", "Größe", "Ägidius", "M"], "GDT-TURBOMED": ["A-1205", "Größe", "Ägidius", "W"], "GDT-ALBIS": ["A-1205", "Größe", "Ägidius", "M"], "GDT-CGMM1": ["A-1205", "Größe", "Ägidius", "W"], "GDT-XISYNET": ["778899", "Weiß", "Zoë", "W"],
  };
  for (const [quelle, [id, nach, vor, g]] of Object.entries(erwartet)) {
    const p = pats.find((x) => x.externalSource === quelle);
    if (!p) { fehler(`${quelle}: Patient fehlt`); continue; }
    if (p.externalId !== id || p.lastName !== nach || p.firstName !== vor || p.geschlecht !== g) fehler(`${quelle}: ${p.externalId} ${p.lastName}, ${p.firstName} ${p.geschlecht} statt ${id} ${nach}, ${vor} ${g}`);
  }
  if (pats.length !== Object.keys(erwartet).length) fehler(`${pats.length} Patienten statt ${Object.keys(erwartet).length}`);
  const key = await prisma.connectorKey.findFirstOrThrow({ where: { practiceId: practice.id } });
  console.log("Connector meldet:", key.connectorInfo, "· GDT-Kennung:", key.gdtKennung);
  if (!key.connectorInfo?.startsWith("SorridaConnector/2.")) fehler("Connector-Version nicht gemeldet");
} else if (cmd === "bericht") {
  const practice = await prisma.practice.findFirstOrThrow({ where: { name: PRAXIS } });
  const user = await prisma.user.findFirstOrThrow({ where: { practiceId: practice.id } });
  const pat = await prisma.patient.findFirstOrThrow({ where: { practiceId: practice.id, externalSource: process.argv[3] ?? "GDT-MEDISTAR" } });
  const r = await prisma.report.create({ data: { practiceId: practice.id, patientId: pat.id, authorId: user.id, type: "BEFUND", serviceSummary: "CI", status: "FINAL", generatedText: "Befund: Wundversorgung am Unterschenkel, Verband gewechselt. Kontrolle in 3 Tagen.", approvedAt: new Date(), approvedByName: "Dr. Müller", treatmentDate: new Date() } });
  console.log("Bericht freigegeben:", r.id);
} else if (cmd === "gdt") {
  const b = fs.readFileSync(process.argv[3]);
  const t = b.toString("latin1");
  const zeilen = t.split("\r\n").filter(Boolean);
  console.log(zeilen.join("\n"));
  for (const z of zeilen) if (Number(z.slice(0, 3)) !== z.length + 2) fehler(`Zeilenlänge falsch: ${z}`);
  const f = Object.fromEntries(zeilen.map((z) => [z.slice(3, 7), z.slice(7)]));
  if (Number(f["8100"]) !== b.length) fehler(`8100 = ${f["8100"]}, Datei hat ${b.length} Bytes`);
  if (f["8000"] !== "6310") fehler("Satzart nicht 6310");
  if (f["3000"] !== "A-1205" || f["3101"] !== "Größe" || f["3102"] !== "Ägidius") fehler("Patient in der Rückgabe falsch");
  if (f["8315"] !== "MEDISTAR" || f["8316"] !== "SORRIDA") fehler(`Kennungen falsch: 8315=${f["8315"]} 8316=${f["8316"]}`);
  if (!t.includes("Müller")) fehler("Umlaut im Text falsch kodiert");
} else if (cmd === "geliefert") {
  const art = process.argv[3] ?? "bericht";
  const n = await prisma.gdtAuslieferung.count({ where: { art, geliefertAt: { not: null }, weg: "connector" } });
  console.log(`geliefert (${art}):`, n);
  if (n !== 1) fehler(`${n} Lieferungen statt 1`);
} else if (cmd === "pdf") {
  const b = fs.readFileSync(process.argv[3]);
  console.log(process.argv[3].split(/[\\/]/).pop(), b.length, "Bytes");
  if (b.subarray(0, 5).toString() !== "%PDF-") fehler("keine PDF-Datei");
  if (!/^4711_Müller-Lüdenscheidt_\d{4}-\d{2}-\d{2}_Bericht_\w{6}\.pdf$/.test(process.argv[3].split(/[\\/]/).pop())) fehler("Dateiname ohne Patientennummer/Name");
} else fehler("unbekannter Befehl " + cmd);
await prisma.$disconnect();
