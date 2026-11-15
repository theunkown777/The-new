import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { Zweckbestimmung } from "@/components/Zweckbestimmung";
import { BETREIBER } from "@/lib/betreiber";

export const metadata: Metadata = { title: "Impressum – Sorrida" };

// Angaben kommen aus lib/betreiber.ts. Zeilen ohne Wert (Telefon, Wirtschafts-Identifikationsnummer) werden nicht gezeigt.
// Bewusst nicht enthalten: Link zur EU-Streitbeilegungsplattform (seit 20.07.2025 abgeschaltet).
export default function ImpressumPage() {
  const b = BETREIBER;
  return (
    <LegalPage title="Impressum">
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p data-testid="impressum-anschrift">
          {b.name}
          <br />
          {b.strasse}
          <br />
          {b.plzOrt}
          <br />
          {b.land}
        </p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p data-testid="impressum-kontakt">
          {b.telefon && (
            <>
              Telefon: <a href={`tel:${b.telefon.replace(/[^+\d]/g, "")}`}>{b.telefon}</a>
              <br />
            </>
          )}
          E-Mail: <a href={`mailto:${b.email}`}>{b.email}</a>
          <br />
          Anfragen von Praxen auch über das <Link href="/hilfe">Kontaktformular</Link>.
        </p>
      </section>
      <section>
        <h2>Umsatzsteuer</h2>
        <p>Kleinunternehmer nach § 19 UStG; es wird keine Umsatzsteuer berechnet.</p>
        {b.wirtschaftsId && <p>Wirtschafts-Identifikationsnummer: {b.wirtschaftsId}</p>}
      </section>
      <section>
        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>{b.name}, Anschrift wie oben</p>
      </section>
      <section>
        <h2>An wen sich Sorrida richtet</h2>
        <p>
          Sorrida ist ein Angebot für Arzt-, Zahnarzt- und Therapiepraxen und andere Unternehmer (§ 14 BGB). An Verbraucher richtet sich das
          Angebot nicht. Patientinnen und Patienten erhalten ihren Zugang von ihrer Praxis; diese ist ihr Ansprechpartner.
        </p>
      </section>
      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      </section>
      <section id="zweck" className="scroll-mt-6">
        <h2>Was Sorrida ist und was nicht</h2>
        <Zweckbestimmung ohneTitel />
      </section>
      <section>
        <h2>Hinweis zu den Inhalten</h2>
        <p>
          Beträge, Festzuschüsse und Beispiele auf dieser Website dienen der Veranschaulichung und sind sorgfältig recherchiert, aber ohne Gewähr.
          Sie sind keine Abrechnungs-, Rechts- oder Steuerberatung. Verbindlich sind Heil- und Kostenplan, die schriftlichen Vereinbarungen der
          Praxis und die Bescheide der Kostenträger.
        </p>
      </section>
      <section>
        <h2>Bild- und Datenquellen</h2>
        <p>
          Siehe <Link href="/lizenzen">Lizenzen und Quellen</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
