"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rahmen } from "@/lib/modelle/formen";
import { DEKOR, EBENEN, KOERPER_BREITE, KOERPER_HOEHE, STRUKTUREN, UMRISS, seiteImBild, seitenName, strukturNach, teilKennung, teilLesen, type Ansicht, type Ebene, type Seite, type Struktur } from "@/lib/modelle/koerper";
import { ANATOMIE_PFAD, ANATOMIE_QUELLE, DATEI_VON, IN_3D, STUFE_DATEIEN, STUFE_EBENEN, STUFEN, dateienFuerEbenen, inStufe, stufeFuerEbene, type DateiId, type Stufe } from "@/lib/modelle/drei/anatomie";
import { FOKUS, erklaerpunkteFuerFach, imFokus, type Erklaerpunkt, type FokusId, type Thema } from "@/lib/modelle/fokus";
import { mundTeil } from "@/lib/modelle/mund";
import { zahnNach } from "@/lib/modelle/gebiss";
import { useZoom } from "./useZoom";
import { useT } from "./Sprache";
import { Modell3D, type Bauplan, type Modell3DGriff } from "./drei/Modell3D";
import type { Buehne, Drei } from "./drei/Buehne";
import { ladeDatei, vorbereitenImLeerlauf } from "./drei/echt";
import { KOERPER_KUGEL, NUR_FOKUS, fokusKugel } from "./drei/koerperEcht";
import { DreiSchalter, DREI_HINWEIS } from "./drei/Schalter";
import { FARBE_GEWAEHLT, FARBE_MARKIERT, FormPfad, GewaehltLeiste, MODELL_HINWEIS, MarkierFeld, MehrfachFeld, PraxisHinweis, Treffer, ZoomTasten, useMarkierungen, type Markierung } from "./ModellTeile";

// Große Erklärungsansicht: erst laden, wenn jemand einen Erklärpunkt antippt
const ErklaerAnsicht = dynamic(() => import("./erklaerung/ErklaerAnsicht"), { ssr: false });

const BASIS = { x: 0, y: 0, w: KOERPER_BREITE, h: KOERPER_HOEHE };
const FARBE: Record<Ebene, { flaeche: string; rand: string }> = {
  knochen: { flaeche: "#F3E9D4", rand: "#9A8763" },
  organe: { flaeche: "#D98C86", rand: "#8E4A46" },
  muskeln: { flaeche: "#C9706F", rand: "#8A3B3B" },
  sehnen: { flaeche: "#CFE3F0", rand: "#44779B" },
  nerven: { flaeche: "#F4D452", rand: "#9A7B10" },
};
const STUFE_FARBE: Record<Stufe, string> = { haut: "#D6A185", muskeln: FARBE.muskeln.flaeche, organe: FARBE.organe.flaeche, skelett: FARBE.knochen.flaeche, nerven: FARBE.nerven.flaeche };
const SPIEGELN = `matrix(-1 0 0 1 ${KOERPER_BREITE} 0)`;
const ZUM_MUND = ["unterkiefer", "kiefergelenk", "kaumuskel"];
const STUFE_KUGEL: Partial<Record<Stufe, { mitte: [number, number, number]; radius: number }>> = { organe: { mitte: [0, 330, 0], radius: 540 }, nerven: { mitte: [0, 765, 0], radius: 120 } };

type Auswahl = { id: string; seite: Seite };
/** Ebene des Schemas zu einer Gruppe der 3D-Daten */
const ebeneVon = (g: string): Ebene | null => (g === "knochen" || g === "organe" || g === "muskeln" || g === "sehnen" || g === "nerven" ? g : null);

/**
 * Körpermodell: zuerst ein echter Mensch (Haut) mit Erklärpunkten; Antippen fährt heran und öffnet
 * die große Erklärung. Ebenen lassen sich einzeln zeigen (Haut → Muskeln → Organe → Skelett → Nerven)
 * oder frei kombinieren. Mit `fokus` sieht ein Fach zuerst nur sein Organ. Ohne WebGL oder auf
 * Wunsch erscheint das flache Schema; mit patientId markiert die Praxis Stellen für den Patienten.
 */
export function KoerperModell({ markierungen = [], patientId, einspaltig = false, geschlecht: startGeschlecht, fokus = null, fach = null, kompakt = false }: { markierungen?: Markierung[]; patientId?: string; startEbenen?: Ebene[]; einspaltig?: boolean; geschlecht?: "W" | "M" | null; fokus?: FokusId | null; fach?: string | null; kompakt?: boolean }) {
  const marken = useMarkierungen("koerper", markierungen, patientId);
  const t = useT();
  const seite_ = (x: Seite) => (x === "M" ? "" : t(seitenName(x)));
  const name_ = (k: string) => { const x = teilLesen(k); return x ? `${t(x.struktur.name)}${x.seite === "M" ? "" : ` ${seite_(x.seite)}`}` : k; };
  const ersteMarke = markierungen[0] ? teilLesen(markierungen[0].teil) : null;
  const [ansicht, setAnsicht] = useState<Ansicht>(ersteMarke && !ersteMarke.struktur.vorn ? "hinten" : "vorn");
  // Ebenen: eine Stufe nach der anderen oder frei kombiniert
  const [kombinieren, setKombinieren] = useState(markierungen.length > 1);
  const [stufe, setStufe] = useState<Stufe>(ersteMarke ? stufeFuerEbene(ersteMarke.struktur.ebene) : "haut");
  const [ebenenAuswahl, setEbenenAuswahl] = useState<Ebene[]>(() => Array.from(new Set(markierungen.map((m) => teilLesen(m.teil)?.struktur.ebene).filter((e): e is Ebene => !!e))));
  const [hautAuswahl, setHautAuswahl] = useState(false);
  // Fokus: nur das Organ des Fachs (oder des angetippten Erklärpunkts)
  const markeImFokus = (f: FokusId | null) => !f || markierungen.every((m) => (FOKUS[f].dateien as string[]).includes(DATEI_VON[m.teil] ?? "") && imFokus(FOKUS[f], m.teil, null));
  const [fokusJetzt, setFokusJetzt] = useState<FokusId | null>(fokus && markeImFokus(fokus) ? fokus : null);
  const aktiverFokus = fokusJetzt ? FOKUS[fokusJetzt] : null;
  const ebenen: Ebene[] = kombinieren ? ebenenAuswahl : STUFE_EBENEN[stufe];
  const hautAn = kombinieren ? hautAuswahl : stufe === "haut";

  const [auswahl, setAuswahl] = useState<Auswahl | null>(ersteMarke ? { id: ersteMarke.struktur.id, seite: ersteMarke.seite } : null);
  const [fremd, setFremd] = useState<string | null>(null);
  const [thema, setThema] = useState<Thema | null>(null);
  const [geschlecht, setGeschlecht] = useState<"W" | "M">(() => (startGeschlecht === "M" || markierungen.some((m) => m.teil.startsWith("prostata")) ? "M" : "W"));
  const passt = (s: Struktur) => !s.geschlecht || s.geschlecht === geschlecht;
  const zoom = useZoom(BASIS);
  const svgBereich = useRef<HTMLDivElement | null>(null);
  const gewaehlt = auswahl ? strukturNach(auswahl.id) : null;
  const kennung = auswahl ? teilKennung(auswahl.id, auswahl.seite) : null;

  /** Gehört eine Struktur (des Schemas) zum Organ, das gerade allein gezeigt wird? */
  const imAktivenFokus = useCallback((s: Struktur) => {
    if (!aktiverFokus) return true;
    const k = ["M", "R", "L"].map((x) => `${s.id}:${x}`).find((x) => DATEI_VON[x]);
    if (!k || !(aktiverFokus.dateien as string[]).includes(DATEI_VON[k])) return false;
    return imFokus(aktiverFokus, k, null);
  }, [aktiverFokus]);
  const sichtbar = useMemo(() => STRUKTUREN.filter((s) => ebenen.includes(s.ebene) && s[ansicht] && passt(s) && (!aktiverFokus || imAktivenFokus(s))), [ebenen, ansicht, geschlecht, aktiverFokus, imAktivenFokus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- räumlich
  const [raum, setRaum] = useState(true);
  const griff = useRef<Modell3DGriff | null>(null);
  const startKugel = useRef(aktiverFokus ? fokusKugel(aktiverFokus) : KOERPER_KUGEL);
  const plan = useCallback((): Bauplan => ({ kugel: startKugel.current, boden: startKugel.current === KOERPER_KUGEL ? -860 : undefined, winkel: 0.25, selbstDrehen: false, auftraege: [] }), []);
  const dateien: DateiId[] = aktiverFokus ? aktiverFokus.dateien : kombinieren ? dateienFuerEbenen(ebenen, hautAn) : STUFE_DATEIEN[stufe];
  // Sobald Bühne und 3D-Bibliothek bereit sind: die übrigen Ebenen im Leerlauf laden, vorbereiten und unsichtbar
  // an die Grafik übergeben, damit „Haut abnehmen“ und „Weiter innen“ ohne Stocken gehen.
  const vorbereitet = useRef(false);
  const dreiRef = useRef<Drei | null>(null);
  const buehneRef = useRef<Buehne | null>(null);
  const vorbereitenStarten = useCallback(() => {
    const T = dreiRef.current, b = buehneRef.current;
    if (vorbereitet.current || !T || !b) return;
    vorbereitet.current = true;
    vorbereitenImLeerlauf(T, Array.from(new Set(Object.values(STUFE_DATEIEN).flat())) as DateiId[], (meshes) => b.vorwaermen(meshes));
  }, []);
  const laden = useCallback((T: Drei, d: string) => {
    dreiRef.current = T;
    vorbereitenStarten();
    return ladeDatei(T, d as DateiId);
  }, [vorbereitenStarten]);
  const sichtbar3D = useCallback((d: Record<string, unknown>) => {
    const datei = d.datei as DateiId, g = String(d.gruppe), k = (d.kennung as string | undefined) ?? null;
    if (d.geschlecht && d.geschlecht !== geschlecht) return false;
    // Beim Organ allein: das Zwerchfell nur durchscheinend, damit es die Lunge nicht verdeckt
    if (aktiverFokus) return (aktiverFokus.dateien as string[]).includes(datei) && imFokus(aktiverFokus, k, (d.mitteY as number | undefined) ?? null) && (k === "zwerchfell:M" ? 0.3 : true);
    if (NUR_FOKUS.includes(datei)) return false;
    if (kombinieren) {
      if (g === "haut") return hautAn ? (ebenen.length ? 0.22 : 1) : false;
      const e = ebeneVon(g);
      return !!e && ebenen.includes(e);
    }
    return inStufe(stufe, g, k);
  }, [aktiverFokus, kombinieren, hautAn, ebenen, stufe, geschlecht]);
  const sichtbarSchluessel = `${fokusJetzt}|${kombinieren}|${stufe}|${ebenen.join(",")}|${hautAn}|${geschlecht}`;

  // Kamera folgt dem Fokus: Organ allein oder ganzer Körper; Atmen und Herzschlag nur beim Organ allein
  const ersterFokus = useRef(true);
  useEffect(() => {
    const b = griff.current?.buehne();
    if (!b) return;
    const k = aktiverFokus ? fokusKugel(aktiverFokus) : KOERPER_KUGEL;
    if (ersterFokus.current) { ersterFokus.current = false; } else if (!wartet.current) b.rahmenFliegen(k.mitte, k.radius);
    b.bewegen(aktiverFokus?.bewegung === "atmen" ? "atmen" : aktiverFokus?.bewegung === "schlagen" ? "schlagen" : null, k.mitte);
  }, [fokusJetzt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ausschnitt je Stufe: Organe und Nerven sitzen in Rumpf und Kopf, dorthin heranfahren
  const ersteStufe = useRef(true);
  useEffect(() => {
    if (ersteStufe.current) { ersteStufe.current = false; return; }
    const b = griff.current?.buehne();
    if (!b || aktiverFokus || kombinieren || wartet.current) return;
    const k = STUFE_KUGEL[stufe] ?? KOERPER_KUGEL;
    b.rahmenFliegen(k.mitte, k.radius);
  }, [stufe]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- Erklärpunkte
  const punkte = useMemo(() => {
    const alle = erklaerpunkteFuerFach(fach);
    if (aktiverFokus) return alle.filter((p) => p.fokus === aktiverFokus.id);
    return !kombinieren && stufe === "haut" ? alle : [];
  }, [fach, aktiverFokus, kombinieren, stufe]);
  const punktEl = useRef(new Map<string, HTMLButtonElement>());
  const wartet = useRef(false);
  const ankerSetzen = useCallback((b: Buehne | null | undefined) => {
    if (!b) return;
    b.anker(punkte.map((p) => {
      // Beim Organ allein sitzt der Punkt auf dem Organ, sonst auf der Haut
      const k = aktiverFokus ? fokusKugel(aktiverFokus) : null;
      return { el: punktEl.current.get(p.thema)!, pos: k ? [k.mitte[0], k.mitte[1] + k.radius * 0.35, k.mitte[2] + k.radius * 0.3] as [number, number, number] : p.pos, normal: k ? [0, 0, 1] as [number, number, number] : p.normal };
    }).filter((a) => !!a.el));
  }, [punkte, aktiverFokus]);
  useEffect(() => { ankerSetzen(griff.current?.buehne()); }, [ankerSetzen]);

  function punktWaehlen(p: Erklaerpunkt) {
    const b = griff.current?.buehne();
    setAuswahl(null); setFremd(null);
    if (p.fokus) { setFokusJetzt(p.fokus); setKombinieren(false); }
    else if (p.stufe) { setFokusJetzt(null); setKombinieren(false); setStufe(p.stufe); }
    if (!b) { setThema(p.thema); return; }
    const k = p.fokus ? fokusKugel(FOKUS[p.fokus]) : { mitte: p.pos, radius: p.radius };
    wartet.current = true;
    // Sanft heranfahren; danach öffnet sich die große Erklärung
    b.fliegeZuPunkt(k.mitte, p.fokus ? k.radius : p.radius, { theta: p.theta ?? 0, dauer: 1700, ende: () => { wartet.current = false; setThema(p.thema); } });
  }

  // ---------------------------------------------------------------- Auswahl
  const [mehrfach, setMehrfach] = useState(false);
  const [mehrere, setMehrere] = useState<string[]>([]);
  const offenerFlug = useRef<string | null>(null);

  function waehlen(s: Struktur, seite: Seite, hinzoomen = false, ziel: Ansicht = ansicht) {
    if (mehrfach && !hinzoomen) { const k = teilKennung(s.id, seite); setMehrere((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k])); return; }
    setAuswahl({ id: s.id, seite }); setFremd(null);
    if (s.geschlecht && s.geschlecht !== geschlecht) setGeschlecht(s.geschlecht);
    if (aktiverFokus && !imAktivenFokus(s)) setFokusJetzt(null);
    if (!ebenen.includes(s.ebene) || (aktiverFokus && !imAktivenFokus(s))) {
      if (kombinieren) setEbenenAuswahl((e) => Array.from(new Set([...e, s.ebene])));
      else setStufe(stufeFuerEbene(s.ebene));
    }
    const a: Ansicht = s[ziel] ? ziel : s.vorn ? "vorn" : "hinten";
    if (a !== ansicht) setAnsicht(a);
    if (hinzoomen && raum) {
      svgBereich.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const k = teilKennung(s.id, seite);
      offenerFlug.current = k;
      window.setTimeout(() => { if (griff.current?.fliegeZu(k)) offenerFlug.current = null; }, 120);
    } else if (hinzoomen) {
      svgBereich.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const r = rahmen(s[a] ?? []);
      const rechts = s.lage === "paarig" && seiteImBild(a, "rechts") === seite;
      zoom.zoomAuf(s.lage === "mitteGespiegelt" ? { x: r.x, y: r.y, b: KOERPER_BREITE - 2 * r.x, h: r.h } : rechts ? { ...r, x: KOERPER_BREITE - r.x - r.b } : r);
    }
  }
  function wahl3D(k: string) {
    const x = teilLesen(k);
    if (x) { waehlen(x.struktur, x.seite); return; }
    if (!mehrfach) { setAuswahl(null); setFremd(k); }
  }
  // Eine Ebene wird erst geladen: die Kamerafahrt zum gewählten Teil danach nachholen
  const geladen = useCallback(() => { const k = offenerFlug.current; if (k && griff.current?.fliegeZu(k)) offenerFlug.current = null; }, []);

  function stufeWaehlen(s: Stufe) { setStufe(s); setFokusJetzt(null); }
  const stufeIdx = STUFEN.findIndex((s) => s.id === stufe);

  // Tief liegende Strukturen (gestrichelt) sollen keine Klicks abfangen, die dem Organ davor gelten.
  const zeichne = (s: Struktur, tief: boolean, teil: "alles" | "treffer" | "bild" = "alles") => {
    const formen = s[ansicht]!;
    const haelften: { seite: Seite; gespiegelt: boolean }[] = s.lage === "paarig"
      ? [{ seite: seiteImBild(ansicht, "links"), gespiegelt: false }, { seite: seiteImBild(ansicht, "rechts"), gespiegelt: true }]
      : [{ seite: "M", gespiegelt: false }];
    return haelften.map(({ seite, gespiegelt }) => {
      const k = teilKennung(s.id, seite);
      const istGewaehlt = mehrfach ? mehrere.includes(k) : kennung === k;
      const istMarkiert = marken.istMarkiert(k);
      const c = istMarkiert ? { ...FARBE_MARKIERT, rand: istGewaehlt ? "#5A1D1D" : FARBE_MARKIERT.rand } : istGewaehlt ? FARBE_GEWAEHLT : s.farbe ?? FARBE[s.ebene];
      const inhalt = (
        <>
          {teil !== "treffer" && formen.map((f, i) => <FormPfad key={i} form={f} flaeche={c.flaeche} rand={c.rand} randStaerke={istGewaehlt && istMarkiert ? 2.8 : istGewaehlt || istMarkiert ? 1.8 : s.ebene === "sehnen" ? 1.3 : 0.9}
            deckkraft={istGewaehlt || istMarkiert ? 1 : tief ? 0.5 : s.ebene === "muskeln" ? 0.92 : s.ebene === "sehnen" ? 0.9 : 1} gestrichelt={tief && !istGewaehlt && !istMarkiert} />)}
          {teil !== "bild" && <Treffer formen={formen} mindest={tief ? 9 : s.ebene === "sehnen" || s.ebene === "nerven" ? 16 : 12} />}
        </>
      );
      if (teil === "bild") {
        return (
          <g key={`${k}-bild`} aria-hidden="true" pointerEvents="none" data-markiert={istMarkiert || undefined}>
            {s.lage === "paarig" ? <g transform={gespiegelt ? SPIEGELN : undefined}>{inhalt}</g> : <>{inhalt}{s.lage === "mitteGespiegelt" && <g transform={SPIEGELN}>{inhalt}</g>}</>}
          </g>
        );
      }
      return (
        <g key={k} role="button" tabIndex={0} aria-label={name_(k)} aria-pressed={istGewaehlt} className="cursor-pointer outline-none focus-visible:[&_path]:stroke-[#1d4ed8]"
          data-teil={k} data-markiert={teil === "alles" ? istMarkiert || undefined : undefined}
          onClick={() => { if (zoom.warKlick()) waehlen(s, seite); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); waehlen(s, seite, true); } }}>
          {s.lage === "paarig" ? <g transform={gespiegelt ? SPIEGELN : undefined}>{inhalt}</g> : (<>{inhalt}{s.lage === "mitteGespiegelt" && <g transform={SPIEGELN}>{inhalt}</g>}</>)}
        </g>
      );
    });
  };
  const geordnet = [...sichtbar.filter((s) => !s.tief), ...sichtbar.filter((s) => s.tief)].sort((a, b) => EBENEN.findIndex((e) => e.id === a.ebene) - EBENEN.findIndex((e) => e.id === b.ebene) || Number(!!a.tief) - Number(!!b.tief));

  const fremdName = fremd ? (fremd.startsWith("deko:") ? fremd.slice(5) : mundTeil(fremd)?.name ?? (zahnNach(Number(fremd)) ? t("Zahn {nr}", { nr: fremd }) : fremd)) : null;
  const fremdText = fremd ? mundTeil(fremd)?.was ?? (zahnNach(Number(fremd)) ? zahnNach(Number(fremd))!.name : null) : null;
  const listeStrukturen = (e: Ebene) => STRUKTUREN.filter((s) => s.ebene === e && passt(s) && (!aktiverFokus || imAktivenFokus(s)));

  const buehne = (
  <div ref={svgBereich} className={`relative scroll-mt-4 overflow-hidden rounded-2xl ring-1 ring-[#E9E2DA] ${raum ? "modell-buehne" : "bg-[#FBF7F1]"}`}>
    <DreiSchalter raum={raum} setRaum={setRaum} />
    <ZoomTasten zoom={raum ? { vergroessern: () => griff.current?.zoom(0.72), verkleinern: () => griff.current?.zoom(1.38), zuruecksetzen: () => { const k = aktiverFokus ? fokusKugel(aktiverFokus) : KOERPER_KUGEL; griff.current?.buehne()?.rahmenFliegen(k.mitte, k.radius); }, gezoomt: true } : zoom} />
    {kennung && !mehrfach && <GewaehltLeiste titel={name_(kennung)} zielId="koerper-erklaerung" />}
    {raum && (
      <Modell3D ref={griff} plan={plan} schluessel="koerper" beschriftung={t("Körper")} hoehe={kompakt ? "h-[min(64vh,32rem)]" : "h-[min(72vh,46rem)]"}
        gewaehlt={mehrfach ? mehrere : kennung ? [kennung] : fremd ? [fremd] : []} markiert={marken.liste.map((m) => m.teil)}
        sichtbar={sichtbar3D} sichtbarSchluessel={sichtbarSchluessel} quelle={ANATOMIE_QUELLE} poster={`${ANATOMIE_PFAD}/vorschau/${fokusJetzt ?? "mensch"}.webp`}
        dateien={{ liste: dateien, laden }} onGeladen={geladen}
        onBereit={(b) => { buehneRef.current = b; vorbereitenStarten(); const k = aktiverFokus ? fokusKugel(aktiverFokus) : KOERPER_KUGEL; b.bewegen(aktiverFokus?.bewegung === "atmen" ? "atmen" : aktiverFokus?.bewegung === "schlagen" ? "schlagen" : null, k.mitte); ankerSetzen(b); geladen(); }}
        onWahl={wahl3D} ohne3D={() => setRaum(false)}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-label={t("Erklärpunkte")} role="group">
          {punkte.map((p) => (
            <button key={p.thema} ref={(el) => { if (el) punktEl.current.set(p.thema, el); else punktEl.current.delete(p.thema); }} type="button"
              className="group absolute left-0 top-0 flex items-center gap-1.5 opacity-0 transition-opacity duration-300" style={{ pointerEvents: "none" }}
              onClick={() => punktWaehlen(p)} data-testid={`erklaerpunkt-${p.thema}`} aria-label={`${t(p.name)}: ${t("heranfahren und erklären")}`}>
              <span className="relative flex h-6 w-6 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-white/70 motion-reduce:animate-none" />
                <span className="relative h-3.5 w-3.5 rounded-full bg-brand-600 ring-[3px] ring-white shadow-md" />
              </span>
              <span className="whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-xs font-medium text-slate-800 shadow ring-1 ring-black/5">{t(p.name)}</span>
            </button>
          ))}
        </div>
      </Modell3D>
    )}
    {!raum && <svg ref={zoom.svgRef} viewBox={zoom.viewBox} {...zoom.ereignisse} className="mx-auto block h-[min(72vh,46rem)] w-full select-none" style={{ touchAction: zoom.touchAction }}
      role="group" aria-label={`${t("Körper")}: ${ansicht === "vorn" ? t("Von vorn") : t("Von hinten")}`} data-testid="koerper-svg">
      <g aria-hidden="true">
        {UMRISS.map((u, i) => <path key={i} d={u.d} stroke={hautAn ? "#E8C9B4" : "#F0E5DA"} strokeWidth={u.breite} strokeLinecap="round" fill="none" />)}
      </g>
      {geordnet.filter((s) => s.ebene === "knochen").flatMap((s) => zeichne(s, !!s.tief))}
      {ebenen.includes("knochen") && <g aria-hidden="true" pointerEvents="none">{DEKOR[ansicht].map((f, i) => <FormPfad key={i} form={f} flaeche="#B9A888" rand="#B9A888" randStaerke={0.4} />)}</g>}
      {geordnet.filter((s) => s.ebene !== "knochen" && s.tief).flatMap((s) => zeichne(s, true, "treffer"))}
      {geordnet.filter((s) => s.ebene !== "knochen" && !s.tief).flatMap((s) => zeichne(s, false))}
      {geordnet.filter((s) => s.ebene !== "knochen" && s.tief).flatMap((s) => zeichne(s, true, "bild"))}
      <text x={18} y={KOERPER_HOEHE - 14} fontSize={11} fill="#8b8378" aria-hidden="true">{ansicht === "vorn" ? "rechts" : "links"}</text>
      <text x={KOERPER_BREITE - 18} y={KOERPER_HOEHE - 14} fontSize={11} fill="#8b8378" textAnchor="end" aria-hidden="true">{ansicht === "vorn" ? "links" : "rechts"}</text>
    </svg>}
  </div>
  );

  // Kompakt (Fachseite der Website): nur die Bühne mit den Punkten des Fachs und die große Erklärung
  if (kompakt) return (
    <div data-testid="koerpermodell" data-kompakt="1" data-fokus={fokusJetzt ?? ""}>
      {buehne}
      <p className="mt-1.5 text-xs text-slate-500">{punkte.length ? t("Punkt antippen: Die Kamera fährt hin und die Erklärung öffnet sich.") : t(DREI_HINWEIS)}</p>
      {aktiverFokus?.hinweis && <p className="mt-1 text-xs text-slate-500">{t(aktiverFokus.hinweis)}</p>}
      {thema && <ErklaerAnsicht thema={thema} fach={fach ?? undefined} onSchliessen={() => setThema(null)} />}
    </div>
  );

  return (
    <div className={`grid gap-4 ${einspaltig ? "" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]"}`} data-testid="koerpermodell" data-stufe={kombinieren ? "kombiniert" : stufe} data-fokus={fokusJetzt ?? ""}>
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {aktiverFokus ? (
            <div className="flex flex-wrap items-center gap-2" data-testid="koerper-fokus">
              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800 ring-1 ring-brand-200">{t("Nur")}: {t(aktiverFokus.name)}</span>
              <button type="button" className="rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300 hover:text-brand-700" onClick={() => { setFokusJetzt(null); setKombinieren(false); setStufe("haut"); setThema(null); }} data-testid="koerper-ganzer-koerper">{t("Ganzer Mensch")}</button>
            </div>
          ) : (
            <>
              {!kombinieren ? (
                <div className="inline-flex max-w-full flex-wrap rounded-2xl bg-slate-100 p-1 text-sm" role="tablist" aria-label={t("Ebene")} data-testid="koerper-stufen">
                  {STUFEN.map((s) => (
                    <button key={s.id} type="button" role="tab" aria-selected={stufe === s.id} onClick={() => stufeWaehlen(s.id)} data-testid={`koerper-stufe-${s.id}`}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${stufe === s.id ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>
                      <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: STUFE_FARBE[s.id] }} />{t(s.name)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("Ebenen")}>
                  <button type="button" aria-pressed={hautAuswahl} onClick={() => setHautAuswahl(!hautAuswahl)} data-testid="koerper-ebene-haut"
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ${hautAuswahl ? "bg-white text-slate-900 ring-slate-300" : "bg-slate-50 text-slate-400 ring-slate-200"}`}>
                    <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: hautAuswahl ? STUFE_FARBE.haut : "#e5e7eb" }} />{t("Haut")}
                  </button>
                  {EBENEN.map((e) => {
                    const an = ebenenAuswahl.includes(e.id);
                    return (
                      <button key={e.id} type="button" aria-pressed={an} onClick={() => setEbenenAuswahl((l) => (an ? l.filter((x) => x !== e.id) : [...l, e.id]))} data-testid={`koerper-ebene-${e.id}`}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 ${an ? "bg-white text-slate-900 ring-slate-300" : "bg-slate-50 text-slate-400 ring-slate-200"}`}>
                        <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: an ? FARBE[e.id].flaeche : "#e5e7eb" }} />{t(e.kurz)}
                      </button>
                    );
                  })}
                </div>
              )}
              <button type="button" className="text-xs font-medium text-brand-700 hover:underline" aria-pressed={kombinieren} data-testid="koerper-kombinieren"
                onClick={() => { if (kombinieren) setKombinieren(false); else { setEbenenAuswahl(STUFE_EBENEN[stufe].length ? STUFE_EBENEN[stufe] : ["knochen"]); setHautAuswahl(stufe === "haut"); setKombinieren(true); } }}>
                {kombinieren ? t("Eine Ebene nach der anderen") : t("Ebenen kombinieren")}
              </button>
            </>
          )}
          {fokus && !aktiverFokus && <button type="button" className="rounded-full bg-brand-50 px-3 py-1.5 text-sm text-brand-800 ring-1 ring-brand-200" onClick={() => setFokusJetzt(fokus)} data-testid="koerper-nur-fokus">{t("Nur")}: {t(FOKUS[fokus].name)}</button>}
          {(ebenen.includes("organe") || (aktiverFokus && ["harnwege", "becken"].includes(aktiverFokus.id))) && (
            <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm" role="group" aria-label={t("Körper")}>
              {([["W", "weiblich"], ["M", "männlich"]] as const).map(([g, name]) => (
                <button key={g} type="button" aria-pressed={geschlecht === g} onClick={() => setGeschlecht(g)} data-testid={`koerper-geschlecht-${g}`}
                  className={`rounded-full px-3 py-1.5 ${geschlecht === g ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>{t(name)}</button>
              ))}
            </div>
          )}
        </div>
        {buehne}
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">{raum ? (punkte.length ? t("Punkt antippen: Die Kamera fährt hin und die Erklärung öffnet sich.") + " " : "") + t(DREI_HINWEIS) : t("Antippen für die Erklärung. Vergrößern mit + und −, mit zwei Fingern oder per Doppelklick.")}</p>
          {!aktiverFokus && !kombinieren && (
            <div className="flex gap-1.5">
              {stufe === "haut" ? (
                <button type="button" className="btn-secondary text-sm" onClick={() => stufeWaehlen("skelett")} data-testid="koerper-haut-ab">{t("Haut abnehmen")}</button>
              ) : (
                <>
                  <button type="button" className="rounded-full px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" disabled={stufeIdx <= 0} onClick={() => stufeWaehlen(STUFEN[stufeIdx - 1].id)} data-testid="koerper-stufe-hoeher">‹ {t("Weiter außen")}</button>
                  <button type="button" className="rounded-full px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" disabled={stufeIdx >= STUFEN.length - 1} onClick={() => stufeWaehlen(STUFEN[stufeIdx + 1].id)} data-testid="koerper-stufe-tiefer">{t("Weiter innen")} ›</button>
                </>
              )}
            </div>
          )}
        </div>
        {aktiverFokus?.hinweis && <p className="mt-1 text-xs text-slate-500" data-testid="koerper-fokus-hinweis">{t(aktiverFokus.hinweis)}</p>}
        {!raum && stufe === "haut" && !kombinieren && !aktiverFokus && <p className="mt-1 text-xs text-slate-500">{t("Im Schema ist die Haut nur als Umriss zu sehen. Der echte Körper erscheint unter „3D“.")}</p>}
      </div>

      <div className="min-w-0">
        {marken.liste.length > 0 && (
          <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50 p-3" data-testid="modell-markierte">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">{marken.bearbeitbar ? "Für diesen Patienten markiert" : t("Von Ihrer Praxis markiert")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {marken.liste.map((m) => {
                const x = teilLesen(m.teil);
                if (!x) return null;
                return <button key={m.teil} type="button" onClick={() => waehlen(x.struktur, x.seite, true)} className="rounded-full bg-white px-3 py-1.5 text-sm text-orange-950 ring-1 ring-orange-300 hover:bg-orange-100" data-testid="modell-marke">{name_(m.teil)}</button>;
              })}
            </div>
          </div>
        )}

        {marken.bearbeitbar && !mehrfach && (
          <div className="mb-3">
            <button type="button" className="btn-secondary text-sm" onClick={() => { setMehrfach(true); setMehrere([]); }} data-testid="modell-mehrfach-start">Mehrere Stellen auf einmal markieren</button>
          </div>
        )}
        {mehrfach ? (
          <MehrfachFeld
            gewaehlt={mehrere.map((k) => ({ teil: k, name: name_(k) }))}
            marken={marken}
            platzhalter="Hinweis, z. B. „Diese Muskeln bitte täglich dehnen.“"
            onEntfernen={(teil) => setMehrere((a) => a.filter((x) => x !== teil))}
            onFertig={() => { setMehrfach(false); setMehrere([]); }}
          />
        ) : gewaehlt && auswahl && kennung ? (
          <section id="koerper-erklaerung" className="card scroll-mt-4" aria-live="polite" data-testid="modell-erklaerung">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">{t(gewaehlt.name)}{auswahl.seite !== "M" && <span className="font-normal text-slate-500"> {seite_(auswahl.seite)}</span>}</h3>
                {gewaehlt.latein && <p className="text-sm italic text-slate-500">{gewaehlt.latein}</p>}
              </div>
              <span className="rounded-full px-2.5 py-1 text-xs ring-1 ring-black/10" style={{ background: FARBE[gewaehlt.ebene].flaeche, color: gewaehlt.ebene === "muskeln" || gewaehlt.ebene === "organe" ? "#fff" : "#3f3a33" }}>{t(EBENEN.find((e) => e.id === gewaehlt.ebene)!.name)}</span>
            </div>
            {gewaehlt.lage === "paarig" && (
              <div className="mt-2 inline-flex rounded-full bg-slate-100 p-0.5 text-xs" role="group" aria-label={t("Körperseite")}>
                {(["R", "L"] as Seite[]).map((s) => (
                  <button key={s} type="button" aria-pressed={auswahl.seite === s} onClick={() => waehlen(gewaehlt, s, true)} className={`rounded-full px-3 py-1 ${auswahl.seite === s ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`}>{seite_(s)}</button>
                ))}
              </div>
            )}
            {raum && !IN_3D.has(gewaehlt.id) && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200" data-testid="koerper-nicht-in-3d">
                {t("Diese Struktur ist in den frei verfügbaren 3D-Scandaten nicht enthalten. Im Schema ist sie eingezeichnet.")}{" "}
                <button type="button" className="font-medium underline" onClick={() => setRaum(false)}>{t("Im Schema zeigen")}</button>
              </p>
            )}
            <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Was ist das?")}</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{t(gewaehlt.was)}</p>
            <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Häufige Beschwerden")}</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{t(gewaehlt.beschwerden)}</p>
            {!marken.bearbeitbar && <PraxisHinweis notiz={marken.notizVon(kennung)} />}
            <MarkierFeld key={kennung} teil={kennung} marken={marken} platzhalter="Hinweis, z. B. „Hier sitzt die Reizung. Bitte zweimal täglich dehnen.“" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => waehlen(gewaehlt, auswahl.seite, true)}>{t("Im Modell zeigen")}</button>
              {gewaehlt.vorn && gewaehlt.hinten && <button type="button" className="btn-secondary text-sm" onClick={() => waehlen(gewaehlt, auswahl.seite, true, ansicht === "vorn" ? "hinten" : "vorn")}>{ansicht === "vorn" ? t("Von hinten ansehen") : t("Von vorn ansehen")}</button>}
              {ZUM_MUND.includes(gewaehlt.id) && <a href="/anatomie/gebiss" className="btn-secondary text-sm" data-testid="koerper-zum-mund">{t("Mund von innen ansehen")}</a>}
            </div>
          </section>
        ) : fremd && fremdName ? (
          <section className="card" aria-live="polite" data-testid="modell-erklaerung">
            <h3 className="text-lg font-semibold text-slate-900">{t(fremdName)}</h3>
            {fremdText ? <p className="mt-1 text-sm leading-relaxed text-slate-800">{t(fremdText)}</p> : <p className="mt-1 text-sm text-slate-600">{t("Dieser Teil ist zur Orientierung zu sehen und hat keine eigene Erklärung.")}</p>}
          </section>
        ) : (
          <section className="card text-sm text-slate-600" data-testid="modell-erklaerung-leer">
            <h3 className="text-base font-semibold text-slate-900">{t("So funktioniert das Modell")}</h3>
            <p className="mt-1">{t("Tippen Sie auf einen Punkt am Körper: Die Kamera fährt heran und die Erklärung öffnet sich. Mit „Haut abnehmen“ sehen Sie das Skelett, danach Ebene für Ebene Muskeln, Organe und Nerven.")}</p>
          </section>
        )}

        <details className="mt-3 rounded-2xl bg-white ring-1 ring-slate-200" data-testid="modell-liste">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-900">{aktiverFokus ? t(aktiverFokus.name) : t("Alle {n} Strukturen als Liste", { n: STRUKTUREN.length })}</summary>
          <div className="space-y-3 border-t border-slate-100 px-4 py-3">
            {EBENEN.map((e) => {
              const liste = listeStrukturen(e.id);
              if (!liste.length) return null;
              return (
                <div key={e.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(e.name)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {liste.map((s) => (
                      <button key={s.id} type="button" onClick={() => waehlen(s, s.lage === "paarig" ? (auswahl?.seite && auswahl.seite !== "M" ? auswahl.seite : "R") : "M", true)}
                        className={`rounded-full px-3 py-2 text-sm ring-1 sm:px-2.5 sm:py-1 sm:text-xs ${auswahl?.id === s.id ? "bg-brand-600 text-white ring-brand-600" : "bg-slate-50 text-slate-700 ring-slate-200 hover:text-brand-700"}`}>
                        {t(s.name)}{raum && !IN_3D.has(s.id) ? " ·" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {raum && <p className="text-xs text-slate-500">{t("Mit · markiert: nur im Schema, nicht in den 3D-Scandaten.")}</p>}
          </div>
        </details>
        <p className="mt-3 text-xs text-slate-500">{t(MODELL_HINWEIS)}</p>
      </div>
      {thema && <ErklaerAnsicht thema={thema} fach={fach ?? undefined} onSchliessen={() => setThema(null)} />}
    </div>
  );
}
