import { DEFAULT_PRICES as P } from "@/lib/proposals";
import type { Specialty } from "@/lib/specialties";

// Zahnmedizin im selben Aufbau wie die übrigen Fachseiten (/fachgebiete/zahn).
// Nur zur Darstellung auf der Website: Die eigentlichen Vorschläge rechnet
// das Regelwerk in lib/proposals.ts (Befund je Zahn, Festzuschuss,
// Mehrkostenvereinbarung). Preise sind die dortigen Beispielwerte.
export const DENTAL_SHOWCASE: Specialty = {
  id: "zahn",
  name: "Zahnmedizin",
  kurz: "Zahnarztpraxis",
  arztDativ: "Ihrer Zahnärztin oder Ihrem Zahnarzt",
  teaser: "Zahnschema, Festzuschuss 2027, Mehrkostenvereinbarung",
  marketing: {
    headline: "Nach dem Patientengespräch ein Klick: Bericht, Vorschlag mit Eigenanteil, Patienten-Link.",
    problem:
      "Mehrkostenvereinbarung, Festzuschuss und Heil- und Kostenplan sind für Patienten schwer zu verstehen. Gute Alternativen fallen im vollen Praxisalltag unter den Tisch, und die Rezeption erklärt dieselben Fragen jeden Tag aufs Neue.",
    beispiel: "Befund am Zahnschema wählen: Sorrida zeigt die Kassenleistung zuerst, sinnvolle Alternativen mit Eigenanteil und Festzuschuss.",
  },
  anlaesse: [
    {
      id: "fuellung",
      bereich: "Zahn 36, Karies ab 3 Flächen",
      label: "Füllung im Seitenzahn",
      options: [
        { id: "fk", name: "Kassenfüllung", type: "kasse", price: P.fk_gross, benefits: ["haltbar", "ohne Zuzahlung"] },
        { id: "komp", name: "Mehrschicht-Komposit", type: "igel", price: P.komp_gross, kasseAnteil: P.fk_gross, benefits: ["zahnfarben", "substanzschonend"], kasseWenn: "Die Kasse zahlt den Anteil der Kassenfüllung, der Rest ist Mehrkostenvereinbarung (§ 28 Abs. 2 SGB V)." },
        { id: "inlay", name: "Keramik-Inlay", type: "igel", price: P.inlay, benefits: ["sehr haltbar", "zahnfarben"] },
      ],
      notes: ["Im Frontzahnbereich gibt es keinen Mehrkosten-Vorschlag für Komposit, weil das dort schon Kassenleistung ist."],
    },
    {
      id: "krone",
      bereich: "Zahn 46, stark zerstört",
      label: "Krone",
      options: [
        { id: "regel", name: "Krone, Regelversorgung", type: "kasse", price: P.krone_regel, benefits: ["Festzuschuss der Kasse", "mit Bonusheft bis 75 %"] },
        { id: "vk", name: "Vollkeramik-Krone", type: "igel", price: P.krone_vk, kasseAnteil: P.krone_regel, benefits: ["ästhetisch", "metallfrei"], kasseWenn: "Festzuschuss bleibt gleich, Sie zahlen die Differenz (gleichartige Versorgung)." },
      ],
      notes: ["Für die Höhe des Festzuschusses zählt das Datum, an dem die Kasse den Heil- und Kostenplan genehmigt."],
    },
    {
      id: "luecke",
      bereich: "Zahn 36 fehlt",
      label: "Lücke schließen",
      options: [
        { id: "bruecke", name: "Brücke, Regelversorgung", type: "kasse", price: P.bruecke_regel, benefits: ["Festzuschuss der Kasse"] },
        { id: "implantat", name: "Implantat mit Krone", type: "igel", price: P.implantat, kasseAnteil: Math.round(P.bruecke_regel * 0.6), benefits: ["Nachbarzähne bleiben unbeschliffen"], kasseWenn: "Die Kasse zahlt den Festzuschuss der Regelversorgung (andersartige Versorgung)." },
      ],
    },
    {
      id: "endo",
      bereich: "Zahn 26, Entzündung",
      label: "Wurzelbehandlung",
      options: [
        { id: "wk", name: "Wurzelbehandlung", type: "kasse", price: P.wk_kasse, benefits: ["erhält den Zahn"] },
        { id: "wkplus", name: "Mit maschineller Aufbereitung und Mikroskop", type: "igel", price: P.wk_plus, benefits: ["höhere Erfolgsquote bei schwierigen Kanälen"] },
      ],
    },
    {
      id: "prophylaxe",
      bereich: "Vorsorge",
      label: "Zahnreinigung",
      options: [
        { id: "zst", name: "Zahnsteinentfernung", type: "kasse", price: P.zst, benefits: ["einmal im Jahr"] },
        { id: "pzr", name: "Professionelle Zahnreinigung", type: "igel", price: P.pzr, benefits: ["gründlich, auch zwischen den Zähnen"], kasseWenn: "Viele Kassen und Zusatzversicherungen bezuschussen sie." },
      ],
    },
  ],
};
