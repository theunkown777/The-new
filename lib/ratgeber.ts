// Ratgeber-Artikel der öffentlichen Website. Inhalte stehen in den Seiten
// unter app/ratgeber/*; hier nur die Liste für Übersicht, Sitemap und Links.
export const RATGEBER = [
  {
    slug: "festzuschuss-2027",
    title: "Festzuschuss 2027: Was die Kürzung für Praxis und Patienten bedeutet",
    description:
      "Ab 1. Januar 2027 sinken die Festzuschüsse für Zahnersatz. Was zählt, ist das Bewilligungsdatum des Heil- und Kostenplans. Mit Rechenbeispiel und Checkliste für die Rezeption.",
    updated: "2026-10-31",
  },
  {
    slug: "heil-und-kostenplan-verstehen",
    title: "Heil- und Kostenplan verständlich erklären: so finden Patienten ihren Eigenanteil",
    description:
      "Warum Patienten den HKP oft nicht verstehen, welche Zahlen wirklich zählen und wie Sie den Eigenanteil in drei Sätzen erklären.",
    updated: "2026-10-31",
  },
  {
    slug: "mehrkostenvereinbarung",
    title: "Mehrkostenvereinbarung bei Füllungen: Regeln nach § 28 SGB V kurz erklärt",
    description:
      "Wann eine Mehrkostenvereinbarung nötig ist, was die Kasse weiter zahlt und welche Fehler Praxen vermeiden sollten.",
    updated: "2026-10-31",
  },
] as const;

export type RatgeberSlug = (typeof RATGEBER)[number]["slug"];
export const ratgeber = (slug: RatgeberSlug) => RATGEBER.find((a) => a.slug === slug)!;
