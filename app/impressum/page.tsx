import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Impressum – Sorrida" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          Luca Kolhoff
          <br />
          Pastorskamp 19
          <br />
          48485 Neuenkirchen
          <br />
          Deutschland
        </p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>E-Mail: lucakolhoff1@gmail.com</p>
      </section>
      <section>
        <h2>Umsatzsteuer</h2>
        <p>
          Gemäß § 19 UStG (Kleinunternehmerregelung) wird keine Umsatzsteuer erhoben; es wird daher
          keine Umsatzsteuer-Identifikationsnummer ausgewiesen.
        </p>
      </section>
      <section>
        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>Luca Kolhoff, Anschrift wie oben</p>
      </section>
      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Sorrida richtet sich an Arzt- und Zahnarztpraxen als Unternehmer. Wir sind nicht bereit oder verpflichtet,
          an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>
      <section>
        <h2>Hinweis zu den Inhalten</h2>
        <p>
          Beträge, Festzuschüsse und Beispiele auf dieser Website dienen der Veranschaulichung. Sie sind
          keine Abrechnungs-, Rechts- oder Steuerberatung. Verbindlich sind Heil- und Kostenplan,
          Mehrkostenvereinbarung und die Bescheide der Krankenkassen.
        </p>
      </section>
    </LegalPage>
  );
}
