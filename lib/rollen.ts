// Rollen und Rechte der Praxiskonten. Reine Logik ohne Datenbank, damit die
// Matrix (Rolle × Aktion) vollständig getestet werden kann. Die Prüfung mit
// Sitzung und Datenbank steht in lib/permissions.ts.
//
// - admin:     Geschäftsführung / Praxisleitung, darf alles.
// - staff:     Mitarbeiter/in (Rezeption, Verwaltung): Tagesarbeit und Zahlungen,
//              Einstellungen nur lesen, Analyse nur mit Freigabe.
// - behandler: Ärztin, Arzt, Therapeutin, Therapeut ohne Verwaltungsaufgaben:
//              Tagesarbeit am Patienten, eigenes Konto. Keine Einstellungen der
//              Praxis, kein Team; Zahlungen und Analyse nur mit Freigabe.

export const ROLLEN = ["admin", "staff", "behandler"] as const;
export type Rolle = (typeof ROLLEN)[number];

export const ROLLEN_LABEL: Record<Rolle, string> = {
  admin: "Geschäftsführung",
  staff: "Mitarbeiter/in",
  behandler: "Behandler/in",
};

/** Ein Satz je Rolle für die Team-Einstellungen. */
export const ROLLEN_HINWEIS: Record<Rolle, string> = {
  admin: "Alles: Einstellungen, Team, Zahlungen, Analyse.",
  staff: "Tagesarbeit und Zahlungen. Einstellungen nur lesen. Analyse nur mit Freigabe.",
  behandler: "Behandelt und berät: Patienten, Vorschläge, Berichte, Termine, Modelle, Mein Bereich. Keine Einstellungen der Praxis. Zahlungen und Analyse nur mit Freigabe.",
};

export const AKTIONEN = [
  "patienten",
  "vorschlaege",
  "berichte",
  "termine",
  "modelle",
  "meinBereich",
  /** Eigenes Konto: Passwort, Zwei-Faktor-Anmeldung */
  "konto",
  "zahlungen",
  "analyse",
  /** Einstellungen der Praxis ansehen (Katalog, Vorlagen, Preise …) */
  "einstellungen.ansehen",
  /** Einstellungen der Praxis ändern */
  "einstellungen.aendern",
  "team",
  "protokoll",
  "standorte.verwalten",
  "patienten.import",
] as const;
export type Aktion = (typeof AKTIONEN)[number];

const ALLTAG: ReadonlySet<Aktion> = new Set(["patienten", "vorschlaege", "berichte", "termine", "modelle", "meinBereich", "konto"]);
const NUR_LEITUNG: ReadonlySet<Aktion> = new Set(["einstellungen.aendern", "team", "protokoll", "standorte.verwalten", "patienten.import"]);

export const istRolle = (r: unknown): r is Rolle => typeof r === "string" && (ROLLEN as readonly string[]).includes(r);

/** Unbekannte Rollen bekommen die engste Rolle, nie mehr. */
export const rolleVon = (r: unknown): Rolle => (istRolle(r) ? r : "behandler");

export const rollenLabel = (r: unknown): string => ROLLEN_LABEL[rolleVon(r)];

/**
 * Darf diese Rolle die Aktion ausführen?
 * `freigabe`: der Schalter „freigeben“ in Einstellungen → Team (User.canSeeAnalytics).
 * Er öffnet Mitarbeitenden die Analyse und Behandlern Zahlungen und Analyse.
 */
export function darf(rolle: unknown, aktion: Aktion, opt: { freigabe?: boolean } = {}): boolean {
  const r = rolleVon(rolle);
  if (r === "admin") return true;
  if (ALLTAG.has(aktion)) return true;
  if (NUR_LEITUNG.has(aktion)) return false;
  if (aktion === "analyse") return !!opt.freigabe;
  if (aktion === "zahlungen") return r === "staff" || !!opt.freigabe;
  if (aktion === "einstellungen.ansehen") return r === "staff";
  return false;
}

/** Was das Menü zeigen soll (Seitenleiste, Handy-Menü, Suche). */
export function menueRechte(rolle: unknown, freigabe = false) {
  return {
    zahlungen: darf(rolle, "zahlungen", { freigabe }),
    analyse: darf(rolle, "analyse", { freigabe }),
    einstellungen: darf(rolle, "einstellungen.ansehen", { freigabe }),
    team: darf(rolle, "team", { freigabe }),
    import: darf(rolle, "patienten.import", { freigabe }),
  };
}
export type MenueRechte = ReturnType<typeof menueRechte>;

/** Wie die Freigabe in den Team-Einstellungen heißt (je Rolle öffnet sie anderes). */
export const freigabeLabel = (rolle: unknown): string | null => {
  const r = rolleVon(rolle);
  if (r === "admin") return null;
  return r === "behandler" ? "Zahlungen und Analyse freigeben" : "Analyse freigeben";
};
