// Führung im Gastzugang: drei Schritte zum Mitklicken. Der Stand gilt nur für diesen Tab (sessionStorage),
// es wird nichts an den Server geschickt. Reine Logik, damit sie prüfbar bleibt (lib/demoFuehrung.test.ts).

export const FUEHRUNG_SCHLUESSEL = "sorrida-demo-fuehrung";

export type FuehrungSchritt = 1 | 2 | 3;

export interface FuehrungZustand {
  /** Abgeschlossene Schritte. */
  erledigt: FuehrungSchritt[];
  /** Die Seite „Vorschlag anlegen“ war in diesem Tab offen. */
  warNeu: boolean;
  /** Die Leiste wurde weggeklickt. */
  zu: boolean;
}

export const FUEHRUNG_SCHRITTE: { nr: FuehrungSchritt; text: string; href: string | null }[] = [
  { nr: 1, text: "Vorschlag anlegen", href: "/proposals/new" },
  // Schritt 2 öffnet die Patientenansicht eines Beispielpatienten in einem neuen Tab (Knopf, kein fester Link).
  { nr: 2, text: "Patientenansicht öffnen", href: null },
  { nr: 3, text: "Rückmeldung im Eingang sehen", href: "/eingang" },
];

export const FUEHRUNG_LEER: FuehrungZustand = { erledigt: [], warNeu: false, zu: false };

/** Gespeicherten Stand lesen; Unlesbares zählt als Neuanfang. */
export function fuehrungLesen(roh: string | null | undefined): FuehrungZustand {
  if (!roh) return FUEHRUNG_LEER;
  try {
    const d = JSON.parse(roh) as Partial<FuehrungZustand> | null;
    if (!d || typeof d !== "object") return FUEHRUNG_LEER;
    const erledigt = Array.isArray(d.erledigt) ? ([1, 2, 3] as FuehrungSchritt[]).filter((n) => (d.erledigt as unknown[]).includes(n)) : [];
    return { erledigt, warNeu: d.warNeu === true, zu: d.zu === true };
  } catch {
    return FUEHRUNG_LEER;
  }
}

const mit = (z: FuehrungZustand, nr: FuehrungSchritt): FuehrungZustand =>
  z.erledigt.includes(nr) ? z : { ...z, erledigt: [...z.erledigt, nr].sort((a, b) => a - b) as FuehrungSchritt[] };

/** Seite eines einzelnen Vorschlags (nicht „neu“, nicht die Listen). */
const istVorschlag = (pfad: string) => /^\/proposals\/(?!new$|schnell$|nachfassen$)[^/]+$/.test(pfad);

/** Schritt als erledigt vermerken (z. B. nach dem Klick auf „Patientenansicht öffnen“). */
export const fuehrungErledigt = (z: FuehrungZustand, nr: FuehrungSchritt): FuehrungZustand => mit(z, nr);

/** Was sich aus der gerade offenen Seite ergibt. */
export function fuehrungNachSeite(z: FuehrungZustand, pfad: string): FuehrungZustand {
  if (pfad === "/proposals/new") return z.warNeu ? z : { ...z, warNeu: true };
  // Nach dem Speichern landet man auf der Seite des neuen Vorschlags: Schritt 1 ist geschafft.
  if (istVorschlag(pfad) && z.warNeu) return mit(z, 1);
  if (pfad === "/eingang" || pfad.startsWith("/eingang/")) return mit(z, 3);
  return z;
}

/** Der aktuelle Schritt: zuerst nach der Seite, sonst der erste offene. Null, wenn alles erledigt ist. */
export function fuehrungAktuell(z: FuehrungZustand, pfad: string): FuehrungSchritt | null {
  if (fuehrungFertig(z)) return null;
  if (pfad === "/proposals/new") return 1;
  if (istVorschlag(pfad) && !z.erledigt.includes(2)) return 2;
  if (pfad === "/eingang" || pfad.startsWith("/eingang/")) return ([1, 2] as FuehrungSchritt[]).find((n) => !z.erledigt.includes(n)) ?? null;
  return ([1, 2, 3] as FuehrungSchritt[]).find((n) => !z.erledigt.includes(n)) ?? null;
}

export const fuehrungFertig = (z: FuehrungZustand) => [1, 2, 3].every((n) => z.erledigt.includes(n as FuehrungSchritt));
