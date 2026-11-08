import { prisma } from "@/lib/prisma";
import { buildGdt6310 } from "@/lib/gdtExport";

// Ergebnisse, die als GDT-Datei (6310) in die Arzt-Praxissoftware zurückgehen:
// freigegebene Berichte und angenommene Vorschläge von Patienten, die aus der
// Praxissoftware geöffnet wurden (nur dann kennt Sorrida deren Patientennummer).

export type GdtArt = "bericht" | "vorschlag";
export type GdtErgebnis = { art: GdtArt; refId: string; dateiname: string; inhalt: string; zeit: Date };
type Fehler = { fehler: string; status: number };

const patSel = { select: { id: true, firstName: true, lastName: true, birthDate: true, externalSource: true, externalId: true } } as const;

/** Kennung, unter der die Praxissoftware Sorrida führt (zuletzt vom Connector gemeldet). */
async function sorridaKennung(practiceId: string, keyKennung?: string | null) {
  if (keyKennung) return keyKennung;
  const k = await prisma.connectorKey.findFirst({ where: { practiceId, revokedAt: null, gdtKennung: { not: null } }, orderBy: { lastUsedAt: "desc" }, select: { gdtKennung: true } });
  return k?.gdtKennung ?? undefined;
}

export async function gdtErgebnis(practiceId: string, art: GdtArt, id: string, keyKennung?: string | null): Promise<GdtErgebnis | Fehler> {
  let patient, titel: string, text: string, datum: Date;
  if (art === "bericht") {
    const r = await prisma.report.findFirst({ where: { id, practiceId }, include: { patient: patSel } });
    if (!r) return { fehler: "Bericht nicht gefunden", status: 404 };
    if (r.status !== "FINAL") return { fehler: "Nur freigegebene Berichte gehen an die Praxissoftware.", status: 409 };
    patient = r.patient;
    titel = r.type === "KRANKENKASSE" ? "Schreiben an die Krankenkasse (Sorrida)" : "Befundbericht (Sorrida)";
    text = `${r.editedText ?? r.generatedText ?? ""}\n\nFreigegeben von ${r.approvedByName ?? "unbekannt"}${r.approvedAt ? ` am ${r.approvedAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}` : ""}.`;
    datum = r.treatmentDate ?? r.createdAt;
  } else {
    const p = await prisma.treatmentProposal.findFirst({ where: { id, practiceId }, include: { patient: patSel } });
    if (!p) return { fehler: "Vorschlag nicht gefunden", status: 404 };
    if (p.status !== "ANGENOMMEN") return { fehler: "Nur angenommene Vorschläge gehen an die Praxissoftware.", status: 409 };
    patient = p.patient;
    titel = "Behandlungsvereinbarung (Sorrida)";
    const eur = (c: number) => (c / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " EUR";
    text = [
      `Behandlungsvorschlag vom ${p.createdAt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} vom Patienten angenommen.`,
      `Eigenanteil: ${eur(p.eigenanteilCent)}.`,
      p.agreedAt ? `Vereinbarung digital unterschrieben am ${p.agreedAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}; PDF in Sorrida.` : "Keine digitale Unterschrift in Sorrida.",
    ].join("\n");
    datum = p.agreedAt ?? p.updatedAt;
  }
  if (!patient.externalId) {
    return { fehler: "Dieser Patient wurde nicht aus der Praxissoftware geöffnet; Sorrida kennt seine Patientennummer dort nicht. Bitte einmal aus der Praxissoftware heraus öffnen.", status: 409 };
  }
  const receiver = (patient.externalSource ?? "").replace(/^GDT-/, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 8) || "PVS";
  const inhalt = buildGdt6310({ patId: patient.externalId, lastName: patient.lastName, firstName: patient.firstName, birthDate: patient.birthDate, receiver, sender: await sorridaKennung(practiceId, keyKennung), datum, titel, text });
  const nr = patient.externalId.replace(/[^A-Za-z0-9]/g, "");
  return { art, refId: id, dateiname: `SORRIDA_${nr}_${art === "bericht" ? "B" : "V"}${id.slice(-6)}.gdt`, inhalt, zeit: datum };
}

export const RESERVIERUNG_MS = 5 * 60_000;
const MAX_JE_ABRUF = 20;

/**
 * Offene Ergebnisse für den Rückweg reservieren. Berücksichtigt wird nur, was nach dem Einrichten
 * des ersten Connectors der Praxis freigegeben wurde, damit kein alter Bestand auf einmal ankommt.
 * Jedes Ergebnis wird genau einmal geliefert; eine Reservierung ohne Bestätigung wird nach 5 Minuten frei.
 */
export async function offeneErgebnisseReservieren(practiceId: string, keyId: string, keyKennung: string | null, jetzt = new Date()): Promise<GdtErgebnis[]> {
  const ersterKey = await prisma.connectorKey.findFirst({ where: { practiceId }, orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  if (!ersterKey) return [];
  const ab = ersterKey.createdAt;
  const gdtPatient = { externalSource: { startsWith: "GDT-" }, externalId: { not: null } };
  const [berichte, vorschlaege, vorhanden] = await Promise.all([
    prisma.report.findMany({ where: { practiceId, status: "FINAL", approvedAt: { gte: ab }, patient: gdtPatient }, select: { id: true, approvedAt: true }, orderBy: { approvedAt: "asc" }, take: 200 }),
    prisma.treatmentProposal.findMany({ where: { practiceId, status: "ANGENOMMEN", updatedAt: { gte: ab }, patient: gdtPatient }, select: { id: true, agreedAt: true, updatedAt: true }, orderBy: { updatedAt: "asc" }, take: 200 }),
    prisma.gdtAuslieferung.findMany({ where: { practiceId }, select: { art: true, refId: true, geliefertAt: true, reserviertAt: true } }),
  ]);
  const frei = new Date(jetzt.getTime() - RESERVIERUNG_MS);
  const belegt = new Set(vorhanden.filter((v) => v.geliefertAt || v.reserviertAt > frei).map((v) => `${v.art}:${v.refId}`));
  const kandidaten = [
    ...berichte.map((b) => ({ art: "bericht" as const, refId: b.id, zeit: b.approvedAt! })),
    ...vorschlaege.map((v) => ({ art: "vorschlag" as const, refId: v.id, zeit: v.agreedAt ?? v.updatedAt })),
  ].filter((k) => !belegt.has(`${k.art}:${k.refId}`)).sort((a, b) => a.zeit.getTime() - b.zeit.getTime()).slice(0, MAX_JE_ABRUF);

  const out: GdtErgebnis[] = [];
  for (const k of kandidaten) {
    // Reservieren: neu anlegen oder eine abgelaufene, unbestätigte Reservierung übernehmen.
    let meins = false;
    try {
      await prisma.gdtAuslieferung.create({ data: { practiceId, art: k.art, refId: k.refId, keyId, reserviertAt: jetzt } });
      meins = true;
    } catch {
      const r = await prisma.gdtAuslieferung.updateMany({ where: { art: k.art, refId: k.refId, practiceId, geliefertAt: null, reserviertAt: { lte: frei } }, data: { keyId, reserviertAt: jetzt } });
      meins = r.count === 1;
    }
    if (!meins) continue;
    const e = await gdtErgebnis(practiceId, k.art, k.refId, keyKennung);
    if ("fehler" in e) continue;
    out.push(e);
  }
  return out;
}

/** Vom Connector bestätigt: Datei liegt im Importordner. Nur eigene Reservierungen zählen. */
export async function lieferungBestaetigen(practiceId: string, keyId: string, eintraege: { art: string; refId: string }[]) {
  let n = 0;
  for (const e of eintraege.slice(0, 50)) {
    const r = await prisma.gdtAuslieferung.updateMany({ where: { practiceId, art: e.art, refId: e.refId, keyId, geliefertAt: null }, data: { geliefertAt: new Date(), weg: "connector" } });
    n += r.count;
  }
  return n;
}

/** Von Hand heruntergeladen: zählt als geliefert, damit der Connector dieselbe Datei nicht noch einmal ablegt. */
export async function alsHeruntergeladenMerken(practiceId: string, art: GdtArt, refId: string) {
  await prisma.gdtAuslieferung.upsert({
    where: { art_refId: { art, refId } },
    create: { practiceId, art, refId, geliefertAt: new Date(), weg: "download" },
    update: {},
  }).catch(() => undefined);
}
