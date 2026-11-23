"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomOffer } from "@/lib/proposals";
import { betragInCent, ordnePreiseZu, parsePreisliste, type Preiszeile } from "@/lib/preisliste";

import { useAppText } from "@/components/FachKontext";
export interface PreislisteZiel {
  id: string;
  /** leistung = Leistung des Fachs, eigen = eigene Leistung, vorschlag = Vorschlagspreis (Zahnmedizin), katalog = eigene Katalogposition */
  art: "leistung" | "eigen" | "vorschlag" | "katalog";
  name: string;
  preisCent: number | null;
}

interface Start {
  specialty: string;
  medPrices: Record<string, number>;
  customOffers: CustomOffer[];
  vorschlagspreise: Record<string, number>;
}

interface Zeile {
  nr: number;
  bezeichnung: string;
  betrag: string;
  /** Ziel-ID, "neu" = neue eigene Leistung */
  ziel: string;
  naheliegend: string[];
  vermerk?: string;
  bestaetigt: boolean;
  ki: boolean;
}

const NEU = "neu";
const KI_DATEI_MAX = 5 * 1024 * 1024;
const euro = (cent: number | null) => (cent == null ? "kein Preis" : (cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }));
const alsEingabe = (cent: number) => (cent / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });

/** Große Fotos vor dem Senden verkleinern: schneller, und die Preisliste bleibt lesbar. */
async function verkleinern(datei: File): Promise<File> {
  if (!datei.type.startsWith("image/") || datei.type === "image/gif" || datei.size < 900 * 1024) return datei;
  try {
    const bild = await createImageBitmap(datei);
    const faktor = Math.min(1, 2000 / Math.max(bild.width, bild.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bild.width * faktor);
    canvas.height = Math.round(bild.height * faktor);
    canvas.getContext("2d")?.drawImage(bild, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob && blob.size < datei.size ? new File([blob], "preisliste.jpg", { type: "image/jpeg" }) : datei;
  } catch {
    return datei;
  }
}

/** Preisliste einlesen: Text oder Datei, Vorschau, Bestätigung Zeile für Zeile, dann speichern. */
export function PreislisteEinlesen({ dental, readOnly, ziele: zieleStart, ki, start }: { dental: boolean; readOnly: boolean; ziele: PreislisteZiel[]; ki: { aktiv: boolean; schalter: boolean; verfuegbar: boolean }; start: Start }) {
  const ft = useAppText();
  const router = useRouter();
  const [text, setText] = useState("");
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [ohneBetrag, setOhneBetrag] = useState(0);
  const [ziele, setZiele] = useState(zieleStart);
  const [stand, setStand] = useState(start);
  const [laeuft, setLaeuft] = useState(false);
  const [kiLaeuft, setKiLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const zielVon = new Map(ziele.map((z) => [z.id, z]));

  function vorschau(gelesen: Preiszeile[], vonKi: boolean) {
    const zu = ordnePreiseZu(gelesen, ziele.map((z) => ({ id: z.id, name: z.name })));
    setZeilen(zu.map((z, i) => ({ nr: i + 1, bezeichnung: z.zeile.bezeichnung, betrag: alsEingabe(z.zeile.betragCent), ziel: z.zielId ?? NEU, naheliegend: z.naheliegend.map((n) => n.id), vermerk: z.vermerk, bestaetigt: false, ki: vonKi })));
    setMeldung(null);
    setFehler(null);
  }

  function lesen() {
    const r = parsePreisliste(text);
    setOhneBetrag(r.ohneBetrag.length);
    vorschau(r.zeilen, false);
    if (r.zeilen.length === 0) setFehler("In diesem Text wurde keine Zeile mit Leistung und Betrag gefunden. Beispiel: Reisemedizinische Beratung 30,00 €");
  }

  async function mitKi(datei: File | undefined) {
    if (!datei) return;
    setFehler(null);
    setMeldung(null);
    const klein = await verkleinern(datei);
    if (klein.size > KI_DATEI_MAX) return setFehler("Die Datei ist größer als 5 MB. Bitte ein kleineres Foto oder eine einzelne PDF-Seite wählen.");
    setKiLaeuft(true);
    const form = new FormData();
    form.append("datei", klein);
    const res = await fetch("/api/ki/preisliste", { method: "POST", body: form }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setKiLaeuft(false);
    if (!res?.ok || !Array.isArray(d?.zeilen)) return setFehler(d?.error ?? "Das Lesen mit KI hat nicht geklappt. Sie können die Liste als Text einfügen.");
    setOhneBetrag(0);
    vorschau(d.zeilen.map((z: { bezeichnung: string; betragCent: number; ab: boolean }, i: number) => ({ zeile: i + 1, bezeichnung: String(z.bezeichnung), betragCent: Number(z.betragCent), ab: z.ab === true, ...(z.ab ? { vermerk: "„ab“-Preis: als Mindestbetrag gelesen. Bitte den Betrag prüfen." } : {}) })), true);
    if (d.zeilen.length === 0) setFehler("Die KI hat in der Datei keine Preisliste gefunden.");
  }

  const aendern = (nr: number, patch: Partial<Zeile>) => setZeilen((l) => l.map((z) => (z.nr === nr ? { ...z, ...patch } : z)));
  const bestaetigt = zeilen.filter((z) => z.bestaetigt);
  const ungueltig = bestaetigt.filter((z) => betragInCent(z.betrag.replace(/[€\s]/g, "")) == null || z.bezeichnung.trim().length < 2);

  async function speichern() {
    setLaeuft(true);
    setFehler(null);
    setMeldung(null);
    const fertig: number[] = [];
    let naechster = stand;
    let neueZiele = ziele;
    const probleme: string[] = [];
    const antwort = async (res: Response | null) => ({ ok: !!res?.ok, d: await res?.json().catch(() => null) });

    if (!dental) {
      // Arzt- und Therapiepraxen: Preise der Leistungen und eigene Leistungen in einem Schritt (vorhandene Schnittstelle der Einstellungen).
      const medPrices = { ...naechster.medPrices };
      let customOffers = [...naechster.customOffers];
      for (const [i, z] of bestaetigt.entries()) {
        const cent = betragInCent(z.betrag.replace(/[€\s]/g, ""))!;
        const ziel = zielVon.get(z.ziel);
        if (ziel?.art === "leistung") medPrices[ziel.id.slice("leistung:".length)] = cent / 100;
        else if (ziel?.art === "eigen") customOffers = customOffers.map((c) => (c.id === ziel.id.slice("eigen:".length) ? { ...c, price: cent / 100 } : c));
        else customOffers.push({ id: `p${Date.now().toString(36)}${i}`, anlass: "Eigene Leistungen", name: z.bezeichnung.trim().replace(/\s+/g, " ").slice(0, 120), price: cent / 100 });
      }
      if (customOffers.length > 100) probleme.push("Mehr als 100 eigene Leistungen sind nicht möglich. Bitte weniger Zeilen bestätigen.");
      else {
        const r = await antwort(await fetch("/api/settings/specialty", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ specialty: naechster.specialty, medPrices, customOffers }) }).catch(() => null));
        if (!r.ok) probleme.push(r.d?.error ?? "Speichern hat nicht geklappt.");
        else {
          fertig.push(...bestaetigt.map((z) => z.nr));
          naechster = { ...naechster, medPrices, customOffers };
          neueZiele = [
            ...ziele.filter((z) => z.art === "leistung").map((z) => ({ ...z, preisCent: Math.round((medPrices[z.id.slice("leistung:".length)] ?? (z.preisCent ?? 0) / 100) * 100) })),
            ...customOffers.map((c) => ({ id: `eigen:${c.id}`, art: "eigen" as const, name: c.name, preisCent: Math.round(c.price * 100) })),
          ];
        }
      }
    } else {
      // Zahnarztpraxen: Vorschlagspreise gesammelt, eigene Katalogpositionen einzeln.
      const preise = { ...naechster.vorschlagspreise };
      const mitVorschlag = bestaetigt.filter((z) => zielVon.get(z.ziel)?.art === "vorschlag");
      for (const z of mitVorschlag) preise[z.ziel.slice("vorschlag:".length)] = betragInCent(z.betrag.replace(/[€\s]/g, ""))! / 100;
      if (mitVorschlag.length) {
        const r = await antwort(await fetch("/api/settings/proposal-prices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prices: preise }) }).catch(() => null));
        if (!r.ok) probleme.push(r.d?.error ?? "Die Vorschlagspreise wurden nicht gespeichert.");
        else {
          fertig.push(...mitVorschlag.map((z) => z.nr));
          naechster = { ...naechster, vorschlagspreise: preise };
          neueZiele = neueZiele.map((t) => (t.art === "vorschlag" ? { ...t, preisCent: Math.round(preise[t.id.slice("vorschlag:".length)] * 100) } : t));
        }
      }
      for (const z of bestaetigt.filter((x) => zielVon.get(x.ziel)?.art !== "vorschlag")) {
        const cent = betragInCent(z.betrag.replace(/[€\s]/g, ""))!;
        const ziel = zielVon.get(z.ziel);
        const r = ziel?.art === "katalog"
          ? await antwort(await fetch(`/api/catalog-items/${ziel.id.slice("katalog:".length)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ festbetragCent: cent }) }).catch(() => null))
          : await antwort(await fetch("/api/catalog-items/schnell", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: z.bezeichnung.trim(), preis: cent / 100 }) }).catch(() => null));
        if (!r.ok) { probleme.push(`${z.bezeichnung}: ${r.d?.error ?? "nicht gespeichert"}`); continue; }
        fertig.push(z.nr);
        if (ziel?.art === "katalog") neueZiele = neueZiele.map((t) => (t.id === ziel.id ? { ...t, preisCent: cent } : t));
        else if (r.d?.item?.id && !neueZiele.some((t) => t.id === `katalog:${r.d.item.id}`)) neueZiele = [...neueZiele, { id: `katalog:${r.d.item.id}`, art: "katalog", name: String(r.d.item.title ?? z.bezeichnung), preisCent: cent }];
      }
    }

    setStand(naechster);
    setZiele(neueZiele);
    setZeilen((l) => l.filter((z) => !fertig.includes(z.nr)));
    setLaeuft(false);
    if (fertig.length) setMeldung(`${fertig.length} ${fertig.length === 1 ? "Zeile" : "Zeilen"} gespeichert.`);
    if (probleme.length) setFehler(probleme.slice(0, 5).join(" "));
    if (fertig.length) router.refresh();
  }

  return (
    <div className="space-y-6" data-testid="preisliste-einlesen" data-hilfe="preisliste-einlesen">
      {readOnly && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{ft("Nur die Praxisleitung kann Preise speichern. Sie können eine Liste lesen und die Vorschau ansehen.")}</p>}

      <section className="card space-y-3" aria-labelledby="preisliste-text-titel">
        <h2 id="preisliste-text-titel" className="font-medium text-slate-900">Text einfügen oder Datei wählen</h2>
        <p className="text-sm text-slate-500">Eine Zeile je Leistung, zum Beispiel „Reisemedizinische Beratung 30,00 €“ oder „Attest;15,00“. Sorrida liest den Text ohne KI in Ihrem Browser.</p>
        <label className="block text-xs text-slate-600">
          Text- oder CSV-Datei
          <input type="file" accept=".csv,.txt,text/csv,text/plain" className="mt-1 block w-full max-w-full text-xs" data-testid="preisliste-datei"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText((await f.text()).slice(0, 200_000)); }} />
        </label>
        <label className="label" htmlFor="preisliste-text">Preisliste als Text</label>
        <textarea id="preisliste-text" className="input h-40 w-full font-mono text-xs" value={text} maxLength={200_000} onChange={(e) => setText(e.target.value)} data-testid="preisliste-text"
          placeholder={"Reisemedizinische Beratung 30,00 €\nAttest;15,00\nAkupunktur ab 55,- EUR"} />
        <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={lesen} data-testid="preisliste-lesen">Liste lesen</button>
      </section>

      {ki.aktiv && (
        <section className="card space-y-3" aria-labelledby="preisliste-ki-titel" data-testid="preisliste-ki">
          <h2 id="preisliste-ki-titel" className="font-medium text-slate-900">Foto oder PDF-Seite mit KI lesen</h2>
          <p className="text-sm text-slate-500">
            Die Datei geht zum Lesen an den KI-Dienst und wird nicht gespeichert. Höchstens 5 MB. Das Ergebnis ist ein Entwurf, den Sie unten Zeile für Zeile prüfen.
          </p>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="preisliste-ki-hinweis">{ft("Bitte keine Patientendaten hochladen. Nur die Preisliste, ohne Namen und ohne Rechnungen.")}</p>
          <label className="block text-xs text-slate-600">
            Foto (JPG, PNG, WebP) oder PDF
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-1 block w-full max-w-full text-xs" disabled={kiLaeuft} data-testid="preisliste-ki-datei"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void mitKi(f); }} />
          </label>
          {kiLaeuft && <p className="text-sm text-slate-700" role="status">Die KI liest die Datei …</p>}
        </section>
      )}

      {fehler && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert" data-testid="preisliste-fehler">{fehler}</p>}
      {meldung && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700" role="status" data-testid="preisliste-meldung">{meldung}</p>}

      {zeilen.length > 0 && (
        <section className="card space-y-3" aria-labelledby="preisliste-vorschau-titel" data-testid="preisliste-vorschau">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="preisliste-vorschau-titel" className="font-medium text-slate-900">Vorschau: {zeilen.length} {zeilen.length === 1 ? "Zeile" : "Zeilen"}</h2>
            {zeilen[0].ki && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">Entwurf der KI, bitte prüfen</span>}
          </div>
          <p className="text-sm text-slate-500">
            Prüfen Sie Bezeichnung, Betrag und Zuordnung. Setzen Sie den Haken nur bei Zeilen, die stimmen. Gespeichert werden nur Zeilen mit Haken.
            {ohneBetrag > 0 && ` ${ohneBetrag} ${ohneBetrag === 1 ? "Zeile" : "Zeilen"} ohne Betrag wurden ausgelassen.`}
          </p>
          <ul className="space-y-3">
            {zeilen.map((z) => {
              const ziel = zielVon.get(z.ziel);
              const cent = betragInCent(z.betrag.replace(/[€\s]/g, ""));
              const vorn = z.naheliegend.filter((id) => zielVon.has(id));
              return (
                <li key={z.nr} className={`rounded-lg border p-3 ${z.bestaetigt ? "border-brand-300 bg-brand-50/40" : "border-slate-200"}`} data-testid="preisliste-zeile">
                  <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
                    <label className="block text-xs text-slate-600">
                      Bezeichnung
                      <input className="input mt-1 w-full" value={z.bezeichnung} maxLength={120} onChange={(e) => aendern(z.nr, { bezeichnung: e.target.value })} />
                    </label>
                    <label className="block text-xs text-slate-600">
                      Betrag in Euro
                      <input className="input mt-1 w-full text-right" inputMode="decimal" value={z.betrag} maxLength={12} aria-invalid={cent == null} onChange={(e) => aendern(z.nr, { betrag: e.target.value })} />
                    </label>
                  </div>
                  <label className="mt-2 block text-xs text-slate-600">
                    Zuordnung
                    <select className="input mt-1 w-full" value={z.ziel} onChange={(e) => aendern(z.nr, { ziel: e.target.value })} data-testid="preisliste-zuordnung">
                      <option value={NEU}>{dental ? "Neue eigene Leistung im Katalog anlegen" : "Neue eigene Leistung anlegen"}</option>
                      {vorn.length > 0 && (
                        <optgroup label="Ähnliche Bezeichnung">
                          {vorn.map((id) => <option key={id} value={id}>{zielVon.get(id)!.name}</option>)}
                        </optgroup>
                      )}
                      <optgroup label="Alle vorhandenen Leistungen">
                        {ziele.filter((t) => !vorn.includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </optgroup>
                    </select>
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    {ziel ? `Bisheriger Preis: ${euro(ziel.preisCent)}. Der Betrag aus der Liste ersetzt ihn.` : "Passt zu keiner vorhandenen Leistung. Vorschlag: als eigene Leistung anlegen."}
                    {cent == null && <span className="text-red-700"> Der Betrag ist nicht lesbar. Beispiel: 49,90</span>}
                  </p>
                  {z.vermerk && <p className="mt-1 text-xs text-amber-800">{z.vermerk}</p>}
                  <label className="mt-2 flex items-center gap-2 text-sm text-slate-800">
                    <input type="checkbox" checked={z.bestaetigt} disabled={readOnly} onChange={(e) => aendern(z.nr, { bestaetigt: e.target.checked })} data-testid="preisliste-bestaetigen" />
                    Diese Zeile stimmt und soll gespeichert werden
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" disabled={readOnly || laeuft || bestaetigt.length === 0 || ungueltig.length > 0} onClick={speichern} data-testid="preisliste-speichern">
              {laeuft ? "Speichert …" : `Bestätigte Zeilen speichern (${bestaetigt.length})`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setZeilen([]); setMeldung(null); setFehler(null); }} data-testid="preisliste-verwerfen">Vorschau verwerfen</button>
          </div>
          <p className="text-xs text-slate-500">
            {dental
              ? "Zeilen zu Vorschlagspreisen ändern die Preise unter Einstellungen → Vorschlagspreise. Neue Leistungen stehen danach im Katalog unter „Eigene Leistungen“."
              : "Neue Leistungen stehen danach unter Fachgebiet und Leistungen bei „Eigene Leistungen“ mit dem Anlass „Eigene Leistungen“. Den Anlass und den Hinweis zur Kasse ergänzen Sie dort."}
          </p>
        </section>
      )}
    </div>
  );
}
