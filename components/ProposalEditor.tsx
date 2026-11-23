"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BefundDiktat } from "@/components/BefundDiktat";
import { favoritenFuerFach, type Favorit } from "@/lib/favoriten";
import { AnlassPicker } from "@/components/AnlassPicker";
import { AnlassStichworte } from "@/components/AnlassStichworte";
import { DENTAL_ID, bietetKasse, isDental, isTherapie, istZahnVorschlag, specialty } from "@/lib/specialties";
import { fachWoerter } from "@/lib/fachprofile";
import type { DiktatResult } from "@/lib/befundDiktat";
import {
  ABGEWAEHLT,
  FINDINGS,
  GLOBAL_FINDINGS,
  LOWER_TEETH,
  PROPOSAL_STATUS_LABELS,
  UPPER_TEETH,
  ageFromBirthDate,
  buildLetter,
  buildProposal,
  chosenOption,
  defaultZuschussJahr,
  FESTZUSCHUSS_SAETZE,
  isZahnersatz,
  showsJahresvergleich,
  tageBisStichtag,
  vergleicheJahre,
  formatEuro,
  LEER_MEDIZIN,
  LEER_ZAHN,
  money,
  typeLabelOf,
  summarize,
  type FindingCode,
  type GlobalCode,
  type PatientFactors,
  type Prices,
  type ProposalInput,
  type MedInput,
  type ZuschussJahr,
  festzuschuss2027Amtlich,
  festzuschussSaetzeText,
} from "@/lib/proposals";
import { PatientAuswahl } from "@/components/PatientAuswahl";
import { NutzenQuelleLink } from "@/components/NutzenQuelleLink";

import { useAppText } from "@/components/FachKontext";
type EntwurfDaten = { patientId: string; kuerzel: string; factors: PatientFactors; teeth: Partial<Record<string, FindingCode>>; globals: Partial<Record<GlobalCode, boolean>>; anlaesse: string[]; choices: Record<string, string> };

type PatientOption = {
  id: string;
  firstName: string;
  lastName: string;
  insuranceType: string | null;
  birthDate: string | null;
  geschlecht?: string | null;
};

export type ExistingProposal = {
  id: string;
  patientId: string;
  status: string;
  input: ProposalInput;
  choices: Record<string, string>;
  /** Wahl, die der Patient über seinen Link zurückgemeldet hat. */
  patientChoices?: Record<string, string>;
  /** Wahl, die der Patient im Portal unterschrieben hat (geht vor). */
  agreedChoices?: Record<string, string>;
  patientFirstName?: string;
};

function defaultFactors(p: PatientOption | undefined): PatientFactors {
  return {
    age: p ? ageFromBirthDate(p.birthDate) : null,
    insurance: p?.insuranceType === "PKV" ? "PKV" : "GKV",
    bonusYears: 0,
    haertefall: false,
    erstattungProzent: p?.insuranceType === "PKV" ? 80 : 0,
    zuschussJahr: defaultZuschussJahr(),
  };
}

export function ProposalEditor({
  patients,
  initialPatientId,
  initialGlobals,
  ausModell = [],
  prices,
  practiceName,
  existing,
  savedHrefPrefix = "/proposals/",
  compact = false,
  onChange,
  fach: practiceFach,
  med: practiceMed,
  schnell,
  favoriten: favoritenStart = [],
}: {
  /** Schnellvorschlag ohne Akte: statt eines Patienten nur ein Kürzel (kein Name, kein Geburtsdatum). */
  schnell?: { vorschlag: string };
  /** Gespeicherte Kombinationen der Praxis für neue Vorschläge. */
  favoriten?: Favorit[];
  patients: PatientOption[];
  initialPatientId?: string;
  /** Allgemeine Befunde aus der Anamnese (z. B. Raucher), nur für neue Vorschläge. */
  initialGlobals?: GlobalCode[];
  /** Im Anatomie-Modell markierte Stellen des Patienten (nur neue Vorschläge): Zähne mit Befund füllen das Zahnschema vor. */
  ausModell?: { name: string; notiz: string; zahn: number | null; befund: string | null }[];
  prices: Prices;
  practiceName: string;
  existing?: ExistingProposal;
  /** Ziel nach dem ersten Speichern; im Praxissoftware-Fenster bleibt der Nutzer unter /embed. */
  savedHrefPrefix?: string;
  /** Im Abschluss-Schritt: ohne eigene Speichern-Knöpfe und Schreiben-Reiter, gespeichert wird gemeinsam. */
  compact?: boolean;
  onChange?: (input: ProposalInput, choices: Record<string, string>) => void;
  /** Fachgebiet der Praxis für neue Vorschläge; ohne Angabe neutral ("andere"), nie Zahnmedizin. */
  fach?: string;
  /** Preise und eigene Leistungen einer Arztpraxis. */
  med?: MedInput;
}) {
  const ft = useAppText();
  const router = useRouter();
  const [patientId, setPatientId] = useState(existing?.patientId ?? initialPatientId ?? "");
  const patient = patients.find((p) => p.id === patientId);
  const [factors, setFactors] = useState<PatientFactors>(existing?.input.patient ?? defaultFactors(patient));
  const modellZaehne = existing ? [] : ausModell.filter((m) => m.zahn != null);
  const [teeth, setTeeth] = useState<Partial<Record<string, FindingCode>>>(
    existing?.input.teeth ?? Object.fromEntries(modellZaehne.filter((m) => m.befund && m.befund in FINDINGS).map((m) => [String(m.zahn), m.befund as FindingCode])),
  );
  const [globals, setGlobals] = useState<Partial<Record<GlobalCode, boolean>>>(
    existing?.input.globals ?? Object.fromEntries((initialGlobals ?? []).map((k) => [k, true])),
  );
  const [choices, setChoices] = useState<Record<string, string>>(existing?.choices ?? {});
  // Gespeicherte Vorschläge: ohne fach ein Zahnvorschlag (istZahnVorschlag). Neue Vorschläge: das Fach der Praxis.
  const fach = existing ? existing.input.fach : practiceFach || "andere";
  const dental = existing ? istZahnVorschlag(fach) : isDental(fach);
  const spec = specialty(fach);
  const w = fachWoerter(fach);
  const medData = existing?.input.med ?? practiceMed ?? {};
  const [anlaesse, setAnlaesse] = useState<string[]>(existing?.input.anlaesse ?? []);
  const [selected, setSelected] = useState<number>(modellZaehne[0]?.zahn ?? 16);
  const [tab, setTab] = useState<"praxis" | "patient">("praxis");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [kuerzel, setKuerzel] = useState(schnell?.vorschlag ?? "");
  // „Patient schaut mit“: ruhige Ansicht für das Gespräch, ohne Praxiszahlen und ohne Eingabefelder.
  const [gespraech, setGespraech] = useState(false);
  const [favoriten, setFavoriten] = useState<Favorit[]>(favoritenStart);
  const [favName, setFavName] = useState<string | null>(null);
  const [favMeldung, setFavMeldung] = useState<string | null>(null);
  const [entwurf, setEntwurf] = useState<{ zeit: number; daten: EntwurfDaten } | null>(null);

  const status = existing?.status ?? "ENTWURF";
  const locked = status === "ANGENOMMEN" || status === "ABGELEHNT";

  const input: ProposalInput = dental
    ? { teeth, globals, patient: factors }
    : { teeth: {}, globals: {}, patient: factors, fach, anlaesse, med: medData };
  const items = useMemo(() => buildProposal(input, prices), [teeth, globals, factors, prices, anlaesse]); // eslint-disable-line react-hooks/exhaustive-deps
  const summary = summarize(items, choices, factors);
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "";
  const letter = buildLetter({ items, choices, patient: factors, patientName, practiceName, date: new Date(), fach });
  const delta = summary.planTotal - summary.baseTotal;
  const jv = vergleicheJahre(items, choices, factors);
  const jahr: ZuschussJahr = factors.zuschussJahr ?? defaultZuschussJahr();
  const zeigeVergleich = factors.insurance === "GKV" && !factors.haertefall;
  const tage = tageBisStichtag();
  const pct = (y: ZuschussJahr) => `${Math.round(FESTZUSCHUSS_SAETZE[y][factors.bonusYears] * 100)} %`;

  useEffect(() => {
    onChange?.(input, choices);
  }, [teeth, globals, factors, choices, anlaesse]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entwurf speichert sich selbst (nur neue Vorschläge, nur in diesem Tab): Klingelt das Telefon, geht nichts verloren.
  const entwurfKey = !existing && !compact ? `sorrida:entwurf:${schnell ? "schnell" : "neu"}:${fach}` : null;
  const hatInhalt = Object.keys(teeth).length > 0 || anlaesse.length > 0;
  useEffect(() => {
    if (!entwurfKey) return;
    try {
      const roh = JSON.parse(window.sessionStorage.getItem(entwurfKey) ?? "null");
      if (roh && typeof roh.zeit === "number" && Date.now() - roh.zeit < 12 * 3600e3 && roh.daten) setEntwurf(roh);
    } catch { /* kein Entwurf */ }
  }, [entwurfKey]);
  useEffect(() => {
    if (!entwurfKey || entwurf) return;
    const t = setTimeout(() => {
      try {
        if (hatInhalt) window.sessionStorage.setItem(entwurfKey, JSON.stringify({ zeit: Date.now(), daten: { patientId, kuerzel, factors, teeth, globals, anlaesse, choices } satisfies EntwurfDaten }));
        else window.sessionStorage.removeItem(entwurfKey);
      } catch { /* Speicher voll oder gesperrt */ }
    }, 500);
    return () => clearTimeout(t);
  }, [entwurfKey, entwurf, hatInhalt, patientId, kuerzel, factors, teeth, globals, anlaesse, choices]);
  function entwurfUebernehmen() {
    if (!entwurf) return;
    const d = entwurf.daten;
    if (d.patientId && patients.some((p) => p.id === d.patientId)) setPatientId(d.patientId);
    if (schnell && d.kuerzel) setKuerzel(d.kuerzel);
    setFactors(d.factors); setTeeth(d.teeth ?? {}); setGlobals(d.globals ?? {}); setAnlaesse(d.anlaesse ?? []); setChoices(d.choices ?? {});
    setEntwurf(null);
  }
  function entwurfVerwerfen() {
    if (entwurfKey) try { window.sessionStorage.removeItem(entwurfKey); } catch { /* egal */ }
    setEntwurf(null);
  }

  // Favoriten: häufige Kombinationen mit einem Klick übernehmen bzw. die aktuelle Auswahl speichern.
  const favoritFach = dental ? DENTAL_ID : fach || "andere";
  const meineFavoriten = favoritenFuerFach(favoriten, favoritFach);
  function favoritAnwenden(f: Favorit) {
    if (dental) {
      setTeeth(f.teeth as Partial<Record<string, FindingCode>>);
      setGlobals(Object.fromEntries(f.globals.map((k) => [k, true])));
    } else setAnlaesse(f.anlaesse);
    setChoices(f.choices);
    setFavMeldung(`„${f.name}“ übernommen. Bitte prüfen und anpassen.`);
  }
  async function favoritSpeichern() {
    const name = (favName ?? "").trim();
    if (name.length < 2) return setFavMeldung("Bitte einen Namen mit mindestens 2 Zeichen eingeben.");
    const res = await fetch("/api/praxis/vorschlag-favoriten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, fach: favoritFach, teeth: dental ? teeth : {}, globals: dental ? Object.entries(globals).filter(([, v]) => v).map(([k]) => k) : [], anlaesse: dental ? [] : anlaesse, choices }),
    }).catch(() => null);
    const d = await res?.json().catch(() => null);
    if (!res?.ok) return setFavMeldung(d?.error ?? "Der Favorit konnte nicht gespeichert werden.");
    setFavoriten(d.favoriten); setFavName(null); setFavMeldung(`„${name}“ gespeichert.`);
  }
  async function favoritLoeschen(id: string) {
    const res = await fetch("/api/praxis/vorschlag-favoriten", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => null);
    const d = await res?.json().catch(() => null);
    if (res?.ok) { setFavoriten(d.favoriten); setFavMeldung(null); }
  }

  function changePatient(id: string) {
    setPatientId(id);
    setFactors(defaultFactors(patients.find((p) => p.id === id)));
  }
  function setFinding(n: number, f: string) {
    setTeeth((t) => {
      const next = { ...t };
      if (f) next[String(n)] = f as FindingCode;
      else delete next[String(n)];
      return next;
    });
  }

  function applyDiktat(r: DiktatResult) {
    setTeeth((t) => {
      const next = { ...t };
      for (const [n, c] of Object.entries(r.teeth)) {
        if (c === "ok") delete next[n];
        else if (c) next[n] = c;
      }
      return next;
    });
    if (r.globals.length) setGlobals((g) => ({ ...g, ...Object.fromEntries(r.globals.map((k) => [k, true])) }));
    const first = Object.keys(r.teeth).map(Number)[0];
    if (first) setSelected(first);
  }

  // Wahl des Patienten (unterschrieben geht vor Rückmeldung), nur für Positionen, die es im Vorschlag gibt.
  const patientWahl = (() => {
    const w = existing?.agreedChoices ?? existing?.patientChoices;
    if (!w) return null;
    const gueltig = Object.fromEntries(
      Object.entries(w).filter(([k, v]) => items.some((it) => it.key === k && (v === ABGEWAEHLT || it.options.some((o) => o.id === v)))),
    );
    return Object.keys(gueltig).length ? gueltig : null;
  })();
  const wahlUnterschrieben = !!existing?.agreedChoices;
  const wahlWeichtAb = !!patientWahl && Object.entries(patientWahl).some(([k, v]) => (chosenOption(items.find((it) => it.key === k)!, choices)?.id ?? ABGEWAEHLT) !== v);
  const wahlText = patientWahl
    ? Object.entries(patientWahl)
        .map(([k, v]) => {
          const it = items.find((x) => x.key === k)!;
          return v === ABGEWAEHLT ? `${it.where}: ${it.title} nicht gewünscht` : `${it.where}: ${it.options.find((o) => o.id === v)?.name ?? v}`;
        })
        .join(" · ")
    : "";

  const leerHinweis = dental ? LEER_ZAHN : LEER_MEDIZIN;

  async function save(nextStatus?: string, choicesOverride?: Record<string, string>) {
    if (schnell && !existing) {
      if (kuerzel.trim().length < 2) {
        setError("Bitte ein Kürzel mit mindestens 2 Zeichen eingeben.");
        return;
      }
    } else if (!patientId) {
      setError(`Bitte zuerst ${w.einePerson} wählen.`);
      return;
    }
    if (!locked && items.length === 0) {
      setError(leerHinweis);
      return;
    }
    setSaving(true);
    setError(null);
    const wer = schnell && !existing ? { schnell: { kuerzel: kuerzel.trim() } } : { patientId };
    const body = locked ? { status: nextStatus } : { ...wer, input, choices: choicesOverride ?? choices, status: nextStatus ?? status };
    const res = await fetch(existing ? `/api/proposals/${existing.id}` : "/api/proposals", {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    // Übernommene Wahl auch in der Ansicht zeigen, nicht erst nach dem Neuladen.
    if (choicesOverride) setChoices(choicesOverride);
    if (entwurfKey) try { window.sessionStorage.removeItem(entwurfKey); } catch { /* egal */ }
    if (existing) router.refresh();
    // Schnellvorschlag: gleich den QR-Code zeigen, damit der Patient ihn am Stuhl scannen kann.
    else router.push(`${savedHrefPrefix}${data.proposal.id}${schnell ? "?qr=1" : ""}`);
  }

  async function copyLetter() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren nicht möglich. Bitte den Text manuell markieren.");
    }
  }

  const tooth = (n: number, lower: boolean) => {
    const f = teeth[String(n)];
    const base = "aspect-[4/5] w-full border text-xs font-medium tabular-nums transition-colors disabled:cursor-default sm:aspect-[3/4] sm:text-[11px]";
    const shape = lower ? "rounded-b-lg rounded-t" : "rounded-t-lg rounded-b";
    const color =
      f === "fehlt"
        ? "border-dashed border-slate-400 bg-slate-100 text-slate-500"
        : f === "fissur"
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : f
            ? "border-amber-500 bg-amber-50 text-amber-800"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-400";
    return (
      <button
        key={n}
        type="button"
        onClick={() => setSelected(n)}
        aria-pressed={selected === n}
        aria-label={`Zahn ${n}${f ? `, ${FINDINGS[f]}` : ""}`}
        data-aus-modell={modellZaehne.some((m) => m.zahn === n) || undefined}
        className={`${base} ${shape} ${color} ${selected === n ? "ring-2 ring-slate-900 ring-offset-1" : !f && modellZaehne.some((m) => m.zahn === n) ? "ring-2 ring-brand-500" : ""} ${n === 21 || n === 31 ? "ml-1" : ""}`}
      >
        {n}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {locked && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          Dieser Vorschlag ist abgeschlossen ({PROPOSAL_STATUS_LABELS[status]}) und dient als
          Aufklärungsnachweis. Befund und Wahl sind nicht mehr änderbar, nur der Status.
        </p>
      )}

      {entwurf && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-slate-800" data-testid="entwurf-hinweis">
          <span>Es gibt einen angefangenen Vorschlag von {new Date(entwurf.zeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr.</span>
          <button type="button" className="btn-primary !py-1 text-xs" onClick={entwurfUebernehmen} data-testid="entwurf-uebernehmen">Weiterarbeiten</button>
          <button type="button" className="btn-secondary !py-1 text-xs" onClick={entwurfVerwerfen} data-testid="entwurf-verwerfen">Verwerfen</button>
        </div>
      )}
      {!compact && (
        <div className={`flex flex-wrap items-center justify-between gap-3 ${gespraech ? "rounded-xl bg-[#F5F2EE] px-4 py-3" : ""}`}>
          <p className="text-sm text-slate-600">
            {gespraech ? ft("Ansicht für das Gespräch: Praxiszahlen und Eingabefelder sind ausgeblendet.") : ft(`Drehen Sie den Bildschirm ${w.zurPerson}? Dann blendet diese Ansicht alles aus, was nur die Praxis betrifft.`)}
          </p>
          <button type="button" className={gespraech ? "btn-primary" : "btn-secondary"} aria-pressed={gespraech} onClick={() => setGespraech((g) => !g)} data-testid="gespraech-schalter" data-hilfe="vorschlag-gespraech">
            {gespraech ? ft("Zurück zur Praxisansicht") : `${w.person} schaut mit`}
          </button>
        </div>
      )}

      <div className={gespraech ? "grid gap-6" : "grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"} data-gespraech={gespraech ? "an" : "aus"}>
        <fieldset disabled={locked} className={gespraech ? "hidden" : "space-y-6"}>
          <div className="card space-y-4">
            <h2 className="font-medium text-slate-900">{schnell && !existing ? "Ohne Akte" : w.person}</h2>
            {schnell && !existing ? (
              <div>
                <label className="label" htmlFor="proposal-kuerzel">Kürzel</label>
                <input id="proposal-kuerzel" className="input" maxLength={24} value={kuerzel} onChange={(e) => setKuerzel(e.target.value)} data-testid="schnell-kuerzel" />
                <p className="mt-1 text-xs text-slate-500">Bitte keinen Namen und kein Geburtsdatum eintragen. Das Kürzel hilft Ihnen, den Vorschlag wiederzufinden, z. B. Zimmer und Uhrzeit.</p>
              </div>
            ) : (
            <div>
              <label className="label" htmlFor="proposal-patient">{w.person}</label>
              <PatientAuswahl id="proposal-patient" patients={patients} value={patientId} disabled={!!existing} onChange={changePatient} leer="Bitte wählen…" />
            </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="proposal-age">Alter</label>
                <input
                  id="proposal-age"
                  type="number"
                  min={0}
                  max={120}
                  className="input"
                  value={factors.age ?? ""}
                  onChange={(e) => setFactors({ ...factors, age: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label" htmlFor="proposal-insurance">Versicherung</label>
                <select
                  id="proposal-insurance"
                  className="input"
                  value={factors.insurance}
                  onChange={(e) => {
                    const ins = e.target.value as "GKV" | "PKV";
                    setFactors({ ...factors, insurance: ins, erstattungProzent: ins === "PKV" ? 80 : 0 });
                  }}
                >
                  <option value="GKV">Gesetzlich</option>
                  <option value="PKV">Privat</option>
                </select>
              </div>
            </div>
            {dental && factors.insurance === "GKV" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="proposal-bonus">Bonusheft</label>
                  <select
                    id="proposal-bonus"
                    className="input"
                    value={factors.bonusYears}
                    onChange={(e) => setFactors({ ...factors, bonusYears: Number(e.target.value) as 0 | 5 | 10 })}
                  >
                    <option value={0}>kein Bonus</option>
                    {/* Die Sätze hängen am Jahr der Bewilligung (2026: 70/75 %, ab 2027: 60/65 %). */}
                    <option value={5}>5 Jahre ({Math.round(FESTZUSCHUSS_SAETZE[jahr][5] * 100)} %)</option>
                    <option value={10}>10 Jahre ({Math.round(FESTZUSCHUSS_SAETZE[jahr][10] * 100)} %)</option>
                  </select>
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={factors.haertefall}
                    onChange={(e) => setFactors({ ...factors, haertefall: e.target.checked })}
                  />
                  Härtefall
                </label>
              </div>
            )}
            {dental && factors.insurance === "GKV" && (
              <div>
                <label className="label" htmlFor="proposal-zuschussjahr">Bewilligung des HKP durch die Kasse</label>
                <select
                  id="proposal-zuschussjahr"
                  className="input"
                  value={jahr}
                  onChange={(e) => setFactors({ ...factors, zuschussJahr: Number(e.target.value) as ZuschussJahr })}
                >
                  <option value={2026}>bis 31.12.2026 ({festzuschussSaetzeText(2026, "/")})</option>
                  <option value={2027}>ab 1.1.2027 ({festzuschussSaetzeText(2027, "/")})</option>
                </select>
              </div>
            )}
            <div>
              <label className="label" htmlFor="proposal-erstattung">
                {factors.insurance === "GKV" ? "Zusatzversicherung erstattet" : "PKV-Tarif erstattet"}:{" "}
                {factors.erstattungProzent} %
              </label>
              <input
                id="proposal-erstattung"
                type="range"
                min={0}
                max={100}
                step={10}
                className="w-full accent-brand-600"
                value={factors.erstattungProzent}
                onChange={(e) => setFactors({ ...factors, erstattungProzent: Number(e.target.value) })}
              />
            </div>
          </div>

          {!existing && ausModell.length > 0 && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800" data-testid="aus-modell">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Im Modell markiert</p>
              <ul className="mt-2 space-y-1.5">
                {ausModell.map((m) => (
                  <li key={m.name} className="flex flex-wrap items-baseline gap-x-2">
                    {dental && m.zahn != null ? (
                      <button type="button" className="text-left font-medium underline" onClick={() => setSelected(m.zahn!)} data-testid="aus-modell-zahn">{m.name}</button>
                    ) : (
                      <span className="font-medium">{m.name}</span>
                    )}
                    {dental && m.zahn != null && (
                      <span className="text-xs">{teeth[String(m.zahn)] ? `Befund: ${FINDINGS[teeth[String(m.zahn)]!]}` : "noch kein Befund gewählt"}</span>
                    )}
                    {m.notiz && <span className="text-brand-800/80">„{m.notiz}“</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-brand-800/80">
                {dental
                  ? "Zähne mit Befund sind schon im Zahnschema eingetragen. Zähne ohne Befund sind orange umrandet: antippen und den Befund wählen."
                  : ft(`Diese Stellen hat die Praxis im Modell ${w.fuerPerson} markiert. Wählen Sie unten den passenden Anlass.`)}
              </p>
            </div>
          )}

          {!dental && <AnlassStichworte spec={spec} custom={medData.custom ?? []} fach={fach} value={anlaesse} onChange={setAnlaesse} patientId={patientId || null} person={patient ? { geschlecht: patient.geschlecht ?? null, alter: ageFromBirthDate(patient.birthDate) } : undefined} />}

          {!dental && (
            <AnlassPicker spec={spec} custom={medData.custom ?? []} value={anlaesse} onChange={setAnlaesse} person={patient ? { geschlecht: patient.geschlecht ?? null, alter: ageFromBirthDate(patient.birthDate) } : undefined} />
          )}

          {dental && <BefundDiktat onApply={applyDiktat} />}

          {dental && (
          <>

          <div className="card space-y-3">
            <h2 className="font-medium text-slate-900">Zahnschema (FDI)</h2>
            {/* Handy: je Kiefer zwei Reihen (erst die rechte, dann die linke Seite), damit jeder Zahn groß genug zum Antippen ist */}
            <div className="hidden justify-between text-[11px] text-slate-500 sm:flex"><span>rechts</span><span>Oberkiefer</span><span>links</span></div>
            <p className="text-xs text-slate-500 sm:hidden">Oberkiefer: erste Reihe rechte Seite (18–11), zweite Reihe linke Seite (21–28)</p>
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-[repeat(16,minmax(0,1fr))] sm:gap-0.5" data-testid="zahnschema-oben">{UPPER_TEETH.map((n) => tooth(n, false))}</div>
            <p className="pt-1 text-xs text-slate-500 sm:hidden">Unterkiefer: erste Reihe rechte Seite (48–41), zweite Reihe linke Seite (31–38)</p>
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-[repeat(16,minmax(0,1fr))] sm:gap-0.5" data-testid="zahnschema-unten">{LOWER_TEETH.map((n) => tooth(n, true))}</div>
            <div className="hidden justify-between text-[11px] text-slate-500 sm:flex"><span>rechts</span><span>Unterkiefer</span><span>links</span></div>
            <div className="rounded-lg bg-slate-50 p-3">
              <label className="label" htmlFor="proposal-finding">Befund an Zahn {selected}</label>
              <select
                id="proposal-finding"
                className="input"
                value={teeth[String(selected)] ?? ""}
                onChange={(e) => setFinding(selected, e.target.value)}
              >
                <option value="">Kein Befund</option>
                {Object.entries(FINDINGS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card space-y-2">
            <h2 className="mb-1 font-medium text-slate-900">Allgemeiner Befund</h2>
            {!existing && initialGlobals && initialGlobals.length > 0 && (
              <p className="text-xs text-slate-500" data-testid="globals-from-anamnesis">Aus der Anamnese übernommen, bitte prüfen.</p>
            )}
            {(Object.entries(GLOBAL_FINDINGS) as [GlobalCode, string][]).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!!globals[k]}
                  onChange={(e) => setGlobals({ ...globals, [k]: e.target.checked })}
                />
                {l}
              </label>
            ))}
          </div>
          </>
          )}

          {!existing && !compact && (
            <div className="card space-y-3" data-testid="favoriten">
              <h2 className="font-medium text-slate-900">Favoriten</h2>
              {meineFavoriten.length === 0 ? (
                <p className="text-xs text-slate-500">Speichern Sie häufige Kombinationen. Beim nächsten Mal genügt ein Klick.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {meineFavoriten.map((f) => (
                    <li key={f.id} className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-white text-sm">
                      <button type="button" className="px-3 py-1 hover:bg-slate-50" onClick={() => favoritAnwenden(f)} data-testid="favorit-anwenden">{f.name}</button>
                      <button type="button" className="border-l border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50 hover:text-red-700" aria-label={`Favorit ${f.name} löschen`} onClick={() => favoritLoeschen(f.id)}>×</button>
                    </li>
                  ))}
                </ul>
              )}
              {favName === null ? (
                <button type="button" className="btn-secondary !py-1 text-xs" disabled={!hatInhalt} onClick={() => { setFavName(""); setFavMeldung(null); }} data-testid="favorit-neu">Aktuelle Auswahl als Favorit speichern</button>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[10rem] flex-1">
                    <label className="label" htmlFor="favorit-name">Name des Favoriten</label>
                    <input id="favorit-name" className="input" maxLength={60} value={favName} onChange={(e) => setFavName(e.target.value)} placeholder="z. B. Check-up mit Labor" data-testid="favorit-name" />
                  </div>
                  <button type="button" className="btn-primary" onClick={favoritSpeichern} data-testid="favorit-speichern">Speichern</button>
                  <button type="button" className="btn-secondary" onClick={() => setFavName(null)}>Abbrechen</button>
                </div>
              )}
              {favMeldung && <p className="text-xs text-slate-600" role="status" data-testid="favorit-meldung">{favMeldung}</p>}
            </div>
          )}
        </fieldset>

        <div className="min-w-0 space-y-4">
          {gespraech ? (
            <div className="grid gap-3 sm:grid-cols-2" data-testid="gespraech-summen">
              <div className="rounded-2xl bg-salbei-50 px-5 py-4">
                <p className="text-sm text-salbei-800">{factors.insurance === "PKV" ? "Das erstattet Ihre Versicherung voraussichtlich" : "Das übernimmt Ihre Krankenkasse"}</p>
                <p className="mt-1 font-display text-4xl tabular-nums text-slate-900">{formatEuro(Math.max(0, summary.planTotal - summary.netto))}</p>
              </div>
              <div className="rounded-2xl bg-white px-5 py-4 ring-1 ring-slate-200">
                <p className="text-sm text-slate-600">Ihr Eigenanteil bei dieser Auswahl</p>
                <p className="mt-1 font-display text-4xl tabular-nums text-slate-900">{formatEuro(summary.netto)}</p>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4 [&>div]:bg-white">
            {dental ? <Stat label={factors.insurance === "PKV" ? "Nur Basis" : "Nur Kasse"} value={formatEuro(summary.baseTotal)} /> : <Stat label="Anlässe" value={String(items.filter((i) => !i.zusatz).length)} />}
            <Stat label="Gewählter Plan" value={formatEuro(summary.planTotal)} />
            <Stat
              label="Mehrumsatz"
              value={`${delta >= 0 ? "+" : ""}${formatEuro(delta)}`}
              hint={summary.baseTotal ? `+${Math.round((delta / summary.baseTotal) * 100)} % ggü. ${factors.insurance === "PKV" ? "Basis" : "Kasse"}` : undefined}
              accent
            />
            <Stat label={`Eigenanteil ${w.person}`} value={formatEuro(summary.netto)} />
          </div>
          )}

          {zeigeVergleich && jv.betroffen && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-medium text-slate-900">Festzuschuss sinkt zum 1.1.2027</h2>
                {showsJahresvergleich() && !gespraech && (
                  <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                    {tage === 0 ? "Heute letzter Tag" : `Noch ${tage} Tage`} für Bewilligung zu den alten Sätzen
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className={`rounded-lg bg-white p-3 ${jahr === 2026 ? "ring-2 ring-brand-600" : ""}`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bewilligt bis 31.12.2026</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{formatEuro(jv.netto2026)}</p>
                  <p className="text-xs text-slate-500">Festzuschuss nach Befund, {pct(2026)}</p>
                </div>
                <div className={`rounded-lg bg-white p-3 ${jahr === 2027 ? "ring-2 ring-brand-600" : ""}`}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bewilligt ab 1.1.2027</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{formatEuro(jv.netto2027)}</p>
                  <p className="text-xs text-slate-500">Festzuschuss nach Befund, {pct(2027)}{festzuschuss2027Amtlich() ? "" : "; Beträge 2027 voraussichtlich"}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mehrkosten {w.fuerPerson}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-red-700">+{formatEuro(jv.mehrkosten)}</p>
                  <p className="text-xs text-slate-500">bei der gewählten Versorgung</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600">
                Maßgeblich ist das Bewilligungsdatum der Krankenkasse, nicht der Behandlungstermin. Härtefälle
                erhalten weiter den doppelten Festzuschuss.{" "}
                {festzuschuss2027Amtlich()
                  ? "Gerechnet wird mit den Festzuschüssen je Befund ab 1.1.2026 und ab 1.1.2027 (GKV-Spitzenverband)."
                  : "Gerechnet wird mit den Festzuschüssen je Befund ab 1.1.2026 (GKV-Spitzenverband); die Beträge für 2027 sind noch nicht veröffentlicht, die Werte für 2027 deshalb voraussichtlich."}{" "}
                Grundlage der Kürzung: GKV-Beitragssatzstabilisierungsgesetz.
              </p>
            </div>
          )}

          {!compact && !gespraech && <div className="flex gap-1 border-b border-slate-200" role="tablist">
            {(["praxis", "patient"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t ? "border-brand-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                {t === "praxis" ? ft("Praxisansicht") : `Schreiben an ${w.person}`}
              </button>
            ))}
          </div>}

          {tab === "praxis" || gespraech ? (
            items.length === 0 ? (
              <div className="card text-sm text-slate-500">
                {dental ? "Noch kein Befund. Wählen Sie im Zahnschema einen Zahn und setzen Sie einen Befund." : "Noch kein Anlass gewählt. Kreuzen Sie links an, worum es im Gespräch geht."}
              </div>
            ) : (
              items.map((item) => {
                const chosen = chosenOption(item, choices);
                return (
                  <section key={item.key} className={`card space-y-3 p-4 ${gespraech ? "text-base" : ""}`}>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-white">{item.where}</span>
                      <h3 className="font-medium text-slate-900">{item.title}</h3>
                      {item.zusatz && <span className="text-xs text-slate-500" data-testid="zusatz-hinweis">Zusatz zur Kassenleistung, nur auf Wunsch: anklicken, wenn besprochen</span>}
                    </div>
                    {item.options.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {item.options.map((o) => {
                          const m = money(o, factors);
                          const active = chosen?.id === o.id;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              disabled={locked}
                              aria-pressed={active}
                              onClick={() =>
                                // Zusatzleistung: erneutes Anklicken nimmt sie wieder heraus.
                                setChoices(item.zusatz && active ? { ...choices, [item.key]: ABGEWAEHLT } : { ...choices, [item.key]: o.id })
                              }
                              className={`flex flex-col gap-2 rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-default ${active ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
                            >
                              <span className="flex flex-wrap items-center justify-between gap-1">
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${o.type === "kasse" || o.type === "regel" ? "border-green-600 text-green-700" : "border-slate-300 text-slate-500"}`}
                                >
                                  {typeLabelOf(o, factors.insurance)}
                                </span>
                                {o.id === item.recommended && !gespraech && (
                                  <span className="text-[11px] font-semibold text-slate-500">Vorauswahl</span>
                                )}
                              </span>
                              <span className="font-medium text-slate-900">{o.name}</span>
                              <ul className="list-disc pl-4 text-xs text-slate-500">
                                {o.benefits.map((b) => <li key={b}>{b}</li>)}
                              </ul>
                              {o.befunde && factors.insurance === "GKV" && (
                                <span className="text-xs text-green-800" data-testid="festzuschuss-befund">
                                  Festzuschuss Befund {o.befunde.filter((b, i, a) => a.indexOf(b) === i).map((b) => (o.befunde!.filter((x) => x === b).length > 1 ? `${o.befunde!.filter((x) => x === b).length}× ${b}` : b)).join(" + ")}: {m.kasse.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                                </span>
                              )}
                              {o.hinweis && <span className="text-xs text-green-800">{factors.insurance === "PKV" ? "" : "Kasse: "}{o.hinweis}</span>}
                              {o.nutzen && !gespraech && (
                                <span className="text-xs text-amber-800">
                                  {o.nutzenVonPraxis ? ft("Hinweis der Praxis") : "Nutzen"}: {o.nutzen}
                                  <NutzenQuelleLink quelle={o.nutzenQuelle} link={false} />
                                </span>
                              )}
                              <span className={`mt-auto flex justify-between border-t border-dashed border-slate-200 pt-2 text-slate-500 ${gespraech ? "text-sm" : "text-xs"}`}>
                                {gespraech ? "Ihr Eigenanteil" : "Eigenanteil"}
                                <b className="tabular-nums text-slate-900">{formatEuro(m.netto)}</b>
                              </span>
                              {zeigeVergleich && isZahnersatz(o) && (
                                <span className="flex justify-between text-xs text-red-700">
                                  {jahr === 2026 ? "Ab 2027" : "Bis 31.12.2026"}
                                  <span className="tabular-nums">
                                    {formatEuro(money(o, factors, jahr === 2026 ? 2027 : 2026).netto)}
                                  </span>
                                </span>
                              )}
                              {!gespraech && (
                              <span className="flex justify-between text-xs text-slate-500">
                                Volumen <span className="tabular-nums">{formatEuro(m.total)}</span>
                              </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!gespraech && (item.notes.length > 0 || item.excluded.length > 0) && (
                      <ul className="space-y-1 text-sm">
                        {item.notes.map((n) => (
                          <li key={n.text} className={n.kind === "warn" ? "text-amber-800" : "text-slate-700"}>
                            {n.kind === "warn" ? "⚠ " : "• "}
                            {n.text}
                          </li>
                        ))}
                        {item.excluded.map((x) => (
                          <li key={x} className="text-slate-500">○ Nicht vorgeschlagen: {x}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })
            )
          ) : (
            <div className="card space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={copyLetter} className="btn-secondary">
                  {copied ? "Kopiert" : "Text kopieren"}
                </button>
                <span className="text-xs text-slate-500">
                  {ft("Für E-Mail, Patienten-Link oder Ausdruck. Gespeichert wird der Text beim Sichern des Vorschlags.")}
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-800">{letter}</pre>
            </div>
          )}

          {gespraech && <p className="text-sm text-slate-600">{ft("Die Beträge sind Schätzungen. Verbindlich sind der Kostenplan und die Vereinbarung Ihrer Praxis.")}</p>}
          <p className={gespraech ? "hidden" : "text-xs text-slate-500"}>
            {dental
              ? ft("Beträge sind Schätzungen aus der Preisliste Ihrer Praxis (Einstellungen → Vorschlagspreise). Vorausgewählt ist immer die Kassen- bzw. Regelleistung. Was Sie mit Ihrer Patientin oder Ihrem Patienten vormerken, wählen Sie selbst; die fachliche Entscheidung trifft die behandelnde Person. HKP und Mehrkostenvereinbarung erstellen Sie wie gewohnt in Ihrer Praxissoftware.")
              : `Beträge sind Schätzungen nach Ihrer Preisliste (Einstellungen → Fachgebiet und Leistungen). ${bietetKasse(fach) ? "Vorausgewählt ist immer die Kassenleistung. " : ""}Was Sie im Gespräch vormerken, wählen Sie selbst; die fachliche Entscheidung trifft die behandelnde Person. ${isTherapie(spec) ? `Selbstzahlerleistungen vereinbaren Sie ${w.vorAbschluss} schriftlich.` : "Die schriftliche IGeL-Vereinbarung schließen Sie vor der Leistung."}`}
          </p>

          {!compact && !gespraech && patientWahl && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${wahlWeichtAb && !locked ? "border-amber-300 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}
              data-testid="patient-wahl"
            >
              <p className="font-semibold">
                {existing?.patientFirstName ?? w.derPerson} hat {wahlUnterschrieben ? "unterschrieben" : "gewählt"}:
              </p>
              <p className="mt-0.5">{wahlText}</p>
              {!locked && wahlWeichtAb && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-xs">Ihre Planung oben weicht davon ab.</span>
                  <button type="button" className="btn-secondary !py-1 text-xs" onClick={() => setChoices((c) => ({ ...c, ...patientWahl }))} data-testid="wahl-uebernehmen">
                    Wahl {w.desPerson} übernehmen
                  </button>
                </div>
              )}
              {!locked && !wahlWeichtAb && <p className="mt-1 text-xs">Ihre Planung entspricht dieser Wahl.</p>}
              {locked && wahlWeichtAb && <p className="mt-1 text-xs">Festgehalten ist eine andere Wahl. Für die Wahl {w.desPerson} bitte einen neuen Vorschlag anlegen.</p>}
            </div>
          )}

          {!compact && !gespraech && <div className="flex flex-wrap gap-2">
            {!locked && (
              <button type="button" disabled={saving || items.length === 0} title={items.length === 0 ? leerHinweis : undefined} onClick={() => save()} className="btn-primary" data-testid="vorschlag-speichern">
                {saving ? "Speichert…" : existing ? "Änderungen speichern" : "Vorschlag speichern"}
              </button>
            )}
            {existing &&
              (["BESPROCHEN", "ANGENOMMEN", "ABGELEHNT"] as const)
                .filter((s) => s !== status)
                .map((s) =>
                  s === "ANGENOMMEN" && !locked && wahlWeichtAb && patientWahl ? (
                    <span key={s} className="contents">
                      <button type="button" disabled={saving} onClick={() => save(s, { ...choices, ...patientWahl })} className="btn-primary" data-testid="annehmen-patientenwahl">
                        Wahl {w.desPerson} annehmen
                      </button>
                      <button type="button" disabled={saving} onClick={() => save(s)} className="btn-secondary">
                        Mit Ihrer Planung annehmen
                      </button>
                    </span>
                  ) : (
                    <button key={s} type="button" disabled={saving} onClick={() => save(s)} className="btn-secondary">
                      Als „{PROPOSAL_STATUS_LABELS[s]}“ markieren
                    </button>
                  ),
                )}
          </div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${accent ? "text-brand-700" : "text-slate-900"}`}>{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
