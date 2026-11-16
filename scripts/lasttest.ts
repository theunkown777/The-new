// Belastungsprobe: viele erfundene Praxen in der LOKALEN Datenbank anlegen, Antwortzeiten messen, wieder löschen.
//
//   npx tsx scripts/lasttest.ts anlegen    40 Praxen mit je 2.500 Patienten, 1.200 Vorschlägen, 2.000 Terminen, 800 Rechnungen
//   npx tsx scripts/lasttest.ts messen     misst mit einer angemeldeten Sitzung der ersten Praxis (je 5 Aufrufe, Median)
//   npx tsx scripts/lasttest.ts loeschen   entfernt alles wieder (alle Praxen mit „LASTTEST“ im Namen)
//   npx tsx scripts/lasttest.ts alles      anlegen, messen, löschen
//
// Umgebung: DATABASE_URL (muss auf diesen Rechner zeigen, sonst bricht das Skript ab), BASIS (Standard
// http://localhost:3000, die Anwendung muss mit next start laufen), LASTTEST_AUSGABE (Datei für die Tabelle),
// LASTTEST_PRAXEN (kleinere Probe zum Ausprobieren), LASTTEST_ZUSATZ (weitere Seiten, durch Komma getrennt),
// LASTTEST_PASSWORT_DATEI (Datei für das Zufallspasswort des Messkontos, damit „messen“ es nicht neu setzen muss).
// Alle Daten sind erfunden. Das Skript verschickt nichts und ruft keinen fremden Dienst auf.
import crypto from "node:crypto";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PRICES, buildProposal, type FindingCode, type ProposalInput } from "@/lib/proposals";
import { computeProposal } from "@/lib/proposalSchema";
import { specialty } from "@/lib/specialties";
import { generatePatients, rng } from "@/lib/demoData";
import { LASTTEST_GRENZE_MS, LASTTEST_KENNZEICHEN, LASTTEST_UMFANG, bloecke, istLokaleDatenbank, median, messTabelle, type Messung } from "@/lib/lasttest";

const BASIS = (process.env.BASIS || "http://localhost:3000").replace(/\/+$/, "");
const PRAXEN = Number(process.env.LASTTEST_PRAXEN || LASTTEST_UMFANG.praxen);
const TAG = 24 * 60 * 60 * 1000;
const FAECHER = ["zahn", "hausarzt", "physio", "haut"];
const MAIL = (n: number) => `lasttest-${String(n).padStart(2, "0")}@lasttest.local`;
const PASSWORT = `Lasttest-${crypto.randomBytes(9).toString("base64url")}`;
const PASSWORT_DATEI = process.env.LASTTEST_PASSWORT_DATEI || "";

function sperre() {
  if (!istLokaleDatenbank(process.env.DATABASE_URL)) {
    console.error("Abbruch: DATABASE_URL zeigt nicht auf eine Datenbank auf diesem Rechner. Die Belastungsprobe läuft nur lokal.");
    process.exit(2);
  }
}

const ZAEHNE = [16, 17, 26, 27, 36, 37, 46, 47, 15, 25, 35, 45, 14, 24];
const BEFUNDE: FindingCode[] = ["karies_klein", "karies_gross", "fuellung_defekt", "fehlt", "zerstoert", "wurzel"];
const GRUENDE = ["Kontrolle", "Beratung", "Behandlung", "Nachsorge", "Erstgespräch", "Vorsorge"];

/** Einige Dutzend durchgerechnete Vorschläge je Fach; daraus entstehen die 1.200 Vorschläge je Praxis. */
function vorlagen(fach: string, r: () => number, praxisName: string) {
  const spec = specialty(fach);
  const aus: { input: ProposalInput; computed: ReturnType<typeof computeProposal> }[] = [];
  for (let i = 0; i < 400 && aus.length < 60; i++) {
    const insurance = (r() < 0.12 ? "PKV" : "GKV") as "GKV" | "PKV";
    const factors = { age: 20 + Math.floor(r() * 60), insurance, bonusYears: ([0, 5, 10] as const)[Math.floor(r() * 3)], haertefall: r() < 0.04, erstattungProzent: insurance === "PKV" ? 80 : 0 };
    let input: ProposalInput;
    if (fach === "zahn") {
      const teeth: Record<string, FindingCode> = {};
      for (let k = 0; k <= Math.floor(r() * 3); k++) teeth[String(ZAEHNE[Math.floor(r() * ZAEHNE.length)])] = BEFUNDE[Math.floor(r() * BEFUNDE.length)];
      input = { teeth, globals: { zahnstein: r() < 0.4 }, patient: factors };
    } else {
      const alle = (spec?.anlaesse ?? []).filter((a) => !a.nurAufWunsch).map((a) => a.id);
      if (!alle.length) break;
      const anlaesse = [...alle].sort(() => r() - 0.5).slice(0, r() < 0.7 ? 1 : 2);
      input = { teeth: {}, globals: {}, patient: { ...factors, bonusYears: 0, haertefall: false }, fach, anlaesse, med: { prices: {}, custom: [] } };
    }
    const items = buildProposal(input, DEFAULT_PRICES).filter((it) => it.options.length);
    if (!items.length) continue;
    const upgrade = r() < 0.6;
    const choices = Object.fromEntries(
      items.flatMap((it) => {
        if (it.zusatz) return upgrade && r() < 0.5 ? [[it.key, it.options[0].id]] : [];
        const alt = it.options.filter((o) => o.type !== "kasse" && o.type !== "regel");
        return [[it.key, upgrade && alt.length ? alt[Math.floor(r() * alt.length)].id : it.options[0].id]];
      }),
    );
    aus.push({ input, computed: computeProposal({ input, choices, prices: DEFAULT_PRICES, patientName: "Erika Beispiel", practiceName: praxisName, date: new Date() }) });
  }
  if (!aus.length) throw new Error(`Für das Fach ${fach} ließ sich kein Vorschlag rechnen`);
  return aus;
}

async function anlegen() {
  sperre();
  const schon = await prisma.practice.count({ where: { name: { startsWith: LASTTEST_KENNZEICHEN } } });
  if (schon) {
    console.error(`Abbruch: Es gibt schon ${schon} Praxen mit „${LASTTEST_KENNZEICHEN}“ im Namen. Bitte zuerst: npx tsx scripts/lasttest.ts loeschen`);
    process.exit(2);
  }
  const now = new Date();
  const hash = await bcrypt.hash(PASSWORT, 10);
  if (PASSWORT_DATEI) fs.writeFileSync(PASSWORT_DATEI, PASSWORT, { mode: 0o600 });
  const beginn = Date.now();
  for (let n = 1; n <= PRAXEN; n++) {
    const fach = FAECHER[(n - 1) % FAECHER.length];
    const r = rng(1000 + n);
    const name = `${LASTTEST_KENNZEICHEN} Praxis ${String(n).padStart(2, "0")}`;
    const praxis = await prisma.practice.create({ data: { name, specialty: fach } });
    const practiceId = praxis.id;
    // Ein Konto für die Messung: Mitarbeiter/in mit Freigabe für die Analyse (für Konten der Leitung wäre die Zwei-Faktor-Anmeldung Pflicht).
    const konto = await prisma.user.create({ data: { email: MAIL(n), passwordHash: hash, name: `Lasttest Konto ${n}`, role: "staff", canSeeAnalytics: true, practiceId, emailVerifiedAt: now } });
    const ort = await prisma.location.create({ data: { practiceId, name: "Hauptstandort", rooms: 3 } });

    const reihen = generatePatients(LASTTEST_UMFANG.patienten, fach, 5000 + n, now);
    const patientIds: string[] = [];
    for (const block of bloecke(reihen, 1000)) {
      const neu = await prisma.patient.createManyAndReturn({
        data: block.map((p, i) => ({
          practiceId,
          firstName: p.firstName,
          lastName: p.lastName,
          birthDate: p.birthDate,
          insuranceType: p.insuranceType,
          insuranceName: p.insuranceName,
          geschlecht: p.sex,
          patientNummer: String(10000 + patientIds.length + i),
          notes: "Belastungsprobe, erfundene Daten",
          createdAt: new Date(now.getTime() - Math.floor(r() * 4 * 365) * TAG),
        })),
        select: { id: true },
      });
      patientIds.push(...neu.map((x) => x.id));
    }
    const patient = () => patientIds[Math.floor(r() * patientIds.length)];

    // Vorschläge über zwei Jahre verteilt (die Analyse vergleicht mit dem Zeitraum davor).
    const pool = vorlagen(fach, r, name);
    const vorschlaege: Prisma.TreatmentProposalCreateManyInput[] = [];
    for (let i = 0; i < LASTTEST_UMFANG.vorschlaege; i++) {
      const v = pool[Math.floor(r() * pool.length)];
      const tageHer = Math.floor(r() * 730);
      const createdAt = new Date(now.getTime() - tageHer * TAG - Math.floor(r() * 8) * 3_600_000);
      const x = r();
      const status = tageHer < 7 ? (x < 0.55 ? "ENTWURF" : "BESPROCHEN") : tageHer < 30 ? (x < 0.4 ? "BESPROCHEN" : x < 0.75 ? "ANGENOMMEN" : "ABGELEHNT") : x < 0.55 ? "ANGENOMMEN" : x < 0.95 ? "ABGELEHNT" : "BESPROCHEN";
      const geteilt = r() < 0.55;
      const gesehen = geteilt && r() < 0.8;
      const geantwortet = gesehen && r() < 0.5;
      const shareCreatedAt = new Date(createdAt.getTime() + 3_600_000);
      vorschlaege.push({
        practiceId,
        patientId: patient(),
        authorId: konto.id,
        status,
        input: v.input as unknown as Prisma.InputJsonValue,
        createdAt,
        updatedAt: createdAt,
        ...v.computed,
        ...(geteilt && {
          shareTokenHash: crypto.randomBytes(32).toString("hex"),
          shareExpiresAt: new Date(shareCreatedAt.getTime() + 30 * TAG),
          shareCreatedAt,
          patientViewedAt: gesehen ? new Date(shareCreatedAt.getTime() + Math.floor(r() * 72) * 3_600_000) : null,
          ...(geantwortet && { patientResponse: r() < 0.6 ? "INTERESSE" : "RUECKRUF", patientChoices: v.computed.choices, patientRespondedAt: new Date(Math.min(now.getTime(), shareCreatedAt.getTime() + 2 * TAG)) }),
        }),
      });
    }
    const angenommen: { id: string; patientId: string; eigenanteilCent: number; createdAt: Date }[] = [];
    for (const block of bloecke(vorschlaege, 400)) {
      const neu = await prisma.treatmentProposal.createManyAndReturn({ data: block, select: { id: true, patientId: true, status: true, eigenanteilCent: true, createdAt: true } });
      angenommen.push(...neu.filter((x) => x.status === "ANGENOMMEN"));
    }

    // Termine: 45 Tage zurück bis 45 Tage voraus, nur werktags, zwischen 8 und 17 Uhr.
    const termine: Prisma.AppointmentCreateManyInput[] = [];
    while (termine.length < LASTTEST_UMFANG.termine) {
      const offset = Math.floor(r() * 91) - 45;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 8 + Math.floor(r() * 9), Math.floor(r() * 4) * 15);
      if (start.getDay() === 0 || start.getDay() === 6) continue;
      const x = r();
      termine.push({
        practiceId,
        patientId: patient(),
        locationId: ort.id,
        start,
        minutes: [15, 20, 30, 45][Math.floor(r() * 4)],
        reason: GRUENDE[Math.floor(r() * GRUENDE.length)],
        status: offset < 0 ? (x < 0.9 ? "ERSCHIENEN" : x < 0.96 ? "NICHT_ERSCHIENEN" : "ABGESAGT") : x < 0.4 ? "BESTAETIGT" : "GEPLANT",
      });
    }
    for (const block of bloecke(termine, 1000)) await prisma.appointment.createMany({ data: block });

    // Rechnungen: zu angenommenen Vorschlägen, sonst ohne Vorschlag; die meisten bezahlt, einige offen oder überfällig.
    const rechnungen: Prisma.InvoiceCreateManyInput[] = [];
    for (let i = 0; i < LASTTEST_UMFANG.rechnungen; i++) {
      const v = angenommen[i];
      const createdAt = v ? new Date(Math.min(now.getTime() - TAG, v.createdAt.getTime() + TAG)) : new Date(now.getTime() - Math.floor(1 + r() * 400) * TAG);
      const alter = (now.getTime() - createdAt.getTime()) / TAG;
      const x = r();
      const status = alter < 14 ? (x < 0.6 ? "OFFEN" : x < 0.75 ? "GEMELDET" : "BEZAHLT") : alter < 60 ? (x < 0.75 ? "BEZAHLT" : "OFFEN") : x < 0.96 ? "BEZAHLT" : "STORNIERT";
      rechnungen.push({
        practiceId,
        patientId: v?.patientId ?? patient(),
        proposalId: v?.id ?? null,
        number: `L-${String(i + 1).padStart(5, "0")}`,
        title: "Eigenanteil",
        amountCent: v && v.eigenanteilCent > 0 ? v.eigenanteilCent : 2000 + Math.floor(r() * 80000),
        dueDate: new Date(createdAt.getTime() + 14 * TAG),
        status,
        createdAt,
        ...(status === "GEMELDET" && { reportedPaidAt: new Date(Math.min(now.getTime(), createdAt.getTime() + 3 * TAG)) }),
        ...(status === "BEZAHLT" && { paidAt: new Date(Math.min(now.getTime(), createdAt.getTime() + Math.floor(2 + r() * 16) * TAG)) }),
      });
    }
    for (const block of bloecke(rechnungen, 1000)) await prisma.invoice.createMany({ data: block });
    if (n % 5 === 0 || n === PRAXEN) console.log(`${n} von ${PRAXEN} Praxen angelegt (${Math.round((Date.now() - beginn) / 1000)} s)`);
  }
  await prisma.$executeRawUnsafe("ANALYZE");
  const [pa, vo, te, re] = await Promise.all([
    prisma.patient.count({ where: { practice: { name: { startsWith: LASTTEST_KENNZEICHEN } } } }),
    prisma.treatmentProposal.count({ where: { practice: { name: { startsWith: LASTTEST_KENNZEICHEN } } } }),
    prisma.appointment.count({ where: { practice: { name: { startsWith: LASTTEST_KENNZEICHEN } } } }),
    prisma.invoice.count({ where: { practice: { name: { startsWith: LASTTEST_KENNZEICHEN } } } }),
  ]);
  console.log(`Angelegt: ${PRAXEN} Praxen, ${pa} Patienten, ${vo} Vorschläge, ${te} Termine, ${re} Rechnungen.`);
}

/** Anmeldung über die normale Anmelde-Schnittstelle; liefert den Cookie-Kopf der Sitzung. */
async function anmelden(email: string, passwort: string): Promise<string> {
  const glas = new Map<string, string>();
  const merken = (res: Response) => {
    for (const c of res.headers.getSetCookie()) {
      const kv = c.split(";")[0];
      const i = kv.indexOf("=");
      if (i > 0) glas.set(kv.slice(0, i), kv.slice(i + 1));
    }
  };
  const kopf = () => [...glas].map(([k, v]) => `${k}=${v}`).join("; ");
  const r1 = await fetch(`${BASIS}/api/auth/csrf`);
  merken(r1);
  const { csrfToken } = (await r1.json()) as { csrfToken: string };
  const r2 = await fetch(`${BASIS}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: kopf() },
    body: new URLSearchParams({ csrfToken, email, password: passwort, json: "true", callbackUrl: `${BASIS}/dashboard` }),
  });
  merken(r2);
  if (![...glas.keys()].some((k) => k.includes("session-token"))) throw new Error(`Anmeldung fehlgeschlagen (Status ${r2.status})`);
  return kopf();
}

async function messen() {
  sperre();
  const praxis = await prisma.practice.findFirst({ where: { name: { startsWith: LASTTEST_KENNZEICHEN } }, orderBy: { name: "asc" }, select: { id: true, name: true, specialty: true } });
  if (!praxis) {
    console.error("Keine Praxis der Belastungsprobe gefunden. Bitte zuerst: npx tsx scripts/lasttest.ts anlegen");
    process.exit(2);
  }
  // Für die Messung ein eigenes Passwort setzen (das beim Anlegen erzeugte ist nach dem Lauf nicht mehr bekannt).
  const passwort = PASSWORT_DATEI && fs.existsSync(PASSWORT_DATEI) ? fs.readFileSync(PASSWORT_DATEI, "utf8").trim() : PASSWORT;
  const konto = await prisma.user.findFirst({ where: { practiceId: praxis.id, role: "staff" }, select: { id: true, email: true } });
  if (!konto) throw new Error("Konto der Belastungsprobe fehlt");
  await prisma.user.update({ where: { id: konto.id }, data: { passwordHash: await bcrypt.hash(passwort, 10) } });
  const cookie = await anmelden(konto.email, passwort);
  const beispiel = await prisma.patient.findFirst({ where: { practiceId: praxis.id }, select: { lastName: true } });
  const q = encodeURIComponent(beispiel?.lastName ?? "Schmidt");
  // Weitere Seiten zum Mitmessen: LASTTEST_ZUSATZ="/proposals/new,/abrechnung" (Platzhalter :patient für eine Patienten-ID)
  const einPatient = await prisma.patient.findFirst({ where: { practiceId: praxis.id }, select: { id: true } });
  const zusatz = (process.env.LASTTEST_ZUSATZ ?? "").split(",").map((z) => z.trim().replace(":patient", einPatient?.id ?? "")).filter((z) => z.startsWith("/"));
  const ziele = ["/dashboard", "/patients", `/patients?q=${q}`, "/proposals", "/proposals/nachfassen", "/termine", "/zahlungen", "/analyse", "/eingang", "/vorsorge", `/api/suche?q=${q}`, ...zusatz];

  const zeilen: Messung[] = [];
  for (const ziel of ziele) {
    const zeiten: number[] = [];
    let status = 0;
    let kb = 0;
    for (let i = 0; i < 6; i++) {
      const t0 = performance.now();
      const res = await fetch(BASIS + ziel, { headers: { Cookie: cookie }, redirect: "manual" });
      const text = await res.text();
      const ms = performance.now() - t0;
      status = res.status;
      kb = Buffer.byteLength(text) / 1024;
      if (i > 0) zeiten.push(ms); // der erste Aufruf wärmt nur an
    }
    const name = ziel.replace(q, "…").replace(einPatient?.id ?? "\u0000", "<id>");
    zeilen.push({ ziel: name, status, ms: median(zeiten), kb });
    console.log(`${name.padEnd(26)} ${String(status).padStart(3)}  ${String(Math.round(median(zeiten))).padStart(6)} ms  ${String(Math.round(kb)).padStart(6)} kB`);
  }
  const tabelle = messTabelle(zeilen);
  console.log(`\nPraxis: ${praxis.name} (${praxis.specialty}), Grenze ${LASTTEST_GRENZE_MS} ms\n${tabelle}`);
  if (process.env.LASTTEST_AUSGABE) fs.writeFileSync(process.env.LASTTEST_AUSGABE, tabelle + "\n");
  const schlecht = zeilen.filter((z) => z.status !== 200);
  if (schlecht.length) console.log(`\nAchtung: ${schlecht.map((z) => `${z.ziel} (${z.status})`).join(", ")} antwortet nicht mit 200.`);
}

/** Alles löschen, was zu den Praxen der Belastungsprobe gehört. Reihenfolge ergibt sich aus Wiederholung: Tabellen, die noch gebraucht werden, kommen in der nächsten Runde dran. */
async function loeschen() {
  sperre();
  const praxen = await prisma.practice.findMany({ where: { name: { startsWith: LASTTEST_KENNZEICHEN } }, select: { id: true } });
  if (!praxen.length) {
    console.log("Nichts zu löschen.");
    return;
  }
  const ids = praxen.map((p) => p.id);
  const tabellen = (await prisma.$queryRawUnsafe<{ table_name: string }[]>(`select table_name from information_schema.columns where table_schema = current_schema() and column_name = 'practiceId' and table_name <> 'Practice'`)).map((t) => t.table_name);
  let offen = [...tabellen];
  for (let runde = 0; runde < 8 && offen.length; runde++) {
    const naechste: string[] = [];
    for (const t of offen) {
      try {
        await prisma.$executeRawUnsafe(`delete from "${t}" where "practiceId" = any($1::text[])`, ids);
      } catch {
        naechste.push(t);
      }
    }
    offen = naechste;
  }
  if (offen.length) throw new Error(`Diese Tabellen ließen sich nicht leeren: ${offen.join(", ")}`);
  await prisma.practice.deleteMany({ where: { id: { in: ids } } });
  await prisma.$executeRawUnsafe("VACUUM ANALYZE").catch(() => {});
  const rest = await prisma.practice.count({ where: { name: { startsWith: LASTTEST_KENNZEICHEN } } });
  console.log(`Gelöscht: ${ids.length} Praxen mit allen Daten. Übrig mit „${LASTTEST_KENNZEICHEN}“ im Namen: ${rest}.`);
}

(async () => {
  const was = process.argv[2] ?? "";
  if (was === "anlegen") await anlegen();
  else if (was === "messen") await messen();
  else if (was === "loeschen") await loeschen();
  else if (was === "alles") {
    await anlegen();
    try {
      await messen();
    } finally {
      await loeschen();
    }
  } else {
    console.log("Aufruf: npx tsx scripts/lasttest.ts anlegen | messen | loeschen | alles");
    process.exitCode = 1;
  }
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
