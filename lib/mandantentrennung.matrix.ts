// Verzeichnis ALLER Schnittstellen unter app/api (eine Zeile je route.ts).
// lib/mandantentrennung.test.ts liest die Dateien von der Platte und schlägt fehl,
// sobald eine Route hier fehlt ("neue Schnittstelle nicht eingeordnet").
//
// Art:
//   "sitzung"     braucht die Anmeldung einer Praxis; der Test ruft sie als Praxis A
//                 mit den IDs der Praxis B auf (Feld faelle) und ohne Sitzung auf.
//   "oeffentlich" ohne Praxis-Sitzung erreichbar; grund sagt, was stattdessen schützt
//                 (Token im Pfad, Signatur, Geheimnis, Begrenzung).
//   "team"        nur für das Sorrida-Team (lib/supportTeam.ts).
// beleg:  ein Wort, das in der Datei stehen muss und die Einordnung trägt.
// faelle: Aufrufe mit IDs der fremden Praxis. Zu jedem Fall läuft eine Gegenprobe mit eigenen IDs.
// listen: Listen und Suchen; die Antwort enthält eigene Daten und nichts von der fremden Praxis.
// offen:  Grund, warum die Route nicht (ganz) mit fremden IDs geprüft wird; erscheint im Bericht.
//
// Neue Route eintragen: s("pfad/[id]", [id("patient")]) für Praxis-Routen (Datensatz passend wählen),
// o("pfad", "Begründung", "Beleg-Wort") für öffentliche. Reicht {} als Body nicht bis zur Suche nach dem
// Datensatz, meldet die Gegenprobe das; dann einen gültigen Body angeben.

import { QUESTIONS } from "@/lib/anamnesis";

export type Art = "sitzung" | "oeffentlich" | "team";
export type Methode = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** Datensätze, die der Test je Praxis anlegt (Schlüssel im ID-Verzeichnis). */
export type Datensatz =
  | "praxis" | "nutzer" | "patient" | "vorschlag" | "rechnung" | "termin" | "eingang" | "dokument" | "akteneintrag"
  | "bericht" | "standort" | "katalog" | "vorlage" | "vorlagePosten" | "schluessel" | "warteliste" | "terminanfrage"
  | "anamnese" | "zweitmeinung" | "abgesagterTermin" | "schnellPatient" | "mitarbeit" | "katalogZwei"
  /** Patient mit demselben Namen und Geburtsdatum in jeder Praxis; die Terminanfrage passt zu ihm */
  | "zwilling"
  /** besprochener Vorschlag mit Inhalt, noch nicht unterschrieben */
  | "vorschlagOffen"
  /** Roh-Token der Patienten-Links (in der Datenbank steht nur der Hash) */
  | "portalToken" | "linkToken";

/** "B.patient" = ID des Patienten der fremden Praxis, "A.patient" = eigener Patient. */
export type Verweis = `${"A" | "B"}.${Datensatz}`;

export interface Fall {
  /** kurze Beschreibung, wenn eine Route mehrere Fälle hat */
  name?: string;
  /** Pfad-Parameter → Datensatz */
  pfad?: Record<string, Verweis>;
  /** Abfrage-Parameter; Werte mit "$B.…"/"$A.…" werden durch die ID ersetzt */
  query?: Record<string, string>;
  /** JSON-Body; Zeichenketten "$B.…"/"$A.…" werden durch die ID ersetzt */
  body?: unknown;
  /** nur diese Methoden (sonst alle, die die Datei exportiert) */
  methoden?: Methode[];
  /** erlaubte Antworten; Standard 401, 403, 404, 409 */
  erwartet?: number[];
  /**
   * Gegenprobe: Derselbe Aufruf mit eigenen IDs darf nicht als „nicht gefunden“ enden (sonst beweist der Fall nichts).
   * Hier der Grund, wenn die Gegenprobe für diesen Fall nicht geht.
   */
  ohneGegenprobe?: string;
  /** Patientenportal: vor dem Aufruf das Geburtsdatum bestätigen (wie der Patient es täte) */
  vorher?: "geburtsdatum";
}

/** Liste oder Suche: als Praxis A aufrufen; die Antwort enthält eigene Daten und nichts von Praxis B. */
export interface Liste {
  name?: string;
  methode?: Methode;
  query?: Record<string, string>;
  body?: unknown;
  /** muss in der Antwort stehen, z. B. "$A.marke" (zeigt, dass die Liste nicht einfach leer war) */
  enthaelt?: string;
}

export interface Eintrag {
  /** Pfad unter app/api */
  datei: string;
  art: Art;
  grund?: string;
  beleg?: string;
  faelle?: Fall[];
  listen?: Liste[];
  offen?: string;
}

/** Wörter, von denen mindestens eines in jeder "sitzung"-Route stehen muss. */
export const SITZUNGS_BELEGE = ["getServerSession", "requireAdmin", "requireRecht", "patientInPractice"] as const;

const s = (datei: string, faelle?: Fall[], listen?: Liste[]): Eintrag => ({ datei: `${datei}/route.ts`, art: "sitzung", ...(faelle?.length ? { faelle } : {}), ...(listen ? { listen } : {}) });
const o = (datei: string, grund: string, beleg: string, faelle?: Fall[], offen?: string): Eintrag => ({ datei: `${datei}/route.ts`, art: "oeffentlich", grund, beleg, ...(faelle ? { faelle } : {}), ...(offen ? { offen } : {}) });
/** Patientenportal: eigener Portal-Link, Datensatz der fremden Praxis */
const portal = (d: Datensatz, mehr: Omit<Fall, "pfad"> = {}): Fall => ({ pfad: { token: "A.portalToken", id: `B.${d}` }, ...mehr });
/** ein Fall: Pfad-Parameter id zeigt auf den Datensatz der fremden Praxis */
const id = (d: Datensatz, mehr: Omit<Fall, "pfad"> = {}): Fall => ({ pfad: { id: `B.${d}` }, ...mehr });

const TOKEN = "Zufälliger Link-Token im Pfad, in der Datenbank nur als Hash; gilt für genau einen Datensatz";
const PORTAL = "Portal-Token des Patienten im Pfad (nur als Hash gespeichert); alles ist auf diesen Patienten begrenzt";
const UEBERGABE = "Empfangsmodus: signiertes Übergabe-Cookie, gilt nur für einen Patienten und wenige Minuten";
const SCHLUESSEL = "Schlüssel der Praxis im Kopf (lib/connectorAuth.ts); alles ist auf die Praxis des Schlüssels begrenzt";
const PARTNER = "Partner-Schlüssel (lib/apiAuth.ts) mit Begrenzung; liest nur das allgemeine Verzeichnis (practiceId null), speichert nichts";

const TERMIN_NEU = { start: "2031-03-04T09:00:00.000Z", minutes: 30, reason: "Kontrolle" };
const ZAHLUNG = { rechnungId: "$B.rechnung", datum: "2026-11-02" };
const EINGABE = { teeth: {}, globals: {}, patient: { age: 46, insurance: "GKV", bonusYears: 0, haertefall: false, erstattungProzent: 0 } };
const BERICHT = { type: "BEFUND", reviewConfirmed: true };
const RECHNUNG_NEU = { title: "Eigenanteil", amountEur: 100 };
const ZWEIT = { leistung: "Krone", eigenanteil: 400, geteilt: false };
const ANAMNESE = { q: Object.fromEntries(QUESTIONS.map((q) => [q.key, { yes: false }])), wishes: [], confirmName: "Vor Nach" };
const VEREINBARUNG = { name: "Vor Nach", accept: true, signature: "data:image/png;base64,AAAA" };
const BRIEF = { gebuehrenordnung: "GOZ", versicherung: "Muster Versicherung", posten: [{ bezeichnung: "Leistung", ergaenzung: "Begründung der Praxis" }] };

export const MATRIX: Eintrag[] = [
  // --- Patienten-Links und Portal (Token im Pfad) ---
  o("a/[token]", TOKEN, "hashToken"),
  o("p/[token]", TOKEN, "hashToken"),
  o("p/[token]/pdf", TOKEN, "hashToken"),
  o("p/[token]/erinnern", TOKEN, "zugangLink"),
  o("p/[token]/lesen", TOKEN, "zugangLink"),
  o("p/[token]/zweitmeinung", TOKEN, "vorschlagUeberLink"),
  o("p/[token]/zweitmeinung/[zid]", TOKEN, "vorschlagUeberLink", [{ name: "eigener Link, fremde Zweitmeinung", pfad: { token: "A.linkToken", zid: "B.zweitmeinung" }, body: ZWEIT }]),
  o("kalender/[token]", "Geheimer Kalender-Link der Praxis (nur als Hash gespeichert); liefert nur Zeiten dieser Praxis", "hashToken"),
  o("t/[kennung]", "Öffentliche Buchungsseite für neue Patienten: zufällige Kennung der Praxis, Begrenzung je Adresse und Praxis, Zeitstempel gilt für eine Anfrage; zeigt nur freie Zeiten und verrät nichts über vorhandene Anfragen zu Kontaktdaten", "praxisZurKennung"),
  o("portal/[token]", PORTAL, "hashToken"),
  o("portal/[token]/pruefung", PORTAL, "hashToken"),
  o("portal/[token]/termin", PORTAL, "hashToken"),
  o("portal/[token]/kurzcheck", PORTAL, "portalPatient"),
  o("portal/[token]/rueckmeldung", PORTAL, "portalPatient"),
  o("portal/[token]/anamnese/[id]", PORTAL, "portalPatient", [portal("anamnese", { body: ANAMNESE })]),
  o("portal/[token]/rechnung/[id]/online", PORTAL, "portalPatient", [
    portal("rechnung", { erwartet: [404, 503], ohneGegenprobe: "Online-Zahlung ist im Test nicht eingerichtet: Die Route endet mit 503, bevor sie die Rechnung sucht" }),
  ], "Suche nach der Rechnung nicht erreicht (Online-Zahlung im Test aus); geprüft ist nur: nichts von B in der Antwort, B unverändert. Am 16.11.2026 von Hand geprüft (zwei Demo-Praxen, Zahlungsdienst lokal ersetzt): eigene Rechnung erreicht den Zahlungsdienst, Rechnung der anderen Praxis und eines anderen Patienten 404"),
  o("portal/[token]/vereinbarung/[id]", PORTAL, "portalPatient", [portal("vorschlagOffen", { body: VEREINBARUNG, vorher: "geburtsdatum" })]),
  o("portal/[token]/vorschlag/[id]", PORTAL, "portalPatient", [portal("vorschlag", { body: { response: "INTERESSE" } })]),
  o("portal/[token]/vorschlag/[id]/pdf", PORTAL, "portalPatient", [portal("vorschlag")]),
  o("portal/[token]/vorschlag/[id]/erinnern", PORTAL, "zugangPortal", [portal("vorschlag")]),
  o("portal/[token]/vorschlag/[id]/lesen", PORTAL, "zugangPortal", [portal("vorschlag")]),
  o("portal/[token]/vorschlag/[id]/zweitmeinung", PORTAL, "vorschlagUeberPortal", [portal("vorschlag", { body: ZWEIT })]),
  o("portal/[token]/vorschlag/[id]/zweitmeinung/[zid]", PORTAL, "vorschlagUeberPortal", [
    { pfad: { token: "A.portalToken", id: "B.vorschlag", zid: "B.zweitmeinung" }, body: ZWEIT },
    { name: "eigener Vorschlag, fremde Zweitmeinung", pfad: { token: "A.portalToken", id: "A.vorschlag", zid: "B.zweitmeinung" }, body: ZWEIT },
  ]),

  // --- Anmeldung, Registrierung, öffentliche Formulare ---
  o("auth/[...nextauth]", "Die Anmeldung selbst (next-auth)", "NextAuth"),
  o("auth/accept-invite", "Einladungs-Token (nur als Hash gespeichert), Begrenzung je Adresse", "hashToken"),
  o("auth/forgot-password", "Antwortet immer gleich, Begrenzung je Adresse; verrät nicht, ob es ein Konto gibt", "isRateLimited"),
  o("auth/reset-password", "Einmal-Token aus der E-Mail (nur als Hash gespeichert)", "hashToken"),
  o("auth/verify-email", "Einmal-Token aus der E-Mail (nur als Hash gespeichert)", "hashToken"),
  o("register", "Legt eine neue Praxis an; Begrenzung je Adresse, liest keine Daten anderer Praxen", "isRateLimited"),
  o("demo", "Legt einen Gastzugang mit Beispieldaten an; Begrenzung je Adresse", "isRateLimited"),
  o("leads", "Kontaktformular der Website; Begrenzung und Spam-Prüfung, nur Schreiben", "isRateLimited"),
  o("support", "Hilfe-Formular; Begrenzung je Adresse, nur Schreiben", "isRateLimited"),
  o("vorschau", "Zugang zur Vorschau-Domain mit eigenem Passwort; Begrenzung, keine Praxisdaten", "zugangPasst"),
  o("status", "Kurzfassung ohne Praxisdaten für alle; Einzelheiten nur mit CRON_SECRET oder für das Sorrida-Team", "cronSecretPasst"),
  o("fehler", "Fehlermeldung aus dem Browser; nur gleiche Herkunft, Begrenzung je Adresse, höchstens 2 kB, nur Schreiben, gespeichert werden nur Wörter von einer festen Liste, Tagesgrenze neuer Einträge", "consumeAttempt"),

  // --- Maschinen-Zugänge ---
  o("cron/aufraeumen", "Geheimnis im Kopf (CRON_SECRET), nur von der Zeitsteuerung", "CRON_SECRET"),
  o("cron/morgenmail", "Geheimnis im Kopf (CRON_SECRET), nur von der Zeitsteuerung", "CRON_SECRET"),
  o("stripe/webhook", "Signatur von Stripe wird geprüft (STRIPE_WEBHOOK_SECRET)", "signaturGueltig"),
  o("connector/ping", SCHLUESSEL, "connectorAuth"),
  o("connector/launch", SCHLUESSEL, "connectorAuth"),
  o("connector/ergebnisse", SCHLUESSEL, "connectorAuth"),
  o("v1/catalog", PARTNER, "authenticateAndRateLimitApiRequest"),
  o("v1/validate", PARTNER, "authenticateAndRateLimitApiRequest"),
  o("v1/reports/generate", PARTNER, "authenticateAndRateLimitApiRequest"),

  // --- Empfangsmodus (Tablet am Tresen) ---
  o("empfang/entsperren", "Geparkte Sitzung im Cookie, auf dem Server geführt und nur einmal gültig, dazu die PIN der Praxis; Sperre nach Fehlversuchen, Prüfung je Praxis nacheinander", "sitzungHolen"),
  o("empfang/patient/fertig", "Löscht nur das Übergabe-Cookie des Geräts", "UEBERGABE_COOKIE"),
  o("empfang/patient/kontakt", UEBERGABE, "uebergabeFuer"),
  // Der Test übergibt zuerst an einen Patienten der Praxis A und ruft dann mit dem Cookie die fremden IDs auf.
  o("empfang/patient/anamnese/[id]", UEBERGABE, "uebergabeFuer", [id("anamnese", { body: ANAMNESE })]),
  o("empfang/patient/vereinbarung/[id]", UEBERGABE, "uebergabeFuer", [id("vorschlagOffen", { body: VEREINBARUNG })]),

  // --- Sorrida-Team ---
  { datei: "leads/[id]/route.ts", art: "team", grund: "Postfach der Website-Anfragen; nur Konten aus SUPPORT_TEAM_EMAILS", beleg: "isSupportTeam" },
  { datei: "fehler/[id]/route.ts", art: "team", grund: "Fehleransicht /betrieb; nur Konten aus SUPPORT_TEAM_EMAILS", beleg: "isSupportTeam" },

  // --- Praxis: Patienten und Akte ---
  s("patients", undefined, [
    { enthaelt: "$A.patient" },
    { name: "Suche mit dem gemeinsamen Namensanfang beider Praxen", query: { q: "Nach$lauf" }, enthaelt: "$A.patient" },
  ]),
  s("patients/import"),
  s("patients/[id]", [id("patient")]),
  s("patients/[id]/akte", [{ name: "fremder Schnellvorschlag ohne Akte", pfad: { id: "B.schnellPatient" }, body: { firstName: "Neu", lastName: "Name" } }]),
  s("patients/[id]/anamnesis", [id("patient")]),
  s("patients/[id]/behandler", [
    id("patient", { body: { behandlerId: null } }),
    { name: "eigener Patient, fremdes Konto als Stammbehandlung", pfad: { id: "A.patient" }, body: { behandlerId: "$B.nutzer" }, erwartet: [400] },
  ]),
  s("patients/[id]/briefing", [id("patient")]),
  s("patients/[id]/documents", [id("patient")]),
  s("patients/[id]/entries", [id("patient")]),
  s("patients/[id]/entries/[entryId]", [
    { pfad: { id: "B.patient", entryId: "B.akteneintrag" }, body: { inaktiv: true } },
    { name: "eigener Patient, fremder Akteneintrag", pfad: { id: "A.patient", entryId: "B.akteneintrag" }, body: { inaktiv: true } },
  ]),
  s("patients/[id]/export", [id("patient")]),
  s("patients/[id]/fhir", [id("patient")]),
  s("patients/[id]/kontakt", [id("patient")]),
  s("patients/[id]/modell", [id("patient", { query: { modell: "gebiss", teil: "16" } })]),
  s("patients/[id]/portal", [id("patient")]),
  s("patients/[id]/recall", [id("patient")]),
  s("documents/[id]", [id("dokument")]),
  s("suche", [{ name: "Suche nach dem Namen des fremden Patienten", query: { q: "$B.name" }, erwartet: [200], ohneGegenprobe: "Suche, keine ID; die Gegenprobe ist die Liste darunter" }], [
    { name: "Suche mit dem gemeinsamen Namensanfang beider Praxen", query: { q: "Nach$lauf" }, enthaelt: "$A.patient" },
  ]),
  s("mein-bereich"),
  s("eingang", [
    { name: "fremden Eingangseintrag erledigen", methoden: ["POST"], body: { id: "$B.eingang", erledigt: true } },
    { name: "fremden Eingangseintrag übernehmen", methoden: ["POST"], body: { id: "$B.eingang", uebernehmen: true } },
    // Sammel-Aktion: antwortet mit 200 und „anzahl 0“; dass B unberührt bleibt, prüft der Test danach.
    { name: "fremden Eingangseintrag wieder öffnen (Sammel-Aktion)", methoden: ["POST"], body: { ids: ["$B.eingang"], erledigt: false }, erwartet: [200] },
  ], [{ name: "Zahl der offenen Einträge", enthaelt: "\"offen\":1" }]),
  s("eingang/[id]/antwort", [id("eingang", { body: { weg: "kopiert" } })]),
  s("gdt", [
    { name: "fremder Bericht", query: { art: "bericht", id: "$B.bericht" } },
    { name: "fremder Vorschlag", query: { art: "vorschlag", id: "$B.vorschlag" } },
  ]),

  // --- Praxis: Termine, Warteliste, Empfang ---
  s("appointments", [
    { name: "Termin für fremden Patienten", body: { patientId: "$B.patient", ...TERMIN_NEU } },
    { name: "eigener Patient, fremder Standort", body: { patientId: "$A.patient", locationId: "$B.standort", ...TERMIN_NEU } },
  ]),
  s("appointments/[id]", [id("termin", { body: { status: "ABGESAGT" } })]),
  s("warteliste", [{ name: "fremder Patient auf die Warteliste", body: { patientId: "$B.patient", anlass: "Kontrolle" } }]),
  s("warteliste/[id]", [id("warteliste")]),
  s("warteliste/[id]/angebot", [
    id("warteliste", { body: { terminId: "$B.abgesagterTermin" } }),
    { name: "eigener Wartelisten-Eintrag, fremder Termin", pfad: { id: "A.warteliste" }, body: { terminId: "$B.abgesagterTermin" } },
  ]),
  s("terminanfragen/[id]", [
    id("terminanfrage", { body: { aktion: "bestaetigen" } }),
    id("terminanfrage", { name: "ablehnen", body: { aktion: "ablehnen" } }),
    // Der fremde Patient heißt wie die Anfrage und hat dasselbe Geburtsdatum: Nur die Praxis unterscheidet ihn.
    { name: "eigene Anfrage, gleichnamiger Patient der fremden Praxis", pfad: { id: "A.terminanfrage" }, body: { aktion: "bestaetigen", patientId: "$B.zwilling" } },
  ]),
  s("empfang/uebergabe", [
    { name: "Übergabe für fremden Patienten", methoden: ["POST"], body: { patientId: "$B.patient" } },
    { name: "Stand des fremden Patienten", methoden: ["GET"], query: { patientId: "$B.patient" } },
  ]),

  // --- Praxis: Vorschläge und Berichte ---
  s("proposals", [
    { name: "Vorschlag für fremden Patienten", methoden: ["POST"], body: { patientId: "$B.patient", input: EINGABE } },
    { name: "eigener Patient, fremder Bericht", methoden: ["POST"], body: { patientId: "$A.patient", input: EINGABE, reportId: "$B.bericht" } },
  ], [{ enthaelt: "$A.vorschlag" }]),
  s("proposals/[id]", [id("vorschlag", { body: { status: "ANGENOMMEN" } })]),
  s("proposals/[id]/einverstaendnis", [id("vorschlag")]),
  s("proposals/[id]/nachfassen", [id("vorschlag", { body: { aktion: "nachgefasst" } })]),
  s("proposals/[id]/nachweis", [id("vorschlag")]),
  s("proposals/[id]/share", [id("vorschlag")]),
  s("praxis/vorschlag-favoriten"),
  s("reports", [
    { name: "Bericht für fremden Patienten", body: { ...BERICHT, patientId: "$B.patient", serviceTemplateId: "$A.vorlage", entries: [{ catalogItemId: "$A.katalog", performed: true }] } },
    { name: "eigener Patient, fremde Vorlage", body: { ...BERICHT, patientId: "$A.patient", serviceTemplateId: "$B.vorlage", entries: [{ catalogItemId: "$B.katalog", performed: true }] } },
    // Fremde Leistung in der Liste: Die Route lehnt mit 400 ab („unbekannte Positionen“).
    { name: "eigene Vorlage, fremde Leistung in der Liste", body: { ...BERICHT, patientId: "$A.patient", serviceTemplateId: "$A.vorlage", entries: [{ catalogItemId: "$A.katalog", performed: true }, { catalogItemId: "$B.katalogZwei", performed: true }] }, erwartet: [400] },
  ]),
  s("reports/[id]", [id("bericht", { body: { editedText: "Geändert" } })]),
  s("reports/[id]/pdf", [id("bericht")]),
  s("reports/[id]/regenerate", [id("bericht")]),
  s("reports/[id]/revisions", [id("bericht")]),

  // --- Praxis: KI-Hilfen ---
  s("praxis/ki-hilfen"),
  s("ki/preisliste"),
  s("ki/hilfe"),
  s("ki/uebersetzung"),
  s("ki/anlass", [
    {
      name: "Stichworte mit fremder Patienten-ID", body: { text: "Kontrolle und Reinigung", patientId: "$B.patient" }, erwartet: [200, 400, 403, 409, 429, 502, 503],
      ohneGegenprobe: "Die Patienten-ID dient nur dazu, den Namen vor dem Senden zu entfernen (Suche mit practiceId); einen fremden Patienten übergeht die Route",
    },
  ]),

  // --- Praxis: Rechnungen und Zahlungen ---
  s("invoices", [
    { name: "Rechnung für fremden Patienten", body: { ...RECHNUNG_NEU, patientId: "$B.patient", proposalId: "$B.vorschlag" } },
    { name: "eigener Patient, fremder Vorschlag", body: { ...RECHNUNG_NEU, patientId: "$A.patient", proposalId: "$B.vorschlag" } },
  ]),
  s("invoices/[id]", [id("rechnung", { body: { action: "bezahlt" } }), id("rechnung", { name: "stornieren", body: { action: "storniert" } })]),
  s("invoices/[id]/erstattungsbrief", [id("rechnung", { body: BRIEF })]),
  s("bankabgleich"),
  // Antwortet mit 200 und „gebucht 0“; dass die Rechnung der Praxis B offen bleibt, prüft der Test danach.
  s("bankabgleich/buchen", [{ name: "fremde Rechnung als bezahlt buchen", body: { zahlungen: [ZAHLUNG] }, erwartet: [200] }]),
  s("sepa"),
  { ...s("datev"), offen: "Der DATEV-Export braucht hinterlegte Berater- und Mandantennummer; im Test nicht eingerichtet. Geprüft: 401 ohne Sitzung, nichts von B in der Antwort, B unverändert. Nicht geprüft: Inhalt der Buchungsliste. Am 16.11.2026 von Hand geprüft (zwei Demo-Praxen mit Nummern): Der Export von A enthält die Rechnung von B nicht, der Export von B enthält sie" },
  s("nachrichten", [
    { name: "Zahlungserinnerung zu fremder Rechnung", body: { art: "zahlungserinnerung", id: "$B.rechnung" } },
    { name: "Erinnerung an fremden Termin", body: { art: "termin-erinnerung", id: "$B.termin" } },
    { name: "Bestätigung für fremden Termin", body: { art: "termin-bestaetigung", id: "$B.termin" } },
  ]),
  s("nachrichten/whatsapp", [
    { name: "Portal-Link für fremden Patienten", body: { art: "portal-link", id: "$B.patient" } },
    { name: "Zahlungserinnerung zu fremder Rechnung", body: { art: "zahlungserinnerung", id: "$B.rechnung" } },
    { name: "Erinnerung an fremden Termin", body: { art: "termin-erinnerung", id: "$B.termin" } },
  ]),

  // --- Praxis: Leistungen und Vorlagen ---
  s("catalog-items", undefined, [{ enthaelt: "$A.katalog" }]),
  s("catalog-items/import"),
  s("catalog-items/schnell"),
  s("catalog-items/[id]", [id("katalog", { body: { title: "Geändert" } })]),
  s("service-templates", undefined, [{ enthaelt: "$A.vorlage" }]),
  s("service-templates/[id]", [id("vorlage", { body: { name: "Geändert" } })]),
  s("service-templates/[id]/items", [
    id("vorlage", { body: { catalogItemId: "$B.katalog" } }),
    { name: "eigene Vorlage, fremde Leistung", pfad: { id: "A.vorlage" }, body: { catalogItemId: "$B.katalog" } },
  ]),
  s("service-templates/[id]/items/[itemId]", [
    { pfad: { id: "B.vorlage", itemId: "B.vorlagePosten" }, body: { position: 3 } },
    { name: "eigene Vorlage, fremder Posten", pfad: { id: "A.vorlage", itemId: "B.vorlagePosten" }, body: { position: 3 } },
  ]),
  s("amtliche-leistungen/fach"),
  s("amtliche-leistungen/fuer-sitzung"),
  s("amtliche-leistungen/uebernehmen"),

  // --- Praxis: Standorte, Team, Einstellungen ---
  s("locations"),
  s("locations/[id]", [id("standort", { body: { name: "Geändert", rooms: 1, minutesPerDay: 480 } })]),
  s("settings/team", [
    { name: "Konto der fremden Praxis einladen", methoden: ["POST"], body: { email: "$B.email", role: "staff" }, ohneGegenprobe: "E-Mail-Adressen sind über alle Praxen eindeutig; auch die eigene Adresse wird mit 409 abgelehnt" },
  ], [{ enthaelt: "$A.nutzer" }]),
  s("settings/team/[userId]", [
    { pfad: { userId: "B.nutzer" }, body: { role: "staff" } },
    { name: "fremdes Konto: Analyse freigeben", pfad: { userId: "B.nutzer" }, methoden: ["PATCH"], body: { canSeeAnalytics: true } },
    { name: "eigenes Konto, fremder Standort", pfad: { userId: "A.mitarbeit" }, methoden: ["PATCH"], body: { standorte: ["$B.standort"] } },
  ]),
  s("settings/connector-keys", undefined, [{ enthaelt: "$A.schluessel" }]),
  s("settings/connector-keys/[id]", [id("schluessel")]),
  s("settings/2fa/backup-codes"),
  s("settings/2fa/disable"),
  s("settings/2fa/enable"),
  s("settings/2fa/setup"),
  s("settings/zwei-faktor"),
  s("settings/bank"),
  s("settings/billing"),
  s("settings/buchung"),
  s("settings/buchung/datei"),
  s("settings/buchung/neupatienten"),
  s("settings/empfang"),
  s("settings/export", undefined, [{ name: "Gesamtexport der Praxis", enthaelt: "$A.marke" }]),
  s("settings/installments"),
  s("settings/proposal-prices"),
  s("settings/specialty"),
  s("praxis/ausgangswert"),
  s("praxis/diktat"),
  s("praxis/kv-bezirk"),
  s("praxis/morgenmail"),
  s("praxis/rueckmeldung"),
  s("praxis/stammdaten"),
  s("stripe/verbinden"),
  s("stripe/callback"),
  s("stripe/trennen"),
  s("auth/resend-verification"),
  s("demo/wechsel"),
  s("demo/patientenansicht"),
];
