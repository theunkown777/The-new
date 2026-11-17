# Betriebshandbuch Sorrida

Stand: 16.11.2026. Dieses Handbuch beschreibt, wie Sorrida betrieben wird und was bei einer Störung zu tun ist.
Es enthält keine Zugangsdaten und keine Werte von Variablen.

Sorrida wird von einer Person betrieben. Es gibt keine Bereitschaft rund um die Uhr und keine Vertretung.
Deshalb steht hier alles so, dass eine zweite Person es im Notfall nachvollziehen kann.

## 1. Überblick

| Baustein | Anbieter | Wo nachsehen |
| --- | --- | --- |
| Anwendung | Vercel, Region Frankfurt (fra1) | Vercel-Projekt, Reiter „Deployments“ und „Logs“ |
| Datenbank | Neon (PostgreSQL), Frankfurt | Neon-Konsole, Projekt und Branch „main“ |
| Zähler gegen Missbrauch | Upstash (Redis), nur falls angebunden | Upstash-Konsole |
| E-Mail-Versand | Resend | Resend-Konsole |
| KI-Entwürfe | Anthropic | Konsole des Anbieters |
| Online-Zahlung | Stripe Connect, nur falls eingerichtet | Stripe-Dashboard |

Die Liste der Dienstleister mit Zweck und Daten steht in `lib/dienstleister.ts`. Daraus entstehen das AVV-Muster (`/avv`)
und die Seite `/vertrauen`.

Eigene Hilfsmittel:

- `/api/status`: Selbsttest. Ohne Anmeldung nur „ok“ oder „nicht ok“ je Punkt. Die Hinweise sieht das Sorrida-Team nach der Anmeldung.
- `/status`: öffentliche Seite mit drei Angaben (Website, Anmeldung, Datenbank) und der Liste der Störungen.
- `/betrieb`: Fehler aus Server und Browser der letzten 14 Tage. Nur für Konten aus `SUPPORT_TEAM_EMAILS`.
- `/anfragen`: Postfach mit Hilfe- und Pilot-Anfragen. Nur für das Sorrida-Team.

## 2. Wiederherstellung der Datenbank

> **Noch nicht geübt.** Die Schritte unten sind aus der Beschreibung des Anbieters abgeleitet und wurden bei Sorrida
> noch nie durchgeführt. Die Namen der Schaltflächen können abweichen. Bei der ersten Übung jeden Schritt prüfen und hier berichtigen.

| | |
| --- | --- |
| Datum der ersten Übung | ______________ |
| Dauer vom Beginn bis zur laufenden Anwendung | ______________ |
| Wer hat geübt | ______________ |
| Was war anders als hier beschrieben | ______________ |

Der Anbieter sichert die Datenbank fortlaufend. Wie weit man zurückgehen kann, hängt vom Tarif ab.
Den Zeitraum vorher in der Neon-Konsole nachsehen (Projekt, Einstellungen, Aufbewahrung der Historie) und hier eintragen: ______________
Diese Angabe braucht auch das Löschen einer Praxis (Abschnitt 11, `--sicherung-tage`, in ganzen Tagen, angefangene Tage aufrunden).

Stand 17.11.2026: Die Datenbank läuft über den Vercel-Marketplace im Neon-Tarif **Free**. Laut Neon reicht die Historie dort
höchstens **6 Stunden** zurück (https://neon.com/docs/postgres/backup-restore/history-window). Dazu kann es **einen** manuell
angelegten Snapshot geben, der bleibt, bis man ihn löscht. Für `--sicherung-tage` heißt das: `1`, solange kein Snapshot und kein
alter Branch mit Praxisdaten besteht (in der Konsole unter Snapshots und Branches nachsehen). Längere Zeiträume gibt es erst in
bezahlten Tarifen (Launch bis 7 Tage, Scale bis 30 Tage). Vor der ersten echten Praxis entscheiden, ob 6 Stunden reichen.

### Ablauf

1. **Ruhe bewahren und Zeitpunkt festlegen.** Bis wann waren die Daten sicher in Ordnung? Uhrzeit in deutscher Zeit notieren.
2. **Schreiben anhalten**, wenn die Daten gerade beschädigt werden: im Vercel-Projekt das letzte gute Deployment wieder einsetzen
   („Instant Rollback“) oder die Anwendung kurz anhalten. Auf `/status` eine Störung eintragen (Abschnitt 4).
3. **Kopie des beschädigten Stands sichern.** In der Neon-Konsole vom aktuellen Stand einen eigenen Branch anlegen
   (Name zum Beispiel `vor-wiederherstellung-JJJJ-MM-TT`). So geht nichts verloren, falls der gewählte Zeitpunkt falsch war.
4. **Zum Prüfen einen Branch auf den Zeitpunkt anlegen.** In der Neon-Konsole: Branches, neuer Branch, als Ausgangspunkt „Zeitpunkt“
   wählen und die Uhrzeit aus Schritt 1 eintragen. Der neue Branch hat eine eigene Adresse.
5. **Den Prüf-Branch ansehen.** Mit `psql` verbinden und Stichproben zählen, zum Beispiel:
   `select count(*) from "Practice"; select count(*) from "Patient"; select max("createdAt") from "AuditLog";`
   Passt der Stand, weiter. Passt er nicht, Schritt 4 mit einem anderen Zeitpunkt wiederholen.
6. **Wiederherstellen.** Zwei Wege:
   - Den Haupt-Branch in der Neon-Konsole auf den geprüften Zeitpunkt zurücksetzen („Restore“). Die Adresse bleibt gleich.
   - Oder die Anwendung auf den geprüften Branch umstellen: in Vercel `DATABASE_URL` (und die Adresse ohne Pooling, falls gesetzt)
     auf den neuen Branch ändern und neu deployen.
7. **Prüfen.** `/api/status` muss bei „Datenbank“ und „Migrationen“ ok zeigen. Anmelden, eine Praxis öffnen, einen Patienten öffnen.
8. **Was fehlt?** Alles, was nach dem Zeitpunkt aus Schritt 1 eingegeben wurde, ist im wiederhergestellten Stand nicht enthalten.
   Aus dem gesicherten Branch aus Schritt 3 lässt sich nachsehen, was das war. Die betroffenen Praxen informieren (Abschnitt 3).
9. **Aufräumen.** Prüf-Branches löschen, wenn sie nicht mehr gebraucht werden. Störung in `lib/stoerungen.ts` abschließen.

### Übung

Die Übung läuft wie oben, nur ohne Schritt 2 und 6: Prüf-Branch anlegen, verbinden, zählen, Zeit stoppen, Branch löschen.
Danach die Tabelle oben ausfüllen und auf `/vertrauen` den Punkt „Wiederherstellung noch nicht geübt“ ändern (`lib/vertrauen.ts`).

## 3. Was bei einer Störung zu tun ist

Reihenfolge:

1. **Feststellen, was nicht geht.** `/status` und `/api/status` öffnen. Vercel-Logs und `/betrieb` ansehen.
2. **Eintragen.** Störung in `lib/stoerungen.ts` mit `behoben: false` und `dauerMinuten: 0` eintragen und veröffentlichen (Abschnitt 4).
   Geht das Veröffentlichen gerade nicht, zuerst Schritt 3.
3. **Beheben.** Häufige Fälle:
   - Fehler seit dem letzten Deployment: in Vercel das vorige Deployment wieder einsetzen.
   - Datenbank nicht erreichbar: Status des Anbieters prüfen, `DATABASE_URL` prüfen.
   - Anmeldung geht nicht: `NEXTAUTH_SECRET` und `NEXTAUTH_URL` prüfen (`/api/status` nennt den Punkt).
   - E-Mails kommen nicht an: Resend-Konsole, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
4. **Prüfen, ob Daten betroffen sind.** Konnte jemand Daten sehen, ändern oder löschen, der das nicht durfte? Sind Daten verloren?
   Das Protokoll der Praxis (Einstellungen, Protokoll) und die Logs des Anbieters helfen.
5. **Informieren** (siehe unten).
6. **Abschließen.** Eintrag in `lib/stoerungen.ts` mit Dauer und Ursache ergänzen, `behoben: true`. Kurz aufschreiben, was künftig anders läuft.

### Wen informieren

**Wenn personenbezogene Daten betroffen sind** (Verletzung des Schutzes personenbezogener Daten, Art. 4 Nr. 12 DSGVO):

- **Betroffene Praxen: unverzüglich.** Sorrida ist Auftragsverarbeiter und muss der Praxis die Verletzung unverzüglich melden
  (Art. 33 Abs. 2 DSGVO, AVV § 9). Per E-Mail an die Praxisleitung, zusätzlich anrufen. Inhalt: was passiert ist, seit wann,
  welche Daten und wie viele Personen ungefähr betroffen sind, was schon getan wurde, wer bei Sorrida erreichbar ist.
  Nicht warten, bis alles geklärt ist. Fehlende Angaben nachreichen.
- **Aufsichtsbehörde: binnen 72 Stunden** nach Bekanntwerden (Art. 33 Abs. 1 DSGVO). Die Meldung macht der Verantwortliche.
  Für die Patientendaten ist das die Praxis; sie braucht dafür die Angaben von Sorrida, deshalb zählt jede Stunde.
  Für Daten, für die Sorrida selbst verantwortlich ist (Konten der Praxis-Beschäftigten, Anfragen über die Website), meldet Sorrida
  selbst an die für den Betreiber zuständige Landesbehörde. Die Meldung entfällt nur, wenn voraussichtlich kein Risiko für die Betroffenen besteht.
  Diese Einschätzung mit Begründung aufschreiben.
- **Betroffene Personen**: bei voraussichtlich hohem Risiko benachrichtigt der Verantwortliche sie unverzüglich (Art. 34 DSGVO).
  Die Praxis entscheidet das für ihre Patienten; Sorrida unterstützt.
- **Dokumentieren**: Jede Verletzung mit Ablauf, Auswirkungen und Maßnahmen festhalten, auch wenn keine Meldung nötig war (Art. 33 Abs. 5 DSGVO).

**Wenn keine Daten betroffen sind** (reiner Ausfall): Eintrag auf `/status` genügt. Dauert der Ausfall länger als eine Stunde
während der Sprechzeiten, die Praxen kurz per E-Mail informieren.

Das ist keine Rechtsberatung. Im Zweifel den Datenschutzbeauftragten oder eine Anwältin fragen, bevor die Frist abläuft.

## 4. Eine Störung eintragen (`lib/stoerungen.ts`)

Die Liste `STOERUNGEN` wird von Hand gepflegt. Neue Einträge kommen oben hin:

```ts
export const STOERUNGEN: Stoerung[] = [
  { datum: "2026-12-03", beginn: "09:40", dauerMinuten: 35, was: "Anmeldung nicht möglich", ursache: "Datenbank nicht erreichbar", behoben: true },
];
```

Regeln:

- `datum` als JJJJ-MM-TT, `beginn` in deutscher Zeit (HH:MM).
- Solange die Störung läuft: `dauerMinuten: 0` und `behoben: false`. Danach die Dauer eintragen und `behoben: true` setzen.
- `was` in einem Satz, den eine Praxis versteht. `ursache`, sobald sie bekannt ist.
- Nie Namen von Praxen oder Personen, keine Patientendaten.
- Einträge werden nicht gelöscht.

Danach `npx vitest run lib/stoerungen.test.ts` und veröffentlichen. Die Seite `/status` zeigt die Liste.

## 5. Umgebungsvariablen

Quelle ist `.env.example`; ergänzt um Variablen, die der Code zusätzlich liest. Hier stehen nur Name und Zweck, nie Werte.
In Vercel unter „Settings, Environment Variables“ pflegen. Nach einer Änderung neu deployen.

| Variable | Zweck | In `.env.example` |
| --- | --- | --- |
| `DATABASE_URL` | Adresse der Datenbank. Auch gelesen: `DATABASE_URL_UNPOOLED`, `DIRECT_URL`, `POSTGRES_URL` und ähnliche Namen des Anbieters (`lib/databaseUrl.ts`) | ja |
| `NEXTAUTH_URL` | Adresse der Anwendung; Grundlage für Anmeldung und Links in E-Mails | ja |
| `NEXTAUTH_SECRET` | Schlüssel für Sitzungen und signierte Links. Ohne ihn geht die Anmeldung nicht | ja |
| `ANTHROPIC_API_KEY` | Schlüssel für den KI-Dienst. Ohne ihn laufen Entwürfe im Testmodus | ja |
| `ANTHROPIC_MODEL` | Modell des KI-Dienstes, falls vom Standard abgewichen wird | ja |
| `LEAD_NOTIFY_EMAIL` | Empfänger für Anfragen von der Website und für die tägliche Fehler-Mail | ja |
| `REGISTRIERUNG_OFFEN` | Nur mit dem Wert 1 können sich neue Praxen selbst registrieren | ja |
| `RESEND_API_KEY` | Schlüssel für den E-Mail-Versand. Ohne ihn wird nichts verschickt | ja |
| `RESEND_FROM_EMAIL` | Eigene Absenderadresse. Ohne sie gehen keine E-Mails an Patienten | ja |
| `DOKUMENT_SPEICHER`, `DOKUMENT_S3_*` | Dokumentenspeicher, nur vorbereitet (Abschnitt 9) | ja |
| `CRON_SECRET` | Schützt die nächtlichen Läufe (`/api/cron/…`) und gibt die ausführliche Fassung von `/api/status` frei | nein |
| `SUPPORT_TEAM_EMAILS` | Konten des Sorrida-Teams (kommagetrennt): sehen `/anfragen`, `/betrieb` und die Hinweise in `/api/status` | nein |
| `SUPPORT_NOTIFY_EMAIL` | Empfänger für Hilfe-Anfragen, falls abweichend von `LEAD_NOTIFY_EMAIL` | nein |
| `VORSCHAU_HOSTS` | Domains, auf denen das Vorschau-Schloss gilt | nein |
| `VORSCHAU_BENUTZER`, `VORSCHAU_PASSWORT` | Zugang zur Vorschau | nein |
| `VORSCHAU_OEFFENTLICH` | Stufe der Sichtbarkeit: leer, `1` (Informationsseiten) oder `demo` | nein |
| `GOOGLE_SITE_VERIFICATION` | Bestätigung für die Google Search Console (kein Geheimnis) | nein |
| `KV_REST_API_URL`/`_TOKEN`, `UPSTASH_REDIS_REST_URL`/`_TOKEN` | Zugang zu Upstash für die Zähler gegen Missbrauch (`lib/redisCredentials.ts`) | nein |
| `STRIPE_SECRET_KEY`, `STRIPE_CLIENT_ID`, `STRIPE_WEBHOOK_SECRET` | Online-Zahlung über Stripe Connect, nur falls eingerichtet | nein |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VORLAGE`, `WHATSAPP_SPRACHE` | WhatsApp Business Platform, nur falls eingerichtet | nein |
| `KBV_STAMMDATEN_LIZENZ` | Mit `abgelehnt` wird die EBM-Stammdatei der KBV beim Einlesen nicht geladen | nein |
| `AMTLICH_SPEICHER_GRENZE_MB` | Obergrenze für die amtlichen Verzeichnisse in der Datenbank | nein |

Von Vercel gesetzt und nur gelesen: `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_REGION`, `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`.

Nur für die Browser-Durchläufe (Abschnitt 8): `BASIS`, `DB`, `BILDER`, `E2E_IP`, `E2E_ZEITLIMIT_MIN`.

## 6. Regelmäßige Kontrollen

### Täglich (von selbst)

- 03:17 Uhr UTC: `/api/cron/aufraeumen` wendet die Löschfristen an (`lib/loeschfristen.ts`) und schickt eine Mail an `LEAD_NOTIFY_EMAIL`,
  wenn es seit gestern neue Fehler gibt. Die Mail nennt nur Zahl, Orte und den Link `/betrieb`.
- Werktags 05:40 Uhr UTC: Morgen-Mail an die Praxen.

### Wöchentlich

- [ ] `/betrieb` öffnen: offene Fehler ansehen, beheben oder als erledigt markieren.
- [ ] `/api/status` angemeldet öffnen: Alle Punkte ok? Besonders „Fehler (24 Std.)“, „Migrationen“, „Speicher“, „Missbrauchsschutz“.
- [ ] `/anfragen` öffnen: offene Hilfe- und Pilot-Anfragen beantworten.
- [ ] Vercel: Ist das letzte Deployment durchgelaufen? Auffälliges in den Logs?
- [ ] GitHub: Sind die Prüfläufe (CI, Browser-Durchläufe) grün?

### Monatlich

- [ ] Neon: Speicherverbrauch und Aufbewahrung der Historie prüfen.
- [ ] Bewertungen des IGeL-Monitors nachprüfen: `IGEL_MONITOR_ONLINE=1 npx vitest run lib/igelMonitor.test.ts` (hinter einem Proxy
  zusätzlich `NODE_USE_ENV_PROXY=1`). Schlägt er fehl, hat der IGeL-Monitor eine Seite neu angelegt, entfernt oder neu bewertet:
  Katalog (`lib/specialties.ts`, `lib/fachangebote.ts`) und Liste im Test nachziehen, Abrufdatum anpassen.
- [ ] Lauf „Amtliche Daten prüfen“ (am 2. des Monats) ansehen. Gibt es ein Issue „Amtliche Daten: neuer Stand verfügbar“? Dann nachsehen und einlesen.
- [ ] Abhängigkeiten: `npm outdated` und `npm audit` ansehen, Sicherheitsmeldungen einspielen.
- [ ] Dienstleister: Hat sich bei Vertrag, Standort oder Unterauftragnehmern etwas geändert? Dann `lib/dienstleister.ts` pflegen und die Praxen
  30 Tage vorher informieren (AVV § 6).
- [ ] Zugänge: Wer hat Zugriff auf Vercel, Neon, Resend, GitHub? Zwei-Faktor-Anmeldung überall an?
- [ ] `SUPPORT_TEAM_EMAILS`: stimmt die Liste noch?

### Jährlich

- [ ] Wiederherstellung der Datenbank üben (Abschnitt 2) und Datum eintragen.
- [ ] Zum Jahreswechsel: Festzuschüsse einlesen (Abschnitt 7), Zuzahlungen und Gebührenwerke prüfen.
- [ ] `/vertrauen` und AVV-Muster gegen den tatsächlichen Stand lesen.

## 7. Amtliche Daten

- `npx tsx scripts/amtlich-pruefen.ts` vergleicht EBM (KBV-Stammdatei), OPS (BfArM), UV-GOÄ und BEMA mit dem Stand im Repo.
  Ausgabe je Quelle: aktuell, neuer Stand verfügbar oder nicht prüfbar. Code 0 heißt keine Änderung, Code 3 neuer Stand.
  Die Prüfung liest nur Versionsnummern und Datumsangaben von den Seiten der Herausgeber. Ein Fund heißt: bitte nachsehen.
- `.github/workflows/amtlich.yml` führt das am 2. jedes Monats aus und öffnet bei Code 3 ein Issue.
- **Festzuschüsse 2027.** Solange `data/festzuschuss-2027.json` leer ist (`{}`), rechnet Sorrida 2027 mit den Beträgen 2026 und den neuen Sätzen
  und nennt das Ergebnis „voraussichtlich“. Sobald die Beträge veröffentlicht sind:
  1. CSV anlegen, je Zeile `Befund;Euro` (zum Beispiel `1.1;410,25`), alle Befunde aus 2026.
  2. `npx tsx scripts/festzuschuss-2027-einlesen.ts datei.csv --nur-pruefen` zeigt die Gegenüberstellung.
  3. Ohne `--nur-pruefen` schreibt das Skript die Datei. Es bricht ab, wenn ein Befund fehlt oder ein Betrag mehr als 25 % abweicht.
  4. Jeden Betrag gegen die Veröffentlichung vergleichen, `npx vitest run`, dann veröffentlichen.
  Ab dann entfällt das Wort „voraussichtlich“ im Schreiben an den Patienten, im Rechner, in der Nachfass-Liste und im Ratgeber-Artikel.

## 8. Browser-Durchläufe (`e2e/`)

Die Durchläufe klicken die laufende Anwendung mit Chromium durch. Playwright steht bewusst nicht in `package.json`.

```
npm install --no-save playwright && npx playwright install chromium
REGISTRIERUNG_OFFEN=1 npm run build && REGISTRIERUNG_OFFEN=1 npm start &
node e2e/alle.js            # alle
node e2e/alle.js teil3-a    # nur einer
```

Einstellungen: `BASIS` (Standard `http://localhost:3000`), `DB` (sonst `DATABASE_URL` oder die `.env`), `BILDER` (Standard `e2e/.bilder`).
Jeder Durchlauf endet mit Code 1, wenn eine Prüfung fehlschlägt. In GitHub läuft das als Job „browser“ nach den Tests;
bei einem Fehlschlag liegen die Bilder als Artefakt am Lauf.

Niemals gegen die echte Datenbank laufen lassen: Die Durchläufe legen Praxen und Patienten an.

## 9. Dokumentenspeicher (nur vorbereitet)

Dokumente der Akte liegen heute in der Datenbank (Tabelle `PatientDocument`, Spalte `data`). Das bleibt der Standard.

`lib/dokumentSpeicher.ts` enthält eine Schnittstelle (speichern, lesen, löschen) mit zwei Treibern:
`db` (der heutige Weg) und `s3` (S3-kompatibler Speicher in der EU, über fetch mit SigV4-Signatur, geprüft gegen die Beispielwerte von AWS).

**Die Akte nutzt diese Schnittstelle noch nicht.** Das Setzen von `DOKUMENT_SPEICHER="s3"` ändert heute nichts an der Anwendung.
Für die Umstellung fehlen:

1. Anbieter in der EU wählen, AVV schließen, Bucket mit Verschlüsselung und ohne öffentlichen Zugriff anlegen. Dienst in `lib/dienstleister.ts` eintragen
   und die Praxen 30 Tage vorher informieren.
2. Die Schnittstellen `app/api/patients/[id]/documents` und das Patientenportal auf `dokumentSpeicher()` umstellen.
   Der Schlüssel ist immer `<Praxis>/<Dokument>` (`dokumentSchluessel`).
3. Vorhandene Dateien einmal umziehen und danach die Spalte `data` leeren. Dafür gibt es noch kein Skript.
4. Löschen: Beim Löschen eines Patienten oder Dokuments auch die Datei im Speicher löschen. Sicherung des Speichers klären.
5. Mit einem echten Speicher testen. Bisher ist nur die Signatur gegen veröffentlichte Beispielwerte geprüft, kein echter Abruf.

## 10. Fehlerlog

- Server: `instrumentation.ts` schreibt jeden Fehler einer Anfrage in die Tabelle `FehlerEintrag`.
- Browser: Die Fehlerseiten melden an `POST /api/fehler` (nur gleiche Herkunft, 20 Meldungen je Stunde und Adresse, höchstens 2 kB).
- Vor dem Speichern wird bereinigt (`lib/fehlerlog.ts`): Ort ohne Abfrage-Teil und Token, Meldung ohne E-Mail-Adressen, Ziffernfolgen,
  Datumsangaben, IBAN und Texte in Anführungszeichen, höchstens 300 Zeichen, höchstens drei Stack-Zeilen (nur vom Server).
  Aus dem Browser bleiben vom Ort nur feste Seitennamen, von der Meldung nur Wörter einer festen Liste; ein Stack wird nicht gespeichert.
  Gespeichert wird außerdem nur die ID der Praxis und ob es eine Demo-Praxis ist.
- Tagesgrenze für neue Browser-Einträge: 40 ohne Anmeldung, 20 je angemeldeter Praxis. Darüber zählt eine Meldung im Sammeleintrag
  „Weitere neue Meldungen nach Erreichen der Tagesgrenze“ ihres Bereichs.
- Statusbericht: zählt nur Fehler des Servers, die nicht nur in Demo-Praxen auftraten. Null-Zeichen in Adressen beantwortet `proxy.ts`
  mit 400; doppelte Parameter auf Seiten leiten auf den jeweils ersten Wert weiter (`lib/adresse.ts`).
- Gleicher Fehler: gleiche Zeile, der Zähler steigt. Tritt ein erledigter Fehler wieder auf, ist er wieder offen.
- Löschfrist: 30 Tage nach dem letzten Auftreten.
- Grenze: Die Bereinigung erkennt Muster, keine Bedeutungen. Ein Name ohne Anführungszeichen in einer eigenen Fehlermeldung würde gespeichert.
  Deshalb gehören in Fehlermeldungen im Code nie Namen oder andere Angaben zu Personen.
- Auf der Vorschau-Domain erreichen Besucher ohne Zugang `/api/fehler` nicht. Fehler im Browser dieser Besucher werden dann nicht gemeldet.

## 11. Zusagen aus dem AVV-Muster, die Handarbeit sind

Zwei Zusagen im Muster-AVV (`app/avv/page.tsx`) erfüllt nicht die Software, sondern der Betreiber von Hand.
Beides muss stehen, bevor der erste Vertrag unterschrieben wird.

### Zugriffe auf Daten einer Praxis (§ 8)

- Jeder Zugriff des Betreibers auf Daten einer Praxis (Support, Störung) wird schriftlich festgehalten:
  Datum und Uhrzeit, Person, Praxis, Anlass, was angesehen oder geändert wurde.
- Ort der Aufzeichnung: eine fortlaufende Liste außerhalb der Anwendung. In der Anwendung gibt es dafür
  keine Funktion und keine Ansicht für die Praxis.
- Die Praxis bekommt ihre Einträge auf Anfrage in Textform. So steht es im Muster.

### Vertragsende: Export und Löschung (§ 10)

Stand: Skript `scripts/praxis-loeschen.ts`. Es löscht alle Daten einer Praxis in einer Transaktion, auch das Protokoll
der Praxis (`AuditLog`; so steht es in der Datenschutzerklärung, Abschnitt 6, und in `lib/loeschfristen.ts`). Die Liste der
Tabellen steht in `lib/praxisLoeschen.ts`. Dieselbe Liste nutzt der tägliche Lauf für abgelaufene Demo-Praxen; lässt sich eine
nicht löschen, steht das im Fehlerlog (Abschnitt 10) und in der täglichen Fehler-Mail, die übrigen Schritte laufen weiter.
Ein Test (`lib/praxisLoeschen.test.ts`) schlägt fehl, wenn eine neue Tabelle im Schema nicht eingeordnet ist.

Ablauf:

1. Gesamtexport für die Praxis erzeugen (Einstellungen → Protokoll → Gesamtexport, `app/api/settings/export/route.ts`) und der Praxis übergeben. Datum der Bereitstellung festhalten.
2. 30 Tage nach Bereitstellung, oder früher auf Verlangen der Praxis: alle Daten der Praxis löschen.
   - `DATABASE_URL` in der Shell auf die Datenbank der Anwendung setzen. Die Datei `.env` zählt nicht. Ohne die Angabe bricht das Skript ab.
   - Die Kennung der Praxis steht in der Tabelle `Practice` (Neon-Konsole, SQL-Editor: `select id, name from "Practice"`).
   - Erst der Probelauf. Er löscht nichts. Er zeigt Datenbank, Name und Kennung der Praxis und die Zahl der Zeilen je Tabelle:
     `npx tsx scripts/praxis-loeschen.ts --praxis <Kennung>`
   - Prüfen: richtige Datenbank, richtige Praxis, Zahlen plausibel. Meldet der Probelauf Verweise zwischen dieser und anderen
     Praxen (in beide Richtungen), löscht das Skript nicht. Dann erst klären.
   - Dann löschen. Der Probelauf zeigt den fertigen Befehl. `--datenbank` muss genau der Zeile „Datenbank:“ entsprechen
     (ein Branch hat einen anderen Rechnernamen), der Name hinter `--bestaetigen` muss genau stimmen, und `TAGE` wird durch
     die Aufbewahrung der Sicherungen aus Abschnitt 2 ersetzt:
     `npx tsx scripts/praxis-loeschen.ts --praxis <Kennung> --ausfuehren --datenbank <Rechner:Port/Datenbank> --bestaetigen "<Name der Praxis>" --sicherung-tage <Tage>`
   - Danach gibt das Skript einen Bestätigungstext aus: Zeitpunkt (UTC), Name und Kennung der Praxis, Zahl je Tabelle,
     Dauer der Sicherungen und das Datum, ab dem die Daten auch dort gelöscht sind. Er enthält keine Angaben zu Patienten.
     Zwei Zeilen in eckigen Klammern füllt der Betreiber aus (Schritt 3). Text aufbewahren.
   - Nicht gelöscht, nur von der Praxis getrennt: Fehlereinträge (`FehlerEintrag`). Sie werden vor dem Speichern bereinigt
     (Abschnitt 10); die Bereinigung erkennt Muster, keine Bedeutungen. Gelöscht werden sie 30 Tage nach dem letzten Auftreten.
     Anfragen über die Website (`Lead`) hängen nicht an der Praxis. Für sie gilt die eigene Löschfrist.
   - Dokumente liegen heute in der Datenbank und werden mit gelöscht. Wird der Dokumentenspeicher (Abschnitt 9) eingeschaltet,
     muss das Skript auch dort löschen.
   - Wird die Datenbank später aus einer Sicherung von vor der Löschung wiederhergestellt (Abschnitt 2), das Skript für diese Praxis erneut ausführen.
3. Vor der Bestätigung, was das Skript nicht sieht:
   - Sicherungen: Der Datenbank-Anbieter hält Sicherungen für den im Tarif eingestellten Zeitraum (Abschnitt 2). Erst danach
     sind die Daten auch dort weg. Dauer und Datum stehen im Text aus Schritt 2 (`--sicherung-tage`).
   - Branches: In der Neon-Konsole alle Branches des Projekts auflisten. Jeder Branch außer dem Haupt-Branch, der vor der
     Löschung angelegt wurde (zum Beispiel aus einer Wiederherstellung, Abschnitt 2), ist eine vollständige Kopie mit den Daten
     der Praxis. Solche Branches löschen, oder das Skript dort mit der Adresse des Branches ausführen. In die Zeile „Branches“
     des Bestätigungstexts eintragen, was geschehen ist (zum Beispiel „keine weiteren Branches“ oder „Branch … am … gelöscht“).
   - E-Mail-Dienst (Resend): In der Resend-Konsole nachsehen, wie lange gesendete E-Mails mit Inhalt gespeichert bleiben
     (Aufbewahrung laut Tarif), und hier eintragen: ______________. Diese Angabe in die Zeile „E-Mail-Dienst“ eintragen
     (zum Beispiel „Gesendete E-Mails bewahrt der E-Mail-Dienst … Tage auf; danach sind sie dort gelöscht.“).
4. Löschung der Praxis in Textform bestätigen. Dafür den Text aus Schritt 2 mit den ausgefüllten Zeilen aus Schritt 3 nehmen.

