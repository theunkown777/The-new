// Angebote, die das Recht so nicht zulässt, stehen nicht im Katalog (Stand 17.11.2026, gelesen auf
// gesetze-im-internet.de):
// - § 10 NiSV: Bei Ultraschall zu nichtmedizinischen Zwecken (§ 2 Abs. 2 Nr. 1 NiSV) darf ein Fötus nicht exponiert
//   werden („Babyfernsehen“). Kein Ultraschall „auf Wunsch“ in der Schwangerschaft.
// - § 84 Abs. 1 StrlSchG: Früherkennung mit Röntgenstrahlung (§ 5 Abs. 16 StrlSchG: Menschen ohne Krankheitszeichen und
//   ohne konkreten Verdacht) nur, wenn eine Rechtsverordnung sie vorsieht; es gibt sie nur für Brustkrebs und für
//   Lungenkrebs bei rauchenden Personen. Keine Selbstzahler-DXA „zur Vorsorge“, kein CT „auf Wunsch“.
// - §§ 5, 6, 7, 9 NiSV: Wo die NiSV Ärztinnen und Ärzten vorbehält oder Fachkunde verlangt, sagt der Leistungskatalog das.
// - § 3 HWG: Der Katalog beschreibt, was gemacht wird, und nennt das Ziel als Ziel. Er spricht keine Wirkung zu
//   („Strafft …“, „Glättet …“), wirbt nicht („natürlich“, „sanft“, „bewährt“) und nennt keine Mengen ohne Quelle („oft“).
//   Das gilt für alles, was öffentlich steht: Name, Fachbegriff, Synonyme („Auch gesucht als“), Beschreibung, Hinweis.
// - § 10 Abs. 1 HWG: keine Publikumswerbung für verschreibungspflichtige Arzneimittel, also keine Handelsnamen.
// - VO (EG) 1223/2009, Anhang III lfd. Nr. 12 (gelesen auf publications.europa.eu, VO (EU) 344/2013 und RL 2011/84/EU):
//   Zahnaufheller mit mehr als 0,1 % bis 6 % Wasserstoffperoxid „Nicht bei Personen unter 18 Jahren anwenden“; nur an
//   Zahnärzte abzugeben, erste Anwendung je Behandlungszyklus durch Zahnärzte oder unter ihrer direkten Aufsicht.
import { describe, expect, it } from "vitest";
import { ALLE_SPECIALTIES } from "./specialties";
import { LEISTUNGEN, leistung } from "./leistungskatalog";
// Texte vor der Umformulierung vom 17.11.2026 (Beschreibungen und Hinweise), als Gegenprobe für die Prüfmuster
import ALTE_TEXTE from "./rechtsgrenzen.alte-texte.json";

const optionen = () => ALLE_SPECIALTIES.flatMap((s) => s.anlaesse.flatMap((a) => a.options.map((o) => ({ wo: `${s.id}/${a.id}/${o.id}`, a, o }))));

describe("Rechtsgrenzen im Katalog", () => {
  it("kein Ultraschall ohne medizinischen Zweck in der Schwangerschaft (§ 10 NiSV)", () => {
    for (const { wo, o } of optionen()) {
      const text = [o.name, ...o.benefits, o.nutzen ?? ""].join(" ");
      expect(text, wo).not.toMatch(/\b[34]D\b|Baby-?(TV|Kino|fernsehen)|Bilder Ihres Kindes/i);
    }
    expect(optionen().some(({ o }) => o.id === "us_extra")).toBe(false);
    for (const l of LEISTUNGEN) {
      const text = [l.name, l.fachbegriff, ...l.synonyme, l.beschreibung].join(" ");
      expect(text, l.id).not.toMatch(/Baby-?(TV|Kino|fernsehen)/i);
      if (/Ultraschall|Sonograph/i.test(text) && /schwanger|Geburtshilfe/i.test(`${l.bereich} ${text}`)) expect(text, l.id).not.toMatch(/auf Wunsch/i);
    }
    expect(leistung("gynaekologie-geburtshilfe-3d-4d-ultraschall")).toBeNull();
  });

  it("keine Selbstzahler-Untersuchung mit Röntgenstrahlung ohne Anlass (§ 84 Abs. 1 StrlSchG)", () => {
    for (const { wo, a, o } of optionen()) {
      if (o.type !== "igel") continue;
      expect([o.name, ...o.benefits].join(" "), wo).not.toMatch(/\bDXA\b|Knochendichte|Röntgen|\bCT\b|Computertomogra/i);
      expect(a.label, wo).not.toMatch(/\bCT\b/);
    }
    // Im Leistungskatalog steht bei Selbstzahler- und Indikationsleistungen mit Röntgen ohne Anlass die Norm dabei.
    for (const id of ["innere-medizin-osteoporose-diagnostik", "radiologie-nuklearmedizin-herz-ct-kalk-score", "vorsorge-check-ups-manager-executive-check-up"]) {
      expect(leistung(id)?.hinweis, id).toMatch(/§ 84 Abs\. 1 StrlSchG/);
    }
  });

  it("NiSV: Arztvorbehalt und Fachkunde stehen beim Angebot", () => {
    const erwartet: Record<string, RegExp> = {
      "aesthetische-medizin-minimal-invasiv-tattooentfernung": /§ 5 Abs\. 2 NiSV/,
      "aesthetische-medizin-minimal-invasiv-ipl-photoverjuengung": /§ 5 Abs\. 2 NiSV/,
      "aesthetische-medizin-minimal-invasiv-radiofrequenz-microneedling": /§ 6 Abs\. 2 NiSV/,
      "aesthetische-medizin-minimal-invasiv-ultraschall-lifting": /§ 9 Abs\. 2 NiSV/,
    };
    for (const [id, norm] of Object.entries(erwartet)) {
      const l = leistung(id);
      expect(l, id).not.toBeNull();
      expect(l!.hinweis, id).toMatch(norm);
      expect(l!.behandler, id).toMatch(/Arzt|Dermatolog/);
    }
    expect(leistung("aesthetische-medizin-minimal-invasiv-laser-haarentfernung")?.behandler).toMatch(/Fachkunde nach § 5 Abs\. 1 NiSV/);
    expect(leistung("aesthetische-medizin-minimal-invasiv-muskelaufbau-fettreduktion-per-geraet")?.behandler).toMatch(/Fachkunde nach § 7 NiSV/);
  });

  // Prüfmuster für öffentliche Texte. Wortgrenzen über Buchstaben (\p{L}), damit Umlaute zählen: „Sehstärke“, „Software“
  // oder „Hebamme“ schlagen nicht an. Wirkungsverben und Werbewörter zählen überall im Satz und ohne Rücksicht auf
  // Groß- und Kleinschreibung.
  const W = (s: string) => `(?<!\\p{L})(?:${s})(?!\\p{L})`;
  // Wirkung als Tatsache, finit („Strafft …“, „Wärme strafft …“). Nicht im Passiv oder als Zustand („verkürzt wird“,
  // „verhindert sind“): Das beschreibt den Eingriff oder die Lage, nicht eine zugesagte Wirkung.
  const VERB_SG =
    "strafft|glättet|entspannt|reduziert|verbessert|beseitigt|stimuliert|löst|schützt|vergrößert|verkleinert|verkürzt|verlängert|hebt|formt|mildert|" +
    "korrigiert|regt|stoppt|sichert|hellt|lasert|verödet|zerkleinert|entfernt|kaschiert|baut|hält|legt|rollt|schiebt|betont|definiert|gleicht|stellt|" +
    "aktiviert|regeneriert|verjüngt|lindert|heilt|senkt|verhindert|beugt|bringt|sorgt|hilft|belebt|erneuert|beruhigt";
  const WIRKUNG_SG = new RegExp(W(VERB_SG) + "(?!\\s+(?:wird|werden|ist|sind)(?!\\p{L}))", "iu");
  // Plural („Schienen korrigieren …“, „Nadeln regen … an“) und Ziel ohne „Ziel“ („Karies früh erkennen“): nur klein
  // geschrieben, nicht nach „zu“ („mit dem Ziel, … zu straffen“) und nicht vor „soll(en)“ oder „kann/können“.
  const VERB_PL =
    "straffen|glätten|reduzieren|verbessern|beseitigen|stimulieren|schützen|vergrößern|verkleinern|mildern|korrigieren|regen|stoppen|lösen|heben|formen|" +
    "entfernen|aktivieren|regenerieren|verjüngen|lindern|heilen|senken|verhindern|erkennen";
  const WIRKUNG_PL = new RegExp(`(?<!\\p{L})(?<!(?:^|\\s)zu\\s)(?:${VERB_PL})(?!\\p{L})(?!\\s+(?:soll|sollen|kann|können)(?!\\p{L}))`, "u");
  // Werbewörter, auch in Wortformen und Zusammensetzungen („hochpräzise“, „Hautverjüngung“)
  const WERBUNG = new RegExp(
    W(
      "natürlich\\p{L}*|schonend\\p{L}*|sanft\\p{L}*|bewährt\\p{L}*|beliebt\\p{L}*|hartnäckig\\p{L}*|modern\\p{L}*|innovativ\\p{L}*|hochwertig\\p{L}*|" +
        "unsichtbar\\p{L}*|unauffällig\\p{L}*|angstfrei\\p{L}*|schmerzfrei\\p{L}*|schmerzarm\\p{L}*|(?:hoch)?präzis\\p{L}*|exakt\\p{L}*|genaue?[mnrs]?|" +
        "langlebig\\p{L}*|schnell(?:e[mnrs]?|er|ere[mnrs]?)?|sofortig\\p{L}*|sichere?[mnrs]?|harmonisch\\p{L}*|premium\\p{L}*|hauchdünn\\p{L}*|perfekt\\p{L}*|" +
        "ideal\\p{L}*|optimal\\p{L}*|strahlend\\p{L}*|effektiv\\p{L}*|umfassend\\p{L}*|dauerhaft\\p{L}*|markant\\p{L}*|jünger\\p{L}*|\\p{L}*verjüng\\p{L}*|" +
        "rejuvenation|hochkonzentriert\\p{L}*|regenerier\\p{L}*|leichtere[nrs]?|aggressiv\\p{L}*|gelenkschmiere|hydro-boost|slimming|fox eyes|v-shape|" +
        "hollywood\\p{L}*|\\p{L}*(?:facelift|lifting|korrektur) ohne op|neue[nsm]? lächeln\\p{L}*|an einem tag|in einem tag|\\p{L}*wegfrier\\p{L}*",
    ),
    "iu",
  );
  // „Fett weg“, „Brille weg“; nur klein geschrieben, „auf dem Weg zur Arbeit“ ist kein Treffer.
  const WEG = /(?<!\p{L})weg(?!\p{L})/u;
  // Mengen ohne Quelle
  const MENGE = new RegExp(
    W("oft|oftmals|meist|meiste[nrs]?|meistens|häufig|häufige[nrms]?|häufiger|viele[nrs]?|überwiegend\\p{L}*|kaum|selten\\p{L}*|nahezu|fast immer|in der regel|vor allem") +
      "|(?<!\\p{L})(?:v\\.\\s?a\\.|i\\.\\s?d\\.\\s?R\\.)",
    "iu",
  );
  // Nur in Sätzen (Beschreibung, Hinweis): das Ergebnis als Tatsache („Senkung des Augeninnendrucks“, „Schutz vor …“),
  // es sei denn, der Satz nennt es als Ziel („mit dem Ziel, …“).
  const ERGEBNIS = new RegExp(
    "(?<!\\p{L})(?:Senkung|Verbesserung|Entlastung|Belüftung|Gewöhnung|Wiederherstell\\p{L}*|Wiederaufbau|Wiedererlern\\p{L}*|Stabilisierung|Lockerung|" +
      "Entstauung|Erhalt|Aufhellung|Keimreduktion|Gewichtsreduktion|Verdickung|Verbreiterung|Schmerzausschaltung|Entspannung|Beseitigung|Volumenaufbau|Lösen|" +
      "Regeneration|Straffung|Glättung|Linderung|Heilung|Härtung|Feuchtigkeit|Elastizität|Lückenschluss|zur Unterstützung|" +
      "Schutz(?=\\s+(?:vor|gegen|des|der|und)(?!\\p{L})))(?!\\p{L})|^Mehr(?!\\p{L})|(?<!\\p{L})mehr Volumen",
    "u",
  );
  const ZIEL = /(?<!\p{L})Ziel(?!\p{L})/u;
  // „X gegen Y“ verspricht eine Wirkung; Impfungen, Beratung gegen Malaria und „gegen Aufpreis“ nicht.
  const GEGEN = /(?<!\p{L})gegen(?!\p{L})/iu;
  const GEGEN_OK = /(?<!\p{L})(?:Impfung|Impfungen|Antikörpergabe|Beratung|Immunsystem)(?:\s+oder\s+\p{L}+)?\s+gegen(?!\p{L})|gegen\s+Aufpreis/gu;
  // Fachbegriffe und Beschwerden, die nur wie Werbung oder Mengen aussehen
  const FACHWORT = [
    /natürliche[nr]? Familienplanung/giu, // Verhütungsmethode
    /häufige[mnrs]? (?:Harndrang|Wasserlassen|Nasenbluten)/giu, // Beschwerde in den Worten der Patienten
    /dauerhafte (?:Verhütung|Pflege)/giu, // Sterilisation; vollstationäre Pflege
    /bei vielen Arzneimitteln/giu, // Medikationsberatung bei Polymedikation (pDL)
  ];
  const ohneFachwort = (t: string) => FACHWORT.reduce((x, f) => x.replace(f, ""), t);
  /** Für Namen, Fachbegriffe und Synonyme (Stichworte, keine Sätze). */
  const begriffsfund = (t: string) => {
    const x = ohneFachwort(t);
    return [WERBUNG, WEG, MENGE].map((r) => x.match(r)?.[0]).filter((m): m is string => !!m);
  };
  /** Für Beschreibungen und Hinweise. */
  const satzfund = (t: string) => {
    const x = ohneFachwort(t);
    const f = [...begriffsfund(t), ...[WIRKUNG_SG, WIRKUNG_PL].map((r) => x.match(r)?.[0]).filter((m): m is string => !!m)];
    if (!ZIEL.test(x) && ERGEBNIS.test(x)) f.push(x.match(ERGEBNIS)![0]);
    if (GEGEN.test(x.replace(GEGEN_OK, ""))) f.push("gegen");
    return f;
  };
  const verbotsfund = (t: string) => satzfund(t).length > 0;

  it("Prüfmuster greifen bei Werbesätzen und nicht bei harmlosen Wörtern", () => {
    for (const t of [
      "Strafft Gesicht und Hals operativ.",
      "Entspannt überaktive Kaumuskeln.",
      "Entfernt hartnäckige Fettpolster dauerhaft.",
      "Entfernt kleine Hautwucherungen.",
      "Metallfreie, natürlich wirkende Krone.",
      "Natürliche Vergrößerung mit eigenem Fett.",
      "Besonders sanfte, dosierte Anästhesie.",
      "Einfache Füllung, oft für Milchzähne.",
      "Pflegebett, meist leihweise.",
      "Löst kleine Fettpolster.",
      // Funde aus der Prüfung vom 17.11.2026, die das alte Muster durchließ
      "Moderne Immuntherapie bei Rheuma.",
      "Prothese, die auf Implantaten sicher einrastet.",
      "Hochwertige, unsichtbare Füllung in Schichttechnik.",
      "Wärme strafft Haut an Gesicht und Körper.",
      "Baut Fettpolster durch Kälte ab.",
      "Transparente Schienen korrigieren Zähne schrittweise.",
      "Feine Nadeln regen Hauterneuerung an.",
      "Herausnehmbare Spange, v. a. bei Kindern.",
      "Kasse zahlt i. d. R. nicht.",
      "Behandlung, in der Regel ambulant.",
      "Senkung des Augeninnendrucks.",
      "Schutz vor Lungenentzündung.",
      "Nadeln gegen chronische Schmerzen.",
      "Ganzer Kiefer mit Implantaten und sofortiger Brücke.",
    ])
      expect(verbotsfund(t), t).toBe(true);
    for (const t of ["Facelift ohne OP", "Brille weg", "Doppelkinn weg", "Hautverjüngung Laser", "sanfte Osteopathie", "Fox Eyes", "V-Shape", "Jawline slimming", "Hydro-Boost", "Hände jünger", "neues Lächeln"])
      expect(begriffsfund(t), t).not.toEqual([]);
    for (const t of [
      "Bestimmung der Sehstärke.",
      "Software für die Praxis.",
      "Hebamme begleitet die Geburt.",
      "Lösung zum Spülen.",
      "Formular ausfüllen.",
      "Entfernung von Zahnstein.",
      "Naturheilverfahren und Vielfalt.",
      "Häufigkeit nach Richtlinie.",
      "Kunststofffüllung, Stoffwechsel.",
      "Operation mit dem Ziel, Gesicht und Hals zu straffen.",
      "Durchsichtige Schienen mit dem Ziel, die Zahnstellung zu korrigieren.",
      "Stoffe, die die Kollagenbildung anregen sollen.",
      "Operation, bei der die Haut zwischen Nase und Oberlippe verkürzt wird.",
      "Vertretung, wenn Angehörige verhindert sind.",
      "Jährliche Impfung gegen Grippe.",
      "Sonderlinsen gegen Aufpreis.",
      "Beratung zur Natürlichen Familienplanung.",
      "Abklärung bei häufigem Harndrang.",
      "Unfall auf dem Weg zur Arbeit.",
      "Gläser für Kinder und Jugendliche.",
      "Versicherung und Sicherheit.",
      "Corona-Schnelltest.",
    ])
      expect(verbotsfund(t), t).toBe(false);
  });

  // Gegenprobe: die Texte, die am 17.11.2026 umgeschrieben wurden. Fast alle müssen anschlagen. Die wenigen Ausnahmen
  // hat das Muster nicht im Griff; sie stehen hier mit Grund und dürfen nicht mehr werden.
  it("die umgeschriebenen Werbetexte schlagen an (Gegenprobe)", () => {
    const AUSNAHMEN_ALT: Record<string, string> = {
      "Korrektur von Fehlsichtigkeit mit Laser.": "„Korrektur“ heißt auch der Eingriff selbst (Narbenkorrektur, Hallux-valgus-Korrektur).",
      "Minimalinvasive Laserkorrektur ohne Flap.": "wie oben; „minimalinvasiv“ ist ein Fachwort für Bauch- und Gelenkspiegelungen.",
      "Training für eine belastbare Stimme.": "„belastbar“ steht auch im neuen Satz, dort als Ziel.",
      "Private Zusatzversicherungen erstatten teilweise.": "Aussage über Dritte ohne Quelle; kein Wortmuster.",
    };
    expect(ALTE_TEXTE.length).toBe(170);
    for (const t of Object.keys(AUSNAHMEN_ALT)) expect(ALTE_TEXTE, t).toContain(t);
    const durch = ALTE_TEXTE.filter((t) => !verbotsfund(t));
    expect(durch.sort()).toEqual(Object.keys(AUSNAHMEN_ALT).sort());
  });

  it("Beschreibungen und Hinweise sprechen keine Wirkung zu und werben nicht (§ 3 HWG)", () => {
    const funde = LEISTUNGEN.flatMap((l) => [l.beschreibung, l.hinweis].filter((t) => verbotsfund(t)).map((t) => `${l.id}: ${t} → ${satzfund(t).join(", ")}`));
    expect(funde).toEqual([]);
  });

  // Namen bleiben vorerst, damit Adressen und Verweise gleich bleiben. Diese Namen werben noch; sie sind zur Entscheidung
  // offen (über id_name im Generator lässt sich ein Name ändern, ohne dass die Adresse wechselt). Die Liste darf nur kürzer werden.
  const NAMEN_OFFEN = [
    "Feste Zähne an einem Tag",
    "Unsichtbare Zahnspange",
    "Nasenkorrektur ohne OP",
    "Handverjüngung",
    "Fett-weg-Spritze",
    "IPL / Photoverjüngung",
    "Fett wegfrieren",
    "Intimbereich-Verjüngung",
  ];
  it("Fachbegriffe, Synonyme und Namen werben nicht (§ 3 HWG); werbende Namen nur aus der offenen Liste", () => {
    const funde = LEISTUNGEN.flatMap((l) => [l.fachbegriff, ...l.synonyme].filter((t) => begriffsfund(t).length).map((t) => `${l.id}: ${t}`));
    expect(funde).toEqual([]);
    expect(LEISTUNGEN.filter((l) => begriffsfund(l.name).length).map((l) => l.name)).toEqual(NAMEN_OFFEN);
  });

  // § 10 Abs. 1 HWG: keine Publikumswerbung für verschreibungspflichtige Arzneimittel. Handelsnamen solcher Mittel stehen
  // nicht in öffentlichen Texten; „Botox“ in elf Namen ist zur Entscheidung offen (Wirkstoff: Botulinumtoxin).
  it("keine Handelsnamen verschreibungspflichtiger Arzneimittel (§ 10 Abs. 1 HWG)", () => {
    const MARKE = /(?<!\p{L})(?:Botox|Wegovy|Mounjaro|Ozempic|Saxenda|Rybelsus|Victoza|Dysport|Xeomin|Bocouture|Azzalure|Vistabel)(?!\p{L})/iu;
    const funde = LEISTUNGEN.flatMap((l) => [l.fachbegriff, l.beschreibung, l.hinweis, ...l.synonyme].filter((t) => MARKE.test(t)).map((t) => `${l.id}: ${t}`));
    expect(funde).toEqual([]);
    const namen = LEISTUNGEN.filter((l) => MARKE.test(l.name)).map((l) => l.name);
    expect(namen.every((n) => /(?<!\p{L})Botox(?!\p{L})/u.test(n)), namen.join(", ")).toBe(true);
    expect(namen.length).toBeLessThanOrEqual(11);
  });

  it("Bleaching: Bedingungen nach VO (EG) 1223/2009, Anhang III Nr. 12 stehen beim Angebot", () => {
    const norm = "(VO (EG) 1223/2009, Anhang III Nr. 12).";
    const praxis = leistung("aesthetische-zahnmedizin-bleaching-in-der-praxis")!;
    const hause = leistung("aesthetische-zahnmedizin-bleaching-fuer-zu-hause")!;
    for (const l of [praxis, hause]) {
      expect(l.hinweis, l.id).toMatch(/^Zahnaufheller mit mehr als 0,1 % bis 6 % Wasserstoffperoxid \(enthalten oder freigesetzt\): nicht bei Personen unter 18 Jahren anwenden/);
      expect(l.hinweis.endsWith(norm), l.id).toBe(true);
      expect(l.synonyme.join(" "), l.id).not.toMatch(/power/i);
    }
    // Zu Hause: Abgabe nur an Zahnärzte, erste Anwendung je Zyklus durch sie oder unter ihrer direkten Aufsicht
    expect(hause.hinweis).toMatch(/Abgabe nur an Zahnärztinnen und Zahnärzte, erste Anwendung je Behandlungszyklus durch sie oder unter ihrer direkten Aufsicht/);
  });

  // § 34 Abs. 1 Satz 8 SGB V (gelesen am 17.11.2026; gesetze-im-internet.de war nicht erreichbar, Wortlaut über
  // sozialgesetzbuch-sgb.de): Arzneimittel, die überwiegend zur Abmagerung, zur Zügelung des Appetits oder zur Regulierung
  // des Körpergewichts dienen, sind von der Versorgung ausgeschlossen; Absatz 2 kennt dafür keine Ausnahme.
  it("Abnehmmedikamente: gesetzlicher Ausschluss statt „bei der Kasse fragen“", () => {
    const l = leistung("innere-medizin-medikamentoese-adipositastherapie")!;
    expect(l.hinweis).toMatch(/ausgeschlossen \(§ 34 Abs\. 1 Satz 8 SGB V\)/);
    expect(l.hinweis).not.toMatch(/fragen/);
  });

  it("Behandler: Neurochirurgie und Herzchirurgie haben eigene Fachärzte", () => {
    expect(leistung("chirurgie-neurochirurgische-eingriffe")?.behandler).toBe("Facharzt Neurochirurgie");
    expect(leistung("chirurgie-herzoperation")?.behandler).toBe("Facharzt Herzchirurgie");
  });
});
