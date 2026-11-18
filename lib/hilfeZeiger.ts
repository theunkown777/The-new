// „Zeig mir wo“: reine Logik ohne Browser, damit sie getestet werden kann. components/HilfeZeiger.tsx führt aus:
// Seite öffnen, auf das Element warten, aufklappen, scrollen, Fokus setzen, markieren.
//
// Die Seite geht nie mit IDs weiter: seitenMuster macht aus /patients/clx… ein /patients/…, und der Titel einer Seite
// kommt nur aus der festen Liste SEITEN_TITEL. So landen keine Kennungen im Text an die KI.

import { browserOrtBereinigen } from "@/lib/fehlerlog";
import { ankerInfo, ankerSelektor, istMenueAnker, menueAnker, menueFuer, MENUE_ZIELE } from "@/lib/hilfeAnker";
import type { HilfeEintrag } from "@/lib/hilfeWissen/typ";
import type { MenueRechte } from "@/lib/rollen";

/** Ereignis an components/HilfeZeiger.tsx (detail: ZeigAuftrag). Nach dem Muster von MENUE_UMSCHALTEN. */
export const HILFE_ZEIGEN = "sorrida:hilfe-zeigen";

/** Wie lange der Zeiger auf das Element wartet. */
export const ZEIGER_WARTEN_MS = 3000;
/** Wie lange die Markierung stehen bleibt. */
export const ZEIGER_MARKIERUNG_MS = 8000;

/** Pfad ohne Kennungen: nur feste Seitennamen bleiben, alles andere wird zu „…“ (wie im Fehlerprotokoll). */
export const seitenMuster = (pfad: string): string => browserOrtBereinigen(pfad);

/**
 * Alle Seiten der App mit Titel und, falls nötig, dem Recht, das man dafür braucht. lib/hilfeZeiger.test.ts prüft,
 * dass jede Seite unter app/(app) hier steht und umgekehrt.
 */
export const SEITEN_TITEL: Record<string, { titel: string; recht?: keyof MenueRechte; nurZahn?: boolean }> = {
  "/dashboard": { titel: "Übersicht" },
  "/eingang": { titel: "Eingang" },
  "/mein-bereich": { titel: "Mein Bereich" },
  "/termine": { titel: "Termine" },
  "/praxismanager": { titel: "Praxismanager" },
  "/vorsorge": { titel: "Vorsorge fällig" },
  "/empfang": { titel: "Empfang" },
  "/patients": { titel: "{P} und Wege" },
  "/patients/new": { titel: "{P}: neu anlegen" },
  "/patients/import": { titel: "{P}: Liste einlesen", recht: "import" },
  "/patients/[id]": { titel: "Akte" },
  "/abschluss/new": { titel: "{A} abschließen" },
  "/abschluss/[reportId]": { titel: "{A} abgeschlossen" },
  "/proposals": { titel: "Vorschläge" },
  "/proposals/new": { titel: "Neuer Vorschlag" },
  "/proposals/schnell": { titel: "Schnellvorschlag ohne Akte" },
  "/proposals/nachfassen": { titel: "Nachfassen" },
  "/proposals/[id]": { titel: "Vorschlag" },
  "/reports": { titel: "Berichte" },
  "/reports/new": { titel: "Neuer Bericht" },
  "/reports/[id]": { titel: "Bericht" },
  "/zahlungen": { titel: "Zahlungen", recht: "zahlungen" },
  "/abrechnung": { titel: "Abrechnung" },
  "/abrechnungspruefung": { titel: "Abrechnungsprüfung" },
  "/analyse": { titel: "Analyse", recht: "analyse" },
  "/analyse/wirkung": { titel: "Wirkungsbericht", recht: "analyse" },
  "/leistungsverzeichnis": { titel: "Leistungsverzeichnis" },
  "/modelle": { titel: "Modelle" },
  "/hilfe-praxis": { titel: "Frag Sorrida" },
  "/anfragen": { titel: "Anfragen (Team)" },
  "/betrieb": { titel: "Betrieb (Team)" },
  "/settings": { titel: "Einstellungen" },
  "/settings/praxis": { titel: "Angaben der Praxis", recht: "einstellungen" },
  "/settings/fachgebiet": { titel: "Fachgebiet und Leistungen", recht: "einstellungen" },
  "/settings/fachgebiet/preisliste": { titel: "Preisliste einlesen", recht: "einstellungen" },
  "/settings/proposals": { titel: "Vorschlagspreise", recht: "einstellungen", nurZahn: true },
  "/settings/billing": { titel: "Abrechnung (Punktwerte)", recht: "einstellungen", nurZahn: true },
  "/settings/catalog": { titel: "Katalog", recht: "einstellungen" },
  "/settings/templates": { titel: "Vorlagen", recht: "einstellungen" },
  "/settings/templates/[id]": { titel: "Vorlage", recht: "einstellungen" },
  "/settings/connector": { titel: "Praxissoftware", recht: "einstellungen" },
  "/settings/empfang": { titel: "Empfang (PIN)", recht: "einstellungen" },
  "/settings/security": { titel: "Sicherheit" },
  "/settings/lexikon": { titel: "Leistungslexikon" },
  "/settings/termine": { titel: "Online-Termine und Kalender", recht: "einstellungen" },
  "/settings/standorte": { titel: "Standorte", recht: "einstellungen" },
  "/settings/protokoll": { titel: "Protokoll und Datenschutz", recht: "team" },
  "/settings/rueckmeldung": { titel: "Rückmeldung nach dem Termin", recht: "einstellungen" },
  "/settings/team": { titel: "Team", recht: "team" },
};

/** Schlüssel in SEITEN_TITEL zu einem echten Pfad (oder null). */
export function seitenSchluessel(pfad: string): string | null {
  const teile = (pfad.split(/[?#]/)[0].replace(/\/+$/, "") || "/").split("/");
  for (const s of Object.keys(SEITEN_TITEL)) {
    const m = s.split("/");
    if (m.length === teile.length && m.every((t, i) => (/^\[[^\]]+\]$/.test(t) ? teile[i].length > 0 : t === teile[i]))) {
      // Feste Teile gehen vor: /proposals/new ist nicht /proposals/[id].
      const fest = Object.keys(SEITEN_TITEL).find((x) => x === teile.join("/"));
      return fest ?? s;
    }
  }
  return null;
}

/** Titel der Seite für Anzeige und KI-Kontext; nur aus der festen Liste, nie aus dem Pfad selbst. */
export function seitenTitel(pfad: string, w: { personPl?: string; abschluss?: string } = {}): string | null {
  const s = seitenSchluessel(pfad);
  if (!s) return null;
  return SEITEN_TITEL[s].titel.replace("{P}", w.personPl ?? "Patienten").replace("{A}", w.abschluss ?? "Behandlung");
}

/** Darf dieses Konto die Seite öffnen? Unbekannte Seiten (Website, Hilfe) gelten als erlaubt. */
export function seiteErlaubt(href: string, k: { rechte?: MenueRechte; fach?: "zahn" | "andere" } = {}): boolean {
  const s = seitenSchluessel(href);
  if (!s) return true;
  const info = SEITEN_TITEL[s];
  if (info.nurZahn && k.fach === "andere") return false;
  return !info.recht || !k.rechte || k.rechte[info.recht];
}

export interface ZeigAuftrag {
  /** Seite, die geöffnet wird (bei gleicher Seite: die aktuelle). */
  href: string;
  /** Anker-Schlüssel (lib/hilfeAnker.ts) */
  anker: string;
  /** CSS-Selektor für das Element */
  selektor: string;
  /** Name des Elements für Menschen */
  name: string;
  /** Menüpfad als Text, falls das Element nicht sichtbar ist */
  pfad: string;
  /** Element steht im Menü (Seitenleiste oder Handy-Menü) */
  menue: boolean;
  /** Das Element liegt auf der gerade geöffneten Seite: nichts öffnen, nur suchen. */
  gleicheSeite: boolean;
}

/**
 * Ziel für „Zeig mir wo“ zu einem Eintrag. Kommt aus dem Eintrag, nie aus einer KI-Antwort.
 * - Eigener Anker: dessen Seite. Liegt der Anker auf einer Seite mit Kennung (/patients/[id]), nur wenn diese Seite
 *   gerade offen ist; sonst der Menüpunkt der Seite des Eintrags.
 * - Ohne Anker: der Menüpunkt, unter dem die Seite des Eintrags liegt.
 * - null: Das Konto darf die Seite nicht öffnen, oder es gibt nichts zu zeigen.
 */
export function zeigZiel(e: Pick<HilfeEintrag, "anker" | "href" | "pfad">, k: { pfad: string; rechte?: MenueRechte; fach?: "zahn" | "andere" }): ZeigAuftrag | null {
  const mitAbfrage = k.pfad.split("#")[0];
  const aktuell = mitAbfrage.split("?")[0];
  const info = e.anker ? ankerInfo(e.anker) : null;
  if (e.anker && info) {
    let ziel: string | null;
    if (info.ueberall) ziel = mitAbfrage;
    else if (/^praxismanager(-knopf)?:/.test(e.anker)) ziel = `/praxismanager?thema=${e.anker.slice(e.anker.indexOf(":") + 1)}`;
    else if (/\[[^\]]+\]/.test(info.seite)) ziel = musterPasst(aktuell, info.seite) ? mitAbfrage : null;
    else ziel = info.seite;
    if (ziel !== null) {
      if (!seiteErlaubt(ziel, k)) return null;
      const gleicheSeite = info.ueberall || ziel === mitAbfrage || (!ziel.includes("?") && musterPasst(aktuell, ziel));
      return { href: gleicheSeite ? mitAbfrage : ziel, anker: e.anker, selektor: ankerSelektor(e.anker), name: info.name, pfad: e.pfad, menue: istMenueAnker(e.anker) || !!info.imMenue, gleicheSeite };
    }
  }
  const href = e.href.split("#")[0];
  if (!seiteErlaubt(href, k)) return null;
  const menue = menueFuer(href);
  if (!menue) return null;
  const anker = menueAnker(menue);
  return {
    href,
    anker,
    selektor: ankerSelektor(anker),
    name: `Menüpunkt „${MENUE_ZIELE[menue]}“`,
    pfad: e.pfad,
    menue: true,
    gleicheSeite: musterPasst(aktuell, href.split("?")[0]),
  };
}

function musterPasst(pfad: string, muster: string): boolean {
  const p = (pfad.replace(/\/+$/, "") || "/").split("/");
  const m = (muster.replace(/\/+$/, "") || "/").split("/");
  return p.length === m.length && m.every((t, i) => (/^\[[^\]]+\]$/.test(t) ? p[i].length > 0 : t === p[i]));
}

/** Ab diesem Anteil der Fensterhöhe gilt ein Ziel als hoch: Dann zeigt der Zeiger seinen Anfang statt der Mitte. */
export const ZIEL_HOCH_ANTEIL = 0.8;

/**
 * Wohin „Zeig mir wo“ scrollt: kleine Ziele in die Mitte, hohe Ziele (z. B. ein ganzer Abschnitt am Handy) mit dem
 * Anfang nach oben. Sonst sähe man nur die Mitte des Abschnitts, ohne Überschrift. Den Abstand zum oberen Rand
 * gibt scroll-margin von .hilfe-ziel (app/globals.css).
 */
export function zielBlock(zielHoehe: number, fensterHoehe: number): "center" | "start" {
  return fensterHoehe > 0 && zielHoehe > fensterHoehe * ZIEL_HOCH_ANTEIL ? "start" : "center";
}

/** Aus mehreren Kandidaten das sichtbare Element wählen (Seitenleiste am Desktop, untere Leiste oder Menü am Handy). */
export function ankerWaehlen<T extends { sichtbar: boolean }>(kandidaten: T[]): T | null {
  return kandidaten.find((k) => k.sichtbar) ?? null;
}

/** Ordner unter app/(app): Seiten der angemeldeten App (lib/hilfeZeiger.test.ts prüft die Liste). */
export const APP_BEREICHE = [
  "abrechnung", "abrechnungspruefung", "abschluss", "analyse", "anfragen", "betrieb", "dashboard", "eingang", "empfang", "hilfe-praxis",
  "leistungsverzeichnis", "mein-bereich", "modelle", "patients", "praxismanager", "proposals", "reports", "settings", "termine", "vorsorge", "zahlungen",
] as const;

/** Seiten ohne Frag Sorrida auf der Website: Patientenseiten, Links mit Token, Demnächst-Seite, eingebettete Fenster. */
const OHNE_WEBSITE_HILFE = ["p", "portal", "a", "t", "demnaechst", "embed", "uebergabe", "api", "website"];

/** Erste Pfadstufe ohne Abfrage und Sprungmarke. */
const ersteStufe = (pfad: string) => (pfad.split(/[?#]/)[0].split("/").filter(Boolean)[0] ?? "");

/** Frag Sorrida im Modus „website“: öffentliche Seiten, nicht die App und nicht die Seiten für Patienten. */
export function websiteChatErlaubt(pfad: string): boolean {
  const s = ersteStufe(pfad);
  return !OHNE_WEBSITE_HILFE.includes(s) && !(APP_BEREICHE as readonly string[]).includes(s);
}

/** Frag Sorrida in der App: überall außer am Tablet im Wartezimmer (/empfang), das Patienten in der Hand halten. */
export function appChatErlaubt(pfad: string): boolean {
  return ersteStufe(pfad) !== "empfang";
}
