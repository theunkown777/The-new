// Sprachen für die Patientenansicht (Patienten-Link). Die Praxis arbeitet
// auf Deutsch; der Patient kann den Vorschlag zusätzlich auf Englisch lesen.
// Rechtlich maßgeblich bleibt die deutsche Fassung, darauf weist die
// englische Ansicht hin.
//
// Inhalte aus dem Regelwerk (lib/proposals.ts) werden über CONTENT_EN
// übersetzt. lib/patientI18n.test.ts prüft, dass jeder Text, den das
// Regelwerk erzeugen kann, eine Übersetzung hat.

export const PATIENT_LANGS = ["de", "en"] as const;
export type PatientLang = (typeof PATIENT_LANGS)[number];

export function pickLang(param: string | undefined, acceptLanguage: string | null): PatientLang {
  if (param === "de" || param === "en") return param;
  const first = acceptLanguage?.split(",")[0]?.trim().toLowerCase() ?? "";
  return first && !first.startsWith("de") && acceptLanguage!.toLowerCase().includes("en") ? "en" : "de";
}

const UI_DE = {
  hello: (name: string) => `Hallo ${name}, hier ist Ihr Behandlungsvorschlag`,
  intro: (arzt: string) =>
    `Sie können sich in Ruhe ansehen, welche Möglichkeiten es gibt und was sie für Sie kosten. Tippen Sie eine Option an, um Ihren Eigenanteil zu sehen. Entschieden wird erst im Gespräch mit ${arzt}.`,
  kasseWenn: "Kasse zahlt:",
  nutzen: "Zum Nutzen:",
  fineMed: (until: string) =>
    `Unverbindliche Kostenschätzung nach der Gebührenordnung für Ärzte (GOÄ). Selbstzahlerleistungen (IGeL) sind freiwillig; vor der Leistung schließen wir eine schriftliche Vereinbarung mit Ihnen. Nehmen Sie sich Zeit für Ihre Entscheidung. Dieser Link ist gültig bis ${until}.`,
  deadlineTitle: "Wichtig für Zahnersatz:",
  deadline: (days: number) =>
    `Ab 2027 zahlen die Krankenkassen weniger zu. Wird der Heil- und Kostenplan noch bis 31.12.2026 bewilligt (in ${days} Tagen), sparen Sie bei Ihrer Auswahl etwa`,
  optionsFor: (t: string) => `Optionen für ${t}`,
  recommended: "Empfehlung",
  yourShare: "Ihr Anteil",
  total: "Gesamt",
  insurerGkv: "Kasse",
  insurerPkv: "Versicherung",
  supplementary: "Zusatzversicherung ca.",
  from2027: "bei Bewilligung ab 2027:",
  nextTitle: "Wie möchten Sie weitermachen?",
  thanks:
    "Danke, Ihre Praxis hat Ihre Rückmeldung erhalten und meldet sich bei Ihnen. Sie können Ihre Auswahl hier jederzeit erneut senden.",
  change: "Auswahl ändern",
  noteLabel: "Frage oder Wunschtermin (optional)",
  notePlaceholder: "z. B. Am besten erreichbar nachmittags.",
  installmentsInterest: "Ich interessiere mich für Ratenzahlung",
  discuss: "Diese Auswahl besprechen",
  callMe: "Bitte rufen Sie mich an",
  sendFailed: "Senden fehlgeschlagen. Bitte versuchen Sie es erneut oder rufen Sie die Praxis an.",
  fine: (gkv: boolean, until: string) =>
    `Unverbindliche Kostenschätzung. Verbindlich sind der Heil- und Kostenplan bzw. die Vereinbarung mit Ihrer Praxis.${gkv ? " Der Kassenanteil bei Zahnersatz richtet sich nach dem Datum der Bewilligung durch Ihre Krankenkasse." : ""} Erstattungen Ihrer Zusatzversicherung sind geschätzt. Dieser Link ist gültig bis ${until}.`,
  installmentsFine: (provider?: string) =>
    ` Ratenzahlung zinsfrei${provider ? ` über ${provider}` : ""}, Beispielrate aufgerundet; Einzelheiten regelt die Vereinbarung mit Ihrer Praxis.`,
  barLabel: "Ihr Eigenanteil für diese Auswahl",
  rate: (months: number, monthly: string) => `oder ${months} × ${monthly} zinsfrei`,
  ask: "Ratenzahlung möglich, sprechen Sie uns an",
  bar2027: "ab 2027 bewilligt:",
  langNote: "",
};

type Ui = typeof UI_DE;

const UI_EN: Ui = {
  hello: (name) => `Hello ${name}, here is your treatment proposal`,
  intro: () =>
    "Take your time to look at the options and what each one costs you. Tap an option to see your share of the cost. Nothing is decided until you have talked it through with your dentist.",
  kasseWenn: "Covered by your insurer:",
  nutzen: "About the benefit:",
  fineMed: (until) =>
    `Non-binding cost estimate. Self-pay services are voluntary; a written agreement is made before the service. This link is valid until ${until}. Only the German version is legally binding.`,
  deadlineTitle: "Important for dentures, crowns and bridges:",
  deadline: (days) =>
    `From 2027, statutory health insurers pay less. If your treatment and cost plan is approved by 31 Dec 2026 (in ${days} days), you save about`,
  optionsFor: (t) => `Options for ${t}`,
  recommended: "Recommended",
  yourShare: "Your share",
  total: "Total",
  insurerGkv: "Health insurer",
  insurerPkv: "Insurance",
  supplementary: "Supplementary insurance approx.",
  from2027: "if approved from 2027:",
  nextTitle: "How would you like to continue?",
  thanks: "Thank you, your dental practice has received your reply and will get in touch. You can send your choice again at any time.",
  change: "Change choice",
  noteLabel: "Question or preferred time (optional)",
  notePlaceholder: "e.g. Best reached in the afternoon.",
  installmentsInterest: "I am interested in paying in instalments",
  discuss: "Discuss this choice",
  callMe: "Please call me",
  sendFailed: "Sending failed. Please try again or call the practice.",
  fine: (gkv, until) =>
    `Non-binding cost estimate. The treatment and cost plan or your agreement with the practice is binding.${gkv ? " For dentures, crowns and bridges, the insurer's share depends on the date your health insurer approves the plan." : ""} Reimbursements from supplementary insurance are estimates. This link is valid until ${until}. Only the German version is legally binding.`,
  installmentsFine: (provider) =>
    ` Interest-free instalments${provider ? ` via ${provider}` : ""}; example rate rounded up. Details are set out in your agreement with the practice.`,
  barLabel: "Your share for this choice",
  rate: (months, monthly) => `or ${months} × ${monthly} interest-free`,
  ask: "Instalments available, please ask us",
  bar2027: "if approved from 2027:",
  langNote: "Translated for your convenience. Only the German version is legally binding.",
};

export const UI: Record<PatientLang, Ui> = { de: UI_DE, en: UI_EN };

/** Übersetzungen der Texte aus lib/proposals.ts (Titel, Optionen, Vorteile, Hinweise, Leistungsarten). */
export const CONTENT_EN: Record<string, string> = {
  // Befunde
  "Alte Füllung defekt": "Old filling defective",
  "Entzündeter Nerv": "Inflamed nerve",
  "Karies, 1–2 Flächen": "Tooth decay, 1–2 surfaces",
  "Karies, ab 3 Flächen": "Tooth decay, 3 or more surfaces",
  "Knirschen oder Pressen": "Grinding or clenching",
  "Parodontitis (PSI-Code 3 oder 4)": "Gum disease (periodontitis)",
  "Patient wünscht hellere Zähne": "You would like whiter teeth",
  "Stark zerstört, Krone nötig": "Badly damaged, crown needed",
  "Tiefe Fissuren, kariesfrei": "Deep grooves, no decay",
  "Zahn fehlt": "Missing tooth",
  "Zahnstein und Beläge": "Tartar and plaque",
  "Raucher": "Smoker",
  Allgemein: "General",
  // Optionen
  Aufbissschiene: "Bite splint",
  Bleaching: "Teeth whitening",
  "Brücke, Regelversorgung": "Bridge, standard care",
  Fissurenversiegelung: "Fissure sealing",
  "Implantat mit Krone": "Implant with crown",
  "Kassenfüllung (selbstadhäsiv)": "Standard filling (self-adhesive)",
  "Keramik-Inlay": "Ceramic inlay",
  "Komposit-Füllung": "Composite filling",
  "Krone, Regelversorgung": "Crown, standard care",
  "Mehrschicht-Komposit, adhäsiv": "Multi-layer composite, bonded",
  "Parodontitis-Behandlung mit Nachsorge": "Gum disease treatment with aftercare",
  "Professionelle Zahnreinigung": "Professional teeth cleaning",
  "Teilprothese (Modellguss)": "Partial denture (cast metal)",
  "Vollkeramik-Brücke": "All-ceramic bridge",
  "Vollkeramik-Krone": "All-ceramic crown",
  "Wurzelbehandlung mit Endo-Zusatz": "Root canal treatment, advanced",
  "Wurzelbehandlung, Kassenleistung": "Root canal treatment, covered by insurer",
  Zahnsteinentfernung: "Tartar removal",
  // Vorteile
  "Ergebnis hält 1–3 Jahre": "result lasts 1–3 years",
  "Festzuschuss wie Regelversorgung": "same fixed subsidy as standard care",
  "Kasse zahlt Grundleistung": "insurer pays the basic treatment",
  "Kasse zahlt Kassenfüllung anteilig": "insurer pays the share of a standard filling",
  Kassenleistung: "covered by your insurer",
  "Kassenleistung bis 17 Jahre": "covered by your insurer up to age 17",
  "Kassenleistung inklusive Nachsorge (UPT)": "covered by your insurer, including aftercare",
  "Kieferknochen bleibt belastet": "keeps the jawbone in use",
  "Metall mit Keramikverblendung": "metal with ceramic veneer",
  "Metall, im Seitenzahnbereich unverblendet": "metal, without veneer on back teeth",
  "Nachbarzähne bleiben unberührt": "neighbouring teeth stay untouched",
  "Nachbarzähne werden beschliffen": "neighbouring teeth are ground down",
  Standardinstrumente: "standard instruments",
  "Zahnzwischenräume, Politur, Fluorid": "between the teeth, polishing, fluoride",
  "auch weiche Beläge und Verfärbungen": "also removes soft plaque and stains",
  "auf ausdrücklichen Wunsch (§ 2 Abs. 3 GOZ)": "only at your explicit request",
  "bei Indikation Kassenleistung": "covered by your insurer when medically indicated",
  "bei großen Flächen begrenzt haltbar": "limited durability for large areas",
  "bewährt und haltbar": "proven and durable",
  "dicht und langlebig": "tight seal and long-lasting",
  "einmal im Kalenderjahr Kassenleistung": "covered by your insurer once per calendar year",
  "entfernt harte Beläge": "removes hard deposits",
  "erhält den Zahn": "saves the tooth",
  "ersetzt mehrere Zähne": "replaces several teeth",
  festsitzend: "fixed in place",
  "gleicher Festzuschuss": "same fixed subsidy",
  herausnehmbar: "removable",
  "hochwertige Schichttechnik": "high-quality layering technique",
  "höhere Erfolgsquote bei gekrümmten Kanälen": "higher success rate with curved canals",
  "im Frontzahnbereich Kassenleistung": "covered by your insurer for front teeth",
  "kürzere Haltbarkeit": "shorter lifespan",
  "maschinelle Aufbereitung und Mikroskop": "machine preparation and microscope",
  "metallfrei, natürliche Optik": "metal-free, natural look",
  "schnelle Lösung": "quick solution",
  "schützt Zähne und Versorgungen": "protects teeth and restorations",
  "schützt tiefe Fissuren vor Karies": "protects deep grooves from decay",
  "sehr gut verträglich": "very well tolerated",
  "sehr langlebig": "very long-lasting",
  "stabilisiert den geschwächten Zahn": "strengthens the weakened tooth",
  "stoppt Knochenabbau": "stops bone loss",
  "viele Zusatzversicherungen erstatten": "many supplementary insurers reimburse it",
  zahnfarben: "tooth-coloured",
  "zahnfarben, gute Randdichte": "tooth-coloured, good seal at the edges",
  "zahnfarben, metallfrei": "tooth-coloured, metal-free",
  "zahnfarben, schnell gelegt": "tooth-coloured, placed quickly",
  // Hinweise
  "Alte Amalgamfüllungen nur ersetzen, wenn sie defekt sind. Intakte Füllungen bleiben.":
    "Old amalgam fillings are only replaced if they are defective. Intact fillings stay.",
  "Bei Front- und Prämolaren mit geradem Kanal reicht die Kassenleistung meist aus.":
    "For front teeth and premolars with a straight canal, the insurer-covered treatment is usually enough.",
  "Im Seitenzahnbereich ist die Kassenkrone funktional gleichwertig. Vollkeramik ist hier vor allem eine Frage der Optik.":
    "On back teeth, the standard crown works just as well. All-ceramic is mainly a question of appearance here.",
  "Seitenzähne brauchen nach einer Wurzelbehandlung meist eine Krone, damit sie nicht brechen.":
    "After a root canal treatment, back teeth usually need a crown so they do not break.",
  "Erst kariöse Zähne versorgen, dann aufhellen. Füllungen hellen nicht mit auf und werden danach farblich angepasst.":
    "Decayed teeth are treated first, then whitened. Fillings do not whiten and are colour-matched afterwards.",
  "Knirschen erhöht die Bruchgefahr. Zusätzlich eine Aufbissschiene einplanen.":
    "Grinding increases the risk of fractures. A bite splint is recommended as well.",
  "Bei Knirschen monolithisches Zirkon wählen, keine verblendete Keramik.":
    "With grinding, solid zirconia is chosen instead of veneered ceramic.",
  "Rauchen erhöht das Risiko eines Implantatverlusts deutlich. Vorher Rauchstopp besprechen.":
    "Smoking clearly increases the risk of losing an implant. We will talk about stopping smoking first.",
  "Vor Implantat oder Brücke zuerst die Parodontitis behandeln.": "Gum disease is treated before an implant or bridge.",
  "Bei sehr großem Defekt am Frontzahn prüfen, ob eine Krone langfristig sinnvoller ist.":
    "For a very large defect on a front tooth, a crown may be the better long-term choice.",
  // Leistungsarten
  Andersartig: "Alternative type of care",
  "Basis + Zusatz": "Basic + extra",
  Basisleistung: "Basic treatment",
  Basisversorgung: "Basic care",
  Gleichartig: "Upgraded care",
  "Kasse + Privatzusatz": "Insurer + private extra",
  Mehrkostenvereinbarung: "Additional cost agreement",
  Privatleistung: "Private treatment",
  Regelversorgung: "Standard care",
  Wahlleistung: "Optional treatment",
};

const PATTERNS_EN: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Zahn (\d\d)$/, (m) => `Tooth ${m[1]}`],
  [
    /^Die Nachbarzähne (\d\d) und (\d\d) brauchen ohnehin eine Versorgung\. Eine Brücke löst beides zugleich\.$/,
    (m) => `The neighbouring teeth ${m[1]} and ${m[2]} need treatment anyway. A bridge solves both at once.`,
  ],
  [
    /^Die Nachbarzähne (\d\d) und (\d\d) sind gesund\. Ein Implantat erspart das Beschleifen\.$/,
    (m) => `The neighbouring teeth ${m[1]} and ${m[2]} are healthy. An implant avoids grinding them down.`,
  ],
];

/** Text aus dem Regelwerk übersetzen; unbekannte Texte bleiben deutsch statt falsch übersetzt. */
export function tr(text: string, lang: PatientLang): string {
  if (lang === "de") return text;
  if (text in CONTENT_EN) return CONTENT_EN[text];
  for (const [re, fn] of PATTERNS_EN) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  return text;
}

export function hasTranslation(text: string): boolean {
  return tr(text, "en") !== text || text in CONTENT_EN;
}

export const euro = (n: number, lang: PatientLang) =>
  lang === "en" ? `€${Math.round(n).toLocaleString("en-GB")}` : `${Math.round(n).toLocaleString("de-DE")} €`;
