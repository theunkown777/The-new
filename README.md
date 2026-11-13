# Sorrida

_Vormals „Zahnarzt Berichte“._ Software für Zahnarztpraxen: nach der Behandlung
mit einem Klick Leistungserfassung, KI-Bericht, Behandlungsvorschlag,
Patientenschreiben und To-dos – auch als Fenster direkt aus der Praxissoftware.

Web-Anwendung für Zahnarztpraxen, um aus einer lückenlosen Leistungserfassung
professionelle Berichte zu erstellen – z. B. Befund-/Behandlungsberichte für
die Patientenakte oder Berichte an Krankenkassen. Die Texte werden von Claude
(Anthropic) auf Basis der erfassten Leistungen formuliert und müssen vor dem
Versand von einer approbierten Zahnärztin / einem approbierten Zahnarzt
geprüft und freigegeben werden.

## Funktionen

- Registrierung/Login pro Praxis (mehrere Mitarbeiter:innen pro Praxis)
- Patientenverwaltung
- **Leistungserfassung nach dem Opt-out-Prinzip**: Für jeden Sitzungstyp
  (z. B. „Füllungstherapie“, „PZR“, „Kontrolluntersuchung“) zeigt das System
  die vollständige Liste der dafür typischen GOZ-/BEMA-Positionen – alle
  standardmäßig als **erbracht** markiert. Die Praxis muss aktiv streichen,
  was der Arzt/die Ärztin *nicht* gemacht hat, statt einzelne Leistungen
  mühsam anzuhaken. Das verhindert vergessene Einträge (Lückenlosigkeit).
  Der Server erzwingt zusätzlich, dass zu jeder Position der Vorlage eine
  Entscheidung vorliegt und die Liste vor dem Absenden als vollständig
  geprüft bestätigt wurde – unvollständige Erfassungen werden abgelehnt.
- **Logisch aufeinander aufbauende Behandlungsschritte**: Innerhalb einer
  Vorlage können Positionen von anderen abhängen (z. B. Wurzelkanalfüllung
  setzt Wurzelkanalaufbereitung voraus, die wiederum eine Trepanation
  voraussetzt). Wird ein vorausgehender Schritt gestrichen, werden alle
  davon abhängigen Folgeschritte automatisch mitgestrichen und in der
  Oberfläche gesperrt (mit Begründung „Setzt voraus: …“) – sie könnten sonst
  nicht stattgefunden haben. Diese Kaskade wird zusätzlich serverseitig neu
  berechnet, damit ein manipulierter Request sie nicht umgehen kann (siehe
  `lib/serviceDependency.ts`).
- 11 Sitzungstyp-Vorlagen über das übliche Behandlungsspektrum hinweg:
  Kontrolle, Erstuntersuchung, Füllungstherapie, PZR, Chirurgie,
  systematische Parodontitisbehandlung (PAR, siehe unten), Endodontie,
  Prothetik, Individualprophylaxe (Kind/Jugendliche),
  Notfall-/Schmerzbehandlung, Schienentherapie.
- Die **PAR-Vorlage** bildet den vollständigen, seit 2021 gültigen
  BEMA-Pfad der systematischen Parodontitisbehandlung ab (BEVa → BEVb →
  ATG → MHU → AITa → AITb → CPTa/CPTb → UPTa → UPTb → UPTc → UPTd) als
  durchgehende Abhängigkeitskette – ein reales Beispiel für „logisch
  aufeinander aufbauende Behandlungsschritte“.
- Aus der geprüften Leistungsliste generiert die KI den Berichtstext
  (Befund-/Behandlungsbericht oder Bericht an Krankenkasse)
- Generierten Text bearbeiten, neu generieren, als Entwurf/final markieren
- Export als PDF
- Auf der Berichtsseite bleibt die vollständige Leistungsliste inkl.
  gestrichener Positionen als Prüf-/Audit-Nachweis sichtbar
- **Diktierfunktion** beim „Zusätzlichen Kontext“: kurz ins Mikrofon
  sprechen (Button „Diktieren“), der Text erscheint direkt im Feld. Die KI
  formuliert daraus beim Generieren einen etwas ausführlicheren Abschnitt,
  ohne die Berichtsstruktur zu ändern. Nutzt die Web-Speech-API des Browsers
  (am zuverlässigsten in Chrome/Edge; ohne Unterstützung wird ein Hinweis
  statt des Buttons angezeigt).
- **Abrechnungsregeln pro Position** (GOZ/GOÄ/BEMA/BEL-II):
  - **Faktor & Begründungspflicht (§5 GOZ)**: Bei Positionen mit Faktorspanne
    (GOZ/GOÄ) zeigt die Leistungserfassung ein Faktor-Feld. Wird der
    Regelhöchstfaktor (i. d. R. 2,3) überschritten, erscheint automatisch ein
    Pflichtfeld für die schriftliche Begründung. Der Server lehnt Berichte
    ohne diese Begründung sowie Faktoren außerhalb des zulässigen Bereichs
    (1,0–3,5) ab.
  - **Ausschluss-Regeln**: Positionen, die laut Katalog nicht gemeinsam
    abgerechnet werden dürfen (z. B. „Füllung, einflächig“ und „Füllung,
    mehrflächig“ am selben Zahn), werden in der Checkliste live als Konflikt
    markiert; der Server weist widersprüchliche Kombinationen zusätzlich
    zurück.
  - **Gültigkeitszeiträume**: Positionen können ein `gueltigAb`-Datum tragen
    (z. B. die PAR-Positionen ab der Reform vom 1.7.2021).
  - **Kassenart (GKV/PKV)** wird pro Patient erfasst.
  - **Gültigkeitszeiträume werden geprüft**: Liegt das gewählte
    Behandlungsdatum vor `gueltigAb` bzw. nach `gueltigBis` einer Position
    (z. B. eine PAR-Position vor dem 1.7.2021), lehnt der Server den Bericht
    mit einer entsprechenden Fehlermeldung ab.
  - **Frequenzlimits werden geprüft**: Positionen mit hinterlegtem
    `frequenzlimitAnzahl`/`frequenzlimitZeitraumTage` (z. B. „PZR max. 2x pro
    Jahr“ als Praxisbeispiel im Katalog) werden gegen bereits erfasste
    Berichte desselben Patienten geprüft; wird das Limit im Zeitraum
    überschritten, wird der Bericht abgelehnt.
  - **Kassenart-Vorbelegung**: Enthält eine Vorlage dieselbe Leistung doppelt
    als GOZ- und BEMA-Position (z. B. „Eingehende Untersuchung“), wird anhand
    der am Patienten hinterlegten Kassenart (GKV/PKV) automatisch nur die
    passende Position vorbelegt, statt beide als erbracht zu markieren.
  - Diese Regeln sind serverseitig in `lib/serviceRules.ts` implementiert und
    greifen unabhängig vom Client (Defense-in-Depth wie bei den
    Abhängigkeitsketten).
- **Berichtsübersicht** (`/reports`): durchsuchbare, nach Status filterbare
  Liste aller Berichte der Praxis, zusätzlich zur „Zuletzt erstellt“-Ansicht
  im Dashboard.
- **Änderungsverlauf bei Berichten**: Vor jedem Überschreiben des bearbeiteten
  Texts wird die bisherige Version als Revision gespeichert (mit Zeitstempel
  und bearbeitender Person) und lässt sich auf der Berichtsseite einsehen und
  bei Bedarf wieder in den Editor laden – Bearbeitungen an der
  Gesundheitsdokumentation gehen dadurch nicht mehr kommentarlos verloren.
- **Zwei-Faktor-Authentifizierung (2FA)**: optional pro Konto unter
  „Sicherheit“ einrichtbar (TOTP, kompatibel mit gängigen Authenticator-Apps
  wie Google Authenticator/Authy). Ist 2FA aktiv, verlangt der Login
  zusätzlich zum Passwort einen 6-stelligen Code. Beim Aktivieren werden 10
  Einmal-Backup-Codes angezeigt (Format `XXXX-XXXX`), die beim Login
  alternativ zum TOTP-Code funktionieren, falls kein Zugriff auf die
  Authenticator-App besteht – jeder Code ist nur einmal gültig, neue Codes
  lassen sich jederzeit unter „Sicherheit“ generieren (ersetzt die alten).
- **Passwort vergessen**: Self-Service-Link auf der Login-Seite; E-Mail-Versand
  über Resend (`RESEND_API_KEY`), mit kostenlosem Testmodus-Fallback ohne
  Key (dann wird nichts verschickt; im Server-Log stehen nur Empfänger und
  Betreff, nie der Link – siehe Setup-Sektion weiter unten).
- **E-Mail-Verifizierung**: Nach der Registrierung wird eine
  Bestätigungs-E-Mail verschickt (24 Std. gültig, gleicher Resend-/
  Testmodus-Mechanismus). Nicht blockierend – ein unbestätigtes Konto kann
  sich weiterhin anmelden und die App normal nutzen, sieht aber einen
  Hinweisbanner mit „Erneut senden“, bis die Adresse bestätigt wurde.
- **Team-Verwaltung** (`/settings/team`, nur Admin-Konten): weitere
  Praxismitglieder per E-Mail-Einladung hinzufügen (Link 7 Tage gültig,
  ebenfalls über Resend/Testmodus), Rollen (Admin/Staff) vergeben und
  wieder entfernen. Der letzte verbleibende Admin einer Praxis kann sich
  nicht selbst herabstufen oder entfernen, damit keine Praxis ohne
  Admin-Zugriff dasteht. Admin-Rechte sind serverseitig für Abrechnung,
  Katalog und Team durchgesetzt (`lib/permissions.ts`) – Staff-Konten sehen
  diese Einstellungen nur lesend bzw. mit Hinweis.
- **Rate-Limiting** auf Login und Registrierung gegen Brute-Force-Versuche
  (siehe „Bekannte offene Punkte“ zu den Grenzen der aktuellen Umsetzung).
- **Geschätzter Rechnungsbetrag & GKV-/Privat-Kennzeichnung**: Jede Position
  in der Leistungserfassung und auf der Berichtsseite zeigt ein Label, ob es
  sich um eine GKV-Leistung (BEMA), eine Privatleistung/IGEL (GOZ/GOÄ),
  Laborkosten (BEL-II) oder eine nicht separat abrechenbare Position handelt
  (`lib/billing.ts`, `kassenLabel`) – rein informativ, ohne Handlungsempfehlung.
  Sind unter „Einstellungen → Abrechnung“ ein GOZ- und/oder BEMA-Punktwert der
  Praxis sowie unter „Einstellungen → Katalog“ Punktzahl/Festbetrag der
  jeweiligen Position hinterlegt, wird zusätzlich ein **geschätzter
  Rechnungsbetrag** je Position und als Gesamtsumme angezeigt (inkl. Faktor bei
  GOZ/GOÄ). Ausdrücklich **keine verbindliche Rechnung** – nur eine
  Kalkulationshilfe auf Basis der von der Praxis selbst eingetragenen Werte.
  Bewusst **keine Optimierungs- oder Empfehlungslogik**: Die Behandlung bleibt
  allein medizinisch begründet (§1 GOZ / Musterberufsordnung), das System
  schlägt keine Leistungen zur Umsatzsteigerung vor.
- **Einstellungen** (`/settings`): eigene Weboberfläche für
  Zwei-Faktor-Authentifizierung, die praxiseigenen Punktwerte (GOZ/BEMA) sowie
  Punktzahl/Festbetrag je Katalogposition – kein direkter Datenbankzugriff
  mehr nötig, um diese Werte zu pflegen.
- **Leistungslexikon** (`/settings/lexikon`): reines Nachschlagewerk zu
  gängigen Selbstzahlerleistungen (IGEL) je Kategorie – für jede Position
  eine sachliche Einordnung, was die GKV typischerweise abdeckt bzw. wo die
  üblichen Grenzen liegen, und welche Selbstzahler-Option grundsätzlich in
  Betracht kommt. Bewusst **nicht patientenbezogen und ohne jede
  Vorschlags-/Empfehlungslogik** – kein "für Patient X empfohlen"-Flow,
  keine Verknüpfung zu Report oder Patient. Zweck ist reines
  Hintergrundwissen für das Beratungsgespräch; die fachliche Einschätzung im
  Einzelfall bleibt vollständig bei der behandelnden Person (§1 GOZ /
  Musterberufsordnung). Ein automatisiertes Vorschlagssystem für
  Zusatzleistungen aus Mustern wurde bewusst **nicht** gebaut; das
  befundbezogene Vorschlagsmodul und seine Grenzen beschreibt
  „Behandlungsvorschläge und ihre Grenzen“ unten.

## Behandlungsvorschläge und ihre Grenzen

Ursprünglich wurde bewusst **kein** Vorschlagsmodul gebaut (Begründung
siehe unten, sie gilt weiterhin als Leitplanke). Seit Oktober 2026 gibt es
unter **Vorschläge** ein befundbezogenes Modul, das so eng gefasst ist,
dass es Aufklärung strukturiert statt Umsatz zu steuern:

- **Ausgangspunkt ist ein Befund**, den die behandelnde Person im
  FDI-Zahnschema erfasst – keine Vorschläge aus Mustern, Diagnosecodes oder
  Patientenhistorie.
- **Kassen-/Regelleistung steht immer an erster Stelle** und ist die Basis
  jeder Rechnung. Abgedeckt sind vor allem Alternativen, über die ohnehin
  aufgeklärt werden muss: Mehrkostenfüllungen (§ 28 Abs. 2 SGB V),
  gleich-/andersartiger Zahnersatz mit identischem Festzuschuss
  (§§ 55, 56 SGB V).
- **Unterdrückte Optionen werden begründet** („Nicht vorgeschlagen: …“),
  z. B. kein Mehrkosten-Komposit im Frontzahnbereich, kein Inlay bei
  kleinen Defekten, kein Laser-Zusatz zur PAR, kein Implantat-Vorschlag bei
  Rauchern, Bleaching nur auf dokumentierten Wunsch (§ 2 Abs. 3 GOZ).
- **Die Empfehlung ist änderbar** und wird von der behandelnden Person
  bestätigt; die Wahl trifft der Patient.
- **Festzuschuss 2026 vs. 2027:** Zum 1.1.2027 sinken die Festzuschüsse
  (60/70/75 % → 50/60/65 %, GKV-Beitragssatzstabilisierungsgesetz);
  maßgeblich ist das Bewilligungsdatum. Bis zum Stichtag zeigt der Editor
  beide Eigenanteile nebeneinander samt Countdown, und das
  Patientenschreiben nennt den Betrag bei Bewilligung ab 2027. Sätze in
  `FESTZUSCHUSS_SAETZE` (lib/proposals.ts), bitte gegen KZV-Angaben prüfen.
- **Patientenschreiben** mit Eigenanteil je Option als Textform-Information
  nach § 630c Abs. 3 BGB; angenommene/abgelehnte Vorschläge werden
  eingefroren (Nachweis).

Regelwerk: `lib/proposals.ts` (reine Funktionen, Tests in
`lib/proposals.test.ts`); Preise je Praxis unter Einstellungen →
Vorschlagspreise (Beispielwerte, bitte ersetzen).

**Offenes Risiko:** Die Kennzahl „Mehrumsatz angenommen“ auf Übersicht und
Vorschlagsliste ist eine Umsatzkennzahl. Genau die Funktion eines Features
(„steuert es Richtung Umsatz?“) ist der Maßstab der unten genannten
Kritik. Vor dem Verkauf an Praxen sollten Regelwerk und Darstellung von
einer Zahnärztin/einem Zahnarzt und standesrechtlich (Kammer bzw.
Medizinrechtler:in) geprüft werden.

### Ursprüngliche Abwägung gegen automatisierte Zusatzverkaufs-Empfehlungen

Eine naheliegende Idee wäre, aus den erfassten Daten automatisch passende
Selbstzahlerleistungen (IGEL) für den jeweiligen Patienten vorzuschlagen –
z. B. "bei dieser Diagnose/Leistung wird oft X empfohlen". Das ist bewusst
**nicht** umgesetzt, aus mehreren Gründen:

- Nach der Musterberufsordnung der Zahnärzte und §1 GOZ muss die Empfehlung
  einer IGEL-Leistung eine **individuelle klinische Einschätzung im
  konkreten Fall** sein, getroffen im persönlichen Gespräch durch die
  behandelnde Person. Ein System, das aus Mustern einen Vorschlag
  generiert, ersetzt diese Einzelfallprüfung durch eine Regel.
- Der IGEL-Monitor (gemeinsame Einrichtung von GKV-Spitzenverband und
  Bundesärztekammer) sowie Verbraucherzentralen kritisieren
  software-/systemgestützte IGEL-Vorschläge in Praxisverwaltungssystemen
  seit Jahren als Umsatzsteuerung, die als Patientenwohl getarnt ist – die
  standesrechtliche/rechtliche Bewertung hängt an der **Funktion** eines
  Features (steuert es Richtung Umsatz?), nicht an der Absicht dahinter.
- Ein Vorschlagsmodul würde außerdem der eigentlichen Positionierung dieses
  Systems widersprechen (siehe unten): kein Abrechnungsoptimierer, sondern
  ein Lückenlosigkeits- und Dokumentationswerkzeug.

Stattdessen gibt es zwei bewusst zurückhaltendere Bausteine, die dasselbe
zugrunde liegende Bedürfnis – Patient:innen über sinnvolle Optionen jenseits
der oft nur begrenzten/kurzfristigen Kassenleistung informieren zu können –
ohne automatisierte Empfehlungslogik abdecken: die GKV-/Privat-Badges
(rein informativ, patienten- und positionsbezogen, aber ohne jede
Kauf-/Behandlungsempfehlung) und das Leistungslexikon (rein
kategorienbezogenes Nachschlagewerk, siehe oben) – die eigentliche
fachliche und kommunikative Arbeit im Beratungsgespräch bleibt in beiden
Fällen vollständig beim Menschen.

## Website und App sind eins

Die öffentliche Website liegt in derselben Anwendung: `public/landing.html`
(Live-Demo des Vorschlags-Regelwerks, Festzuschuss-Vergleich 2026/2027,
Mehrumsatz-Rechner, Preise, Anfrageformular). `middleware.ts` liefert sie
unter `/` an Besucher ohne Anmeldung aus; angemeldete Nutzer landen von `/`
direkt in der Übersicht. „Anmelden“ führt auf `/login` derselben App.

Das Formular „Pilotplatz anfragen“ speichert Anfragen über `POST /api/leads`
in der Tabelle `Lead` (Rate-Limit je IP, Honeypot gegen Bots) und schickt
optional eine Benachrichtigung an `LEAD_NOTIFY_EMAIL`.

## Gastzugang

Unter `/demo` (verlinkt auf Website und Login als „Als Gast ansehen“)
bekommt jeder Besucher per Klick eine eigene Demo-Praxis mit vier erfundenen
Patienten, einem Beispielbericht und zwei Behandlungsvorschlägen und ist sofort
angemeldet – er sieht Sorrida genau wie ein Kunde. `lib/demo.ts` legt die
Daten an; Demo-Praxen laufen nach 24 Stunden ab und werden beim nächsten neuen
Gastzugang vollständig gelöscht. Im Gastzugang sind Team-Einladungen gesperrt
und KI-Berichte auf 15 begrenzt (`lib/demoGuard.ts`); ein Banner weist auf
Beispieldaten und Löschung hin. Rate-Limit: 10 Gastzugänge je IP und Stunde.

## Behandlung abschließen: ein Schritt nach der Behandlung

Unter **Behandlung abschließen** (Übersicht, Patient, und als Standard im
Fenster aus der Praxissoftware) bestätigt das Team die vorausgefüllte
Leistungsliste, klickt optional Befunde im Zahnschema an und schließt einmal
ab. Daraus entstehen automatisch:

- der **KI-Bericht** (Entwurf zur Freigabe),
- der **Behandlungsvorschlag** mit **Patientenschreiben** (§ 630c BGB), mit
  dem Bericht verknüpft,
- eine **To-do-Liste** für Rezeption und Behandler (`lib/nextSteps.ts`):
  HKP anlegen, HKP-Frist vor der Festzuschuss-Kürzung 2027 mit Mehrbetrag,
  Mehrkosten-/Privatvereinbarung, PAR-Antrag, Folgetermine.

## Fenster aus der Praxissoftware (VDDS-media)

Bericht und Behandlungsvorschlag lassen sich direkt aus DS-Win, CGM Z1,
charly, EVIDENT und anderen VDDS-media-fähigen Praxisprogrammen als eigenes
Fenster öffnen, mit dem dort gewählten Patienten. Ein kleiner
Windows-Connector (`public/connector/`) nimmt die VDDS-Übergabedatei
entgegen, meldet den Patienten mit einem Praxis-PC-Schlüssel an
`/api/connector/launch` und öffnet `/embed/...` über ein Einmal-Token.
Einrichtung unter Einstellungen → Praxissoftware; Details, Datenfluss und
Teststand in [`docs/PVS-ANBINDUNG.md`](docs/PVS-ANBINDUNG.md).

## Für Software-Partner: API-Integration statt PVS-Ersatz

Der deutsche Zahnarzt-PVS-Markt (Charly, Dampsoft, CGM Z1, evident,
Update/Data Care u. a.) ist etabliert, zertifiziert und stark besetzt – dort
als komplette Neuentwicklung anzutreten wäre wenig aussichtsreich. Die
realistische Nische: **dieses System als Zusatzmodul an bestehende PVS-Systeme
andocken**, statt sie zu ersetzen. Die Abrechnungshoheit (KZV-Anbindung)
bleibt beim etablierten System; dieses Projekt liefert die
Opt-out-Lückenlosigkeits-Logik und die KI-Berichtsgenerierung als Service.

Dafür gibt es eine **Partner-API** (`/api/v1/...`, API-Key-Authentifizierung,
60 Anfragen/Minute je Key):

- `GET /api/v1/catalog` – Referenzkatalog & Vorlagen zum Abgleich
- `POST /api/v1/validate` – Faktor-/Ausschluss-/Gültigkeits-/
  Frequenzlimit-Prüfung für vom Partner gelieferte Positionsdaten
- `POST /api/v1/reports/generate` – KI-Berichtstext aus geprüften
  Leistungsdaten

Bewusst **zustandslos**: Patienten-/Praxisdaten des Partners werden nicht
gespeichert, jeder Request wird unabhängig verarbeitet – das reduziert den
DSGVO-Haftungsradius erheblich. Details, curl-Beispiele und die
maschinenlesbare Spezifikation: [`docs/API.md`](docs/API.md) /
[`openapi.yaml`](openapi.yaml). API-Keys werden über
`npm run api:create-client -- "Partnername GmbH"` vergeben (bewusst kein
Self-Service, da Partnerintegrationen ein Vertriebsprozess sind).

**Was diese API technisch liefert vs. was für echte Marktreife zusätzlich
nötig ist** (siehe auch „Bekannte offene Punkte“):

| Bereit (Code) | Braucht externen Prozess (kein Code) |
| --- | --- |
| Validierungs-Engine als API | KZV-/PVS-Zertifizierung für GKV-Abrechnung |
| KI-Berichtsgenerierung als API | TI-/gematik-Zulassung (KIM, ePA, SMC-B) |
| API-Key-Auth, Rate-Limiting | Formale MDR-Einstufung |
| Zustandslos (kein Partner-Datenspeicher) | EU-AI-Act-Konformitätsbewertung |
| OpenAPI-Dokumentation | DSFA, AVV mit Partnern, ggf. ISO 27001 |

Diese rechte Spalte lässt sich nicht durch weiteren Code lösen, sondern
braucht Rechtsberatung, Zertifizierungsstellen und die KZBV/gematik selbst –
das sollte vor jeder kommerziellen Vermarktung eingeplant werden.

### Leistungskatalog – wichtiger Hinweis

`prisma/seed.ts` enthält einen **Beispielkatalog** typischer GOZ-/GOÄ-/BEMA-/
BEL-II-Positionen ohne Punktwerte/Eurobeträge. Ziffern, die nicht eindeutig
bekannt waren, sind bewusst mit „–“ statt einer geratenen Nummer versehen;
`punktzahl` und `festbetragCent` bleiben aus demselben Grund `null`. Dieser
Katalog ist **kein abrechnungsverbindliches Verzeichnis** – vor dem Einsatz
zur echten Abrechnung müssen alle Ziffern und Beträge gegen das aktuell
gültige offizielle Gebührenverzeichnis (BZÄK/KZBV) geprüft, korrigiert und
ergänzt werden. Dafür gibt es zwei Wege: über die Weboberfläche unter
„Einstellungen → Katalog“ (Punktzahl/Festbetrag je Position) bzw.
„Einstellungen → Abrechnung“ (praxiseigener GOZ-/BEMA-Punktwert), oder direkt
in `prisma/seed.ts` + erneutem `npx prisma db seed`. Der GOZ-Punktwert ist
bundesweit gesetzlich fixiert (5,62421 Cent seit der GOZ-Reform 2012) und
daher als Standardwert für neu registrierte Praxen vorbelegt; der
BEMA-Punktwert wird dagegen regional zwischen KZV und Krankenkassen
verhandelt und muss von jeder Praxis selbst eingetragen werden – das System
rät hier bewusst nicht. Faktor-Regeln
(`faktorMin`/`faktorMax`/`regelhoechstfaktor`/`begruendungspflichtAbFaktor`)
sind für GOZ/GOÄ-Positionen mit den in der GOZ üblichen Standardwerten
(1,0–3,5, Regelhöchstfaktor 2,3) hinterlegt und ebenfalls vor dem
Produktiveinsatz zu verifizieren.

## Setup

```bash
npm install
cp .env.example .env
```

`.env` ausfüllen:

- `DATABASE_URL` – PostgreSQL-Connection-String. Für lokale Entwicklung
  reicht ein lokaler Postgres-Server oder ein kostenloses Projekt bei z. B.
  [neon.tech](https://neon.tech) oder Vercel Postgres. (Bis zu diesem Punkt
  im Projekt lief die Entwicklung auf SQLite; für den Vercel-Deploy wurde auf
  PostgreSQL umgestellt, da Vercels Dateisystem nicht dauerhaft ist.)
- `NEXTAUTH_SECRET` – zufälligen Wert generieren, z. B. mit
  `openssl rand -base64 32`.
- `ANTHROPIC_API_KEY` – API-Key von [console.anthropic.com](https://console.anthropic.com)
  für die echte KI-Berichtsgenerierung. **Optional zum Testen**: Ist die
  Variable leer oder auf `dummy-key-for-build` gesetzt, generiert die App
  ohne API-Aufruf (also kostenlos) einen einfachen, rein aus den erfassten
  Daten zusammengestellten Text statt eines KI-Fließtexts – deutlich als
  „Testmodus“ markiert (siehe `lib/anthropic.ts`, `buildTemplateReportText`).
  So lässt sich der komplette Ablauf (Erfassung, Bericht, Bearbeitung,
  PDF-Export) ohne Anthropic-Guthaben durchspielen; für produktionsreife,
  ausformulierte Berichte ist ein echter Key mit Guthaben nötig.
- `RESEND_API_KEY` – API-Key von [resend.com](https://resend.com) für den
  Versand von Passwort-Reset- und Team-Einladungs-E-Mails. **Optional zum
  Testen**: Ist die Variable nicht gesetzt, wird keine E-Mail verschickt,
  sondern nur Empfänger und Betreff ins Server-Log geschrieben
  (`lib/email.ts`; der Link steht dort bewusst nicht). Team-Einladungen
  zeigen den Link dann in der Oberfläche; Passwort-Reset und
  E-Mail-Bestätigung brauchen einen echten Key. `RESEND_FROM_EMAIL`
  optional für eine eigene Absenderadresse (Standard: Resends
  Test-Absender `onboarding@resend.dev`, der nur an die eigene, bei Resend
  verifizierte E-Mail-Adresse zustellt – für echten Versand an beliebige
  Empfänger muss eine eigene Domain bei Resend verifiziert werden).
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` – von Upstash Redis (z. B. über die
  Vercel-Marketplace-Integration „Upstash for Redis“, die diese Variablen
  automatisch setzt). **Optional**: Ohne diese Variablen läuft
  Rate-Limiting In-Memory statt über einen geteilten Store (siehe oben,
  `lib/rateLimit.ts`).

Datenbank einrichten und Leistungskatalog/Vorlagen seeden:

```bash
npx prisma migrate dev
npx prisma db seed
```

Entwicklungsserver starten:

```bash
npm run dev
```

Anschließend unter `http://localhost:3000` zuerst eine Praxis unter
„Registrieren“ anlegen.

## Wichtige Hinweise zu Gesundheitsdaten & Datenschutz

Diese Anwendung verarbeitet Patientendaten (besondere Kategorien
personenbezogener Daten nach Art. 9 DSGVO). Vor dem Einsatz mit echten
Patientendaten unbedingt beachten:

- **Hosting/Verschlüsselung**: Datenbank und Verbindungen entsprechend
  absichern (Verschlüsselung at rest/in transit, Zugriffskontrollen,
  Backups).
- **Auftragsverarbeitung**: Für die Nutzung der Anthropic-API mit
  Patientendaten wird ein Auftragsverarbeitungsvertrag (AVV) mit Anthropic
  benötigt; ohne AVV keine echten Patientendaten an die API senden.
- **Diktierfunktion**: Die Spracherkennung läuft über die Web-Speech-API des
  Browsers. In Chrome/Edge wird das Audio dafür an Server des jeweiligen
  Browser-Anbieters (i. d. R. Google) übertragen und dort transkribiert –
  das ist ein separater Auftragsverarbeiter neben Anthropic. Ohne
  entsprechende vertragliche Grundlage keine Patientennamen oder sonstige
  identifizierende Angaben hineindiktieren; im Zweifel nur sachliche
  Befund-/Behandlungsstichworte verwenden.
- **Menschliche Kontrolle**: KI-generierte Berichte sind als Entwürfe zu
  behandeln (im UI entsprechend gekennzeichnet) und müssen vor Freigabe/
  Versand fachlich geprüft werden. Die Software ersetzt keine ärztliche
  Beurteilung.
- Dieses Projekt ist ein funktionaler Prototyp, kein zertifiziertes
  Medizinprodukt.

## Bekannte offene Punkte

- `next@14.2.x` ist die aktuellste Version, die ohne größere Breaking
  Changes läuft; `npm audit` zeigt für diese Linie noch offene High-Severity
  Advisories, die erst mit einem Upgrade auf `next@16` (inkl. Anpassung der
  Route-Handler-Signaturen) vollständig behoben sind. Vor dem produktiven
  Einsatz sollte dieses Upgrade separat geplant werden.
- **Automatisierte Tests**: `npm test` (Vitest) deckt die reine Geschäftslogik
  ab (Abhängigkeitskaskaden, Faktor-/Ausschluss-/Gültigkeitsregeln,
  Rate-Limiter, Backup-Codes). API-Routen und UI werden weiterhin nur
  manuell/per Playwright-Rauchtest geprüft, nicht automatisiert in CI – ein
  DB-gestütztes Integrationstest-Setup wäre ein sinnvoller nächster Schritt.
  **CI** (`.github/workflows/ci.yml`) läuft bei jedem Push/PR: Typecheck,
  Vitest, `prisma migrate deploy` gegen einen frischen Postgres-Service-
  Container (prüft, dass die Migrationshistorie fehlerfrei von Grund auf
  durchläuft) und `next build`.
- **Rate-Limiting** (`lib/rateLimit.ts`) nutzt bei angebundenem Upstash-Redis
  (Vercel-Marketplace-Integration, setzt `KV_REST_API_URL`/`KV_REST_API_TOKEN`)
  einen geteilten Store – der Schutz ist dann über alle Serverless-Instanzen
  hinweg konsistent (einfacher Fixed-Window-Zähler per `INCR`/`EXPIRE`). Ohne
  angebundenes Redis (z. B. lokale Entwicklung, Tests) fällt der Limiter auf
  In-Memory zurück statt zu crashen – dann läuft der Schutz nur pro
  Serverprozess.
- Unter „Einstellungen → Katalog“ lassen sich Katalogpositionen (Admin-Konten)
  jetzt vollständig über die Weboberfläche anlegen, bearbeiten und löschen
  (Löschen ist per Verwendungsprüfung blockiert, solange die Position noch in
  einer Vorlage oder einem Bericht steckt). Unter „Einstellungen → Vorlagen“
  lassen sich Sitzungstyp-Vorlagen anlegen, Positionen hinzufügen/entfernen
  und Abhängigkeitsketten (`dependsOn`, "baut auf X auf") je Position setzen.
  Bewusst weiterhin nur über `prisma/seed.ts` pflegbar: Ausschluss-Regeln,
  Gültigkeitszeiträume und Frequenzlimits – das sind fachlich heikle Regeln
  mit größerer Tragweite bei Fehleingaben.
- GOZ-/BEMA-Ziffern im Beispielkatalog sind, wie oben beschrieben, vor dem
  echten Abrechnungseinsatz zu verifizieren; die Frequenzlimit-Beispielwerte
  (PZR, Zahnsteinentfernung) sind Praxisbeispiele zur Veranschaulichung der
  Prüfung, keine verbindlichen Vorgaben.
- Punktzahl/Festbetrag im Katalog sind aktuell **global** (praxisübergreifend
  geteilte Referenzdaten), da mehrere Praxen denselben mitgelieferten
  Beispielkatalog nutzen; eine praxisspezifische Überschreibung einzelner
  Werte gibt es noch nicht.
- **Partner-API**: Es gibt noch keine Admin-Oberfläche zur Verwaltung von
  API-Clients (nur das CLI-Skript `npm run api:create-client`), kein
  Key-Rotation-/Widerruf-Endpunkt und kein Nutzungs-/Abrechnungs-Dashboard
  für Partner. Das Rate-Limiting teilt sich zudem die In-Memory-Umsetzung
  mit dem restlichen System (siehe oben).
