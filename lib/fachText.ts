import { einrichtungWoerter, fachWoerter, personFuer, tabletOrt } from "@/lib/fachWoerter";

// Deutsche Texte der Patientenseiten in den Wörtern des Fachs. Geschrieben sind sie für Praxis, Behandlung und
// Patient: Für diese Fächer (Zahnmedizin, Ärzte, Therapie) bleiben sie Zeichen für Zeichen gleich. Bei Apotheke,
// Fachgeschäft, Sanitätshaus, Pflegedienst, Hebamme und Klinik heißt es dann „Ihre Apotheke“, „Ihr Beratungsvorschlag“,
// „die Kundin oder der Kunde“. Nur für deutsche Texte; Übersetzungen bleiben, wie sie sind.

type Regel = [RegExp, string];
const gross = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const CACHE = new Map<string, Regel[]>();
const KURZ = { bei: "beim", von: "vom", zu: "zum" } as const;

function regeln(fach: string | null | undefined, ohneEinrichtung = false): Regel[] {
  const schluessel = `${fach ?? ""}${ohneEinrichtung ? "|ohne" : ""}`;
  const fertig = CACHE.get(schluessel);
  if (fertig) return fertig;
  const w = fachWoerter(fach);
  const e = einrichtungWoerter(fach);
  const sg = personFuer(fach).sg;
  const r: Regel[] = [];
  if (w.abschluss !== "Behandlung") {
    const den = w.abschluss === "Einsatz" || w.abschluss === "Besuch" ? "den" : "die";
    r.push(
      [/Behandlungsvorschläge/g, w.vorschlaege],
      [/Behandlungsvorschlag/g, w.vorschlag],
      [/Ihr Behandlungsweg/g, "Ihre Übersicht"],
      [/Ihrem Behandlungsweg/g, "Ihrer Übersicht"],
      [/Ihren Behandlungsweg/g, "Ihre Übersicht"],
      [/Vorgeschlagene Behandlung/g, "Vorgeschlagene Leistung"],
      [/vor der Behandlung/g, w.vorAbschluss],
      [/\b(für|gegen) die Behandlung/g, `$1 ${den} ${w.abschluss}`],
      [/\bzur Behandlung/g, den === "den" ? `zum ${w.abschluss}` : `zur ${w.abschluss}`],
    );
  }
  if (e.name !== "Praxis" && !ohneEinrichtung) {
    r.push(
      [/\b(an|Sie) Ihre Praxis\b/g, `$1 ${e.ihreAkk}`],
      [/\b(von|Von|mit|bei|zu) Ihrer Praxis\b/g, `$1 ${e.ihrer}`],
      [/\bin Ihrer Praxis\b/g, e.inIhrer],
      [/\bIhrer Praxis\b/g, e.ihresGen],
      [/\bIhre Praxis\b/g, e.ihre],
      [/\bmeiner Praxis\b/g, e.meiner],
      [/\bAndere Praxis\b/g, e.andere],
      [/\beiner anderen Praxis\b/g, e.einerAnderen],
      [/\bder anderen Praxis\b/g, e.derAnderen],
      [/\bWas schlägt sie vor\?/g, `Was schlägt ${e.sie} vor?`],
      // Akkusativ: „Diese Praxis auf diesem Gerät merken“, „… von diesem Gerät entfernen?“; sonst Nominativ.
      [/\bDiese Praxis(?= (auf|von) diesem Gerät (merken|entfernen))/g, gross(e.dieseAkk)],
      [/\bDiese Praxis\b/g, gross(e.diese)],
      // Akkusativ: „rufen Sie die Praxis an“, „gehen an die Praxis“
      [/\b(Sie|an|auf|für|über|durch|ohne) die Praxis\b/g, `$1 ${e.dieAkk}`],
      // Dativ: „Möchten Sie der Praxis noch etwas sagen?“
      [/\bSie der Praxis\b/g, `Sie ${e.derDat}`],
      [/\bmit der Praxis\b/g, `mit ${e.derDat}`],
      ...(["bei", "von", "zu"] as const).map((p): Regel => [new RegExp(`\\b${p} der Praxis\\b`, "g"), e.derDat.startsWith("dem ") ? `${KURZ[p]} ${e.name}` : `${p} ${e.derDat}`]),
      [/\bin der Praxis\b/g, e.inDer],
      [/\bder Praxis\b/g, e.derGen],
      [/\bDie Praxis\b/g, gross(e.dieNom)],
      [/\bdie Praxis\b/g, e.dieNom],
    );
  }
  if (sg !== "Patient" && sg !== "Patientin") {
    r.push([/die Patientin oder der Patient\b/g, sg === "Frau" ? "die Frau" : `die ${sg.replace(/e$/, "")}in oder der ${sg}`]);
  }
  CACHE.set(schluessel, r);
  return r;
}

/** Ein deutscher Text in den Wörtern des Fachs (ohne Fach oder bei Praxis, Behandlung und Patient unverändert). */
export function fachText(text: string, fach: string | null | undefined): string {
  return regeln(fach).reduce((t, [re, neu]) => t.replace(re, neu), text);
}

/**
 * Alle Texte eines Textpakets (Zeichenketten und Funktionen, die Text liefern) in den Wörtern des Fachs. Ändert sich
 * für das Fach nichts, kommt dasselbe Objekt zurück.
 */
export function mitFachWoertern<T extends object>(texte: T, fach: string | null | undefined): T {
  if (!regeln(fach).length) return texte;
  const f = (s: string) => fachText(s, fach);
  return Object.fromEntries(
    Object.entries(texte).map(([k, v]) => [
      k,
      typeof v === "string"
        ? f(v)
        : typeof v === "function"
          ? (...a: unknown[]) => {
              const x = (v as (...y: unknown[]) => unknown)(...a);
              return typeof x === "string" ? f(x) : x;
            }
          : v,
    ]),
  ) as T;
}

/**
 * „Behandlung“ im Fließtext der Hilfe in das Wort des Fachs: „eine Beratung abschließen“, „nach dem Abschließen eines
 * Einsatzes“, „Besuchsvorschlag“. Namen aus der App wie „Behandlungsweg senden“ oder „Behandlerin“ bleiben.
 */
export function abschlussText(text: string, abschluss: string): string {
  if (abschluss === "Behandlung") return text;
  const m = abschluss === "Einsatz" || abschluss === "Besuch";
  const genitiv = abschluss === "Einsatz" ? "Einsatzes" : abschluss === "Besuch" ? "Besuchs" : abschluss;
  const vorschlag = abschluss === "Einsatz" ? "Einsatzvorschl" : `${abschluss}svorschl`;
  return text
    .replace(/Behandlungsvorschl/g, vorschlag)
    .replace(/\b([Ee])iner Behandlung\b/g, (_, e: string) => `${e}${m ? "ines" : "iner"} ${genitiv}`)
    .replace(/\b([Ee])ine Behandlung\b/g, (_, e: string) => `${e}${m ? "inen" : "ine"} ${abschluss}`);
}

// Personenwort im Fließtext der App und der Hilfe: „Patient“ wird zum Wort des Fachs. Kunde und Klient beugen sich wie
// Patient (der Patient, den Patienten, die Patienten), dort genügt der Tausch. Bei „Frau“ und „Patientin“ ändern sich
// Artikel und Endungen: „einen Patienten“ wird „eine Frau“, „dem gewählten Patienten“ wird „der gewählten Patientin“.
// Auch die Namen aus der App folgen dem Fach: „Patienten-Link“ heißt „Kunden-Link“, „Klienten-Link“ oder
// „Patientinnen-Link“, bei der Hebamme schlicht „Link“. Fachbegriffe wie „Patientenverfügung“ und die „elektronische
// Patientenakte“ bleiben.
const VOR = "(?<![\\p{L}-])";
const NACH = "(?![\\p{L}-])";
const WEIBLICH_ARTIKEL: Record<string, string> = {
  der: "die", den: "die", dem: "der", des: "der", ein: "eine", einen: "eine", einem: "einer", eines: "einer",
  jeder: "jede", jeden: "jede", jedem: "jeder", dieser: "diese", diesen: "diese", diesem: "dieser", dieses: "dieser", vom: "von der", beim: "bei der", zum: "zur",
  Ihr: "Ihre", Ihren: "Ihre", Ihrem: "Ihrer", Ihres: "Ihrer",
};
const MIT_ARTIKEL = new RegExp(
  `${VOR}(${Object.keys(WEIBLICH_ARTIKEL).flatMap((a) => [a, gross(a)]).filter((a, i, alle) => alle.indexOf(a) === i).join("|")}) ((?:(?!d(?:ie|en) )\\p{Ll}+en? ){0,2})Patient(en)?${NACH}`,
  "gu",
);
const wort = (w: string) => new RegExp(`${VOR}${w}${NACH}`, "gu");
/** Zusammensetzungen, die in der App so heißen und dem Personenwort folgen. Nicht: Patientenverfügung, Patientenrechte. */
const TEILE = "-Links?|links?|ansicht|portals?|daten|akten?|liste|stamm|namen|nummer|seiten|information(?:en)?";
const ZUSAMMEN = new RegExp(`(?<![\\p{L}-]|[Ee]lektronischen? )Patienten(${TEILE})(?![\\p{L}])`, "gu");
/** Bei der Hebamme ohne Personenwort: „Link“, „Portal“, „Akte“; wo es fehlen würde, „der Frau“ oder „der Frauen“. */
const ZUSAMMEN_FRAU: Record<string, string> = {
  ansicht: "Ansicht der Frau", daten: "Daten der Frauen", stamm: "Bestand", namen: "Namen der Frauen", nummer: "Nummer", seiten: "Seiten für Frauen",
  information: "Information für die Frau", informationen: "Informationen für die Frau",
};
const zusammenFrau = (teil: string) => ZUSAMMEN_FRAU[teil] ?? gross(teil.replace(/^-/, ""));
const PERSON_CACHE = new Map<string, (t: string) => string>();

/** Ein Text mit „Patient“ in den Personenwörtern des Fachs. Bei „Patient“ bleibt er unverändert. */
export function personText(text: string, person: string, personen?: string): string {
  if (person === "Patient") return text;
  let f = PERSON_CACHE.get(person);
  if (!f) {
    const pl = personen ?? (person.endsWith("in") ? `${person}nen` : person.endsWith("e") ? `${person}n` : `${person}en`);
    if (person === "Frau" || person.endsWith("in")) {
      const frau = person === "Frau";
      f = (t) =>
        t
          // Fürwörter folgen der Person: „Der Patient sieht seine Optionen“ wird „Die Frau sieht ihre Optionen“. Nur in
          // Sätzen, deren Subjekt „der Patient“ ist.
          .replace(/[^.!?]*\b[Dd]er Patient\b(?!-)[^.!?]*/g, (satz) =>
            satz
              .replace(/\bsein(e[nmrs]?|)\b/g, (_, e: string) => `ihr${e}`)
              .replace(/\ber\b/g, "sie"),
          )
          .replace(/\bJeder (auf|in) seine([mr])\b/g, "Jede $1 ihre$2")
          .replace(ZUSAMMEN, (_, teil: string) => (frau ? zusammenFrau(teil) : `${pl}${teil}`))
          .replace(/\b([Dd])ie Patientin oder der Patient\b/g, `$1ie ${person}`)
          .replace(/\b([Dd])er Patientin oder des Patienten\b/g, `$1er ${person}`)
          .replace(/\b([Dd])er Patientin oder dem Patienten\b/g, `$1er ${person}`)
          .replace(/\bIhre Patientin oder Ihr Patient\b/g, frau ? "die Frau" : `Ihre ${person}`)
          .replace(wort("Patientinnen und Patienten"), pl)
          .replace(wort("Patientin oder Patient"), person)
          .replace(wort("Patientenschreiben"), frau ? "Schreiben" : "Patientinnenschreiben")
          .replace(wort("Patient löschen"), frau ? "Akte löschen" : `${person} löschen`)
          .replace(new RegExp(`${VOR}(Ihren?|Ihrer) ((?:\\p{Ll}+en )?)Patienten${NACH}`, "gu"), (ganz: string, ihr: string, adj: string, stelle: number, alles: string) => {
            // „Ihren Patienten“ mit „Ihren“ in der Einzahl („für Ihren Patienten“) gibt es in den Texten nicht: Mehrzahl.
            if (!frau) return `${ihr} ${adj}${pl}`;
            // „Ihre Patienten“ heißt bei der Hebamme „die Frauen“; am Satzanfang groß.
            const artikel = ihr === "Ihre" ? "die" : ihr === "Ihrer" ? "der" : "den";
            return `${/(^|[.!?:]\s+|„)$/.test(alles.slice(0, stelle)) ? gross(artikel) : artikel} ${adj}${pl}`;
          })
          .replace(MIT_ARTIKEL, (ganz: string, artikel: string, adj: string, en?: string) => {
            // „der Patienten“ ist Mehrzahl (Genitiv oder Dativ): Das übernimmt die Regel für die Mehrzahl.
            if (artikel.toLowerCase() === "der" && en) return ganz;
            const neu = WEIBLICH_ARTIKEL[artikel] ?? WEIBLICH_ARTIKEL[artikel.toLowerCase()];
            const nomAkk = /^(die|eine|jede|diese|Ihre)$/.test(neu);
            const adjektive = nomAkk ? adj.replace(/en /g, "e ") : adj;
            return `${artikel === artikel.toLowerCase() || /^Ihr/.test(artikel) ? neu : gross(neu)} ${adjektive}${person}`;
          })
          .replace(wort("Patientinnen"), pl)
          .replace(wort("Patientin"), person)
          .replace(wort("Patienten"), pl)
          .replace(wort("Patient"), person);
    } else {
      const weiblich = `${person.replace(/e$/, "")}in`;
      f = (t) =>
        t
          .replace(ZUSAMMEN, `${pl}$1`)
          .replace(wort("Patientenschreiben"), "Schreiben")
          .replace(wort("Patientinnen"), `${weiblich}nen`)
          .replace(wort("Patientin"), weiblich)
          .replace(wort("Patienten"), pl)
          .replace(wort("Patient"), person);
    }
    PERSON_CACHE.set(person, f);
  }
  return f(text);
}

// Texte der Praxis-App in den Wörtern des Fachs: Person (personText), Abschluss (abschlussText) und Einrichtung
// (fachText). Geschrieben sind die Texte für Praxis, Behandlung und Patient. Für diese Fächer, also auch für die
// Zahnmedizin, bleibt jeder Text Zeichen für Zeichen gleich.
/** Artikel vor „Behandlungsweg“ (männlich), wenn daraus „Übersicht“ (weiblich) wird. */
const WEG_ARTIKEL: Record<string, string> = {
  der: "die", Der: "Die", den: "die", Den: "Die", dem: "der", des: "der", ein: "eine", einen: "eine", einem: "einer",
  Ihr: "Ihre", Ihren: "Ihre", Ihrem: "Ihrer", Ihres: "Ihrer", ihr: "ihre", ihren: "ihre", ihrem: "ihrer", sein: "seine", seinen: "seine", seinem: "seiner",
  zum: "zur", Zum: "Zur", im: "in der", Im: "In der", vom: "von der", beim: "bei der",
};
const APP_CACHE = new Map<string, (t: string) => string>();
const gleich = (t: string) => t;

/** Liefert die Funktion, die einen festen deutschen Text der App in die Wörter des Fachs schreibt. */
export function appTextFuer(fach: string | null | undefined): (text: string) => string {
  const schluessel = fach ?? "";
  const fertig = APP_CACHE.get(schluessel);
  if (fertig) return fertig;
  const { sg, pl } = personFuer(fach);
  const w = fachWoerter(fach);
  const e = einrichtungWoerter(fach);
  const schritte: ((t: string) => string)[] = [];
  if (w.abschluss !== "Behandlung") {
    // „Behandlungsweg“ heißt für die Person „Übersicht“ (wie auf den Seiten für sie, siehe oben).
    schritte.push((t) =>
      t
        .replace(/\bauf ((?:[Ii]hr|sein|ein|d)em) Behandlungsweg\b/g, (_, a: string) => `in ${a.replace(/em$/, "er")} Übersicht`)
        .replace(new RegExp(`\\b(${Object.keys(WEG_ARTIKEL).join("|")}) Behandlungswegs?\\b`, "g"), (_, a: string) => `${WEG_ARTIKEL[a]} Übersicht`)
        .replace(/\bBehandlungswegs?\b/g, "Übersicht")
        .replace(/\bBehandlungsplätze(n?)\b/g, "Plätze$1")
        .replace(/\bBehandlungsplatz(es)?\b/g, "Platz$1")
        .replace(/\bBehandlungsdokumentation\b/g, "Dokumentation")
        .replace(/\bBehandlungsoption\b/g, "Option")
        .replace(/\bBehandlungstag\b/g, "selben Tag")
        .replace(/\bBehandelt und berät\b/g, "Berät")
        .replace(/\bBehandelt von\b/g, "Betreut von"),
    );
    schritte.push((t) => abschlussText(t, w.abschluss));
  }
  if (sg !== "Patient") schritte.push((t) => personText(t, sg, pl));
  // Eine Hebammenpraxis ist eine Praxis: In der App bleibt es dort bei „Ihre Praxis“.
  const praxis = e.name === "Praxis" || e.name === "Hebammenpraxis";
  // Wo die Einrichtung keine Praxis ist: „Ihre Software“ statt „Ihre Praxissoftware“, „Konto“ statt „Praxiskonto“.
  if (!praxis && e.name !== "Klinik")
    schritte.push((t) =>
      t
        .replace(/\bPraxis(software|konto|programm|leitung)/g, (_, r: string) => gross(r))
        .replace(/\bHauptpraxis und Zweigpraxen\b/g, "Hauptsitz und weitere Standorte")
        .replace(/\bPraxisansicht\b/g, "Ansicht für das Team")
        .replace(/\bPraxiszahlen\b/g, "interne Zahlen")
        .replace(/\bSprechzeit(en)?\b/g, "Öffnungszeit$1")
        .replace(/\bim Wartezimmer\b/g, tabletOrt(fach)),
    );
  const rest = regeln(fach, praxis);
  if (rest.length) schritte.push((t) => rest.reduce((x, [re, neu]) => x.replace(re, neu), t));
  const f = schritte.length ? (t: string) => schritte.reduce((x, s) => s(x), t) : gleich;
  APP_CACHE.set(schluessel, f);
  return f;
}

/** Ein fester deutscher Text der Praxis-App in den Wörtern des Fachs. */
export const appText = (text: string, fach: string | null | undefined): string => appTextFuer(fach)(text);
