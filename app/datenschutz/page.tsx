import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Datenschutz – Sorrida" };

// ENTWURF: vor dem Livegang anwaltlich prüfen und die mit [ … ] markierten
// Angaben (eingesetzte Dienstleister) an den tatsächlichen Betrieb anpassen.
export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          Luca Kolhoff, Pastorskamp 19, 48485 Neuenkirchen, E-Mail: lucakolhoff1@gmail.com
        </p>
      </section>

      <section>
        <h2>2. Aufruf der Website</h2>
        <p>
          Beim Aufruf verarbeitet der Hosting-Anbieter technisch notwendige Daten (IP-Adresse, Zeitpunkt,
          aufgerufene Seite, Browser), um die Seite auszuliefern und vor Missbrauch zu schützen
          (Art. 6 Abs. 1 lit. f DSGVO). Schriften werden von unserem eigenen Server geladen, es werden
          keine Inhalte von Google oder anderen Drittanbietern nachgeladen. Wir setzen keine
          Analyse- oder Werbe-Cookies und kein Tracking ein. Die Live-Demo und der Rechner laufen
          vollständig in Ihrem Browser; Ihre Eingaben dort werden nicht übertragen.
        </p>
        <p>
          Hosting: [Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA], auf Grundlage eines
          Vertrags zur Auftragsverarbeitung und des EU-US Data Privacy Framework bzw. der
          EU-Standardvertragsklauseln.
        </p>
      </section>

      <section>
        <h2>3. Anfrageformular „Pilotplatz anfragen“</h2>
        <p>
          Wenn Sie das Formular absenden, speichern wir Praxisname, Ihren Namen, die Anzahl der Behandler
          und Ihre Telefonnummer oder E-Mail-Adresse, um Sie wegen einer Demo zu kontaktieren
          (Art. 6 Abs. 1 lit. b und lit. a DSGVO). Die Angaben werden gelöscht, wenn kein Vertrag
          zustande kommt, spätestens 12 Monate nach der Anfrage. Ihre Einwilligung können Sie jederzeit
          per E-Mail widerrufen. Zur Benachrichtigung über neue Anfragen nutzen wir den E-Mail-Dienst
          [Resend, Plus Five Five, Inc., USA].
        </p>
      </section>

      <section>
        <h2>4. Nutzung der Sorrida-App durch Zahnarztpraxen</h2>
        <p>
          Für angemeldete Praxen verarbeiten wir Kontodaten (Name, E-Mail, Passwort als Hash) sowie
          Anmelde-Cookies, die für den Betrieb technisch notwendig sind (§ 25 Abs. 2 TDDDG).
        </p>
        <p>
          Patientendaten, die Praxen in Sorrida erfassen oder aus ihrer Praxissoftware übergeben,
          verarbeiten wir ausschließlich im Auftrag der jeweiligen Praxis nach Art. 28 DSGVO auf
          Grundlage eines Vertrags zur Auftragsverarbeitung. Verantwortlich gegenüber den Patienten ist
          die Praxis. Eingesetzte Unterauftragsverarbeiter: Hosting [Vercel], Datenbank
          [DATENBANK-ANBIETER eintragen], Zwischenspeicher für Missbrauchsschutz [Upstash, Inc.],
          E-Mail-Versand [Resend] und für die Formulierung von Berichten [Anthropic PBC, USA].
        </p>
      </section>

      <section>
        <h2>5. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie das Recht, sich bei einer
          Datenschutz-Aufsichtsbehörde zu beschweren, etwa bei der Landesbeauftragten für Datenschutz
          und Informationsfreiheit Nordrhein-Westfalen.
        </p>
      </section>

      <p className="text-xs text-slate-400">Stand: Oktober 2026</p>
    </LegalPage>
  );
}
