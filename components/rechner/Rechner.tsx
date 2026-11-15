"use client";

import { useState } from "react";
import { FESTZUSCHUSS_BEFUNDE } from "@/lib/proposals";
import { RECHNER_BEFUNDE, ZUZAHLUNG_ARTEN, belastungsgrenze, festzuschussVergleich, gebuehrPosition, zuzahlungVergleich, type Bonus, type ZuzahlungArt } from "@/lib/rechner";
import type { GoaeGruppe } from "@/lib/gebuehren";

const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const zahl = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
const feld = "mt-1 w-full rounded-[6px] border border-linie-stark bg-white px-3 py-2.5 text-[17px] text-tinte focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200";
const marke = "block text-[15px] font-semibold text-tinte";

function Ergebnis({ zeilen, hinweis, testid }: { zeilen: [string, string, boolean?][]; hinweis?: string; testid: string }) {
  return (
    <div className="mt-8 bg-papier-2 p-6" role="status" aria-live="polite" data-testid={testid}>
      <dl className="grid gap-4 sm:grid-cols-3">
        {zeilen.map(([t, w, stark]) => (
          <div key={t}>
            <dt className="text-[14px] text-tinte-2">{t}</dt>
            <dd className={`font-display tabular-nums ${stark ? "text-[2.2rem] text-brand-700" : "text-[1.9rem] text-tinte"}`}>{w}</dd>
          </div>
        ))}
      </dl>
      {hinweis && <p className="mt-4 text-[14px] text-tinte-2">{hinweis}</p>}
    </div>
  );
}

/** Gesetzliche Zuzahlung vor und nach dem 1.1.2027, dazu die Belastungsgrenze. */
export function ZuzahlungRechner() {
  const [art, setArt] = useState<ZuzahlungArt>("heilmittel");
  const [kosten, setKosten] = useState("180");
  const [brutto, setBrutto] = useState("");
  const [chronisch, setChronisch] = useState(false);
  const r = zuzahlungVergleich(art, zahl(kosten));
  const a = ZUZAHLUNG_ARTEN[art];
  const grenze = belastungsgrenze(zahl(brutto), chronisch);
  return (
    <div data-testid="rechner-zuzahlung">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={marke}>
          Worum geht es?
          <select className={feld} value={art} onChange={(e) => setArt(e.target.value as ZuzahlungArt)} data-testid="zz-art">
            {(Object.keys(ZUZAHLUNG_ARTEN) as ZuzahlungArt[]).map((k) => <option key={k} value={k}>{ZUZAHLUNG_ARTEN[k].name}</option>)}
          </select>
          <span className="mt-1 block text-[14px] font-normal text-tinte-2">{a.beispiel}</span>
        </label>
        <label className={marke}>
          {art === "heilmittel" ? "Kosten der Verordnung in Euro" : "Preis in Euro"}
          <input className={feld} inputMode="decimal" value={kosten} onChange={(e) => setKosten(e.target.value)} data-testid="zz-kosten" />
          <span className="mt-1 block text-[14px] font-normal text-tinte-2">Den Betrag nennt Ihnen die Praxis, die Apotheke oder das Sanitätshaus.</span>
        </label>
      </div>
      <Ergebnis
        testid="zz-ergebnis"
        zeilen={[["bis 31.12.2026", eur(r.bis2026)], ["ab 1.1.2027", eur(r.ab2027), true], ["Unterschied", `${r.mehr > 0 ? "+" : ""}${eur(r.mehr)}`]]}
        hinweis={`Regel bis 2026: ${a.regel2026}. Regel ab 2027: ${a.regel2027}. Kinder und Jugendliche unter 18 Jahren zahlen nichts zu.`}
      />
      <h2 className="mt-12 border-t border-linie pt-6 font-display text-[1.9rem] text-tinte">Ihre Belastungsgrenze</h2>
      <p className="mt-2 text-tinte-2">Mehr als 2 % Ihrer jährlichen Bruttoeinnahmen müssen Sie an Zuzahlungen nicht tragen, bei schwerwiegender chronischer Erkrankung 1 %. Danach befreit Sie Ihre Kasse auf Antrag für den Rest des Jahres.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className={marke}>
          Bruttoeinnahmen Ihres Haushalts im Jahr in Euro
          <input className={feld} inputMode="decimal" value={brutto} onChange={(e) => setBrutto(e.target.value)} placeholder="z. B. 30000" data-testid="zz-brutto" />
        </label>
        <label className="flex items-start gap-3 self-end pb-2 text-[15px] text-tinte">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={chronisch} onChange={(e) => setChronisch(e.target.checked)} />
          Schwerwiegend chronisch krank (Bescheinigung der Ärztin oder des Arztes)
        </label>
      </div>
      {grenze > 0 && <Ergebnis testid="zz-grenze" zeilen={[["Belastungsgrenze im Jahr", eur(grenze), true]]} hinweis="Ohne Freibeträge für Angehörige gerechnet; mit ihnen liegt die Grenze niedriger. Die genaue Grenze berechnet Ihre Krankenkasse." />}
    </div>
  );
}

/** Festzuschuss und Eigenanteil bei Zahnersatz: Bewilligung bis 31.12.2026 gegenüber ab 1.1.2027. */
export function ZahnersatzRechner() {
  const [befund, setBefund] = useState(RECHNER_BEFUNDE[0]);
  const [bonus, setBonus] = useState<Bonus>(0);
  const [haertefall, setHaertefall] = useState(false);
  const [kosten, setKosten] = useState("");
  const r = festzuschussVergleich(befund, bonus, haertefall, zahl(kosten));
  const pct = (q: number) => `${Math.round(q * 100)} %`;
  return (
    <div data-testid="rechner-zahnersatz">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={marke}>
          Befund laut Heil- und Kostenplan
          <select className={feld} value={befund} onChange={(e) => setBefund(e.target.value)} data-testid="ze-befund">
            {RECHNER_BEFUNDE.map((b) => <option key={b} value={b}>{b} · {FESTZUSCHUSS_BEFUNDE[b].name}</option>)}
          </select>
          <span className="mt-1 block text-[14px] font-normal text-tinte-2">Die Nummer steht im Heil- und Kostenplan Ihrer Praxis.</span>
        </label>
        <label className={marke}>
          Bonusheft
          <select className={feld} value={bonus} onChange={(e) => setBonus(Number(e.target.value) as Bonus)} data-testid="ze-bonus">
            <option value={0}>kein Bonus</option>
            <option value={5}>5 Jahre lückenlos</option>
            <option value={10}>10 Jahre lückenlos</option>
          </select>
        </label>
        <label className={marke}>
          Gesamtkosten laut Plan in Euro (freiwillig)
          <input className={feld} inputMode="decimal" value={kosten} onChange={(e) => setKosten(e.target.value)} placeholder={`ohne Angabe: Regelversorgung, ${eur(r.regelversorgung)}`} data-testid="ze-kosten" />
        </label>
        <label className="flex items-start gap-3 self-end pb-2 text-[15px] text-tinte">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={haertefall} onChange={(e) => setHaertefall(e.target.checked)} />
          Härtefall (geringes Einkommen, von der Kasse anerkannt)
        </label>
      </div>
      <Ergebnis
        testid="ze-ergebnis"
        zeilen={[[`Ihr Eigenanteil bei Bewilligung bis 31.12.2026 (Zuschuss ${pct(r.satz2026)})`, eur(r.eigen2026)], [`ab 1.1.2027, voraussichtlich (Zuschuss ${pct(r.satz2027)})`, eur(r.eigen2027), true], ["Unterschied", `${r.mehr > 0 ? "+" : ""}${eur(r.mehr)}`]]}
        hinweis={`Festzuschuss der Kasse: ${eur(r.zuschuss2026)} bis 2026, voraussichtlich ${eur(r.zuschuss2027)} ab 2027. Maßgeblich ist der Tag, an dem die Kasse den Plan bewilligt, nicht der Behandlungstermin. Die Euro-Beträge je Befund für 2027 sind noch nicht veröffentlicht; gerechnet ist mit den Beträgen von 2026 und den neuen Sätzen.`}
      />
    </div>
  );
}

/** Eine Position einer Rechnung nach GOÄ oder GOZ nachrechnen. */
export function GebuehrRechner() {
  const [werk, setWerk] = useState<"GOAE" | "GOZ">("GOAE");
  const [gruppe, setGruppe] = useState<GoaeGruppe>("persoenlich");
  const [punkte, setPunkte] = useState("80");
  const [faktor, setFaktor] = useState("2,3");
  const r = gebuehrPosition(werk, zahl(punkte), zahl(faktor), gruppe);
  const f = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
  return (
    <div data-testid="rechner-goae">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={marke}>
          Gebührenordnung
          <select className={feld} value={werk} onChange={(e) => setWerk(e.target.value as "GOAE" | "GOZ")} data-testid="go-werk">
            <option value="GOAE">GOÄ (Ärztinnen und Ärzte)</option>
            <option value="GOZ">GOZ (Zahnärztinnen und Zahnärzte)</option>
          </select>
        </label>
        {werk === "GOAE" && (
          <label className={marke}>
            Art der Leistung
            <select className={feld} value={gruppe} onChange={(e) => setGruppe(e.target.value as GoaeGruppe)}>
              <option value="persoenlich">persönlich-ärztliche Leistung</option>
              <option value="technisch">medizinisch-technische Leistung</option>
              <option value="labor">Laborleistung</option>
            </select>
          </label>
        )}
        <label className={marke}>
          Punktzahl der Ziffer
          <input className={feld} inputMode="numeric" value={punkte} onChange={(e) => setPunkte(e.target.value)} data-testid="go-punkte" />
          <span className="mt-1 block text-[14px] font-normal text-tinte-2">Steht in der Gebührenordnung bei der Ziffer, z. B. 80 Punkte für die Beratung (GOÄ Nr. 1).</span>
        </label>
        <label className={marke}>
          Faktor laut Rechnung
          <input className={feld} inputMode="decimal" value={faktor} onChange={(e) => setFaktor(e.target.value)} data-testid="go-faktor" />
        </label>
      </div>
      <Ergebnis
        testid="go-ergebnis"
        zeilen={[["Einfachsatz", eur(r.einfach)], [`Betrag zum ${f(zahl(faktor) || 0)}-fachen Satz`, eur(r.betrag), true], [`zum ${f(r.schwelle)}-fachen Satz (Schwellenwert)`, eur(r.beiSchwelle)]]}
        hinweis={`${r.pruefung.text} Punktwert: ${r.punktwertCent.toLocaleString("de-DE", { maximumFractionDigits: 5 })} Cent. Höchstsatz ohne Vereinbarung: ${f(r.hoechst)}-fach.`}
      />
    </div>
  );
}
