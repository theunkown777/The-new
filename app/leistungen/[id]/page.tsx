import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PublicShell } from "@/components/PublicShell";
import { INV_LABEL, KT_LABEL, LEISTUNGEN, kostenHinweis, leistung, slugBereich, vorherNachherErlaubt } from "@/lib/leistungskatalog";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const l = leistung(params.id);
  if (!l) return {};
  return { title: `${l.name} (${l.fachbegriff}) – Sorrida`, description: `${l.beschreibung} ${kostenHinweis(l)}` };
}

const HWG_TEXT = {
  ja: "Vorher-Nachher-Bilder dürfen für diese Leistung nicht gezeigt werden (§ 11 HWG, BGH I ZR 170/24). Sorrida blendet sie aus.",
  prüfen: "Vorher-Nachher-Bilder nur nach Prüfung und Freigabe durch einen Admin der Praxis.",
  nein: "Keine Einschränkung für Vorher-Nachher-Bilder aus dem Katalog.",
} as const;

export default async function LeistungPage({ params }: { params: { id: string } }) {
  const l = leistung(params.id);
  if (!l) notFound();
  // Gebührenordnung und HWG-Status nur für angemeldete Admins, nicht für Endkunden.
  const session = await getServerSession(authOptions).catch(() => null);
  const admin = session?.user.role === "admin";
  const verwandt = LEISTUNGEN.filter((x) => x.kategorie === l.kategorie && x.bereich === l.bereich && x.id !== l.id).slice(0, 6);
  const angaben: [string, string][] = [
    ["Wer behandelt", l.behandler],
    ["Wer bezahlt", `${kostenHinweis(l)}`],
    ["Eingriff", INV_LABEL[l.invasivitaet]],
    ["Ausfallzeit", l.ausfallzeit === "keine" ? "keine" : `${l.ausfallzeit} (grobe Orientierung, im Einzelfall verschieden)`],
  ];

  return (
    <PublicShell full>
      <nav className="text-sm text-slate-500" aria-label="Brotkrumen">
        <Link href="/leistungen" className="text-brand-700 underline">Leistungen</Link> →{" "}
        <Link href={`/leistungen?bereich=${slugBereich(l.bereich)}`} className="text-brand-700 underline">{l.bereich}</Link> → {l.kategorie}
      </nav>
      <article className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr]" data-testid="leistung-detail">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="font-display text-4xl text-slate-900">{l.name}</h1>
          <p className="mt-1 text-slate-500">{l.fachbegriff}</p>
          <p className="mt-4 text-lg text-slate-800">{l.beschreibung}</p>
          <dl className="mt-6 divide-y divide-slate-100 border-y border-slate-100">
            {angaben.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
                <dt className="text-sm text-slate-500">{k}</dt>
                <dd className="text-slate-900" data-testid={k === "Wer bezahlt" ? "kosten" : undefined}>{v}</dd>
              </div>
            ))}
          </dl>
          {l.hinweis && <p className="mt-4 rounded-lg bg-salbei-50 px-3 py-2 text-sm text-salbei-800">Hinweis: {l.hinweis}</p>}
          {l.synonyme.length > 0 && <p className="mt-4 text-sm text-slate-500">Auch gesucht als: {l.synonyme.join(", ")}</p>}
          <p className="mt-6 text-xs text-slate-500">
            Allgemeine Information, ersetzt keine Beratung. Ob und wie behandelt wird und was es kostet, klärt Ihre Praxis mit Ihnen.
          </p>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Kostenträger</p>
            <p className="mt-1 font-medium text-slate-900">{KT_LABEL[l.kostentraeger_code]}</p>
            <p className="text-sm text-slate-600">{l.kostentraeger}</p>
          </div>
          {admin && (
            <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-5 text-sm" data-testid="nur-admin">
              <p className="text-xs font-medium text-brand-700">Nur für Admins sichtbar</p>
              <p className="mt-1 text-slate-800">Gebührenordnung: {l.gebuehrenordnung}</p>
              <p className="mt-1 text-slate-800">{HWG_TEXT[l.hwg_vorher_nachher]}</p>
              <p className="mt-1 text-slate-500">Galerie erlaubt ohne Freigabe: {vorherNachherErlaubt(l) ? "ja" : "nein"}</p>
            </div>
          )}
          {verwandt.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-700">Ebenfalls unter „{l.kategorie}“</p>
              <ul className="mt-2 space-y-1 text-sm">
                {verwandt.map((v) => (
                  <li key={v.id}>
                    <Link href={`/leistungen/${v.id}`} className="text-brand-700 hover:underline">
                      {v.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </article>
    </PublicShell>
  );
}
