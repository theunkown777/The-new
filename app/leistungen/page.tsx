import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import {
  AUSFALLZEITEN,
  BEREICHE,
  INV_LABEL,
  KATALOG,
  KT_LABEL,
  bereichAusSlug,
  filtern,
  navigation,
  slugBereich,
  suchen,
  type KostentraegerCode,
  type Leistung,
  LEISTUNGEN,
} from "@/lib/leistungskatalog";

export const metadata: Metadata = {
  title: "Leistungen von A bis Z – Sorrida",
  description: "Behandlungen und Untersuchungen in Laiensprache: was dahinter steckt, wer sie macht und wer sie bezahlt.",
};

type SP = { q?: string; bereich?: string; kt?: string; inv?: string; ausfall?: string };

const KT_CLS: Record<KostentraegerCode, string> = {
  GKV: "bg-salbei-100 text-salbei-800",
  GKV_EA: "bg-salbei-50 text-salbei-800",
  IND: "bg-amber-50 text-amber-800",
  PKV: "bg-slate-100 text-slate-700",
  SZ: "bg-brand-50 text-brand-700",
};

function Karte({ l }: { l: Leistung }) {
  return (
    <li>
      <Link href={`/leistungen/${l.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300" data-testid="leistung-karte">
        <span className="block font-medium text-slate-900">{l.name}</span>
        <span className="block text-xs text-slate-500">{l.fachbegriff}</span>
        <span className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          <span className={`rounded-full px-2 py-0.5 ${KT_CLS[l.kostentraeger_code]}`}>{KT_LABEL[l.kostentraeger_code]}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{INV_LABEL[l.invasivitaet]}</span>
          {l.ausfallzeit !== "keine" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Ausfall {l.ausfallzeit}</span>}
        </span>
      </Link>
    </li>
  );
}

export default function LeistungenPage({ searchParams }: { searchParams: SP }) {
  const q = (searchParams.q ?? "").slice(0, 80);
  const bereich = searchParams.bereich ? bereichAusSlug(searchParams.bereich) : null;
  const kt = (Object.keys(KT_LABEL) as KostentraegerCode[]).find((k) => k === searchParams.kt) ?? null;
  const inv = (Object.keys(INV_LABEL) as Leistung["invasivitaet"][]).find((k) => k === searchParams.inv) ?? null;
  const ausfall = AUSFALLZEITEN.find((a) => a === searchParams.ausfall) ?? null;
  const filter = { bereich, kt, inv, ausfall };
  const aktiv = !!(q || kt || inv || ausfall);
  const treffer = q ? suchen(q, filter, 100) : filtern(LEISTUNGEN, filter);
  const bereiche = navigation();

  return (
    <PublicShell full>
      <header className="max-w-3xl">
        <h1 className="font-display text-4xl text-slate-900 sm:text-5xl">Leistungen von A bis Z</h1>
        <p className="mt-3 text-slate-600">
          {KATALOG.meta.anzahl} Behandlungen und Untersuchungen in {BEREICHE.length} Bereichen, von der Zahnmedizin über die Ästhetik bis zur Pflege, in
          einfachen Worten: was dahinter steckt, wer sie macht und wer sie bezahlt. Kosten und Kassenleistung richten sich nach dem Einzelfall.
        </p>
      </header>

      <form action="/leistungen" className="mt-6 rounded-2xl border border-slate-200 bg-white p-4" role="search" data-testid="leistung-suche">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="q"
            defaultValue={q}
            placeholder="Was suchen Sie? z. B. dritte Zähne, Kreuzbandriss, Hollywood-Lächeln"
            aria-label="Leistung suchen"
            className="input flex-1 py-2.5 text-base"
          />
          <button className="btn-primary py-2.5">Suchen</button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select name="bereich" defaultValue={searchParams.bereich ?? ""} className="input" aria-label="Bereich">
            <option value="">Alle Bereiche</option>
            {BEREICHE.map((b) => (
              <option key={b} value={slugBereich(b)}>
                {b}
              </option>
            ))}
          </select>
          <select name="kt" defaultValue={kt ?? ""} className="input" aria-label="Wer bezahlt">
            <option value="">Wer bezahlt: alle</option>
            {(Object.keys(KT_LABEL) as KostentraegerCode[]).map((k) => (
              <option key={k} value={k}>
                {KT_LABEL[k]}
              </option>
            ))}
          </select>
          <select name="inv" defaultValue={inv ?? ""} className="input" aria-label="Eingriff">
            <option value="">Eingriff: alle</option>
            {(Object.keys(INV_LABEL) as Leistung["invasivitaet"][]).map((k) => (
              <option key={k} value={k}>
                {INV_LABEL[k]}
              </option>
            ))}
          </select>
          <select name="ausfall" defaultValue={ausfall ?? ""} className="input" aria-label="Ausfallzeit">
            <option value="">Ausfallzeit: alle</option>
            {AUSFALLZEITEN.map((a) => (
              <option key={a} value={a}>
                Ausfall: {a}
              </option>
            ))}
          </select>
        </div>
        {(aktiv || bereich) && (
          <p className="mt-2 text-sm">
            <Link href="/leistungen" className="text-brand-700 underline">
              Suche und Filter zurücksetzen
            </Link>
          </p>
        )}
      </form>

      {aktiv ? (
        <section className="mt-8" aria-live="polite">
          <h2 className="text-sm text-slate-500" data-testid="trefferzahl">
            {treffer.length === 0 ? "Keine passende Leistung gefunden." : `${treffer.length} ${treffer.length === 1 ? "Leistung" : "Leistungen"}`}
            {q && ` zu „${q}“`}
            {bereich && ` in ${bereich}`}
          </h2>
          {treffer.length === 0 && <p className="mt-2 text-sm text-slate-600">Tipp: ein anderes Wort versuchen, etwa den Körperteil oder die Beschwerde.</p>}
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {treffer.map((l) => (
              <Karte key={l.id} l={l} />
            ))}
          </ul>
        </section>
      ) : bereich ? (
        <section className="mt-8" data-testid="bereich-ansicht">
          <p className="text-sm">
            <Link href="/leistungen" className="text-brand-700 underline">Alle Bereiche</Link> → {bereich}
          </p>
          <h2 className="mt-2 font-display text-3xl text-slate-900">{bereich}</h2>
          {bereiche
            .find((b) => b.bereich === bereich)!
            .kategorien.map((k) => (
              <div key={k.kategorie} className="mt-6">
                <h3 className="mb-2 text-sm font-medium text-slate-500">{k.kategorie}</h3>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {k.leistungen.map((l) => (
                    <Karte key={l.id} l={l} />
                  ))}
                </ul>
              </div>
            ))}
        </section>
      ) : (
        <section className="mt-8" aria-labelledby="bereiche">
          <h2 id="bereiche" className="font-display text-2xl text-slate-900">Nach Bereich</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="bereiche">
            {bereiche.map((b) => (
              <li key={b.bereich}>
                <Link href={`/leistungen?bereich=${slugBereich(b.bereich)}`} className="block h-full rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300">
                  <span className="block font-medium text-slate-900">{b.bereich}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {b.kategorien.reduce((n, k) => n + k.leistungen.length, 0)} Leistungen · {b.kategorien.map((k) => k.kategorie).join(", ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PublicShell>
  );
}
