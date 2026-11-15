import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { BETREIBER, betreiberAnschrift } from "@/lib/betreiber";
import { onlineZahlungStatus } from "@/lib/onlineZahlung";
import { whatsappApiAktiv } from "@/lib/whatsapp";
import { LOESCHFRISTEN } from "@/lib/loeschfristen";
import { SITZUNG_MAX_SEKUNDEN } from "@/lib/sitzung";
import { BEREICH_MINUTEN } from "@/lib/bereichSchutz";
import { BESTAETIGUNG_MINUTEN } from "@/lib/portalPruefung";
import { PARKEN_STUNDEN, UEBERGABE_MINUTEN } from "@/lib/empfang";
import { VORSCHAU_TAGE } from "@/lib/vorschau";

export const metadata: Metadata = { title: "Datenschutz – Sorrida" };

// Jede Tatsache auf dieser Seite muss zum Code passen. Wer Cookies, Dienstleister oder Löschfristen ändert,
// ändert diese Seite mit (Cookies: proxy.ts, lib/sitzung.ts, lib/bereichSchutz.ts, lib/portalPruefung.ts,
// lib/empfang.ts; Dienste: lib/email.ts, lib/anthropic.ts, lib/whatsapp.ts, lib/rateLimit.ts,
// lib/onlineZahlung.ts, vercel.json; Fristen: lib/loeschfristen.ts). Dauern und Fristen werden deshalb
// aus dem Code gelesen. Stripe und WhatsApp erscheinen nur, wenn die Dienste eingerichtet sind.
const STAND = "15.11.2026";

export default function DatenschutzPage() {
  const b = BETREIBER;
  const stripeAktiv = onlineZahlungStatus().aktiv;
  const whatsappAktiv = whatsappApiAktiv();
  const anfragenTage = LOESCHFRISTEN.find((f) => f.id === "anfragen")!.tage;
  const anfragenMonate = Math.round(anfragenTage / 30.4);
  const terminanfrageTage = LOESCHFRISTEN.find((f) => f.id === "terminanfrage")!.tage;
  const protokollJahre = Math.round(LOESCHFRISTEN.find((f) => f.id === "protokoll")!.tage / 365);
  const sitzungStunden = SITZUNG_MAX_SEKUNDEN / 3600;
  return (
    <LegalPage title="Datenschutzerklärung">
      <p className="text-sm text-slate-500" data-testid="datenschutz-stand">
        Stand: {STAND}
      </p>

      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          {betreiberAnschrift(b)}
          {b.telefon ? `, Telefon ${b.telefon}` : ""}, E-Mail <a href={`mailto:${b.email}`}>{b.email}</a>.
        </p>
        <p>
          Diese Erklärung gilt für die Website von Sorrida und für die Konten der Praxen. Für die Daten von Patientinnen und Patienten ist die
          jeweilige Praxis verantwortlich (Abschnitt 6).
        </p>
      </section>

      <section>
        <h2>2. Besuch der Website</h2>
        <p>
          Beim Aufruf verarbeitet unser Hosting-Dienstleister IP-Adresse, Zeitpunkt, aufgerufene Adresse, übertragene Datenmenge und Angaben
          Ihres Browsers, um die Seite auszuliefern und Angriffe abzuwehren (Art. 6 Abs. 1 lit. f DSGVO; unser Interesse ist der sichere
          Betrieb). Wie lange der Hosting-Dienstleister diese Protokolle aufbewahrt, richtet sich nach unserem Vertrag mit ihm. Eine eigene
          Besucherstatistik führen wir nicht.
        </p>
        <p>
          Zum Schutz vor Missbrauch zählen wir bei Formularen, Anmeldung, Registrierung, Gastzugang und Patienten-Links die Anfragen je
          IP-Adresse. Diese Zähler verfallen nach spätestens einer Stunde. Ist kein Zähldienst angebunden, liegen sie nur im Arbeitsspeicher
          des Servers.
        </p>
        <p>
          Wir setzen keine Analyse- oder Werbewerkzeuge ein und binden keine Inhalte fremder Server ein. Schriften, Bilder und 3D-Modelle
          kommen von unserem eigenen Server. Die Vorschau unter <Link href="/vorschau">/vorschau</Link> und der Zeitrechner auf der Startseite
          laufen in Ihrem Browser; Ihre Eingaben dort werden nicht übertragen. Für den Gastzugang gilt Abschnitt 5.
        </p>
      </section>

      <section>
        <h2>3. Cookies und Speicher im Browser</h2>
        <p>
          Wir verwenden nur technisch notwendige Cookies (§ 25 Abs. 2 Nr. 2 TDDDG). Eine Einwilligung ist dafür nicht erforderlich, deshalb
          gibt es kein Cookie-Banner.
        </p>
        <ul className="ml-5 list-disc space-y-1" data-testid="cookie-liste">
          <li>
            <b>Anmeldung:</b> ein Sitzungs-Cookie und zwei Hilfs-Cookies für das Anmeldeformular, sobald Sie sich anmelden, registrieren oder
            den Gastzugang öffnen. Das Sitzungs-Cookie gilt höchstens {sitzungStunden} Stunden, die Hilfs-Cookies bis zum Schließen des
            Browsers.
          </li>
          <li>
            <b>„Mein Bereich“:</b> ein Cookie für {BEREICH_MINUTEN} Minuten, nachdem eine angemeldete Person ihren Bereich entsperrt hat.
          </li>
          <li>
            <b>Empfangsmodus:</b> Wenn die Praxis ihr Gerät einem Patienten gibt, hält ein Cookie die Patientenansicht für höchstens{" "}
            {UEBERGABE_MINUTEN} Minuten offen; ein zweites bewahrt die Anmeldung der Praxis verschlüsselt auf, bis sie mit der PIN zurückkehrt, höchstens {PARKEN_STUNDEN} Stunden.
          </li>
          <li>
            <b>Patientenportal:</b> ein Cookie für {BESTAETIGUNG_MINUTEN} Minuten, nachdem Sie Ihr Geburtsdatum bestätigt haben. Ohne diese
            Bestätigung setzt das Portal kein Cookie.
          </li>
          <li>
            <b>Zugang vor dem Start:</b> Solange diese Website nur mit Zugangsdaten erreichbar ist, merkt sich ein Cookie für {VORSCHAU_TAGE}{" "}
            Tage, dass die Zugangsdaten eingegeben wurden.
          </li>
        </ul>
        <p>
          Angemeldete Praxen: Ein angefangener Vorschlag wird im Sitzungsspeicher des Browsers zwischengespeichert, damit er beim Neuladen nicht
          verloren geht. Er wird beim Speichern, beim Abmelden und beim Schließen des Browserfensters gelöscht. Auf der öffentlichen Website
          speichern wir nichts im Speicher Ihres Browsers.
        </p>
      </section>

      <section>
        <h2>4. Anfragen (Pilotprogramm, Hilfe-Formular, E-Mail, Telefon)</h2>
        <p>
          Wir verarbeiten Praxisname, Ihren Namen, Fachrichtung, Zahl der Behandelnden, Telefonnummer oder E-Mail-Adresse, Praxissoftware,
          Rückrufzeit und Ihre Nachricht, um Ihre Anfrage zu beantworten und ein Vertragsverhältnis anzubahnen (Art. 6 Abs. 1 lit. b und f
          DSGVO). Die Angaben sind freiwillig; ohne Kontaktangabe können wir nicht antworten. Über neue Anfragen werden wir per E-Mail
          benachrichtigt; dafür nutzen wir unseren E-Mail-Dienstleister (Abschnitt 7).
        </p>
        <p data-testid="datenschutz-anfragen-frist">
          Wir löschen jede Anfrage spätestens {anfragenMonate} Monate nach Eingang. Das geschieht automatisch.
        </p>
      </section>

      <section>
        <h2>5. Gastzugang (Demo-Praxis)</h2>
        <p>
          Für den Gastzugang legen wir auf unserem Server eine Demo-Praxis mit erfundenen Daten an und melden Ihren Browser dort an. Name oder
          E-Mail-Adresse fragen wir nicht ab. Was Sie in der Demo-Praxis eingeben, wird an unseren Server übertragen und dort gespeichert.
          Bitte geben Sie keine echten Patientendaten ein. Der Zugang endet nach 24 Stunden. Demo-Praxis und alle Eingaben werden danach
          automatisch gelöscht, spätestens in der folgenden Nacht.
        </p>
      </section>

      <section>
        <h2>6. Registrierung und Nutzung durch Praxen</h2>
        <p>
          Für das Konto verarbeiten wir Praxisname, Fachgebiet, Name, E-Mail-Adresse, Passwort (nur als Hash), Rolle, Zeitpunkte der Anmeldung
          und ein Änderungsprotokoll (Art. 6 Abs. 1 lit. b DSGVO). Zur Bestätigung der E-Mail-Adresse senden wir einen Link. Bei der
          Registrierung speichern wir außerdem, wann die Praxis die Pflichthinweise bestätigt hat. Ohne diese Angaben können wir kein Konto
          einrichten. Kontodaten löschen wir nach Vertragsende, Protokolleinträge nach {protokollJahre} Jahren.
        </p>
        <p>
          Patientendaten, die Praxen in Sorrida verarbeiten, verarbeiten wir ausschließlich im Auftrag der jeweiligen Praxis (Art. 28 DSGVO).
          Verantwortlich ist die Praxis; an sie richten Patientinnen und Patienten ihre Anfragen. Das gilt auch für Patienten-Link,
          Patientenportal, Anamnesebogen, Fragebögen, Terminbuchung und Terminanfrage, Rechnungen, Lastschriftmandat, Online-Zahlung und
          Nachrichten. Was dabei verarbeitet wird, steht im <Link href="/avv">Muster des Vertrags zur Auftragsverarbeitung</Link>.
        </p>
        <p data-testid="datenschutz-terminanfrage">
          Terminanfrage neuer Patienten: Bietet eine Praxis ihre Buchungsseite an, verarbeiten wir dort im Auftrag der Praxis Vor- und
          Nachname, Geburtsdatum, Mobilnummer oder E-Mail-Adresse, Anlass und gewünschten Termin. Die Seite setzt kein Cookie. Anfragen, die
          die Praxis nicht bestätigt, werden {terminanfrageTage} Tage nach Eingang gelöscht; bestätigte stehen dann in Akte und Termin der
          Praxis.
        </p>
        <p>
          Empfangsmodus: Gibt die Praxis ihr Gerät einem Patienten in die Hand, kann er dort Kontaktdaten prüfen, den Anamnesebogen ausfüllen
          oder unterschreiben. Auch das geschieht im Auftrag der Praxis; die Cookies dazu stehen in Abschnitt 3.
        </p>
        <p data-testid="datenschutz-patientenfunktionen">
          Weitere Funktionen im Patienten-Link, ebenfalls im Auftrag der Praxis: Wer seinen Vorschlag mit einer Vertrauensperson teilt,
          erzeugt einen zweiten Link nur zum Lesen. Wir speichern davon nur einen Hashwert; die Lese-Ansicht zeigt weder Namen noch
          Antworten, und der Link lässt sich jederzeit widerrufen. Wer sich erinnern lassen möchte, wählt einen Tag; an diesem Tag sieht die
          Praxis den Wunsch in ihrem Eingang, von selbst wird keine Nachricht verschickt. Die Kostenübersicht als PDF entsteht beim Abruf und
          wird bei uns nicht gespeichert. Die Antwort auf die Frage nach dem Termin (fünf Stufen, auf Wunsch ein Satz) sieht die Praxis ohne
          Namen und erst ab fünf Antworten. Hat die Praxis einen Link zu ihrem Profil bei Google hinterlegt, zeigen wir ihn nach dem Absenden
          an; erst wenn Sie ihn anklicken, verlassen Sie Sorrida, und es gelten die Bedingungen von Google. Das Vorlesen übernimmt Ihr Browser
          auf Ihrem Gerät; dabei wird nichts an uns übertragen.
        </p>
        <p>
          Hinweis für Patientinnen und Patienten: Ihr persönlicher Link enthält keine Patientendaten, sondern ein zufälliges Kennzeichen, von
          dem wir nur einen Hashwert speichern. Im Patientenportal setzen wir erst dann ein Cookie, wenn Sie Ihr Geburtsdatum bestätigen
          (Abschnitt 3). Die Seiten sind für Suchmaschinen gesperrt.
        </p>
      </section>

      <section>
        <h2>7. Empfänger</h2>
        <p>Wir setzen folgende Dienstleister als Auftragsverarbeiter ein:</p>
        <ul className="ml-5 list-disc space-y-1" data-testid="empfaenger-liste">
          <li>
            <b>Vercel</b> (Vercel Inc., USA): Hosting. Die Anwendung läuft in der Region Frankfurt am Main.
          </li>
          <li>
            <b>Neon</b> (Datenbankdienst, Unternehmen mit Sitz in den USA): Datenbank mit Speicherort Frankfurt am Main.
          </li>
          <li>
            <b>Upstash</b> (Upstash, Inc., USA): Zähler zum Schutz vor Missbrauch. Dort liegen nur Zähler je IP-Adresse, Konto oder Praxis. Zähler je
            IP-Adresse verfallen nach spätestens einer Stunde, die übrigen nach spätestens 24 Stunden.
          </li>
          <li>
            <b>Resend</b> (E-Mail-Dienst, Unternehmen mit Sitz in den USA): Versand von E-Mails. Das betrifft E-Mails an Praxen (Bestätigung,
            Einladung, Passwort) und, wenn eine Praxis es auslöst, E-Mails an ihre Patienten (Termin, Zahlungserinnerung).
          </li>
          <li>
            <b>Anthropic</b> (KI-Dienst, Unternehmen mit Sitz in den USA): Formulierung von Berichtsentwürfen für Praxen. Dorthin gehen keine
            Namen, kein Geburtsdatum und keine Versichertennummer. Website-Besucher betrifft das nicht.
          </li>
          {stripeAktiv && (
            <li>
              <b>Stripe</b> (Stripe Payments Europe Ltd., Irland): Online-Zahlung über das Konto der Praxis. Karten- und Bankdaten geben
              Patienten direkt bei Stripe ein.
            </li>
          )}
          {whatsappAktiv && (
            <li>
              <b>WhatsApp</b> (WhatsApp Ireland Ltd., Meta): Nachrichten an Patienten im Auftrag der Praxis, nur mit deren Einwilligung.
            </li>
          )}
        </ul>
      </section>

      <section>
        <h2>8. Übermittlung in Länder außerhalb der EU</h2>
        <p>
          Die genannten Unternehmen haben ihren Sitz in den USA oder gehören zu US-Konzernen. Ein Zugriff aus den USA ist nicht ausgeschlossen.
          Grundlage ist der Angemessenheitsbeschluss der EU-Kommission für das EU-US Data Privacy Framework, soweit der Empfänger dort
          zertifiziert ist, sonst die EU-Standardvertragsklauseln. Welche Grundlage für welchen Empfänger gilt, teilen wir Ihnen auf Anfrage
          mit; dabei erhalten Sie auch eine Kopie der Garantien.
        </p>
      </section>

      <section>
        <h2>9. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit (Art. 15–20 DSGVO).
        </p>
        <p className="rounded-lg border border-linie-stark px-4 py-3" data-testid="widerspruchsrecht">
          <b>Widerspruch:</b> Soweit wir Daten auf Grundlage berechtigter Interessen verarbeiten (Abschnitte 2 und 4), können Sie aus Gründen,
          die sich aus Ihrer besonderen Situation ergeben, jederzeit widersprechen (Art. 21 DSGVO). Eine Nachricht an die oben genannte
          Adresse genügt.
        </p>
        <p>
          Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Eine automatisierte Entscheidung im Einzelfall
          oder ein Profiling findet nicht statt.
        </p>
        <p>
          Sie können sich bei einer Aufsichtsbehörde beschweren, zum Beispiel bei der Landesbeauftragten für Datenschutz und
          Informationsfreiheit Nordrhein-Westfalen, Kavalleriestraße 2–4, 40213 Düsseldorf.
        </p>
      </section>
    </LegalPage>
  );
}
