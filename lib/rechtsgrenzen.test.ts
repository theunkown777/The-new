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
//   Das gilt für alles, was öffentlich steht: Name, Kategorie, Fachbegriff, Synonyme („Auch gesucht als“), Beschreibung,
//   Hinweis. Auch die Namen beschreiben das Verfahren („Kryolipolyse“) statt eine Wirkung zu versprechen („Fett wegfrieren“).
// - § 10 Abs. 1 HWG: keine Publikumswerbung für verschreibungspflichtige Arzneimittel, also keine Handelsnamen
//   („Botulinumtoxin“ statt „Botox“). Handelsnamen von Geräten und Medizinprodukten („Invisalign“, „CoolSculpting“) stehen
//   ebenfalls nicht in angezeigten Feldern. Wer so sucht, findet die Leistung trotzdem: Diese Wörter stehen nur im
//   Suchindex (NUR_SUCHE in lib/leistungskatalog.ts).
// - VO (EG) 1223/2009, Anhang III lfd. Nr. 12 (gelesen auf publications.europa.eu, VO (EU) 344/2013 und RL 2011/84/EU):
//   Zahnaufheller mit mehr als 0,1 % bis 6 % Wasserstoffperoxid „Nicht bei Personen unter 18 Jahren anwenden“; nur an
//   Zahnärzte abzugeben, erste Anwendung je Behandlungszyklus durch Zahnärzte oder unter ihrer direkten Aufsicht.
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { ALLE_SPECIALTIES } from "./specialties";
import { LEISTUNGEN, leistung } from "./leistungskatalog";
import { ANAMNESE_FRAGEN } from "./anamneseProfile";
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
        "hollywood\\p{L}*|\\p{L}*(?:facelift|lifting|korrektur|straffung) ohne op|neue[nsm]? lächeln\\p{L}*|an einem tag|in einem tag|\\p{L}*wegfrier\\p{L}*|" +
        // Geräte- und Spritzenbehandlungen, die eine Wirkung im Namen tragen („Ultraschall-Lifting“, „Vampir-Lifting“)
        "\\p{L}*weglaser\\p{L}*|\\p{L}*makeover|vampir\\p{L}*|liquid[- ](?:face)?lift\\p{L}*|\\d+-punkt-lift|nefertiti[- ]lift|\\p{L}*browlift|" +
        "body[- ]?contouring|same-?day\\p{L}*|\\d+-minuten-\\p{L}+|(?:ultraschall|radiofrequenz|rf|hifu)-?(?:lifting|straffung)|" +
        // „Fett weg“ in jeder Schreibweise („Fett-Weg-Spritze“, „Fettwegspritze“) und das Umgangswort für GLP-1-Mittel
        "\\p{L}*fett[- ]?weg\\p{L}*|\\p{L}*abnehmspritze\\p{L}*",
    ),
    "iu",
  );
  // Preis als Lockmittel („Hörtest kostenlos“). Nur in Namen, Fachbegriffen und Synonymen: Eine Beschreibung darf sagen,
  // dass eine Pflichtleistung nichts kostet („Kostenlose Beratung“ nach § 7a SGB XI).
  const PREIS = /(?<!\p{L})(?:kostenlos\p{L}*|gratis|umsonst)(?!\p{L})/iu;
  // Tempo oder „ohne Eingriff“ als Vorteil („Implantat am selben Tag“, „ohne Bohren“). Nur in Namen, Fachbegriffen und
  // Synonymen: Eine Beschreibung darf sagen, was in einer Sitzung geschieht oder dass ohne Operation behandelt wird.
  const TEMPO = new RegExp(W("ohne (?:op|operation|skalpell|bohren)|am (?:selben|gleichen) tag|in einer sitzung|schnittarm\\p{L}*"), "iu");
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
  const wortfund = (t: string, muster: RegExp[]) => {
    const x = ohneFachwort(t);
    return muster.map((r) => x.match(r)?.[0]).filter((m): m is string => !!m);
  };
  /** Für Namen, Kategorien, Fachbegriffe und Synonyme (Stichworte, keine Sätze). */
  const begriffsfund = (t: string) => wortfund(t, [WERBUNG, WEG, MENGE, PREIS, TEMPO]);
  /** Für Beschreibungen und Hinweise. */
  const satzfund = (t: string) => {
    const x = ohneFachwort(t);
    const f = wortfund(t, [WERBUNG, WEG, MENGE, WIRKUNG_SG, WIRKUNG_PL]);
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
    for (const t of ["Facelift ohne OP", "Brille weg", "Doppelkinn weg", "Hautverjüngung Laser", "sanfte Osteopathie", "Fox Eyes", "V-Shape", "Jawline slimming", "Hydro-Boost", "Hände jünger", "neues Lächeln",
      // frühere Namen und Synonyme, umbenannt am 17.11.2026
      "Vampir-Lifting", "Komplettes Smile Makeover", "Mommy Makeover", "Ultraschall-Lifting", "Radiofrequenz-Straffung", "RF-Straffung", "Liquid Facelift", "Liquid Lift", "8-Punkt-Lift",
      "Nefertiti Lift", "Chemisches Browlift", "Body Contouring", "Same-Day-Krone", "15-Minuten-Nase", "Haare weglasern", "Tattoo weglasern", "Hörtest kostenlos",
      // Funde der zweiten Prüfung vom 17.11.2026
      "Fett-Weg-Spritze", "Fettweg-Spritze", "Fettwegspritze", "Fett Weg", "FETT-WEG", "Straffung ohne OP", "Abnehmspritze", "Abnehmspritzen",
      "Zahnersatz in einer Sitzung (CAD/CAM)", "Implantat am selben Tag", "Initialkaries ohne Bohren", "schnittarmes Lasern", "Nase ohne Operation"])
      expect(begriffsfund(t), t).not.toEqual([]);
    // Fachbezeichnungen von Operationen und neutrale neue Namen schlagen nicht an
    for (const t of ["Facelift", "Fadenlifting", "Sinuslift", "Bodylift", "Lippenlift", "Bruststraffung", "Kryolipolyse (Kältebehandlung)", "Radiofrequenz-Behandlung der Haut",
      "Ultraschall-Behandlung der Haut", "Eigenbluttherapie (PRP) im Gesicht", "Arbeits- und Wegeunfall", "Wegeunfall", "Fettgewebe", "Fett absaugen",
      "Abnehmen", "Sofortimplantat", "Veneers ohne Beschleifen", "Physio ohne Rezept", "In der Praxis gefräster Zahnersatz (CAD/CAM)",
      "Feste Brücke auf Implantaten im zahnlosen Kiefer", "Fokussierter Ultraschall (HIFU) an Gesicht und Hals", "Muskelstimulation per Gerät"])
      expect(begriffsfund(t), t).toEqual([]);
    // In Sätzen bleibt „ohne Operation“ eine Beschreibung (konservative Therapie)
    expect(verbotsfund("Behandlung ohne OP: Medikamente, Spritzen, Physio."), "Rückenschmerz-Therapie").toBe(false);
    expect(verbotsfund("Kostenlose Beratung für Pflegebedürftige und Angehörige."), "Pflichtleistung nach § 7a SGB XI").toBe(false);
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

  // Namen werden über id_name im Generator geändert, ohne dass die Adresse /leistungen/<id> wechselt. Seit dem 17.11.2026
  // wirbt kein Name mehr; frühere Namen helfen nur noch in der Suche (NUR_SUCHE).
  it("Namen, Kategorien, Fachbegriffe und Synonyme werben nicht (§ 3 HWG)", () => {
    const funde = LEISTUNGEN.flatMap((l) => [l.name, l.kategorie, l.fachbegriff, ...l.synonyme].filter((t) => begriffsfund(t).length).map((t) => `${l.id}: ${t} → ${begriffsfund(t).join(", ")}`));
    expect(funde).toEqual([]);
  });

  // Bei Spritzen und Geräten (Ästhetische Medizin, weitere Selbstzahler-Eingriffe) ist die Wirkung nicht sicher. Namen,
  // Fachbegriffe und Synonyme nennen deshalb Wirkstoff, Ort oder Verfahren („Botulinumtoxin an den Augenbrauen“), nicht die
  // Wirkung als Stichwort („Augenbrauen anheben“, „Kinn vergrößern“). Bei Operationen und am Zahn ist das Verb der Eingriff
  // selbst („Oberschenkel innen straffen“, „Zahnkanten glätten“) und bleibt.
  const ZIELVERB = new RegExp(
    W("anheben|heben|liften|verschmälern|schmaler|betonen|vergrößern|verkleinern|glätten|straffen|verjüngen|verlängern|verschönern|aufpolstern|definieren"),
    "iu",
  );
  const MIT_UNSICHERER_WIRKUNG = ["Ästhetische Medizin (minimal-invasiv)", "Weitere Selbstzahler-Eingriffe"];
  it("Spritzen und Geräte: keine Wirkung als Stichwort (§ 3 HWG)", () => {
    for (const t of ["Augenbrauen anheben mit Botulinumtoxin", "Brauen anheben", "Kaumuskel verkleinern", "Gesicht verschmälern", "Kinn vergrößern", "Wangenknochen betonen", "Narben glätten"])
      expect(ZIELVERB.test(t), t).toBe(true);
    for (const t of ["Botulinumtoxin an den Augenbrauen", "Nasolabialfalten auffüllen", "Filler auflösen", "Kinnaufbau mit Filler", "Narbenbehandlung"]) expect(ZIELVERB.test(t), t).toBe(false);
    const funde = LEISTUNGEN.filter((l) => MIT_UNSICHERER_WIRKUNG.includes(l.bereich)).flatMap((l) => [l.name, l.fachbegriff, ...l.synonyme].filter((t) => ZIELVERB.test(t)).map((t) => `${l.id}: ${t}`));
    expect(funde).toEqual([]);
  });

  // § 10 Abs. 1 HWG: keine Publikumswerbung für verschreibungspflichtige Arzneimittel. Kein Handelsname steht in einem
  // angezeigten Feld (Seite, Titel und Meta-Angaben von /leistungen/<id>, Karten, „Auch gesucht als“, Fachseiten); genannt wird
  // der Wirkstoff. Dasselbe gilt für Handelsnamen von Geräten und Medizinprodukten.
  const MARKE = new RegExp(
    W(
      // verschreibungspflichtige Arzneimittel und Impfstoffe
      "Botox|Wegovy|Mounjaro|Ozempic|Saxenda|Rybelsus|Victoza|Dysport|Xeomin|Bocouture|Azzalure|Vistabel|Shingrix|" +
        // Filler und Biostimulatoren
        "Juv[eé]derm|Restylane|Belotero|Profhilo|Sculptra|Radiesse|Rejuran|" +
        // Geräte und Verfahren mit Markennamen
        "Invisalign|Incognito|Lumineers|Emax|e\\.max|CEREC|iTero|DIAGNOdent|Air-?Flow|Emdogain|The Wand|Locator|All-on-[46]|Twinkles|" +
        "Ultherapy|Thermage|Morpheus8|Potenza|Fraxel|Dermapen|Vaser|CoolSculpting|Emsculpt|Hydra-?facial|Aquafacial|Vampire Facial|Fotofinder|ReLEx|" +
        // Verfahrens- und Produktnamen von Herstellern (HIFEM: BTL; Kinesio: Kinesio Holding; Digital Smile Design; A-PRF)
        "HIFEM|Kinesio[- ]?tap\\p{L}*|Digital Smile Design|A-PRF\\+?|i-PRF",
    ),
    "iu",
  );
  // In Großbuchstaben oder als Eigenname eindeutig („SMILE“ von Zeiss, „Icon“ von DMG); klein geschrieben sind es Wörter.
  // Dazu Abkürzungen, die als Marke eingetragen sind (DHI, DSD, ICL).
  const MARKE_GROSS = /(?<!\p{L})(?:SMILE|Icon|DHI|DSD|ICL)(?!\p{L})/u;
  const istMarke = (t: string) => MARKE.test(t) || MARKE_GROSS.test(t);
  const angezeigt = (l: (typeof LEISTUNGEN)[number]) => [l.bereich, l.kategorie, l.name, l.fachbegriff, ...l.synonyme, l.beschreibung, l.hinweis, l.behandler, l.kostentraeger];

  it("keine Handelsnamen in angezeigten Feldern (§ 10 Abs. 1 HWG, § 3 HWG)", () => {
    const funde = LEISTUNGEN.flatMap((l) => angezeigt(l).filter(istMarke).map((t) => `${l.id}: ${t}`));
    expect(funde).toEqual([]);
    expect(LEISTUNGEN.filter((l) => /botox/i.test(angezeigt(l).join(" "))).map((l) => l.id)).toEqual([]);
  });

  it("Gegenprobe: frühere Namen und Synonyme mit Handelsnamen schlagen an", () => {
    for (const t of [
      "Botox gegen Zähneknirschen", "Botox bei Gummy Smile", "Botox Zornesfalte", "Botox Stirnfalten", "Botox Krähenfüße", "Brauenlifting mit Botox",
      "Botox Kinn & Mundwinkel", "Botox Hals", "Gesicht verschmälern (Masseter-Botox)", "Botox bei Migräne", "Botox in die Blase", "Botulinumtoxin (Botox)",
      "Zahnersatz in einer Sitzung (CEREC)", "Hydrafacial", "Augenlasern (SMILE)", "Kariesinfiltration (Icon)", "All-on-4 / All-on-6 Sofortversorgung",
      "HIFU (z. B. Ultherapy)", "Monopolare Radiofrequenz (z. B. Thermage)", "Hyaluron-Skinbooster (z. B. Profhilo)", "Liposuktion (Tumeszenz, Vaser)",
      "Computergestützte Anästhesie (z. B. The Wand)", "Implantatprothese (Locator/Steg)", "Dental Jewelry / Twinkles", "Zirkonkrone, Keramikkrone, Emax",
      "Invisalign", "CoolSculpting", "Emsculpt", "Juvederm", "Shingrix", "Fotofinder", "Vampire Facial", "Morpheus8, Potenza",
      // Funde der zweiten Prüfung vom 17.11.2026
      "Muskelstimulation per Gerät (HIFEM/EMS)", "FUE / DHI-Haartransplantation", "Kinesio-Taping", "Kinesiotape", "Digital Smile Design (DSD)",
      "Refraktiver Linsenaustausch / ICL", "Eigenblut Wundheilung, A-PRF",
    ])
      expect(istMarke(t), t).toBe(true);
    for (const t of ["Digitales Smile Design", "Gummy Smile", "Botulinumtoxin an der Stirn", "Lentikelextraktion", "Wandern", "Lokator", "Kinesiologisches Taping", "Kinesiologie",
      "Elektromagnetische oder elektrische Muskelstimulation (EMS)", "phake Intraokularlinse", "Plättchenreiches Fibrin (PRF)"]) expect(istMarke(t), t).toBe(false);
  });

  // Nicht nur der Katalog: Kein angezeigter Text nennt „Botox“ oder „Fett weg“, in keiner Sprache. Durchsucht werden alle
  // Quellen der Seiten (app, components, lib mit Fachseiten, Ratgeber und Übersetzungen). Adressen (/leistungen/…-botox-…)
  // bleiben gleich und zählen nicht.
  it("„Botox“ und „Fett weg“ stehen in keinem angezeigten Text", () => {
    const ERLAUBT: Record<string, string> = {
      "lib/leistungskatalog.ts": "NUR_SUCHE, nur im Suchindex, nie angezeigt",
      "lib/anlassErkennung.ts": "Erkennungswort für den Freitext der Praxis (Fachkreise); wird nicht angezeigt",
      "lib/handelsnamen.ts": "Umleitung der öffentlichen Suche vom Handelsnamen auf den Wirkstoff; nie angezeigt",
    };
    const wurzel = path.resolve(__dirname, "..");
    const dateien: string[] = [];
    const lauf = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = path.join(d, n);
        if (statSync(p).isDirectory()) {
          if (n !== "__fixtures__" && n !== "node_modules") lauf(p);
        } else if (/\.(tsx?|json|md)$/.test(n) && !/\.test\.tsx?$/.test(n)) dateien.push(path.relative(wurzel, p));
      }
    };
    for (const d of ["app", "components", "lib"]) lauf(path.join(wurzel, d));
    expect(dateien.length).toBeGreaterThan(300);
    const funde: string[] = [];
    for (const f of dateien) {
      if (ERLAUBT[f]) continue;
      const text = readFileSync(path.join(wurzel, f), "utf8");
      for (const m of text.matchAll(/[\p{L}\d-]*(?:botox|fett[- ]?weg)[\p{L}\d-]*/giu)) {
        if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(m[0])) continue; // Adresse /leistungen/<id>
        funde.push(`${f}: ${m[0]}`);
      }
    }
    expect(funde).toEqual([]);
    for (const f of Object.keys(ERLAUBT)) expect(dateien, f).toContain(f);
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

  // Der Anamnesebogen ist öffentlich (/a, /portal, /api/demo): Beispiele nennen den Wirkstoff, keinen Handelsnamen.
  it("Anamnesefragen nennen Wirkstoffe statt Handelsnamen (§ 10 Abs. 1 HWG)", () => {
    const GERINNUNG = /(?<!\p{L})(?:Marcumar|Falithrom|Eliquis|Xarelto|Lixiana|Pradaxa|Plavix|Brilique|Efient|Aspirin)(?!\p{L})/iu;
    const funde = Object.values(ANAMNESE_FRAGEN).flatMap((f) =>
      [f.text, f.textEltern, f.detail, f.hinweis?.text].filter((t): t is string => !!t && (istMarke(t) || GERINNUNG.test(t))).map((t) => `${f.key}: ${t}`),
    );
    expect(funde).toEqual([]);
    expect(ANAMNESE_FRAGEN.blutverduenner.text).toContain("Phenprocoumon, Apixaban oder Rivaroxaban");
    expect(GERINNUNG.test("z. B. ASS, Marcumar, Eliquis, Xarelto")).toBe(true);
  });

  it("Behandler: Neurochirurgie und Herzchirurgie haben eigene Fachärzte", () => {
    expect(leistung("chirurgie-neurochirurgische-eingriffe")?.behandler).toBe("Facharzt Neurochirurgie");
    expect(leistung("chirurgie-herzoperation")?.behandler).toBe("Facharzt Herzchirurgie");
  });
});
