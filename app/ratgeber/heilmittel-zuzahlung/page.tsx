import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("heilmittel-zuzahlung");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

// Rechenbeispiel mit einem angenommenen Preis je Behandlung; die echten Preise stehen in der
// Preisliste Ihres Heilmittelbereichs. Pauschale je Verordnung nach § 61 Satz 3 SGB V.
const PREIS = 30;
const EINHEITEN = 6;
const KOSTEN = PREIS * EINHEITEN;
const euro = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;

export default function Page() {
  return (
    <ArticlePage slug="heilmittel-zuzahlung">
      <h2>Die Regel in einem Satz</h2>
      <p>
        Gesetzlich Versicherte ab 18 Jahren zahlen zu jedem Heilmittel 10 % der Kosten und zusätzlich einen festen Betrag je Verordnung
        (§ 32 Abs. 2 und § 61 Satz 3 SGB V). Das gilt für Physiotherapie, Ergotherapie, Logopädie und Podologie gleichermaßen.
      </p>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>bis 31.12.2026</th>
            <th>ab 1.1.2027</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Anteil an den Kosten</td><td>10 %</td><td>10 %</td></tr>
          <tr><td>Fester Betrag je Verordnung</td><td>10 €</td><td>15 €</td></tr>
        </tbody>
      </table>
      <p>
        Die Erhöhung auf 15 € steht im GKV-Beitragssatzstabilisierungsgesetz vom 24. Juli 2026 (BGBl. 2026 I Nr. 228). Es fasst § 61
        SGB V neu, die neue Fassung tritt am 1. Januar 2027 in Kraft.
      </p>

      <h2>Rechenbeispiel</h2>
      <p>
        Angenommen, die Verordnung lautet über {EINHEITEN} Behandlungen und die Kasse vergütet {PREIS} € je Behandlung, zusammen{" "}
        {KOSTEN} €. Den echten Preis entnehmen Sie der Preisliste Ihres Heilmittelbereichs.
      </p>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>2026</th>
            <th>2027</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>10 % von {KOSTEN} €</td><td>{euro(KOSTEN * 0.1)}</td><td>{euro(KOSTEN * 0.1)}</td></tr>
          <tr><td>je Verordnung</td><td>{euro(10)}</td><td>{euro(15)}</td></tr>
          <tr><td><b>Zuzahlung</b></td><td><b>{euro(KOSTEN * 0.1 + 10)}</b></td><td><b>{euro(KOSTEN * 0.1 + 15)}</b></td></tr>
        </tbody>
      </table>

      <h2>Wer nichts zuzahlt</h2>
      <ul>
        <li>Kinder und Jugendliche bis zum 18. Geburtstag.</li>
        <li>
          Versicherte mit Befreiungsbescheinigung ihrer Kasse für das laufende Kalenderjahr. Die Bescheinigung gibt es, sobald die
          Belastungsgrenze erreicht ist: 2 % der jährlichen Bruttoeinnahmen, bei schwerwiegend chronisch Kranken 1 % (§ 62 SGB V).
          Mehr dazu im Ratgeber <Link prefetch={false} href="/ratgeber/zuzahlungsbefreiung-belastungsgrenze">Zuzahlungsbefreiung</Link>.
        </li>
        <li>Schwangere, wenn das Heilmittel wegen Schwangerschaftsbeschwerden oder im Zusammenhang mit der Entbindung verordnet ist (§ 24e SGB V).</li>
        <li>Privatversicherte und Selbstzahler: Für sie gibt es keine gesetzliche Zuzahlung, sie erhalten eine Rechnung über den vereinbarten Preis.</li>
      </ul>

      <h2>Einzug, Quittung, Nichtzahler</h2>
      <ol>
        <li>Die Praxis zieht die Zuzahlung ein und verrechnet sie mit ihrer Vergütung von der Kasse (§ 43c Abs. 1 SGB V). Die Kasse überweist also entsprechend weniger.</li>
        <li>Jede Zuzahlung ist zu quittieren. Für die Quittung dürfen Sie nichts berechnen (§ 61 Satz 4 SGB V).</li>
        <li>
          Zahlt jemand nicht, fordern Sie ihn gesondert und schriftlich zur Zahlung auf. Bleibt auch das ohne Erfolg, muss die
          Krankenkasse die Zuzahlung einziehen (§ 43c Abs. 1 Satz 2 SGB V). Bewahren Sie die Aufforderung als Nachweis auf.
        </li>
        <li>Befreiungsbescheinigung bei jeder neuen Verordnung ansehen und das Gültigkeitsjahr notieren. Sie gilt nur für das Kalenderjahr.</li>
      </ol>

      <h2>Verordnungen über den Jahreswechsel 2026/2027</h2>
      <p>
        Das Gesetz enthält für die Zuzahlung keine eigene Übergangsregel, es nennt nur das Inkrafttreten am 1. Januar 2027. Ob für eine
        Verordnung aus dem Dezember, die im Januar begonnen oder fortgesetzt wird, 10 € oder 15 € gelten, richtet sich nach den
        Umsetzungshinweisen der Kassen und der Verbände. Prüfen Sie das vor dem Jahreswechsel und sagen Sie Patienten im Dezember
        lieber, dass sich der Betrag ändern kann.
      </p>

      <h2>In drei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Ihre Kasse übernimmt die Behandlung. Sie selbst zahlen gesetzlich 10 Prozent der Kosten und einen festen Betrag für das Rezept,
        bei Ihrer Verordnung sind das zusammen [Betrag]. Wenn Sie eine Befreiung Ihrer Kasse haben, bringen Sie sie bitte mit.“
      </blockquote>
      <p>
        Sorrida rechnet die Zuzahlung für Erwachsene mit dem Betrag, der zum Datum gehört, lässt sie bei Kindern und Jugendlichen weg
        und legt für das Team die Aufgabe an, die Zuzahlung zu kassieren oder die Befreiung zu prüfen.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__32.html" rel="noopener">
            § 32 SGB V
          </a>{" "}
          (Zuzahlung zu Heilmitteln ab 18 Jahren)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__61.html" rel="noopener">
            § 61 SGB V
          </a>{" "}
          (Höhe der Zuzahlung und Quittung, dort noch die Fassung bis 31.12.2026)
        </li>
        <li>
          <a href="https://www.recht.bund.de/bgbl/1/2026/228/VO.html" rel="noopener">
            GKV-Beitragssatzstabilisierungsgesetz vom 24. Juli 2026, BGBl. 2026 I Nr. 228
          </a>{" "}
          (Artikel 1 Nr. 23: neuer § 61 SGB V ab 1.1.2027)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__43c.html" rel="noopener">
            § 43c SGB V
          </a>{" "}
          (Einzug der Zuzahlung, Vorgehen bei Nichtzahlung)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__24e.html" rel="noopener">
            § 24e SGB V
          </a>{" "}
          (keine Zuzahlung bei Schwangerschaftsbeschwerden und Entbindung)
        </li>
      </ul>
    </ArticlePage>
  );
}
