// Löschkonzept als Code: Welche Daten Sorrida nach welcher Frist selbst
// löscht. Behandlungsdokumentation, Rechnungen und Akte löscht Sorrida NICHT
// automatisch; dafür gilt lib/retention.ts (Löschen nur nach Ablauf der
// Aufbewahrungsfrist und nur durch einen Admin). Die Fristen sind Vorschläge
// und von der Praxis bzw. ihrem Datenschutzbeauftragten zu bestätigen.

const DAY = 864e5;

export const LOESCHFRISTEN = [
  { id: "token", daten: "Abgelaufene Einmal-Links (Passwort, E-Mail-Bestätigung, Einladung, PVS-Aufruf)", frist: "30 Tage nach Ablauf", tage: 30, grund: "Nur technisch nötig, danach ohne Zweck" },
  { id: "portal", daten: "Abgelaufene Portal-Zugänge (gehashter Code)", frist: "30 Tage nach Ablauf", tage: 30, grund: "Zugang ist ohnehin ungültig" },
  { id: "anamnese", daten: "Anamnesebögen, die nie ausgefüllt wurden", frist: "90 Tage nach Ablauf", tage: 90, grund: "Enthalten keine Antworten, nur die Einladung" },
  // 360 statt 365 Tage: Der Lauf kommt einmal in der Nacht. So ist jede Anfrage sicher vor Ablauf von 12 Monaten gelöscht,
  // wie es die Datenschutzerklärung zusagt (app/datenschutz/page.tsx, Abschnitt 4).
  { id: "anfragen", daten: "Anfragen über die Website (Pilot, Hilfe), offen oder erledigt", frist: "spätestens 12 Monate nach Eingang", tage: 360, grund: "Vertriebs- und Supportkontakt; so steht es in der Datenschutzerklärung" },
  { id: "protokoll", daten: "Protokolleinträge", frist: "3 Jahre", tage: 3 * 365, grund: "Nachweis nach Art. 5 Abs. 2 und Art. 32 DSGVO, regelmäßige Verjährung (§ 195 BGB)" },
  { id: "terminanfrage", daten: "Online-Anfragen neuer Patienten, die nicht bestätigt wurden (offen oder abgelehnt); bei bestätigten die Kopie der Anmeldedaten", frist: "30 Tage nach Eingang bzw. Bestätigung", tage: 30, grund: "Nur für die Terminvergabe erhoben; nach der Bestätigung stehen die Daten in Akte und Termin" },
  { id: "warteliste", daten: "Erledigte Einträge der Warteliste", frist: "30 Tage nach Erledigung", tage: 30, grund: "Wunsch ist erfüllt oder zurückgezogen" },
  { id: "demo", daten: "Demo-Praxen (erfundene Daten)", frist: "nach 24 Stunden", tage: 1, grund: "Gastzugang" },
] as const;

export type FristId = (typeof LOESCHFRISTEN)[number]["id"];

/** Stichtag: Alles, was vor diesem Zeitpunkt abgelaufen bzw. entstanden ist, wird gelöscht. */
export function stichtag(id: FristId, now = new Date()): Date {
  const f = LOESCHFRISTEN.find((x) => x.id === id)!;
  return new Date(now.getTime() - f.tage * DAY);
}

/**
 * Welche Anfragen der Website zu löschen sind: jede, deren Eingang länger zurückliegt als die Frist.
 * Ob sie erledigt ist, spielt keine Rolle (früher wurden nur erledigte gelöscht, offene nie).
 */
export const anfragenFaellig = (now = new Date()) => ({ createdAt: { lt: stichtag("anfragen", now) } });

export const NICHT_AUTOMATISCH = [
  "Berichte, Vorschläge, Einverständnisse, ausgefüllte Anamnesen, Akte und Dokumente: 10 Jahre nach letzter Behandlung (§ 630f Abs. 3 BGB), Löschen nur durch Admin nach Fristablauf",
  "Rechnungen: steuerliche Aufbewahrungsfristen (Abgabenordnung, HGB)",
  "Termine: gehören zur Behandlungsdokumentation, gelöscht mit dem Patienten",
  "Benutzerkonten: bis die Praxis sie entfernt; bei Vertragsende nach Rückgabe der Daten (Gesamtexport) gemäß AVV",
];
