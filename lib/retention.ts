// Löschen von Patientendaten (Art. 17 DSGVO) gegen die Aufbewahrungspflicht
// abwägen: Die Behandlungsdokumentation ist nach § 630f Abs. 3 BGB zehn Jahre
// nach Abschluss der Behandlung aufzubewahren, Rechnungen unterliegen
// steuerlichen Aufbewahrungsfristen. Sorrida löscht deshalb nur, wenn
// a) zu dem Patienten nichts dokumentiert ist (z. B. versehentlich angelegt)
// oder b) die letzte Dokumentation älter als zehn Jahre ist.
// Rechtlich verbindlich ist das nicht; die Praxis entscheidet und trägt die
// Verantwortung. Die Regel verhindert nur das versehentliche Löschen.

export const AUFBEWAHRUNG_JAHRE = 10;

export interface PatientRecordDates {
  reports: Date[];
  proposals: Date[];
  anamnesis: Date[];
  invoices: Date[];
}

export type DeletionCheck =
  | { allowed: true; reason: "leer" | "frist_abgelaufen" }
  | { allowed: false; reason: "aufbewahrung"; until: Date; counts: Record<keyof PatientRecordDates, number> };

export function deletionCheck(d: PatientRecordDates, now = new Date()): DeletionCheck {
  const all = [...d.reports, ...d.proposals, ...d.anamnesis, ...d.invoices];
  if (all.length === 0) return { allowed: true, reason: "leer" };
  const last = new Date(Math.max(...all.map((x) => x.getTime())));
  const until = new Date(last);
  until.setFullYear(until.getFullYear() + AUFBEWAHRUNG_JAHRE);
  if (until <= now) return { allowed: true, reason: "frist_abgelaufen" };
  return {
    allowed: false,
    reason: "aufbewahrung",
    until,
    counts: { reports: d.reports.length, proposals: d.proposals.length, anamnesis: d.anamnesis.length, invoices: d.invoices.length },
  };
}
