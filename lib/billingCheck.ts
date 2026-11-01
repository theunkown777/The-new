// Abrechnungsprüfung: findet, was Geld kostet, wenn es niemand bemerkt.
// 1. Leistungen ohne Abrechnung: Termin erschienen, aber keine Dokumentation;
//    Vorschlag angenommen, aber kein Eigenanteil in Rechnung gestellt.
// 2. Fehler in der Leistungserfassung: Faktor über Schwelle ohne Begründung,
//    Ausschlüsse, Häufigkeitsgrenzen. (Abhängigkeiten zwischen Positionen
//    prüft schon die Vorlage bei der Erfassung.)
// Die Prüfung ersetzt keine Abrechnungsprüfung der Praxissoftware oder der
// KZV/KV; sie fängt typische Lücken vorher ab.

import { validateFaktor, findExclusionConflicts } from "@/lib/serviceRules";
import { parseDependsOn } from "@/lib/serviceDependency";

export type BefundArt = "ohne_doku" | "ohne_rechnung" | "faktor" | "ausschluss" | "frequenz";

export interface Befund {
  art: BefundArt;
  schwere: "hoch" | "mittel";
  text: string;
  patientId: string;
  href: string;
  /** Geschätzter Betrag in Cent, falls bekannt. */
  betragCent?: number;
}

export const ART_TITEL: Record<BefundArt, string> = {
  ohne_doku: "Termin ohne Dokumentation",
  ohne_rechnung: "Angenommener Vorschlag ohne Rechnung",
  faktor: "Faktor ohne Begründung",
  ausschluss: "Positionen schließen sich aus",
  frequenz: "Häufigkeitsgrenze überschritten",
};

export interface CatalogItem {
  id: string;
  code: string;
  title: string;
  faktorMin: number | null;
  faktorMax: number | null;
  regelhoechstfaktor: number | null;
  begruendungspflichtAbFaktor: number | null;
  ausschlussMit: string | null;
  frequenzlimitAnzahl: number | null;
  frequenzlimitZeitraumTage: number | null;
}

export interface CheckInput {
  now: Date;
  appointments: { id: string; patientId: string; start: Date; status: string; reason: string }[];
  reports: {
    id: string;
    patientId: string;
    createdAt: Date;
    treatmentDate: Date | null;
    entries: { catalogItemId: string; performed: boolean; faktor: number | null; begruendung: string | null; quantity: number }[];
  }[];
  proposals: { id: string; patientId: string; status: string; eigenanteilCent: number; updatedAt: Date; invoiced: boolean }[];
  catalog: Map<string, CatalogItem>;
  patientName: Map<string, string>;
}

const DAY = 864e5;
const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

export function billingCheck(i: CheckInput): Befund[] {
  const out: Befund[] = [];
  const name = (id: string) => i.patientName.get(id) ?? "Patient";
  const datum = (r: CheckInput["reports"][number]) => r.treatmentDate ?? r.createdAt;

  // 1a. Erschienen, aber am selben Tag (±1 Tag) keine Dokumentation.
  for (const a of i.appointments) {
    if (a.status !== "ERSCHIENEN" || i.now.getTime() - a.start.getTime() < DAY / 2) continue;
    const doku = i.reports.some((r) => r.patientId === a.patientId && Math.abs(datum(r).getTime() - a.start.getTime()) <= 1.5 * DAY);
    if (!doku) {
      out.push({
        art: "ohne_doku",
        schwere: "hoch",
        text: `${name(a.patientId)} war am ${fmt(a.start)} da (${a.reason}), es gibt aber keinen Bericht mit erfassten Leistungen.`,
        patientId: a.patientId,
        href: `/abschluss/new?patientId=${a.patientId}`,
      });
    }
  }

  // 1b. Angenommen, Eigenanteil > 0, keine Rechnung.
  for (const p of i.proposals) {
    if (p.status !== "ANGENOMMEN" || p.eigenanteilCent <= 0 || p.invoiced) continue;
    out.push({
      art: "ohne_rechnung",
      schwere: "hoch",
      text: `${name(p.patientId)}: Vorschlag seit ${fmt(p.updatedAt)} angenommen, Eigenanteil noch nicht in Rechnung gestellt.`,
      patientId: p.patientId,
      href: `/proposals/${p.id}`,
      betragCent: p.eigenanteilCent,
    });
  }

  // 2. Leistungserfassung je Bericht.
  for (const r of i.reports) {
    const performed = r.entries.filter((e) => e.performed);
    const ids = performed.map((e) => e.catalogItemId);
    for (const e of performed) {
      const c = i.catalog.get(e.catalogItemId);
      if (!c) continue;
      const fehler = validateFaktor(e.faktor, e.begruendung, c, `${c.code} ${c.title}`);
      if (fehler) out.push({ art: "faktor", schwere: "mittel", text: `${name(r.patientId)}, ${fmt(datum(r))}: ${fehler}`, patientId: r.patientId, href: `/reports/${r.id}` });
    }
    const byId = new Map([...i.catalog.values()].map((c) => [c.id, { id: c.id, title: `${c.code} ${c.title}`, ausschlussMit: parseDependsOn(c.ausschlussMit) }]));
    for (const { a, b } of findExclusionConflicts(ids, byId)) {
      out.push({ art: "ausschluss", schwere: "mittel", text: `${name(r.patientId)}, ${fmt(datum(r))}: „${a.title}“ und „${b.title}“ sind nicht nebeneinander abrechenbar.`, patientId: r.patientId, href: `/reports/${r.id}` });
    }
  }

  // Häufigkeit je Patient und Position über alle Berichte im Zeitraum.
  const gemeldet = new Set<string>();
  for (const r of i.reports) {
    for (const e of r.entries.filter((x) => x.performed)) {
      const c = i.catalog.get(e.catalogItemId);
      if (!c?.frequenzlimitAnzahl || !c.frequenzlimitZeitraumTage) continue;
      const key = `${r.patientId}|${c.id}`;
      if (gemeldet.has(key)) continue;
      const seit = datum(r).getTime() - c.frequenzlimitZeitraumTage * DAY;
      const anzahl = i.reports
        .filter((x) => x.patientId === r.patientId && datum(x).getTime() > seit && datum(x).getTime() <= datum(r).getTime())
        .reduce((a, x) => a + x.entries.filter((y) => y.performed && y.catalogItemId === c.id).reduce((s, y) => s + y.quantity, 0), 0);
      if (anzahl > c.frequenzlimitAnzahl) {
        gemeldet.add(key);
        out.push({
          art: "frequenz",
          schwere: "mittel",
          text: `${name(r.patientId)}: „${c.code} ${c.title}“ ${anzahl}× in ${c.frequenzlimitZeitraumTage} Tagen, erlaubt sind ${c.frequenzlimitAnzahl}×.`,
          patientId: r.patientId,
          href: `/reports/${r.id}`,
        });
      }
    }
  }

  return out.sort((a, b) => (a.schwere === b.schwere ? 0 : a.schwere === "hoch" ? -1 : 1));
}
