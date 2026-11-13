import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("hilfsmittel-zuzahlung-mehrkosten");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

// Gesetzliche Zuzahlung zu Hilfsmitteln nach § 61 Satz 1 SGB V: 10 % des Abgabepreises,
// mindestens/höchstens der feste Betrag, nie mehr als die Kosten.
const zuzahlung = (preis: number, min: number, max: number) => Math.min(preis, Math.min(max, Math.max(min, preis * 0.1)));
const euro = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
const BEISPIELE = [4, 40, 90, 800];

export default function Page() {
  return (
    <ArticlePage slug="hilfsmittel-zuzahlung-mehrkosten">
      <h2>Zwei Beträge, die Patienten verwechseln</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Gesetzliche Zuzahlung</th>
            <th>Mehrkosten (Aufzahlung)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Wofür</td><td>für jedes Hilfsmittel auf Kassenrezept</td><td>für eine Ausführung, die über das Notwendige hinausgeht</td></tr>
          <tr><td>Höhe</td><td>gesetzlich festgelegt</td><td>Unterschied zwischen dem Preis des gewählten Produkts und dem Betrag der Kasse</td></tr>
          <tr><td>Pflicht?</td><td>ja, für Versicherte ab 18</td><td>nein, freie Entscheidung des Patienten</td></tr>
          <tr><td>Zählt für die Belastungsgrenze</td><td>ja</td><td>nein</td></tr>
          <tr><td>Befreiung möglich</td><td>ja</td><td>nein</td></tr>
        </tbody>
      </table>
      <p>
        Für Arztpraxen ist das wichtig, weil Patienten nach der Verordnung fragen: „Was kostet mich das?“ Die ehrliche Antwort hat zwei
        Teile, und nur der erste ist unvermeidbar.
      </p>

      <h2>Die gesetzliche Zuzahlung</h2>
      <p>
        Versicherte ab 18 Jahren zahlen zu jedem Hilfsmittel 10 % des Abgabepreises, mindestens und höchstens einen festen Betrag und
        nie mehr als das Hilfsmittel kostet (§ 33 Abs. 8, § 61 Satz 1 SGB V). Die festen Beträge steigen zum 1. Januar 2027
        (GKV-Beitragssatzstabilisierungsgesetz, BGBl. 2026 I Nr. 228).
      </p>
      <table>
        <thead>
          <tr>
            <th>Preis des Hilfsmittels</th>
            <th>Zuzahlung bis 31.12.2026 (mind. 5 €, höchst. 10 €)</th>
            <th>Zuzahlung ab 1.1.2027 (mind. 7,50 €, höchst. 15 €)</th>
          </tr>
        </thead>
        <tbody>
          {BEISPIELE.map((p) => (
            <tr key={p}>
              <td>{euro(p)}</td>
              <td>{euro(zuzahlung(p, 5, 10))}</td>
              <td>{euro(zuzahlung(p, 7.5, 15))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul>
        <li>Hilfsmittel zum Verbrauch, etwa Inkontinenzprodukte: 10 % des Kassenbetrags, höchstens ein fester Betrag für den Monatsbedarf. Im Gesetz steht seit Ende Juli 2026 der neue Höchstbetrag von 15 € statt 10 €. Nach Berichten der Fachpresse wenden die Kassen ihn wegen eines Versehens im Gesetzgebungsverfahren erst ab 1. Januar 2027 an.</li>
        <li>Keine Zuzahlung für Kinder und Jugendliche unter 18, für Versicherte mit Befreiungsbescheinigung und bei Hilfsmitteln wegen Schwangerschaftsbeschwerden oder im Zusammenhang mit der Entbindung (§ 24e SGB V).</li>
        <li>Die Zuzahlung geht an die abgebende Stelle, also Sanitätshaus, Akustiker oder Apotheke, nicht an die Arztpraxis.</li>
      </ul>

      <h2>Die Mehrkosten</h2>
      <p>
        Wählen Versicherte ein Hilfsmittel oder zusätzliche Leistungen, die über das Maß des Notwendigen hinausgehen, tragen sie die
        Mehrkosten und die dadurch höheren Folgekosten selbst (§ 33 Abs. 1 Satz 9 SGB V). Gibt es für das Hilfsmittel einen Festbetrag,
        erfüllt die Kasse ihre Leistungspflicht mit diesem Betrag (§ 12 Abs. 2 SGB V).
      </p>
      <ul>
        <li>Die Verträge der Kassen mit den Leistungserbringern müssen eine hinreichende Zahl an mehrkostenfreien Hilfsmitteln sicherstellen (§ 127 Abs. 1 SGB V). Es gibt also immer eine Versorgung, bei der nur die gesetzliche Zuzahlung anfällt.</li>
        <li>Der Leistungserbringer muss vor der Versorgung beraten, welche Hilfsmittel im Einzelfall geeignet und notwendig sind, die Beratung dokumentieren und vom Versicherten unterschreiben lassen. Wählt der Versicherte eine Versorgung mit Mehrkosten, ist er vorher über deren Höhe zu informieren (§ 127 Abs. 5 SGB V).</li>
      </ul>

      <h2>Drei Beispiele aus der Sprechstunde</h2>
      <table>
        <thead>
          <tr>
            <th>Fach</th>
            <th>Kassenleistung</th>
            <th>Typische Mehrkosten</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>HNO: Hörgerät</td><td>Gerät, das den Hörverlust ausgleicht, bis zum Betrag der Kasse; nur Zuzahlung</td><td>Komfort wie Akku, Bluetooth oder besonders kleine Bauform</td></tr>
          <tr><td>Orthopädie: Einlagen</td><td>verordnete Einlagen bis zum Vertragspreis; nur Zuzahlung</td><td>besondere Materialien, Bezüge oder Ausführungen</td></tr>
          <tr><td>Augenheilkunde: Brille</td><td>Gläser für Kinder und Jugendliche unter 18; für Erwachsene nur bei schwerer Sehbeeinträchtigung oder bei mehr als 6 Dioptrien (Kurz- oder Weitsichtigkeit) beziehungsweise mehr als 4 Dioptrien (Hornhautverkrümmung)</td><td>Das Brillengestell zahlt die Kasse nie; dazu Entspiegelung, dünnere Gläser und Ähnliches</td></tr>
        </tbody>
      </table>
      <p>Grundlage der Angaben zur Brille ist § 33 Abs. 2 SGB V.</p>

      <h2>In drei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Mit dieser Verordnung bekommen Sie ein Hilfsmittel, das Ihre Kasse bezahlt; Sie selbst zahlen nur die gesetzliche Zuzahlung
        von höchstens [Betrag]. Wenn Sie beim Akustiker oder im Sanitätshaus ein aufwendigeres Modell wählen, kommen Mehrkosten dazu,
        die müssen Sie aber nicht annehmen. Lassen Sie sich dort immer zuerst die Versorgung ohne Mehrkosten zeigen.“
      </blockquote>
      <p>
        Sorrida stellt bei solchen Anlässen die Kassenversorgung mit Zuzahlung und die Varianten mit Aufzahlung nebeneinander und weist
        den Betrag aus, den der Patient selbst trägt. Mehr zur Befreiung im Ratgeber{" "}
        <Link prefetch={false} href="/ratgeber/zuzahlungsbefreiung-belastungsgrenze">Zuzahlungsbefreiung</Link>.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__33.html" rel="noopener">
            § 33 SGB V
          </a>{" "}
          (Anspruch, Mehrkosten (Absatz 1 Satz 9), Sehhilfen (Absatz 2), Zuzahlung (Absatz 8))
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__127.html" rel="noopener">
            § 127 SGB V
          </a>{" "}
          (mehrkostenfreie Versorgung, Beratung und Dokumentation)
        </li>
        <li>
          <a href="https://www.recht.bund.de/bgbl/1/2026/228/VO.html" rel="noopener">
            GKV-Beitragssatzstabilisierungsgesetz vom 24. Juli 2026, BGBl. 2026 I Nr. 228
          </a>{" "}
          (neue Zuzahlungsbeträge ab 1.1.2027)
        </li>
        <li>
          <a href="https://www.pharmazeutische-zeitung.de/uebergangsloesung-wegen-fehler-im-gesetz-167696/" rel="noopener">
            Pharmazeutische Zeitung vom 19. August 2026: Übergangslösung wegen Fehler im Gesetz
          </a>{" "}
          (Hilfsmittel zum Verbrauch: Anwendung des neuen Höchstbetrags erst ab 2027)
        </li>
      </ul>
    </ArticlePage>
  );
}
