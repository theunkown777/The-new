import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Vertrag zur Auftragsverarbeitung (Muster) – Sorrida",
  description: "Muster des Vertrags zur Auftragsverarbeitung nach Art. 28 DSGVO zwischen Zahnarztpraxis und Sorrida, mit technischen und organisatorischen Maßnahmen.",
};

// Muster-AVV. Die technischen Maßnahmen in Anlage 1 beschreiben, was der Code
// tatsächlich umsetzt; bei Änderungen an Sicherheit oder Dienstleistern hier
// mitpflegen. Platzhalter in eckigen Klammern vor Vertragsschluss füllen.
export default function AvvPage() {
  return (
    <LegalPage title="Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO (Muster)">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
        Muster zur Vorabinformation. Der verbindliche Vertrag wird mit jeder Praxis gesondert geschlossen. Angaben in eckigen Klammern
        werden dabei ergänzt.
      </p>

      <section>
        <h2>Vertragsparteien</h2>
        <p>
          Verantwortlicher („Praxis“): [Name und Anschrift der Zahnarztpraxis]
          <br />
          Auftragsverarbeiter („Sorrida“): Luca Kolhoff, Pastorskamp 19, 48485 Neuenkirchen
        </p>
      </section>

      <section>
        <h2>§ 1 Gegenstand und Dauer</h2>
        <p>
          Sorrida stellt der Praxis eine Software zur Dokumentation nach der Behandlung bereit: Leistungserfassung, Erstellung von
          Berichtsentwürfen, Behandlungsvorschläge mit Kostenschätzung, Patienten-Links und Aufgabenlisten. Dabei verarbeitet Sorrida
          personenbezogene Daten im Auftrag der Praxis. Der Vertrag gilt für die Dauer des Nutzungsvertrags.
        </p>
      </section>

      <section>
        <h2>§ 2 Art der Daten und Betroffene</h2>
        <ul className="ml-5 list-disc space-y-1">
          <li>Patientinnen und Patienten der Praxis: Name, Geburtsdatum, Versicherungsart und Kasse, Befunde, erbrachte Leistungen,
            Behandlungsvorschläge, Berichte, Rückmeldungen über den Patienten-Link, Angaben aus dem digitalen Anamnesebogen. Dies sind Gesundheitsdaten nach Art. 9 DSGVO.</li>
          <li>Beschäftigte der Praxis: Name, E-Mail-Adresse, Rolle, Anmeldedaten, Änderungsverlauf.</li>
        </ul>
        <p>
          Versichertennummer, Adresse und Telefonnummer, die eine Praxissoftware beim Start übergibt, werden nicht gespeichert.
        </p>
      </section>

      <section>
        <h2>§ 3 Weisungen</h2>
        <p>
          Sorrida verarbeitet die Daten nur auf dokumentierte Weisung der Praxis, die sich aus diesem Vertrag und der Nutzung der Software
          ergibt. Hält Sorrida eine Weisung für rechtswidrig, weist Sorrida die Praxis unverzüglich darauf hin.
        </p>
      </section>

      <section>
        <h2>§ 4 Vertraulichkeit und Berufsgeheimnis</h2>
        <p>
          Sorrida verpflichtet alle Personen, die Zugang zu den Daten haben, schriftlich zur Vertraulichkeit. Sorrida ist sich bewusst,
          dass die Daten dem Berufsgeheimnis nach § 203 StGB unterliegen, und wirkt als mitwirkende Person im Sinne von § 203 Abs. 3
          StGB. Sorrida verpflichtet seinerseits eingesetzte Personen und Unterauftragsverarbeiter zur Geheimhaltung (§ 203 Abs. 4 StGB).
        </p>
      </section>

      <section>
        <h2>§ 5 Sicherheit der Verarbeitung</h2>
        <p>Sorrida trifft die in Anlage 1 beschriebenen technischen und organisatorischen Maßnahmen (Art. 32 DSGVO) und passt sie dem Stand der Technik an. Das Schutzniveau darf dabei nicht sinken.</p>
      </section>

      <section>
        <h2>§ 6 Unterauftragsverarbeiter</h2>
        <p>
          Die Praxis stimmt dem Einsatz der in Anlage 2 genannten Unterauftragsverarbeiter zu. Über neue oder geänderte
          Unterauftragsverarbeiter informiert Sorrida mindestens 30 Tage vorher per E-Mail. Die Praxis kann aus wichtigem
          datenschutzrechtlichem Grund widersprechen und den Vertrag dann außerordentlich kündigen. Für Übermittlungen in Drittländer
          sorgt Sorrida für geeignete Garantien nach Art. 44 ff. DSGVO.
        </p>
      </section>

      <section>
        <h2>§ 7 Unterstützung der Praxis</h2>
        <p>
          Sorrida unterstützt die Praxis bei Anfragen Betroffener (Auskunft, Berichtigung, Löschung), bei Datenschutz-Folgenabschätzungen
          und bei Meldepflichten. Verletzungen des Schutzes personenbezogener Daten meldet Sorrida der Praxis unverzüglich, spätestens
          innerhalb von 24 Stunden nach Kenntnis, mit den Angaben nach Art. 33 Abs. 3 DSGVO.
        </p>
      </section>

      <section>
        <h2>§ 8 Löschung und Rückgabe</h2>
        <p>
          Nach Vertragsende stellt Sorrida der Praxis auf Wunsch alle Berichte und Vorschläge als Export bereit und löscht die Daten
          spätestens 30 Tage danach, soweit keine gesetzliche Pflicht zur Aufbewahrung besteht. Die Dokumentationspflicht nach § 630f BGB
          liegt bei der Praxis; maßgeblich bleibt die Akte in der Praxissoftware.
        </p>
      </section>

      <section>
        <h2>§ 9 Nachweise und Kontrollen</h2>
        <p>
          Sorrida stellt der Praxis die zum Nachweis der Pflichten nötigen Informationen bereit und ermöglicht Überprüfungen nach
          angemessener Vorankündigung.
        </p>
      </section>

      <section>
        <h2>Anlage 1: Technische und organisatorische Maßnahmen</h2>
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Verschlüsselung:</b> Übertragung ausschließlich per HTTPS (TLS). Passwörter nur als bcrypt-Hash. Schlüssel für die Praxissoftware und Patienten-Links werden nur als SHA-256-Hash gespeichert.</li>
          <li><b>Zugangskontrolle:</b> persönliche Konten, Zwei-Faktor-Anmeldung per Authenticator-App, Begrenzung fehlgeschlagener Anmeldeversuche.</li>
          <li><b>Zugriffskontrolle:</b> strikte Trennung der Daten je Praxis in jeder Abfrage; Rollen Praxisleitung und Team; Einstellungen nur für die Praxisleitung.</li>
          <li><b>Eingabekontrolle:</b> Änderungsverlauf für Berichte mit Zeit und Person; angenommene Vorschläge werden nicht mehr verändert.</li>
          <li><b>Datenminimierung:</b> nur die für den Zweck nötigen Felder; Patienten-Links zeigen nur den Vornamen, enthalten keine Patientendaten und laufen nach 30 Tagen ab.</li>
          <li><b>Schutz vor Missbrauch:</b> Begrenzung der Anfragen je Absender für Anmeldung, Registrierung, Patienten-Links und Formulare.</li>
          <li><b>Verfügbarkeit:</b> Betrieb bei einem Hosting-Anbieter mit redundanter Infrastruktur; Datensicherung durch den Datenbank-Anbieter Neon mit Wiederherstellung auf einen früheren Zeitpunkt innerhalb des im Tarif eingestellten Zeitraums.</li>
          <li><b>Trennung:</b> Gastzugänge laufen in eigenen Demo-Praxen ohne echte Patientendaten und werden nach 24 Stunden gelöscht.</li>
        </ul>
      </section>

      <section>
        <h2>Anlage 2: Unterauftragsverarbeiter</h2>
        <table className="w-full text-left">
          <thead>
            <tr><th className="py-1">Dienst</th><th className="py-1">Zweck</th><th className="py-1">Standort</th></tr>
          </thead>
          <tbody>
            <tr><td className="py-1">Vercel Inc.</td><td>Hosting der Anwendung</td><td>Rechenzentrum Frankfurt am Main (Region fra1); Unternehmen in den USA</td></tr>
            <tr><td className="py-1">Neon, Inc.</td><td>Speicherung der Daten (PostgreSQL)</td><td>Frankfurt am Main (Region eu-central-1); Unternehmen in den USA</td></tr>
            <tr><td className="py-1">Upstash, Inc.</td><td>Zwischenspeicher für Missbrauchsschutz, nur falls aktiviert (keine Patientendaten)</td><td>Region wie im Upstash-Konto gewählt; empfohlen Frankfurt</td></tr>
            <tr><td className="py-1">Resend (Plus Five Five, Inc.)</td><td>Versand von System-E-Mails (keine Patientendaten)</td><td>USA</td></tr>
            <tr><td className="py-1">Anthropic PBC</td><td>Formulierung von Berichtsentwürfen</td><td>USA</td></tr>
          </tbody>
        </table>
      </section>
    </LegalPage>
  );
}
