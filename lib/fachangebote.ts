// Ergänzende Anlässe je Fach, damit jede Richtung ihr ganzes Leistungsspektrum
// abbildet (Apotheke ist mehr als Arzneimittel, Urologie behandelt auch
// Frauen, Optik mehr als Brillen …). Preise sind Beispielwerte im üblichen
// Rahmen und in den Einstellungen anpassbar. Kassenregeln mit Stand 2026,
// geprüft u. a. bei Verbraucherzentrale, Kassen und Bundesgesundheitsministerium;
// wo eine Regel je Kasse verschieden ist, steht das dabei.

import type { Anlass } from "@/lib/specialties";

export const ZUSATZ_ANLAESSE: Record<string, Anlass[]> = {
  kardio: [
    {
      id: "rhythmus", label: "Herzrhythmusstörung und Vorhofflimmern", bereich: "Rhythmus",
      options: [
        { id: "ka_lzekg", name: "Langzeit-EKG und Abklärung", type: "kasse", price: 0, benefits: ["Kassenleistung bei Beschwerden oder Verdacht"] },
        { id: "ka_smartwatch", name: "Auswertung von Smartwatch-EKGs ohne Beschwerden", type: "igel", price: 40, benefits: ["Einordnung eigener Aufzeichnungen"], nutzen: "Ohne Beschwerden ist ein Nutzen nicht belegt." },
      ],
    },
    {
      id: "sportkardio", abAlter: 14, label: "Sportkardiologische Untersuchung", bereich: "Sport",
      options: [
        { id: "ka_sport", name: "Belastungs-EKG und Herzultraschall vor Leistungssport", type: "igel", price: 180, benefits: ["Sicherheit vor intensivem Training"], kasseWenn: "Bei Beschwerden oder Vorerkrankung Kassenleistung." },
      ],
    },
  ],
  ergo: [
    {
      id: "ergo_hausbesuch", label: "Ergotherapie zu Hause", bereich: "Hausbesuch",
      options: [
        { id: "er_hb", name: "Behandlung als Hausbesuch auf Verordnung", type: "kasse", price: 0, zuzahlung: "heilmittel", benefits: ["wenn der Weg in die Praxis nicht möglich ist"] },
      ],
    },
    {
      id: "ergo_privat", label: "Selbstzahlerangebote", bereich: "Privat",
      options: [
        { id: "er_lern", name: "Konzentrations- und Lerntraining (Kind)", type: "igel", price: 55, benefits: ["Einzelstunde"] },
        { id: "er_hand", name: "Handtherapie ohne Verordnung", type: "igel", price: 60, benefits: ["nach Verletzung oder Überlastung"] },
      ],
    },
  ],
  logo: [
    {
      id: "logo_schlucken", label: "Schluckstörung", bereich: "Schlucken",
      options: [
        { id: "lo_schluck", name: "Schlucktherapie auf Verordnung", type: "kasse", price: 0, zuzahlung: "heilmittel", benefits: ["z. B. nach Schlaganfall"] },
      ],
    },
    {
      id: "logo_stimme_beruf", abAlter: 16, label: "Stimmtraining für Sprechberufe", bereich: "Stimme",
      options: [
        { id: "lo_stimmtraining", name: "Stimmtraining ohne Erkrankung (je Einheit)", type: "igel", price: 65, benefits: ["für Lehrkräfte, Callcenter, Bühne"] },
      ],
    },
  ],
  podo: [
    {
      id: "nagelspange", label: "Eingewachsener Nagel", bereich: "Nagel",
      options: [
        { id: "po_spange_kasse", name: "Nagelkorrekturspange auf Verordnung", type: "kasse", price: 0, zuzahlung: "heilmittel", benefits: ["Heilmittel bei entsprechender Diagnose"] },
        { id: "po_spange_privat", name: "Nagelkorrekturspange privat", type: "igel", price: 70, benefits: ["schmerzarm, ohne OP"] },
      ],
    },
    {
      id: "fusspflege", label: "Kosmetische Fußpflege", bereich: "Pflege",
      options: [
        { id: "po_fusspflege", name: "Medizinische Fußpflege ohne Verordnung", type: "igel", price: 35, benefits: ["Nägel, Hornhaut, Pflege"] },
      ],
    },
  ],
  heilpraktiker: [
    {
      id: "akupunktur_hp", label: "Akupunktur", bereich: "Behandlung",
      options: [
        { id: "hp_akup", name: "Akupunktur (je Sitzung)", type: "igel", price: 55, benefits: ["Orientierung am Gebührenverzeichnis für Heilpraktiker"], kasseWenn: "Private Zusatzversicherungen erstatten oft anteilig.", nutzen: "Belegt vor allem bei chronischem Kreuz- und Knieschmerz." },
      ],
    },
  ],
  uro: [
    {
      id: "inkontinenz", label: "Blasenschwäche und Inkontinenz", bereich: "Blase",
      options: [
        { id: "uro_inko_diag", name: "Abklärung (Urin, Ultraschall, Restharn)", type: "kasse", price: 0, benefits: ["Kassenleistung bei Beschwerden"] },
        { id: "uro_inko_bb", name: "Beckenbodentraining in der Physiotherapie", type: "kasse", price: 0, zuzahlung: "heilmittel", benefits: ["Heilmittel auf Verordnung"] },
        { id: "uro_inko_hm", name: "Inkontinenzhilfsmittel auf Rezept", type: "kasse", price: 0, zuzahlung: "hilfsmittel", benefits: ["Kassenleistung mit Zuzahlung"] },
        { id: "uro_inko_magnet", name: "Magnetstimulation des Beckenbodens", type: "igel", price: 40, benefits: ["ohne Ausziehen, im Sitzen"], nutzen: "Wirkung nur in kleinen Studien belegt; Beckenbodentraining ist die Basis." },
      ],
    },
    {
      id: "hwi", label: "Wiederkehrende Harnwegsinfekte", bereich: "Blase",
      options: [
        { id: "uro_hwi_kultur", name: "Urinkultur und gezielte Behandlung", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
        { id: "uro_hwi_immun", name: "Immunprophylaxe (orale Impfung gegen Harnwegsinfekte)", type: "igel", price: 60, benefits: ["kann Infekte seltener machen"], kasseWenn: "Manche Kassen erstatten auf Antrag.", nutzen: "Nutzen für einen Teil der Betroffenen belegt." },
      ],
    },
    {
      id: "maennergesundheit", geschlecht: "M", label: "Männergesundheit und Erektionsstörung", bereich: "Männergesundheit",
      options: [
        { id: "uro_ed_diag", name: "Abklärung der Ursache (Labor, Gefäße, Hormone)", type: "kasse", price: 0, benefits: ["Kassenleistung bei Beschwerden"] },
        { id: "uro_ed_swt", name: "Stoßwellentherapie bei Erektionsstörung (je Sitzung)", type: "igel", price: 150, benefits: ["ohne Medikamente"], nutzen: "Wirkung vor allem bei leichter, gefäßbedingter Störung untersucht; Ergebnisse uneinheitlich." },
      ],
    },
    {
      id: "vasektomie", geschlecht: "M", abAlter: 18, label: "Vasektomie (Sterilisation des Mannes)", bereich: "Männergesundheit",
      options: [
        { id: "uro_vasek", name: "Vasektomie inklusive Kontrollspermiogramm", type: "igel", price: 550, benefits: ["ambulant, in örtlicher Betäubung"], kasseWenn: "Die Kasse zahlt nur aus medizinischem Grund." },
      ],
    },
  ],
  gyn: [
    {
      id: "verhuetung", geschlecht: "W", abAlter: 12, bisAlter: 55, label: "Verhütung", bereich: "Verhütung",
      options: [
        { id: "gyn_pille", name: "Pille auf Kassenrezept", type: "kasse", price: 0, benefits: ["bis zum 22. Geburtstag Kassenleistung, ab 18 mit Zuzahlung"] },
        { id: "gyn_spirale", name: "Hormon- oder Kupferspirale inklusive Einlage", type: "igel", price: 350, benefits: ["mehrere Jahre wirksam"], kasseWenn: "Bis zum 22. Geburtstag zahlt die Kasse das Verhütungsmittel auf Kassenrezept." },
      ],
    },
    {
      id: "wechseljahre", geschlecht: "W", abAlter: 40, label: "Wechseljahre", bereich: "Hormone",
      options: [
        { id: "gyn_wj_ber", name: "Beratung und Behandlung bei Beschwerden", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
        { id: "gyn_wj_horm", name: "Hormonstatus ohne Beschwerden", type: "igel", price: 60, benefits: ["Blutwerte"], nutzen: "Ohne Beschwerden ändert der Wert die Behandlung meist nicht." },
      ],
    },
    {
      id: "hpv", geschlecht: "W", abAlter: 9, bisAlter: 45, label: "HPV-Impfung", bereich: "Impfung",
      options: [
        { id: "gyn_hpv_kasse", name: "HPV-Impfung nach STIKO (9 bis 14 Jahre, Nachholimpfung bis 17)", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
        { id: "gyn_hpv_privat", name: "HPV-Impfung als Erwachsene (je Dosis)", type: "igel", price: 160, benefits: ["Schutz vor Gebärmutterhalskrebs-Vorstufen"], kasseWenn: "Viele Kassen erstatten auch später, oft bis 26; vorher fragen." },
      ],
    },
  ],
  hausarzt: [
    {
      id: "impfen", label: "Impfungen nach STIKO", bereich: "Impfung",
      options: [
        { id: "ha_impf_stiko", name: "Standard- und Auffrischimpfungen (z. B. Tetanus, Grippe ab 60)", type: "kasse", price: 0, benefits: ["Kassenleistung nach Schutzimpfungs-Richtlinie"] },
        { id: "ha_impf_gs", name: "Gürtelrose-Impfung ab 60 (bei Risiko ab 50)", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
      ],
    },
    {
      id: "chroniker", label: "Chronische Erkrankung (Diabetes, KHK, Asthma, COPD)", bereich: "Chronisch",
      options: [
        { id: "ha_dmp", name: "Strukturiertes Behandlungsprogramm (DMP)", type: "kasse", price: 0, benefits: ["regelmäßige Kontrollen, Schulungen"] },
      ],
    },
  ],
  haut: [
    {
      id: "haare", label: "Haarausfall", bereich: "Haare",
      options: [
        { id: "haut_haar_diag", name: "Abklärung der Ursache", type: "kasse", price: 0, benefits: ["Kassenleistung bei krankhaftem Haarausfall"] },
        { id: "haut_trichogramm", name: "Trichogramm / Haaranalyse", type: "igel", price: 45, benefits: ["genaue Zählung der Haarwachstumsphasen"] },
      ],
    },
    {
      id: "akne", label: "Akne und Hautbild", bereich: "Haut",
      options: [
        { id: "haut_akne_kasse", name: "Medizinische Aknetherapie", type: "kasse", price: 0, benefits: ["Kassenleistung bei Akne"] },
        { id: "haut_peeling", name: "Chemisches Peeling (je Sitzung)", type: "igel", price: 90, benefits: ["glattere Haut"], nutzen: "Ergänzung, ersetzt keine Aknetherapie." },
      ],
    },
  ],
  augen: [
    {
      id: "trockenes_auge", label: "Trockenes Auge", bereich: "Oberfläche",
      options: [
        { id: "au_trocken_kasse", name: "Untersuchung und Behandlung", type: "kasse", price: 0, benefits: ["Kassenleistung bei Beschwerden"] },
        { id: "au_ipl", name: "Lidrandbehandlung mit Lichtimpulsen (IPL, je Sitzung)", type: "igel", price: 120, benefits: ["bei Funktionsstörung der Liddrüsen"], nutzen: "Nutzen in Studien gezeigt, Langzeitdaten begrenzt." },
      ],
    },
    {
      id: "lasern", abAlter: 18, label: "Augenlasern und Linsenchirurgie auf Wunsch", bereich: "Refraktive Chirurgie",
      options: [
        { id: "au_vorunters", name: "Voruntersuchung zur Eignung", type: "igel", price: 150, benefits: ["klärt, welches Verfahren passt"] },
        { id: "au_lasik", name: "Augenlaser-Behandlung (je Auge)", type: "igel", price: 1800, benefits: ["ohne Brille im Alltag"], kasseWenn: "Die Kasse zahlt nicht." },
      ],
    },
  ],
  hno: [
    {
      id: "tinnitus", label: "Tinnitus", bereich: "Ohr",
      options: [
        { id: "hno_tin_diag", name: "Hördiagnostik und Abklärung", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
        { id: "hno_tin_app", name: "Digitale Gesundheitsanwendung (DiGA) auf Rezept, falls gelistet", type: "kasse", price: 0, benefits: ["Kassenleistung auf Verordnung"] },
      ],
    },
    {
      id: "allergie", label: "Heuschnupfen und Allergie", bereich: "Nase",
      options: [
        { id: "hno_allergietest", name: "Allergietest", type: "kasse", price: 0, benefits: ["Kassenleistung bei Beschwerden"] },
        { id: "hno_hypo", name: "Hyposensibilisierung", type: "kasse", price: 0, benefits: ["Kassenleistung, über 3 Jahre"] },
      ],
    },
  ],
  ortho: [
    {
      id: "ruecken", label: "Rückenschmerzen", bereich: "Wirbelsäule",
      options: [
        { id: "or_ruecken_kasse", name: "Untersuchung, Physiotherapie auf Verordnung", type: "kasse", price: 0, zuzahlung: "heilmittel", benefits: ["Kassenleistung"] },
        { id: "or_akupunktur", name: "Akupunktur bei chronischem Kreuzschmerz", type: "kasse", price: 0, benefits: ["Kassenleistung bei mindestens 6 Monaten Beschwerden"] },
        { id: "or_rueckenkurs", name: "Präventionskurs Rücken", type: "igel", price: 120, benefits: ["Kasse bezuschusst zertifizierte Kurse"] },
      ],
    },
    {
      id: "arbeitsunfall", label: "Arbeits- oder Wegeunfall", bereich: "Unfall",
      options: [
        { id: "or_bg", name: "Behandlung über die Berufsgenossenschaft", type: "kasse", price: 0, benefits: ["keine Zuzahlung, Abrechnung mit der BG"] },
      ],
    },
  ],
  kinder: [
    {
      id: "impfen_kind", bisAlter: 17, label: "Impfungen nach STIKO", bereich: "Impfung",
      options: [
        { id: "ki_impf", name: "Impfungen nach Impfkalender", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
      ],
    },
    {
      id: "u10", abAlter: 7, bisAlter: 17, label: "Zusätzliche Vorsorge (U10, U11, J2)", bereich: "Vorsorge",
      options: [
        { id: "ki_u10", name: "U10, U11 oder J2", type: "igel", price: 50, benefits: ["Entwicklung, Schule, Pubertät"], kasseWenn: "Viele Kassen zahlen über Sonderverträge; vorher fragen." },
      ],
    },
  ],
  gastro: [
    {
      id: "atemtest", label: "Unverträglichkeit und Reizdarm", bereich: "Darm",
      options: [
        { id: "ga_atemtest", name: "H2-Atemtest (Laktose, Fruktose)", type: "kasse", price: 0, benefits: ["Kassenleistung bei Beschwerden"] },
      ],
    },
  ],
  physio: [
    {
      id: "lymph", label: "Lymphödem", bereich: "Lymphe",
      options: [
        { id: "ph_mld", name: "Manuelle Lymphdrainage auf Verordnung", type: "kasse", price: 0, zuzahlung: "heilmittel", benefits: ["Heilmittel"] },
      ],
    },
    {
      id: "beckenboden", label: "Beckenboden", bereich: "Becken",
      options: [
        { id: "ph_bb", name: "Beckenbodentraining auf Verordnung", type: "kasse", price: 0, zuzahlung: "heilmittel", benefits: ["Heilmittel"] },
        { id: "ph_bb_kurs", name: "Beckenbodenkurs (Gruppe)", type: "igel", price: 110, benefits: ["Kasse bezuschusst zertifizierte Präventionskurse"] },
      ],
    },
  ],
  apotheke: [
    {
      id: "pdl", label: "Pharmazeutische Dienstleistungen", bereich: "Beratung",
      options: [
        { id: "apo_pdl_poly", name: "Erweiterte Medikationsberatung bei Polymedikation", type: "kasse", price: 0, benefits: ["ab 5 dauerhaft verordneten Wirkstoffen, einmal im Jahr"] },
        { id: "apo_pdl_rr", name: "Standardisierte Risikoerfassung hoher Blutdruck", type: "kasse", price: 0, benefits: ["für Kunden mit Blutdruckmedikation"] },
        { id: "apo_pdl_inh", name: "Erweiterte Einweisung in Inhalationstechnik", type: "kasse", price: 0, benefits: ["bei neuem Inhalator oder Wechsel"] },
        { id: "apo_pdl_tx", name: "Betreuung nach Organtransplantation", type: "kasse", price: 0, benefits: ["Medikationsanalyse und Gespräch"] },
        { id: "apo_pdl_onko", name: "Betreuung bei oraler Tumortherapie", type: "kasse", price: 0, benefits: ["Medikationsanalyse und Gespräch"] },
      ],
    },
    {
      id: "impfen_apo", abAlter: 18, label: "Impfen in der Apotheke", bereich: "Impfung",
      options: [
        { id: "apo_grippe", name: "Grippeimpfung", type: "kasse", price: 0, benefits: ["für Erwachsene, Kassenleistung nach STIKO-Empfehlung"] },
        { id: "apo_covid", name: "COVID-19-Auffrischimpfung", type: "kasse", price: 0, benefits: ["für Erwachsene nach STIKO-Empfehlung"] },
      ],
    },
    {
      id: "hilfsmittel_apo", label: "Hilfs- und Pflegehilfsmittel", bereich: "Hilfsmittel",
      options: [
        { id: "apo_kompr", name: "Kompressionsstrümpfe anmessen", type: "kasse", price: 0, zuzahlung: "hilfsmittel", benefits: ["auf Rezept"] },
        { id: "apo_phm", name: "Pflegehilfsmittel zum Verbrauch (Handschuhe, Desinfektion)", type: "kasse", price: 0, benefits: ["bis 42 € im Monat von der Pflegekasse, ab Pflegegrad 1"] },
        { id: "apo_messgeraet", name: "Blutdruckmessgerät mit Einweisung", type: "igel", price: 60, benefits: ["validiertes Oberarmgerät"] },
      ],
    },
    {
      id: "check_apo", label: "Gesundheitscheck", bereich: "Messung",
      options: [
        { id: "apo_check_bz", name: "Blutzucker oder HbA1c", type: "igel", price: 10, benefits: ["Ergebnis in Minuten"], nutzen: "Ersetzt keine ärztliche Untersuchung." },
        { id: "apo_check_chol", name: "Cholesterin", type: "igel", price: 10, benefits: ["Ergebnis in Minuten"], nutzen: "Ersetzt keine ärztliche Untersuchung." },
      ],
    },
    {
      id: "service_apo", label: "Service rund um Arzneimittel", bereich: "Service",
      options: [
        { id: "apo_bote", name: "Botendienst für Rezeptarzneimittel", type: "kasse", price: 0, benefits: ["Lieferung nach Hause"] },
        { id: "apo_blister", name: "Wochenblister / Verblisterung", type: "igel", price: 15, benefits: ["fertig sortiert für jeden Tag"] },
        { id: "apo_reise", name: "Reiseapotheke und Reiseberatung", type: "igel", price: 25, benefits: ["passend zum Reiseziel"] },
        { id: "apo_kosmetik", name: "Hautanalyse und Pflegeberatung", type: "igel", price: 0, benefits: ["kostenlose Beratung, Produkte als Selbstzahler"] },
      ],
    },
  ],
  optik: [
    {
      id: "kontaktlinsen", label: "Kontaktlinsen", bereich: "Kontaktlinsen",
      options: [
        { id: "op_kl_anp", name: "Kontaktlinsenanpassung", type: "igel", price: 60, benefits: ["Messung, Probetragen, Schulung"], kasseWenn: "Die Kasse zahlt nur bei medizinischer Notwendigkeit, z. B. Keratokonus." },
        { id: "op_kl_abo", name: "Monatslinsen im Jahresabo", type: "igel", price: 240, benefits: ["Lieferung nach Hause"] },
      ],
    },
    {
      id: "fuehrerschein_op", abAlter: 16, label: "Sehtest für den Führerschein", bereich: "Sehtest",
      options: [
        { id: "op_sehtest_fs", name: "Sehtest mit Bescheinigung", type: "igel", price: 6.43, benefits: ["feste Gebühr nach Gebührenordnung"] },
      ],
    },
    {
      id: "kinderbrille", bisAlter: 17, label: "Kinderbrille", bereich: "Brille",
      options: [
        { id: "op_kind_glas", name: "Brillengläser auf Verordnung", type: "kasse", price: 0, benefits: ["Kasse zahlt bis 18 den Festbetrag"] },
        { id: "op_kind_fass", name: "Kinderfassung", type: "igel", price: 60, benefits: ["robust, mitwachsend"] },
      ],
    },
  ],
  hoerakustik: [
    {
      id: "hoertest_hk", label: "Hörtest", bereich: "Hören",
      options: [
        { id: "hk_test", name: "Hörtest im Fachgeschäft", type: "igel", price: 0, benefits: ["kostenlos, ersetzt keine HNO-Untersuchung"] },
      ],
    },
    {
      id: "gehoerschutz", label: "Gehörschutz nach Maß", bereich: "Gehörschutz",
      options: [
        { id: "hk_gs", name: "Gehörschutz-Otoplastik (Paar)", type: "igel", price: 150, benefits: ["für Musik, Motorrad, Arbeit"] },
      ],
    },
    {
      id: "tinnitus_hk", label: "Tinnitus-Versorgung", bereich: "Hören",
      options: [
        { id: "hk_noiser", name: "Tinnitus-Gerät (Noiser) auf HNO-Verordnung", type: "kasse", price: 0, zuzahlung: "hilfsmittel", benefits: ["Kassenleistung mit Zuzahlung"] },
      ],
    },
  ],
  sanitaetshaus: [
    {
      id: "bandagen", label: "Bandagen und Orthesen", bereich: "Gelenke",
      options: [
        { id: "sh_bandage", name: "Bandage oder Orthese auf Rezept", type: "kasse", price: 0, zuzahlung: "hilfsmittel", benefits: ["Kassenleistung mit Zuzahlung"] },
      ],
    },
    {
      id: "mobilitaet", label: "Rollator, Rollstuhl, Pflegebett", bereich: "Mobilität",
      options: [
        { id: "sh_rollator", name: "Standardrollator auf Rezept", type: "kasse", price: 0, zuzahlung: "hilfsmittel", benefits: ["Kassenleistung"] },
        { id: "sh_rollator_leicht", name: "Leichtgewicht-Rollator (Aufpreis)", type: "igel", price: 120, benefits: ["leichter, faltbar"], kasseAnteil: 0 },
      ],
    },
    {
      id: "brustprothetik", geschlecht: "W", label: "Brustprothetik nach Operation", bereich: "Prothetik",
      options: [
        { id: "sh_brust", name: "Brustprothese und Spezial-BH auf Rezept", type: "kasse", price: 0, zuzahlung: "hilfsmittel", benefits: ["Kassenleistung"] },
      ],
    },
    {
      id: "stoma", label: "Stoma- und Inkontinenzversorgung", bereich: "Versorgung",
      options: [
        { id: "sh_stoma", name: "Stoma- oder Inkontinenzartikel auf Rezept", type: "kasse", price: 0, zuzahlung: "hilfsmittel", benefits: ["diskrete Lieferung"] },
      ],
    },
  ],
  pflege: [
    {
      id: "entlastung", label: "Entlastung im Alltag", bereich: "Entlastung",
      options: [
        { id: "pf_entlast", name: "Betreuung und Haushaltshilfe über den Entlastungsbetrag", type: "kasse", price: 0, benefits: ["131 € im Monat von der Pflegekasse, ab Pflegegrad 1"] },
        { id: "pf_vhp", name: "Verhinderungs- oder Kurzzeitpflege", type: "kasse", price: 0, benefits: ["gemeinsames Jahresbudget 3.539 € ab Pflegegrad 2"] },
      ],
    },
    {
      id: "beratung_pf", label: "Beratungsbesuch nach § 37.3", bereich: "Beratung",
      options: [
        { id: "pf_37_3", name: "Beratungseinsatz für Pflegegeldbezieher", type: "kasse", price: 0, benefits: ["Pflicht bei Pflegegeld, Kosten trägt die Pflegekasse"] },
      ],
    },
    {
      id: "behandlungspflege", label: "Behandlungspflege auf Verordnung", bereich: "Medizinisch",
      options: [
        { id: "pf_bp", name: "Medikamente, Injektionen, Verbände", type: "kasse", price: 0, benefits: ["Krankenkasse auf ärztliche Verordnung"] },
      ],
    },
  ],
  hebamme: [
    {
      id: "wochenbett", geschlecht: "W", label: "Wochenbett und Stillzeit", bereich: "Wochenbett",
      options: [
        { id: "he_wb", name: "Hausbesuche im Wochenbett", type: "kasse", price: 0, benefits: ["bis 12 Wochen nach der Geburt, danach auf ärztliche Anordnung"] },
        { id: "he_still", name: "Stillberatung", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
        { id: "he_rueck", name: "Rückbildungskurs", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
      ],
    },
    {
      id: "kurse_privat", geschlecht: "W", label: "Zusatzangebote", bereich: "Kurse",
      options: [
        { id: "he_massage", name: "Babymassage-Kurs", type: "igel", price: 80, benefits: ["Gruppe, mehrere Termine"] },
        { id: "he_rufb", name: "Rufbereitschaftspauschale (Beleggeburt)", type: "igel", price: 500, benefits: ["Ihre Hebamme ist rund um den Termin erreichbar"], kasseWenn: "Manche Kassen erstatten anteilig." },
      ],
    },
  ],
  klinik: [
    {
      id: "begleitperson", label: "Begleitperson", bereich: "Aufenthalt",
      options: [
        { id: "kl_begleit_kind", name: "Mitaufnahme bei Kindern, wenn medizinisch nötig", type: "kasse", price: 0, benefits: ["Kassenleistung"] },
        { id: "kl_begleit", name: "Begleitperson auf Wunsch (je Tag)", type: "igel", price: 60, benefits: ["Übernachtung und Verpflegung"] },
      ],
    },
  ],
};
