// Abgleich mit dem IGeL-Monitor des Medizinischen Dienstes (igel-monitor.de): Jede Bewertung, die er zu einer Leistung
// veröffentlicht, steht entweder beim passenden Angebot des Katalogs (lib/specialties.ts, lib/fachangebote.ts) oder hier
// mit Grund, warum sie zu keinem Angebot passt. So hängt es nicht von der Bewertung ab, ob sie genannt wird: positive,
// unklare und negative stehen nach derselben Regel beim Angebot (Grundsatz „Nutzen nur mit Quelle“, components/Grundsaetze.tsx).
//
// UEBERSICHT ist der Stand der Übersicht https://igel-monitor.de/igel-a-z.html, abgerufen am 17.11.2026: je Seite der
// Titel (h1) und die markierte Bewertungsstufe (null: Die Seite informiert, bewertet aber nicht).
//
// Nachprüfen gegen die Seiten selbst (Netz nötig, sonst übersprungen):
//   IGEL_MONITOR_ONLINE=1 npx vitest run lib/igelMonitor.test.ts
// Hinter einem Proxy zusätzlich NODE_USE_ENV_PROXY=1 setzen. Ein Fehlschlag heißt: Der IGeL-Monitor hat eine Seite neu
// angelegt, entfernt, umbenannt oder neu bewertet. Dann Katalog, UEBERSICHT und OHNE_ANGEBOT nachziehen.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALLE_SPECIALTIES } from "./specialties";
import { DENTAL_SHOWCASE } from "./dentalShowcase";
import { IGEL_MONITOR, quellenListe, type IgelStufe } from "./nutzenQuelle";

const UEBERSICHT: Record<string, { titel: string; stufe: IgelStufe | null }> = {
  "akupunktur-in-der-schwangerschaft": { titel: "Akupunktur in der Schwangerschaft", stufe: "unklar" },
  "akupunktur-zur-vorbeugung-von-migraeneanfaellen": { titel: "Akupunktur zur Vorbeugung von Migräneanfällen", stufe: "tendenziell positiv" },
  "akupunktur-zur-vorbeugung-von-spannungskopfschmerzen": { titel: "Akupunktur zur Vorbeugung von Spannungskopfschmerzen", stufe: "unklar" },
  "atteste-und-gutachten": { titel: "Atteste und Gutachten", stufe: null },
  "augenspiegelung-mit-augeninnendruckmessung-zur-glaukom-frueherkennung": { titel: "Augenspiegelung mit Augeninnendruckmessung zur Glaukom-Früherkennung", stufe: "tendenziell negativ" },
  "biofeedback-therapie-bei-migraene": { titel: "Biofeedback-Therapie bei Migräne", stufe: "unklar" },
  "blutegeltherapie-bei-kniearthrose": { titel: "Blutegeltherapie bei Kniearthrose", stufe: "tendenziell negativ" },
  "blutuntersuchung-zur-frueherkennung-von-schilddruesenfunktionsstoerungen": { titel: "Blutuntersuchung zur Früherkennung von Schilddrüsenfunktionsstörungen", stufe: "tendenziell negativ" },
  "botox-gegen-schwitzen": { titel: "Botox gegen Schwitzen", stufe: "unklar" },
  "colon-hydro-therapie": { titel: "Colon-Hydro-Therapie", stufe: "negativ" },
  "computertomographie-ct-zur-frueherkennung-schwerer-krankheiten": { titel: "Computertomographie (CT) zur Früherkennung von Krankheiten", stufe: null },
  "dermatoskopie-zur-frueherkennung-von-hautkrebs": { titel: "Dermatoskopie zur Früherkennung von Hautkrebs", stufe: null },
  "duennschichtzytologie-zur-frueherkennung-von-gebaermutterhalskrebs-ausserhalb-der-regulaeren-frueherkennungsuntersuchungen": { titel: "Dünnschichtzytologie zur Früherkennung von Gebärmutterhalskrebs (außerhalb der regulären Früherkennungsuntersuchungen)", stufe: null },
  "durchblutungsfoerdernde-infusionstherapie-beim-hoersturz": { titel: "Durchblutungsfördernde Infusionstherapie beim Hörsturz", stufe: "negativ" },
  "eigenbluttherapie-bei-tendinopathie": { titel: "Eigenbluttherapie bei Tendinopathie", stufe: "tendenziell negativ" },
  "ekg-zur-frueherkennung-einer-koronaren-herzerkrankung": { titel: "EKG zur Früherkennung einer koronaren Herzerkrankung", stufe: "tendenziell negativ" },
  "entfernung-von-taetowierungen": { titel: "Entfernung von Tätowierungen", stufe: null },
  "frueherkennung-auf-vitamin-b12-mangel-und-vitamingabe": { titel: "Früherkennung auf Vitamin-B12-Mangel und Vitamingabe", stufe: "unklar" },
  "frueherkennungsuntersuchung-auf-vitamin-d-mangel": { titel: "Früherkennungsuntersuchung auf Vitamin-D-Mangel", stufe: "unklar" },
  "glukokortikoide-beim-hoersturz": { titel: "Glukokortikoide beim Hörsturz", stufe: "tendenziell negativ" },
  "hba1c-bestimmung-zur-frueherkennung-eines-typ-2-diabetes": { titel: "HbA1c-Bestimmung zur Früherkennung eines Typ-2-Diabetes", stufe: "unklar" },
  "heidelberg-retina-tomographie-zur-glaukom-frueherkennung": { titel: "Heidelberg Retina Tomographie zur Glaukom-Früherkennung", stufe: "tendenziell negativ" },
  "help-apherese-zur-behandlung-von-long-post-covid": { titel: "H.E.L.P.-Apherese zur Behandlung von Long-/Post-COVID", stufe: "unklar" },
  "hirnleistungs-check-zur-frueherkennung-einer-demenz": { titel: "Hirnleistungs-Check zur Früherkennung einer Demenz", stufe: "tendenziell negativ" },
  "hochtontherapie": { titel: "Hochtontherapie", stufe: "unklar" },
  "hyperbare-sauerstofftherapie-beim-hoersturz": { titel: "Hyperbare Sauerstofftherapie beim Hörsturz", stufe: "tendenziell negativ" },
  "hyperbare-sauerstofftherapie-zur-behandlung-von-long-post-covid": { titel: "Hyperbare Sauerstofftherapie zur Behandlung von Long-/Post-COVID", stufe: "unklar" },
  "immun-apherese-zur-behandlung-von-long-post-covid": { titel: "Immun-Apherese zur Behandlung von Long-/Post-COVID", stufe: "unklar" },
  "immunglobulin-g-bestimmung-zur-diagnose-einer-nahrungsmittelallergie": { titel: "Immunglobulin G-Bestimmung zur Diagnose einer Nahrungsmittelallergie", stufe: "negativ" },
  "immunprophylaxe-mit-uro-vaxomr-zur-vorbeugung-wiederkehrender-blasenentzuendungen": { titel: "Immunprophylaxe mit Uro-Vaxom® zur Vorbeugung wiederkehrender Blasenentzündungen", stufe: "tendenziell positiv" },
  "impfung-mit-strovacr-zur-vorbeugung-wiederkehrender-blasenentzuendungen": { titel: "Impfung mit StroVac® zur Vorbeugung wiederkehrender Blasenentzündungen", stufe: "tendenziell negativ" },
  "kunsttherapie-bei-krebserkrankungen-fuer-betroffene-und-deren-angehoerige": { titel: "Kunsttherapie bei Krebserkrankungen für Betroffene und deren Angehörige", stufe: "unklar" },
  "kunsttherapie-bei-psychischen-erkrankungen": { titel: "Kunsttherapie bei psychischen Erkrankungen", stufe: "unklar" },
  "laser-behandlung-von-blutschwaemmchen-beim-saeugling": { titel: "Laser-Behandlung von Blutschwämmchen beim Säugling", stufe: "tendenziell negativ" },
  "laser-behandlung-von-krampfadern": { titel: "Laser-Behandlung von Krampfadern", stufe: "unklar" },
  "lasertherapie-bei-nagelpilz": { titel: "Lasertherapie bei Nagelpilz", stufe: "unklar" },
  "lichttherapie-bei-akne": { titel: "Lichttherapie bei Akne", stufe: "unklar" },
  "lichttherapie-zur-behandlung-von-symptomen-einer-saisonalen-depressiven-stoerung-winterdepression": { titel: "Lichttherapie zur Behandlung von Symptomen einer saisonalen depressiven Störung („Winterdepression“)", stufe: "tendenziell positiv" },
  "lichttherapie-zur-vorbeugung-von-symptomen-einer-saisonalen-depressiven-stoerung-winterdepression": { titel: "Lichttherapie zur Vorbeugung von Symptomen einer saisonalen depressiven Störung („Winterdepression“)", stufe: "unklar" },
  "m2-pk-test-zur-frueherkennung-von-darmkrebs": { titel: "M2-PK-Test zur Früherkennung von Darmkrebs", stufe: "unklar" },
  "mrt-der-brust-zur-krebsfrueherkennung": { titel: "MRT der Brust zur Krebsfrüherkennung", stufe: "unklar" },
  "mrt-zur-frueherkennung-einer-alzheimer-demenz": { titel: "MRT zur Früherkennung einer Alzheimer-Demenz", stufe: "tendenziell negativ" },
  "oct-zur-frueherkennung-einer-feuchten-altersbedingten-makuladegeneration-namd": { titel: "OCT zur Früherkennung einer feuchten, altersbedingten Makuladegeneration (nAMD)", stufe: "tendenziell negativ" },
  "oct-zur-frueherkennung-eines-glaukoms": { titel: "OCT zur Früherkennung eines Glaukoms", stufe: "tendenziell negativ" },
  "operative-behandlung-des-schnarchens-rhonchopathie": { titel: "Operative Behandlung des Schnarchens (Rhonchopathie)", stufe: "tendenziell negativ" },
  "osteopathie-bei-unspezifischen-kreuzschmerzen": { titel: "Osteopathie bei unspezifischen Kreuzschmerzen", stufe: "unklar" },
  "ozon-eigenbluttherapie-zur-behandlung-von-long-post-covid": { titel: "Ozon-Eigenbluttherapie zur Behandlung von Long-/Post-COVID", stufe: "unklar" },
  "professionelle-zahnreinigung-pzr-der-igel-monitor-informiert": { titel: "Professionelle Zahnreinigung (PZR) – der IGeL-Monitor informiert", stufe: null },
  "protein-c-bestimmung-zur-einschaetzung-des-thrombose-risikos": { titel: "Protein C-Bestimmung zur Einschätzung des Thrombose-Risikos", stufe: "tendenziell negativ" },
  "psa-test-zur-frueherkennung-von-prostatakrebs": { titel: "PSA-Test zur Früherkennung von Prostatakrebs", stufe: "tendenziell negativ" },
  "reisemedizinische-vorsorge": { titel: "Reisemedizinische Vorsorge", stufe: null },
  "spirometrie-zur-ueberpruefung-der-lungenfunktion": { titel: "Spirometrie zur Überprüfung der Lungenfunktion", stufe: "tendenziell negativ" },
  "sport-check": { titel: "Sport-Check", stufe: null },
  "statische-magnetfeldtherapie-beim-kreuzschmerz": { titel: "Statische Magnetfeldtherapie beim Kreuzschmerz", stufe: "unklar" },
  "stosswellentherapie-beim-fersenschmerz": { titel: "Stoßwellentherapie beim Fersenschmerz", stufe: null },
  "stosswellentherapie-beim-tennisarm": { titel: "Stoßwellentherapie beim Tennisarm", stufe: "unklar" },
  "stosswellentherapie-der-kalkschulter": { titel: "Stoßwellentherapie der Kalkschulter", stufe: "unklar" },
  "streptokokken-test-in-der-schwangerschaft": { titel: "Streptokokken-Test in der Schwangerschaft", stufe: "unklar" },
  "toxoplasmose-test-bei-schwangeren": { titel: "Toxoplasmose-Test bei Schwangeren", stufe: "unklar" },
  "ultraschall-der-blase-zur-frueherkennung-von-harnblasenkrebs": { titel: "Ultraschall der Blase zur Früherkennung von Harnblasenkrebs", stufe: "tendenziell negativ" },
  "ultraschall-der-brust-zur-krebsfrueherkennung": { titel: "Ultraschall der Brust zur Krebsfrüherkennung", stufe: "unklar" },
  "ultraschall-der-eierstoecke-zur-krebsfrueherkennung": { titel: "Ultraschall der Eierstöcke zur Krebsfrüherkennung", stufe: "negativ" },
  "ultraschall-der-halsschlagadern-zur-schlaganfallvorsorge": { titel: "Ultraschall der Halsschlagadern zur Schlaganfallvorsorge", stufe: "tendenziell negativ" },
  "ultraschall-der-nieren-zur-frueherkennung-von-nierenkrebs": { titel: "Ultraschall der Nieren zur Früherkennung von Nierenkrebs", stufe: "tendenziell negativ" },
  "ultraschall-in-der-schwangerschaft-ergaenzende-untersuchungen": { titel: "Ultraschall in der Schwangerschaft (ergänzende Untersuchungen)", stufe: null },
  "ultraschall-zur-frueherkennung-von-gebaermutterkoerperkrebs": { titel: "Ultraschall zur Früherkennung von Gebärmutterkörperkrebs", stufe: "tendenziell negativ" },
  "ultraschall-zur-frueherkennung-von-prostatakrebs": { titel: "Ultraschall zur Früherkennung von Prostatakrebs", stufe: "tendenziell negativ" },
  "ultraschall-zur-frueherkennung-von-veraenderungen-der-schilddruese": { titel: "Ultraschall zur Früherkennung von Veränderungen der Schilddrüse", stufe: "tendenziell negativ" },
  "urinanalysen-zur-frueherkennung-von-harnblasenkrebs": { titel: "Urinanalysen zur Früherkennung von Harnblasenkrebs", stufe: "tendenziell negativ" },
};

const KEIN_HOERSTURZ = "Kein Angebot zur Behandlung eines Hörsturzes im Katalog.";
const KEIN_LONG_COVID = "Kein Angebot zur Behandlung von Long-/Post-COVID im Katalog.";

/** Bewertete Seiten, die zu keinem Angebot des Katalogs passen, mit Grund. */
const OHNE_ANGEBOT: Record<string, string> = {
  "biofeedback-therapie-bei-migraene": "Kein Angebot mit Biofeedback im Katalog.",
  "blutegeltherapie-bei-kniearthrose": "Kein Angebot mit Blutegeltherapie im Katalog.",
  "botox-gegen-schwitzen": "Kein Angebot gegen starkes Schwitzen; Botulinum steht nur als Faltenbehandlung im Katalog (aesthetik/botulinum).",
  "colon-hydro-therapie": "Kein Angebot mit Colon-Hydro-Therapie im Katalog.",
  "durchblutungsfoerdernde-infusionstherapie-beim-hoersturz": KEIN_HOERSTURZ,
  "eigenbluttherapie-bei-tendinopathie": "Kein Angebot mit Eigenbluttherapie im Katalog.",
  "frueherkennung-auf-vitamin-b12-mangel-und-vitamingabe": "Das Labor-Paket (hausarzt/labor_plus) umfasst Vitamin D und Schilddrüsenwerte, kein Vitamin B12.",
  "glukokortikoide-beim-hoersturz": KEIN_HOERSTURZ,
  "heidelberg-retina-tomographie-zur-glaukom-frueherkennung": "Keine Heidelberg Retina Tomographie im Katalog; die Glaukom-Vorsorge nennt Augenspiegelung, Druckmessung und OCT (beide bewertet und zitiert).",
  "help-apherese-zur-behandlung-von-long-post-covid": KEIN_LONG_COVID,
  "hochtontherapie": "Kein Angebot mit Hochtontherapie im Katalog.",
  "hyperbare-sauerstofftherapie-beim-hoersturz": KEIN_HOERSTURZ,
  "hyperbare-sauerstofftherapie-zur-behandlung-von-long-post-covid": KEIN_LONG_COVID,
  "immun-apherese-zur-behandlung-von-long-post-covid": KEIN_LONG_COVID,
  "immunglobulin-g-bestimmung-zur-diagnose-einer-nahrungsmittelallergie": "Kein IgG-Test auf Nahrungsmittel im Katalog; gastro/atemtest_igel ist ein Atemtest auf Laktose oder Fruktose.",
  "immunprophylaxe-mit-uro-vaxomr-zur-vorbeugung-wiederkehrender-blasenentzuendungen":
    "Die Bewertung gilt laut Seite ausschließlich für ein bestimmtes Arzneimittel (Markenname) und für nicht-schwangere Frauen ohne Begleiterkrankungen; das Angebot uro/uro_hwi_immun nennt kein Präparat. Ob der Markenname eines Arzneimittels in Patiententexten und auf den öffentlichen Fachseiten stehen darf (Heilmittelwerbegesetz), ist rechtlich zu klären.",
  "impfung-mit-strovacr-zur-vorbeugung-wiederkehrender-blasenentzuendungen": "Die Bewertung gilt laut Seite ausschließlich für einen bestimmten Impfstoff zum Spritzen; uro/uro_hwi_immun sind Kapseln zum Einnehmen.",
  "kunsttherapie-bei-krebserkrankungen-fuer-betroffene-und-deren-angehoerige": "Kein Angebot mit Kunsttherapie im Katalog.",
  "kunsttherapie-bei-psychischen-erkrankungen": "Kein Angebot mit Kunsttherapie im Katalog.",
  "laser-behandlung-von-blutschwaemmchen-beim-saeugling": "Kein Angebot für Säuglinge; haut/laser_gefaesse ist eine ästhetische Behandlung kleiner Gefäße.",
  "laser-behandlung-von-krampfadern": "Kein Laser gegen Krampfadern im Katalog; chirurgie/besenreiser ist eine Verödung von Besenreisern.",
  "lasertherapie-bei-nagelpilz": "Kein Angebot gegen Nagelpilz im Katalog.",
  "lichttherapie-bei-akne": "Keine Lichttherapie bei Akne im Katalog; haut/haut_peeling ist ein chemisches Peeling.",
  "lichttherapie-zur-behandlung-von-symptomen-einer-saisonalen-depressiven-stoerung-winterdepression": "Keine Lichttherapie bei Winterdepression im Katalog.",
  "lichttherapie-zur-vorbeugung-von-symptomen-einer-saisonalen-depressiven-stoerung-winterdepression": "Keine Lichttherapie bei Winterdepression im Katalog.",
  "m2-pk-test-zur-frueherkennung-von-darmkrebs": "Kein M2-PK-Test im Katalog; gastro/ifobt ist ein immunologischer Stuhltest auf Blut.",
  "mrt-der-brust-zur-krebsfrueherkennung": "Keine MRT der Brust im Katalog; radiologie/mrt_igel nennt keine Körperregion, radiologie/ganzkoerper_mrt ist eine MRT des ganzen Körpers.",
  "mrt-zur-frueherkennung-einer-alzheimer-demenz": "Keine MRT zur Früherkennung einer Demenz im Katalog; radiologie/mrt_igel nennt weder Körperregion noch Zweck.",
  "ozon-eigenbluttherapie-zur-behandlung-von-long-post-covid": KEIN_LONG_COVID,
  "operative-behandlung-des-schnarchens-rhonchopathie": "Keine Operation gegen Schnarchen im Katalog; hno/schnarch_igel ist eine Diagnostik.",
  "protein-c-bestimmung-zur-einschaetzung-des-thrombose-risikos": "Keine Bestimmung von Protein C im Katalog.",
  "statische-magnetfeldtherapie-beim-kreuzschmerz": "Keine statische Magnetfeldtherapie im Katalog; uro/uro_inko_magnet ist eine Magnetstimulation des Beckenbodens.",
  "streptokokken-test-in-der-schwangerschaft": "Kein Streptokokken-Test im Katalog.",
  "ultraschall-zur-frueherkennung-von-prostatakrebs": "Kein Ultraschall der Prostata im Katalog; uro/us_uro umfasst Nieren und Blase (beide bewertet und zitiert).",
  "urinanalysen-zur-frueherkennung-von-harnblasenkrebs": "Keine Urinanalyse zur Krebsfrüherkennung im Katalog.",
};

const slugAus = (url: string) => /\/igel\/show\/([a-z0-9-]+)\.html$/.exec(url)?.[1] ?? url;

/** Alle Quellen des IGeL-Monitors im Katalog, mit dem Angebot, bei dem sie stehen. */
function zitiert() {
  return [...ALLE_SPECIALTIES, DENTAL_SHOWCASE].flatMap((s) =>
    s.anlaesse.flatMap((a) => a.options.flatMap((o) => quellenListe(o.nutzenQuelle).filter((q) => q.name === IGEL_MONITOR).map((q) => ({ wo: `${s.id}/${o.id}`, q, slug: slugAus(q.url) })))),
  );
}

describe("IGeL-Monitor: jede Bewertung steht beim passenden Angebot oder ist mit Grund ausgenommen", () => {
  it("jede zitierte Seite steht in der Übersicht, mit demselben Titel und derselben Stufe", () => {
    const z = zitiert();
    expect(z.length).toBeGreaterThan(20);
    for (const { wo, q, slug } of z) {
      const seite = UEBERSICHT[slug];
      expect(seite, `${wo}: ${slug} nicht in der Übersicht`).toBeDefined();
      expect(q.titel, wo).toBe(seite.titel);
      expect(seite.stufe, `${wo}: Seite ohne Bewertung`).not.toBeNull();
      expect(q.bewertung, wo).toBe(seite.stufe);
    }
  });

  it("jede bewertete Seite ist einem Angebot zugeordnet oder mit Grund ausgenommen, nicht beides", () => {
    const zugeordnet = new Set(zitiert().map((x) => x.slug));
    for (const [slug, seite] of Object.entries(UEBERSICHT)) {
      if (seite.stufe === null) {
        expect(OHNE_ANGEBOT[slug], `${slug}: Seite ohne Bewertung braucht keinen Grund`).toBeUndefined();
        continue;
      }
      const grund = OHNE_ANGEBOT[slug];
      expect(zugeordnet.has(slug) || grund !== undefined, `${slug} („${seite.titel}“, ${seite.stufe}): keinem Angebot zugeordnet und kein Grund`).toBe(true);
      expect(zugeordnet.has(slug) && grund !== undefined, `${slug}: zugeordnet und zugleich ausgenommen`).toBe(false);
      if (grund) expect(grund.length, slug).toBeGreaterThan(20);
    }
    for (const slug of Object.keys(OHNE_ANGEBOT)) expect(UEBERSICHT[slug], `${slug} gibt es nicht`).toBeDefined();
  });

  it("die Auswahl hängt nicht von der Stufe ab: auch die positiven Bewertungen, die zu einem Angebot passen, stehen dort", () => {
    const zugeordnet = new Set(zitiert().map((x) => x.slug));
    const positiv = Object.entries(UEBERSICHT).filter(([, s]) => s.stufe === "positiv" || s.stufe === "tendenziell positiv").map(([slug]) => slug);
    expect(positiv.length).toBeGreaterThan(0);
    for (const slug of positiv) expect(zugeordnet.has(slug) || !!OHNE_ANGEBOT[slug], slug).toBe(true);
    expect(zugeordnet.has("akupunktur-zur-vorbeugung-von-migraeneanfaellen")).toBe(true);
  });

  it("die öffentlichen Texte sagen nur, was gilt: Bewertungen stehen dort, wo sie hinterlegt sind (keine Vollständigkeitszusage)", () => {
    for (const datei of ["components/Grundsaetze.tsx", "components/PraxisFaq.tsx", "app/fachgebiete/[id]/page.tsx", "app/ratgeber/igel-vereinbarung/page.tsx"]) {
      const t = readFileSync(datei, "utf8");
      expect(t, datei).not.toMatch(/Wo der IGeL-Monitor[^.]*eine Leistung bewertet|bei jedem Angebot[^.]*was zum Nutzen bekannt ist/);
      expect(t, datei).toMatch(/Bewertung des IGeL-Monitors[^.]*hinterlegt ist/);
    }
  });
});

const ONLINE = process.env.IGEL_MONITOR_ONLINE === "1";
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
async function laden(url: string): Promise<string> {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "sorrida-quellenpruefung/1.0", Accept: "text/html" } });
  expect(r.ok, `${url}: HTTP ${r.status}`).toBe(true);
  return r.text();
}

describe.skipIf(!ONLINE)("IGeL-Monitor online nachprüfen (IGEL_MONITOR_ONLINE=1)", () => {
  it("die Übersicht nennt genau die Seiten aus UEBERSICHT", async () => {
    const html = await laden("https://igel-monitor.de/igel-a-z.html");
    const online = [...new Set([...html.matchAll(/\/igel-a-z\/igel\/show\/([a-z0-9-]+)\.html/g)].map((m) => m[1]))].sort();
    expect(online).toEqual(Object.keys(UEBERSICHT).sort());
  }, 60_000);

  it("Titel und markierte Stufe jeder Seite stimmen", async () => {
    for (const [slug, seite] of Object.entries(UEBERSICHT)) {
      const html = await laden(`https://igel-monitor.de/igel-a-z/igel/show/${slug}.html`);
      const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1];
      expect(h1 && text(h1), slug).toBe(seite.titel);
      const aktiv = /<li[^>]*class="[^"]*\bitem\b[^"]*\bactive\b[^"]*"[^>]*>([\s\S]*?)<\/li>/.exec(html)?.[1];
      const stufe = aktiv ? text(aktiv).split('als: "').pop()!.trim() : null;
      expect(stufe, slug).toBe(seite.stufe);
    }
  }, 300_000);
});
