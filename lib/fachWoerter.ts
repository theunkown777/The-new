// Wörter des Fachs für Sätze: wie die Person heißt (Patient, Kunde, Klient, Frau), wie die Einrichtung (Praxis,
// Apotheke, Fachgeschäft, Pflegedienst …) und wie der Abschluss eines Kontakts (Behandlung, Beratung, Versorgung,
// Einsatz, Besuch). Bewusst klein und ohne die Fachprofile aus lib/fachprofile.ts: Die Patientenseiten (Portal,
// Terminanfrage, Anamnese, Patienten-Link) brauchen nur diese Wörter und laden so nicht alle Profile mit.
// Dieselben Angaben stehen je Fach in FACHPROFILE (person, einrichtung); ein Test hält beide gleich.

const PATIENT = { sg: "Patient", pl: "Patienten" };
const KUNDE = { sg: "Kunde", pl: "Kunden" };
/** Nur die Fächer, die nicht von „Patienten“ sprechen. */
export const PERSON_JE_FACH: Record<string, { sg: string; pl: string }> = {
  gyn: { sg: "Patientin", pl: "Patientinnen" },
  hebamme: { sg: "Frau", pl: "Frauen" },
  pflege: { sg: "Klient", pl: "Klienten" },
  apotheke: KUNDE, hoerakustik: KUNDE, optik: KUNDE, sanitaetshaus: KUNDE,
};
/** Nur die Fächer, die keine „Praxis“ sind. */
export const EINRICHTUNG_JE_FACH: Record<string, string> = {
  hebamme: "Hebammenpraxis", pflege: "Pflegedienst", apotheke: "Apotheke", hoerakustik: "Fachgeschäft", optik: "Fachgeschäft",
  sanitaetshaus: "Sanitätshaus", klinik: "Klinik",
};

/** Personenwort des Fachs; ohne Fach oder ohne Eintrag „Patient“. */
export const personFuer = (fach: string | null | undefined): { sg: string; pl: string } => PERSON_JE_FACH[fach ?? ""] ?? PATIENT;
/** Einrichtung des Fachs; ohne Fach oder ohne Eintrag „Praxis“. */
export const einrichtungFuer = (fach: string | null | undefined): string => EINRICHTUNG_JE_FACH[fach ?? ""] ?? "Praxis";

/** Wie der Abschluss eines Kontakts heißt: Behandlung, Beratung, Versorgung, Einsatz, Besuch. */
export function abschlussWort(fach: string | null | undefined): string {
  const f = fach ?? "";
  if (f === "apotheke") return "Beratung";
  if (["optik", "hoerakustik", "sanitaetshaus"].includes(f)) return "Versorgung";
  if (f === "pflege") return "Einsatz";
  if (f === "hebamme") return "Besuch";
  return "Behandlung";
}

/**
 * Wo das Empfangs-Tablet liegt. Eine Apotheke hat kein Wartezimmer, ein Pflegedienst arbeitet bei den Klienten zu Hause,
 * Optik, Hörakustik und Sanitätshaus empfangen im Geschäft.
 */
export function tabletOrt(fach: string | null | undefined): string {
  const f = fach ?? "";
  if (f === "apotheke") return "am Beratungsplatz";
  if (f === "pflege") return "beim Hausbesuch";
  if (["optik", "hoerakustik", "sanitaetshaus"].includes(f)) return "im Geschäft";
  return "im Wartezimmer";
}

/**
 * Wörter des Fachs für Sätze mit Artikel. Patient, Kunde und Klient haben im Akkusativ und Dativ die Form der
 * Mehrzahl („einen Patienten“, „zum Kunden“), Patientin und Frau die der Einzahl („eine Frau“, „zur Patientin“).
 * Einsatz und Besuch sind männlich („Ersten Einsatz abschließen“), Behandlung, Beratung und Versorgung weiblich.
 */
export function fachWoerter(fach: string | null | undefined) {
  const { sg, pl } = personFuer(fach);
  const weiblich = sg === "Frau" || sg.endsWith("in");
  const abschluss = abschlussWort(fach);
  const abschlussMaennlich = abschluss === "Einsatz" || abschluss === "Besuch";
  return {
    person: sg,
    personen: pl,
    /** „einen Patienten“, „eine Patientin“, „einen Kunden“, „eine Frau“ */
    einePerson: weiblich ? `eine ${sg}` : `einen ${pl}`,
    /** „Ersten Patienten“, „Erste Frau“ (Akkusativ, Satzanfang) */
    erstePerson: weiblich ? `Erste ${sg}` : `Ersten ${pl}`,
    /** „zum Patienten“, „zur Frau“ */
    zurPerson: weiblich ? `zur ${sg}` : `zum ${pl}`,
    /** „für den Patienten“, „für die Frau“ */
    fuerPerson: weiblich ? `für die ${sg}` : `für den ${pl}`,
    /** „vom Patienten“, „von der Frau“ */
    vonPerson: weiblich ? `von der ${sg}` : `vom ${pl}`,
    /** „mit dem Patienten“, „mit der Frau“ */
    mitPerson: weiblich ? `mit der ${sg}` : `mit dem ${pl}`,
    /** „Patientenschreiben“; wo das Fach nicht von Patienten spricht, schlicht „Schreiben“ */
    schreiben: sg.startsWith("Patient") ? "Patientenschreiben" : "Schreiben",
    /** „Der Patient“, „Die Frau“ (Satzanfang) */
    derPerson: weiblich ? `Die ${sg}` : `Der ${sg}`,
    /** „des Patienten“, „der Patientin“ (Genitiv) */
    desPerson: weiblich ? `der ${sg}` : `des ${pl}`,
    abschluss,
    /** „vor der Behandlung“, „vor dem Einsatz“ */
    vorAbschluss: `vor ${abschlussMaennlich ? "dem" : "der"} ${abschluss}`,
    /** „Erste Behandlung“, „Ersten Einsatz“ (Akkusativ, Satzanfang) */
    ersterAbschluss: `${abschlussMaennlich ? "Ersten" : "Erste"} ${abschluss}`,
    /** „Nächste Behandlung“, „Nächsten Besuch“ (Akkusativ, Satzanfang) */
    naechsterAbschluss: `${abschlussMaennlich ? "Nächsten" : "Nächste"} ${abschluss}`,
    /** „Behandlungsdatum“, „Einsatzdatum“, „Besuchsdatum“ */
    datum: abschluss === "Einsatz" ? "Einsatzdatum" : `${abschluss}sdatum`,
    /** „Behandlungsvorschlag“, „Beratungsvorschlag“, „Einsatzvorschlag“ */
    vorschlag: abschluss === "Einsatz" ? "Einsatzvorschlag" : `${abschluss}svorschlag`,
    /** „Behandlungsvorschläge“, „Beratungsvorschläge“, „Einsatzvorschläge“ */
    vorschlaege: abschluss === "Einsatz" ? "Einsatzvorschläge" : `${abschluss}svorschläge`,
  };
}

const EINRICHTUNG_GESCHLECHT: Partial<Record<string, "m" | "n">> = { Fachgeschäft: "n", Sanitätshaus: "n", Pflegedienst: "m" };
const EINRICHTUNG_GENITIV: Record<string, string> = { Fachgeschäft: "Fachgeschäfts", Sanitätshaus: "Sanitätshauses", Pflegedienst: "Pflegedienstes" };

/** Die Einrichtung des Fachs in allen Fällen: „Ihre Praxis“, „Ihr Fachgeschäft“, „Ihrem Pflegedienst“, „des Sanitätshauses“. */
export function einrichtungWoerter(fach: string | null | undefined) {
  const name = einrichtungFuer(fach);
  const g = EINRICHTUNG_GESCHLECHT[name] ?? "f";
  const gen = EINRICHTUNG_GENITIV[name] ?? name;
  if (g === "f") {
    return {
      name, ihre: `Ihre ${name}`, ihreAkk: `Ihre ${name}`, ihrer: `Ihrer ${name}`, ihresGen: `Ihrer ${name}`, meiner: `meiner ${name}`,
      dieNom: `die ${name}`, dieAkk: `die ${name}`, derDat: `der ${name}`, derGen: `der ${name}`, inIhrer: `in Ihrer ${name}`, inDer: `in der ${name}`,
      andere: `Andere ${name}`, derAnderen: `der anderen ${name}`, einerAnderen: `einer anderen ${name}`, sie: "sie",
    };
  }
  return {
    name,
    /** Nominativ: „Ihr Fachgeschäft“ */
    ihre: `Ihr ${name}`,
    /** Akkusativ: „an Ihr Fachgeschäft“, „an Ihren Pflegedienst“ */
    ihreAkk: g === "m" ? `Ihren ${name}` : `Ihr ${name}`,
    /** Dativ: „Ihrem Fachgeschäft“ */
    ihrer: `Ihrem ${name}`,
    /** Genitiv: „Ihres Fachgeschäfts“ */
    ihresGen: `Ihres ${gen}`,
    /** Dativ: „mit meinem Fachgeschäft“ */
    meiner: `meinem ${name}`,
    dieNom: g === "m" ? `der ${name}` : `das ${name}`,
    dieAkk: g === "m" ? `den ${name}` : `das ${name}`,
    derDat: `dem ${name}`,
    derGen: `des ${gen}`,
    /** Wo man nachfragt: „in Ihrem Fachgeschäft“, „bei Ihrem Pflegedienst“ */
    inIhrer: g === "m" ? `bei Ihrem ${name}` : `in Ihrem ${name}`,
    /** Wo etwas geschieht: „im Fachgeschäft“, „beim Pflegedienst“ */
    inDer: g === "m" ? `beim ${name}` : `im ${name}`,
    andere: g === "m" ? `Anderer ${name}` : `Anderes ${name}`,
    derAnderen: `des anderen ${gen}`,
    einerAnderen: `eines anderen ${gen}`,
    /** Pronomen im Nominativ */
    sie: g === "m" ? "er" : "es",
  };
}

/**
 * Für wen die öffentliche Terminanfrage gedacht ist: „Für neue Patientinnen und Patienten“, „Für neue Kundinnen und
 * Kunden“, „Für neue Patientinnen“ (Frauenheilkunde); bei der Hebamme „Für Ihren ersten Termin“.
 */
export function fuerNeue(fach: string | null | undefined): string {
  const { pl } = personFuer(fach);
  if (pl === "Frauen") return "Für Ihren ersten Termin";
  return pl.endsWith("innen") ? `Für neue ${pl}` : `Für neue ${pl.replace(/en$/, "innen")} und ${pl}`;
}
