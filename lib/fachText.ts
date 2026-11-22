import { einrichtungWoerter, fachWoerter, personFuer } from "@/lib/fachWoerter";

// Deutsche Texte der Patientenseiten in den Wörtern des Fachs. Geschrieben sind sie für Praxis, Behandlung und
// Patient: Für diese Fächer (Zahnmedizin, Ärzte, Therapie) bleiben sie Zeichen für Zeichen gleich. Bei Apotheke,
// Fachgeschäft, Sanitätshaus, Pflegedienst, Hebamme und Klinik heißt es dann „Ihre Apotheke“, „Ihr Beratungsvorschlag“,
// „die Kundin oder der Kunde“. Nur für deutsche Texte; Übersetzungen bleiben, wie sie sind.

type Regel = [RegExp, string];
const gross = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const CACHE = new Map<string, Regel[]>();
const KURZ = { bei: "beim", von: "vom", zu: "zum" } as const;

function regeln(fach: string | null | undefined): Regel[] {
  const schluessel = fach ?? "";
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
  if (e.name !== "Praxis") {
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
      // Akkusativ: „rufen Sie die Praxis an“, „gehen an die Praxis“
      [/\b(Sie|an|für|über|durch|ohne) die Praxis\b/g, `$1 ${e.dieAkk}`],
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

// Personenwort im Fließtext, etwa in der Hilfe: „Patient“ wird zum Wort des Fachs. Kunde und Klient beugen sich wie
// Patient (der Patient, den Patienten, die Patienten), dort genügt der Tausch. Bei „Frau“ ändern sich Artikel und
// Endungen: „einen Patienten“ wird „eine Frau“, „dem gewählten Patienten“ wird „der gewählten Frau“. Zusammengesetzte
// Wörter wie „Patienten-Link“ oder „Patientendaten“ bleiben, so heißen sie auch in der App.
const VOR = "(?<![\\p{L}-])";
const NACH = "(?![\\p{L}-])";
const FRAU_ARTIKEL: Record<string, string> = {
  der: "die", den: "die", dem: "der", des: "der", ein: "eine", einen: "eine", einem: "einer", eines: "einer",
  jeder: "jede", jeden: "jede", jedem: "jeder", diesem: "dieser", dieses: "dieser", vom: "von der", beim: "bei der", zum: "zur",
};
const FRAU_MIT_ARTIKEL = new RegExp(
  `${VOR}(${Object.keys(FRAU_ARTIKEL).flatMap((a) => [a, gross(a)]).join("|")}) ((?:(?!d(?:ie|en) )\\p{Ll}+en? ){0,2})Patient(en)?${NACH}`,
  "gu",
);
const wort = (w: string) => new RegExp(`${VOR}${w}${NACH}`, "gu");
const PERSON_CACHE = new Map<string, (t: string) => string>();

/** Ein Text mit „Patient“ in den Personenwörtern des Fachs. Bei „Patient“ und „Patientin“ bleibt er unverändert. */
export function personText(text: string, person: string, personen?: string): string {
  if (person.startsWith("Patient")) return text;
  let f = PERSON_CACHE.get(person);
  if (!f) {
    const pl = personen ?? (person.endsWith("e") ? `${person}n` : `${person}en`);
    if (person === "Frau") {
      f = (t) =>
        t
          .replace(/\b([Dd])ie Patientin oder der Patient\b/g, "$1ie Frau")
          .replace(wort("Patientinnen und Patienten"), pl)
          .replace(wort("Patientenschreiben"), "Schreiben")
          .replace(new RegExp(`${VOR}(Ihren?) ((?:\\p{Ll}+en )?)Patienten${NACH}`, "gu"), (_, ihr: string, adj: string, stelle: number, ganz: string) => {
            // „Ihre Patienten“ heißt hier „die Frauen“; am Satzanfang groß.
            const artikel = ihr === "Ihre" ? "die" : "den";
            return `${/(^|[.!?:]\s+|„)$/.test(ganz.slice(0, stelle)) ? gross(artikel) : artikel} ${adj}${pl}`;
          })
          .replace(FRAU_MIT_ARTIKEL, (ganz: string, artikel: string, adj: string, en?: string) => {
            // „der Patienten“ ist Mehrzahl (Genitiv oder Dativ): Das übernimmt die Regel für die Mehrzahl.
            if (artikel.toLowerCase() === "der" && en) return ganz;
            const neu = FRAU_ARTIKEL[artikel.toLowerCase()];
            const nomAkk = neu === "die" || neu === "eine" || neu === "jede";
            const adjektive = nomAkk ? adj.replace(/en /g, "e ") : adj;
            return `${artikel === artikel.toLowerCase() ? neu : gross(neu)} ${adjektive}${person}`;
          })
          .replace(wort("Patientinnen"), pl)
          .replace(wort("Patientin"), person)
          .replace(wort("Patienten"), pl)
          .replace(wort("Patient"), person);
    } else {
      const weiblich = `${person.replace(/e$/, "")}in`;
      f = (t) =>
        t
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
