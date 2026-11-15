import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { BETREIBER, betreiberAnschrift } from "@/lib/betreiber";

export const metadata: Metadata = {
  title: "Vertrag zur Auftragsverarbeitung (Muster) – Sorrida",
  description: "Muster des Vertrags zur Auftragsverarbeitung nach Art. 28 DSGVO zwischen Praxis und Sorrida, mit technischen und organisatorischen Maßnahmen und der Liste der Dienstleister.",
};

// Muster-AVV. § 2 (Daten) und die Anlagen beschreiben, was der Code tatsächlich speichert und wohin Daten gehen
// (prisma/schema.prisma, lib/connector.ts, lib/email.ts, lib/anthropic.ts, lib/whatsapp.ts, lib/rateLimit.ts,
// lib/onlineZahlung.ts). Bei Änderungen an Datenfeldern, Sicherheit oder Dienstleistern hier mitpflegen.
const STAND = "15.11.2026";

const DIENSTE: { dienst: string; zweck: string; daten: string; ort: string }[] = [
  {
    dienst: "Vercel (Vercel Inc., USA)",
    zweck: "Hosting der Anwendung",
    daten: "Alle Inhalte im Durchlauf; Server-Protokolle mit IP-Adresse, Zeit, aufgerufener Adresse und Browser",
    ort: "Region Frankfurt am Main (fra1); Unternehmen in den USA",
  },
  {
    dienst: "Neon (Datenbankdienst, Unternehmen in den USA)",
    zweck: "Speicherung der Daten (PostgreSQL), Datensicherung",
    daten: "Alle Daten nach § 2",
    ort: "Frankfurt am Main; Unternehmen in den USA",
  },
  {
    dienst: "Upstash (Upstash, Inc., USA)",
    zweck: "Zähler zum Schutz vor Missbrauch, nur falls angebunden",
    daten: "Zähler mit IP-Adresse, auch von Patienten, die ihren Link oder das Portal öffnen; Zähler je Konto und Praxis. Keine Inhalte. Dauer höchstens 24 Stunden.",
    ort: "Region laut Einstellung im Upstash-Konto; Unternehmen in den USA",
  },
  {
    dienst: "Resend (E-Mail-Dienst, Unternehmen in den USA)",
    zweck: "Versand von E-Mails",
    daten:
      "E-Mails an Praxis-Beschäftigte (Einladung, Passwort, Morgen-Mail ohne Patientendaten) und, wenn die Praxis es auslöst, an Patienten (Terminbestätigung, Terminerinnerung, Zahlungserinnerung: E-Mail-Adresse, Vorname, Praxisname, Termin, ggf. Anlass, Rechnungsnummer, Betrag, persönlicher Link)",
    ort: "USA",
  },
  {
    dienst: "Anthropic (KI-Dienst, Unternehmen in den USA)",
    zweck: "Formulierung von Berichtsentwürfen und Kurzfassungen, wenn die Praxis sie anfordert",
    daten:
      "Erfasste Leistungen, Diktat und Akteneinträge. Namen, Geburtsdatum, Versichertennummer, E-Mail-Adressen und Telefonnummern werden vorher durch Platzhalter ersetzt. Freier Text kann trotzdem Angaben enthalten, die auf eine Person schließen lassen.",
    ort: "USA",
  },
  {
    dienst: "Stripe (nur wenn die Praxis Online-Zahlung einschaltet)",
    zweck: "Online-Zahlung im Patientenportal über das eigene Stripe-Konto der Praxis. Die Praxis schließt dafür selbst einen Vertrag mit Stripe.",
    daten: "Rechnungsnummer, Betrag, Praxisname und die Adresse, unter der der Patient ins Portal zurückkehrt. Karten- und Bankdaten gibt der Patient direkt bei Stripe ein; Sorrida erhält sie nicht.",
    ort: "laut Vertrag der Praxis mit Stripe",
  },
  {
    dienst: "WhatsApp Business Platform von Meta (nur wenn eingerichtet)",
    zweck: "Nachrichten an Patienten, die in WhatsApp eingewilligt haben",
    daten: "Mobilnummer, Vorname, Praxisname, Nachricht oder persönlicher Link. Keine Befunde, keine Beträge.",
    ort: "EU und USA",
  },
];

export default function AvvPage() {
  const b = BETREIBER;
  return (
    <LegalPage title="Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO (Muster)">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900" data-testid="avv-muster">
        <b>Muster. Der Vertrag kommt erst mit der Unterschrift beider Seiten zustande.</b> Bis dahin dürfen in Sorrida keine echten
        Patientendaten verarbeitet werden. Die Angaben zur Praxis und die im Text genannten Einzelheiten je Dienstleister werden bei
        Vertragsschluss eingetragen.
      </p>
      <p className="text-sm text-slate-500">Stand: {STAND}</p>

      <section>
        <h2>Vertragsparteien</h2>
        <p>
          Verantwortlicher („Praxis“): Name und Anschrift der Praxis oder Einrichtung
          <br />
          Auftragsverarbeiter („Sorrida“): {betreiberAnschrift(b)}
        </p>
      </section>

      <section>
        <h2>§ 1 Gegenstand, Zweck und Dauer</h2>
        <p>
          Sorrida stellt der Praxis eine Software über das Internet bereit. Sie umfasst: Erfassung von Leistungen und Befunden,
          Berichtsentwürfe (auch mit einem KI-Dienst), Behandlungs- und Kostenvorschläge, Patienten-Link und Patientenportal (Vorschlag,
          Rückmeldung, Vorab-Einverständnis mit Unterschrift, Anamnese und Fragebögen, Terminbuchung, Rechnungen, Lastschriftmandat,
          Online-Zahlung, Zweitmeinungs-Vergleich), Terminanfrage neuer Patienten über die Buchungsseite der Praxis, Empfangsmodus am Gerät der Praxis (Kontaktdaten,
          Anamnese, Unterschrift), Nachrichten an Patienten per E-Mail und Messenger, Termine und Aufgaben, Rechnungen,
          Zahlungsabgleich und Exporte, Auswertungen sowie die Anbindung an die Praxissoftware. Zweck ist ausschließlich die Erbringung dieser
          Leistungen für die Praxis. Der Vertrag gilt für die Dauer des Nutzungsvertrags.
        </p>
      </section>

      <section>
        <h2>§ 2 Art der Daten und Betroffene</h2>
        <ul className="ml-5 list-disc space-y-1" data-testid="avv-daten">
          <li>
            <b>Patientinnen und Patienten:</b> Name, Geburtsdatum, Geschlecht, E-Mail-Adresse, Mobilnummer, Versicherungsart und Kasse,
            Patientennummer aus der Praxissoftware, Versichertennummer (nur wenn die Praxis sie selbst einträgt), Befunde, Diagnosen und
            Leistungen, Vorschläge und Auswahl, Berichte, Akteneinträge und hochgeladene Dokumente, Markierungen am Modell, Anamnese- und
            Fragebogenangaben, Termine und Terminanfragen, Rechnungen und Zahlungsstatus, bei Lastschrift IBAN und Kontoinhaber, Unterschrift
            als Bild, Einwilligungen mit Zeitpunkt, Nachrichtenverlauf, Zeitpunkte von Aufrufen, IP-Adresse (kurzzeitig zum Schutz vor
            Missbrauch). Dies sind überwiegend Gesundheitsdaten nach Art. 9 DSGVO und Daten, die dem Berufsgeheimnis unterliegen.
          </li>
          <li>
            <b>Menschen, die online einen Termin anfragen:</b> Vor- und Nachname, Geburtsdatum, Mobilnummer oder E-Mail-Adresse, Anlass,
            gewünschter Termin, Zeitpunkt der Kenntnisnahme des Datenschutzhinweises.
          </li>
          <li>
            <b>Beschäftigte der Praxis:</b> Name, E-Mail-Adresse, Rolle, Anmeldedaten, Protokoll der Änderungen.
          </li>
        </ul>
        <p>
          Nicht gespeichert werden Versichertennummer, Anschrift und Telefonnummer, die eine Praxissoftware beim Start von Sorrida übergibt.
        </p>
      </section>

      <section>
        <h2>§ 3 Weisungen</h2>
        <p>
          Sorrida verarbeitet die Daten nur auf dokumentierte Weisung der Praxis, die sich aus diesem Vertrag und der Nutzung der Software
          ergibt. Weisungen erteilt die Praxisleitung in Textform. Ansprechpartner bei Sorrida: {b.name}, {b.email}. Hält Sorrida eine Weisung
          für rechtswidrig, weist Sorrida die Praxis unverzüglich darauf hin.
        </p>
      </section>

      <section>
        <h2>§ 4 Vertraulichkeit und Berufsgeheimnis</h2>
        <p>(1) Sorrida verpflichtet alle Personen, die Zugang zu den Daten haben, in Textform zur Vertraulichkeit.</p>
        <p data-testid="avv-203">
          (2) Die Praxis verpflichtet Sorrida hiermit zur Geheimhaltung aller fremden Geheimnisse, die Sorrida bei der Tätigkeit bekannt
          werden. Sorrida ist darüber belehrt, dass die unbefugte Offenbarung nach § 203 Abs. 4 Satz 1 StGB mit Freiheitsstrafe bis zu einem
          Jahr oder mit Geldstrafe bestraft wird, und dass sich nach § 203 Abs. 4 Satz 2 Nr. 2 StGB strafbar macht, wer weitere mitwirkende
          Personen einsetzt, ohne sie zur Geheimhaltung zu verpflichten.
        </p>
        <p>(3) Sorrida verschafft sich nur so weit Kenntnis von Geheimnissen, wie es für die Leistung erforderlich ist.</p>
        <p>
          (4) Sorrida darf weitere mitwirkende Personen (Unterauftragsverarbeiter nach Anlage 2, eigene Hilfspersonen) nur einsetzen, nachdem
          sie in Textform zur Geheimhaltung verpflichtet und über die Strafbarkeit belehrt wurden.
        </p>
      </section>

      <section>
        <h2>§ 5 Sicherheit der Verarbeitung</h2>
        <p>
          Sorrida trifft die in Anlage 1 beschriebenen technischen und organisatorischen Maßnahmen (Art. 32 DSGVO) und passt sie dem Stand der
          Technik an. Das Schutzniveau darf dabei nicht sinken.
        </p>
      </section>

      <section>
        <h2>§ 6 Unterauftragsverarbeiter</h2>
        <p>
          Die Praxis stimmt dem Einsatz der in Anlage 2 genannten Unterauftragsverarbeiter zu. Über neue oder geänderte
          Unterauftragsverarbeiter informiert Sorrida mindestens 30 Tage vorher per E-Mail. Die Praxis kann aus wichtigem
          datenschutzrechtlichem Grund widersprechen und den Vertrag dann außerordentlich kündigen.
        </p>
      </section>

      <section>
        <h2>§ 7 Ort der Verarbeitung</h2>
        <p>
          Die Speicherung erfolgt in Rechenzentren in der Europäischen Union (derzeit Frankfurt am Main). Soweit Unterauftragsverarbeiter nach
          Anlage 2 Daten außerhalb der EU verarbeiten oder von dort zugreifen können, erfolgt dies nur auf Grundlage eines
          Angemessenheitsbeschlusses oder der EU-Standardvertragsklauseln; die jeweilige Grundlage nennt Anlage 2 des unterschriebenen Vertrags.
        </p>
      </section>

      <section>
        <h2>§ 8 Zugriff durch Sorrida (Support, Fernwartung)</h2>
        <p>
          Sorrida greift auf Daten der Praxis nur zu, wenn die Praxis dies im Einzelfall verlangt oder es zur Beseitigung einer Störung
          erforderlich ist. Sorrida hält jeden solchen Zugriff mit Person, Zeit und Anlass fest; die Praxis kann diese Aufzeichnung einsehen.
        </p>
      </section>

      <section>
        <h2>§ 9 Unterstützung der Praxis</h2>
        <p>
          Sorrida unterstützt die Praxis bei Anfragen Betroffener (Auskunft, Berichtigung, Löschung, Übertragbarkeit) und bei ihren Pflichten
          nach Art. 32 bis 36 DSGVO (Sicherheit, Meldung von Datenpannen, Datenschutz-Folgenabschätzung, Abstimmung mit der Aufsichtsbehörde).
          Verletzungen des Schutzes personenbezogener Daten meldet Sorrida der Praxis unverzüglich nach Kenntnis, mit den Angaben nach Art. 33
          Abs. 3 DSGVO, soweit sie vorliegen.
        </p>
      </section>

      <section>
        <h2>§ 10 Löschung und Rückgabe</h2>
        <p>
          Nach Vertragsende stellt Sorrida der Praxis einen vollständigen Export in einem gängigen maschinenlesbaren Format bereit und löscht
          die Daten 30 Tage nach Bereitstellung, es sei denn, die Praxis verlangt eine frühere Löschung oder eine gesetzliche Pflicht steht
          entgegen. Sorrida bestätigt die Löschung in Textform. Die Aufbewahrungspflicht nach § 630f BGB trifft die Praxis; maßgeblich bleibt die
          Akte in der Praxissoftware.
        </p>
      </section>

      <section>
        <h2>§ 11 Nachweise und Kontrollen</h2>
        <p>
          Sorrida stellt der Praxis die zum Nachweis der Pflichten nötigen Informationen bereit und ermöglicht Überprüfungen durch die Praxis
          oder eine von ihr beauftragte, zur Verschwiegenheit verpflichtete Person, auch vor Ort, nach angemessener Vorankündigung.
        </p>
      </section>

      <section>
        <h2>§ 12 Haftung</h2>
        <p>Für die Haftung gegenüber betroffenen Personen gilt Art. 82 DSGVO. Im Übrigen gilt die Haftungsregelung des Nutzungsvertrags.</p>
      </section>

      <section>
        <h2>Anlage 1: Technische und organisatorische Maßnahmen</h2>
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Verschlüsselung:</b> Übertragung ausschließlich per HTTPS (TLS). Passwörter nur als bcrypt-Hash. Schlüssel für die Praxissoftware und Patienten-Links werden nur als SHA-256-Hash gespeichert.</li>
          <li><b>Zugangskontrolle:</b> persönliche Konten, Zwei-Faktor-Anmeldung per Authenticator-App, Begrenzung fehlgeschlagener Anmeldeversuche, Sitzungen enden nach höchstens 12 Stunden.</li>
          <li><b>Zugriffskontrolle:</b> strikte Trennung der Daten je Praxis in jeder Abfrage; Rollen Praxisleitung und Team; Einstellungen nur für die Praxisleitung.</li>
          <li><b>Eingabekontrolle:</b> Protokoll mit Zeit und Person für Anmeldungen, Freigaben, Exporte und Löschungen; Änderungsverlauf für Berichte; angenommene Vorschläge werden nicht mehr verändert.</li>
          <li><b>Datenminimierung:</b> nur die für den Zweck nötigen Felder; Patienten-Links enthalten keine Patientendaten und laufen ab; vor Unterschrift und Lastschrift fragt das Patientenportal das Geburtsdatum ab.</li>
          <li><b>Schutz vor Missbrauch:</b> Begrenzung der Anfragen je Absender für Anmeldung, Registrierung, Patienten-Links und Formulare.</li>
          <li><b>Verfügbarkeit:</b> Betrieb bei einem Hosting-Anbieter mit redundanter Infrastruktur; Datensicherung durch den Datenbank-Anbieter mit Wiederherstellung auf einen früheren Zeitpunkt innerhalb des im Tarif eingestellten Zeitraums.</li>
          <li><b>Trennung:</b> Gastzugänge laufen in eigenen Demo-Praxen ohne echte Patientendaten und werden nach Ablauf gelöscht.</li>
        </ul>
      </section>

      <section>
        <h2>Anlage 2: Unterauftragsverarbeiter</h2>
        <ul className="space-y-4" data-testid="avv-dienste">
          {DIENSTE.map((d) => (
            <li key={d.dienst} className="border-l-2 border-linie-stark pl-4">
              <b>{d.dienst}</b>
              <br />
              Zweck: {d.zweck}
              <br />
              Daten: {d.daten}
              <br />
              Ort: {d.ort}
            </li>
          ))}
        </ul>
        <p>
          Im unterschriebenen Vertrag stehen je Dienst zusätzlich: der genaue Vertragspartner, die Grundlage der Übermittlung in ein Drittland
          (Angemessenheitsbeschluss oder EU-Standardvertragsklauseln) und der Nachweis nach § 393 SGB V.
        </p>
        <p>
          Keine Unterauftragsverarbeiter von Sorrida, aber für die Praxis wichtig: Schaltet die Praxis das Diktat über den Sprachdienst des
          Browsers ein, geht die Aufnahme vom Gerät der Praxis an den Hersteller des Browsers; ohne diesen Schalter bleibt die Erkennung auf dem
          Gerät. Öffnet die Praxis eine Nachricht in ihrem eigenen WhatsApp, gehen Nummer und Text vom Gerät der Praxis an WhatsApp; Sorrida ist daran nicht beteiligt. Verbindet
          die Praxis ihren Kalender, ruft der Kalenderanbieter die Termine ohne Patientennamen ab.
        </p>
      </section>
    </LegalPage>
  );
}
