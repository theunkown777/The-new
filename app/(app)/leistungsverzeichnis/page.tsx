import Link from "next/link";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { praxisFach } from "@/lib/katalogScope";
import { SPECIALTY_LABELS } from "@/lib/specialties";
import { katalogEintrag, SYSTEM_KURZ, SYSTEM_TITEL } from "@/lib/amtlich/katalog";
import { LeistungUebernehmen } from "@/components/LeistungUebernehmen";
import { LeistungenImport } from "@/components/LeistungenImport";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leistungsverzeichnis" };

const SEITE = 60;
/** Orientierungswert EBM 2026 in Cent je Punkt (bundeseinheitlich, ohne regionale Zuschläge). */
const EBM_ORIENTIERUNGSWERT = 12.7404;

const euro = (c: number) => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export default async function LeistungsverzeichnisPage({ searchParams }: { searchParams: { q?: string; system?: string; kapitel?: string; seite?: string; alle?: string } }) {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const admin = session!.user.role === "admin";
  const fach = (await praxisFach(practiceId)) || "zahn";
  const alle = searchParams.alle === "1";
  const q = (searchParams.q ?? "").trim().slice(0, 80);
  const seite = Math.max(1, Number(searchParams.seite) || 1);

  const basis: Prisma.AmtlicheLeistungWhereInput = alle ? {} : { faecher: { has: fach } };
  const proSystem = await prisma.amtlicheLeistung.groupBy({ by: ["system"], where: basis, _count: true, orderBy: { system: "asc" } });
  const system = searchParams.system && proSystem.some((s) => s.system === searchParams.system) ? searchParams.system : null;
  const kapitelListe = system
    ? await prisma.amtlicheLeistung.groupBy({ by: ["kapitel"], where: { ...basis, system }, _count: true, orderBy: { kapitel: "asc" } })
    : [];
  const kapitel = searchParams.kapitel && kapitelListe.some((k) => k.kapitel === searchParams.kapitel) ? searchParams.kapitel : null;
  const worte = q.split(/\s+/).filter(Boolean);
  const where: Prisma.AmtlicheLeistungWhereInput = {
    ...basis,
    ...(system ? { system } : {}),
    ...(kapitel ? { kapitel } : {}),
    AND: worte.map((w) => ({ OR: [{ text: { contains: w, mode: "insensitive" as const } }, { code: { startsWith: w, mode: "insensitive" as const } }, { hinweis: { contains: w, mode: "insensitive" as const } }] })),
  };
  // Exakte Ziffer (z. B. "03000", "Ä 1", "X0501") immer zuerst
  const exakt = q && seite === 1 ? await prisma.amtlicheLeistung.findMany({ where: { ...basis, ...(system ? { system } : {}), code: { equals: q, mode: "insensitive" } } }) : [];
  const [gesamt, rest, imKatalog] = await Promise.all([
    prisma.amtlicheLeistung.count({ where }),
    prisma.amtlicheLeistung.findMany({ where: { ...where, id: { notIn: exakt.map((e) => e.id) } }, orderBy: [{ system: "asc" }, { code: "asc" }], skip: (seite - 1) * SEITE, take: SEITE - exakt.length }),
    prisma.serviceCatalogItem.findMany({ where: { practiceId }, select: { system: true, code: true } }),
  ]);
  const treffer = [...exakt, ...rest];
  const katalogCodes = new Set(imKatalog.map((k) => `${k.system}|${k.code}`));
  const summe = proSystem.reduce((a, s) => a + s._count, 0);
  const link = (p: Record<string, string | null | undefined>) => {
    const u = new URLSearchParams();
    const alt = { q, system, kapitel, alle: alle ? "1" : null, ...p };
    for (const [k, v] of Object.entries(alt)) if (v) u.set(k, String(v));
    return `/leistungsverzeichnis?${u}`;
  };

  return (
    <div className="space-y-5" data-testid="leistungsverzeichnis">
      <div>
        <h1 className="font-display text-3xl text-slate-900">Leistungsverzeichnis</h1>
        <p className="mt-1 text-sm text-slate-600">
          Alle amtlichen Leistungen, die {alle ? "irgendein Fach" : SPECIALTY_LABELS[fach] ?? "Ihr Fach"} erbringen und abrechnen kann:{" "}
          <b className="tabular-nums">{summe.toLocaleString("de-DE")}</b> Positionen aus {proSystem.length} Verzeichnissen. Übernehmen Sie, was Ihre Praxis anbietet, in
          Ihren Abrechnungskatalog.
        </p>
        <p className="mt-1 text-xs">
          <Link href={link({ alle: alle ? null : "1", system: null, kapitel: null, seite: null })} className="text-brand-700 underline">
            {alle ? "Nur mein Fach anzeigen" : "Alle Fächer anzeigen"}
          </Link>
        </p>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="systeme">
        <Link href={link({ system: null, kapitel: null, seite: null })} className={`rounded-full px-3 py-1 text-sm ${!system ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
          Alle ({summe.toLocaleString("de-DE")})
        </Link>
        {proSystem.map((s) => (
          <Link key={s.system} href={link({ system: s.system, kapitel: null, seite: null })} className={`rounded-full px-3 py-1 text-sm ${system === s.system ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
            {SYSTEM_TITEL[s.system] ?? s.system} ({s._count.toLocaleString("de-DE")})
          </Link>
        ))}
      </div>

      <form action="/leistungsverzeichnis" className="flex flex-wrap gap-2">
        {system && <input type="hidden" name="system" value={system} />}
        {alle && <input type="hidden" name="alle" value="1" />}
        <input name="q" defaultValue={q} placeholder="Suchen: Text oder Ziffer, z. B. Sonographie, 03000, Krone" className="input max-w-md flex-1" aria-label="Leistung suchen" />
        {kapitelListe.length > 1 && (
          <select name="kapitel" defaultValue={kapitel ?? ""} className="input w-auto max-w-xs" aria-label="Kapitel">
            <option value="">Alle Kapitel</option>
            {kapitelListe.map((k) => (
              <option key={k.kapitel ?? "-"} value={k.kapitel ?? ""}>
                {(k.kapitel ?? "ohne Kapitel").slice(0, 70)} ({k._count})
              </option>
            ))}
          </select>
        )}
        <button className="btn-primary">Suchen</button>
      </form>

      <section className="card p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 text-sm text-slate-600">
          <span data-testid="treffer">
            {gesamt.toLocaleString("de-DE")} Treffer{gesamt > SEITE ? ` · Seite ${seite} von ${Math.ceil(gesamt / SEITE)}` : ""}
          </span>
          {admin && treffer.length > 0 && <LeistungUebernehmen ids={treffer.map((t) => t.id)} label={`Diese ${treffer.length} übernehmen`} klein={false} />}
        </div>
        <ul className="divide-y divide-slate-100">
          {treffer.map((t) => {
            const betrag = t.euroCent ?? (t.system === "EBM" && t.punkte ? Math.round(t.punkte * EBM_ORIENTIERUNGSWERT) : null);
            return (
              <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm" data-testid="amtliche-leistung">
                <div className="min-w-0 flex-1">
                  <p className="text-slate-900">
                    <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {SYSTEM_KURZ[t.system] ?? t.system} {t.code}
                    </span>
                    {t.text}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t.kapitel}
                    {t.hinweis && <span title={t.hinweis}> · {t.hinweis.slice(0, 140)}{t.hinweis.length > 140 ? " …" : ""}</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {t.punkte != null && <p className="tabular-nums text-slate-700">{t.punkte.toLocaleString("de-DE")} Punkte</p>}
                  {betrag != null && (
                    <p className="text-xs tabular-nums text-slate-500">
                      {t.system === "EBM" && t.euroCent == null ? "≈ " : ""}
                      {euro(betrag)}
                      {t.system === "GOAE" || t.system === "GOZ" ? " (1,0-fach)" : ""}
                    </p>
                  )}
                  {admin && (katalogCodes.has(`${katalogEintrag(t).system}|${katalogEintrag(t).code}`) ? <p className="text-xs text-salbei-700">im Katalog</p> : <LeistungUebernehmen ids={[t.id]} />)}
                </div>
              </li>
            );
          })}
        </ul>
        {gesamt > SEITE && (
          <div className="flex justify-between border-t border-slate-100 px-5 py-3 text-sm">
            {seite > 1 ? <Link href={link({ seite: String(seite - 1) })} className="text-brand-700 underline">← zurück</Link> : <span />}
            {seite * SEITE < gesamt && <Link href={link({ seite: String(seite + 1) })} className="text-brand-700 underline">weiter →</Link>}
          </div>
        )}
      </section>
      {admin && <LeistungenImport />}
      <p className="text-xs text-slate-500">
        Quellen: GOÄ, GOZ, SGB XI und BBhV (gesetze-im-internet.de), EBM (KBV-Stammdatei nach Lizenzvereinbarung der KBV), BEMA (KZBV), Heilmittel und Hebammenhilfe
        (Verträge des GKV-Spitzenverbands), Häusliche Krankenpflege (G-BA-Richtlinie), Hilfsmittelverzeichnis (GKV-Spitzenverband), UV-GOÄ (DGUV, Stand 01.07.2026, Betrag für die allgemeine Heilbehandlung). EBM-Beträge mit dem Orientierungswert
        2026 ({EBM_ORIENTIERUNGSWERT.toLocaleString("de-DE")} Cent je Punkt) ohne regionale Zuschläge; BEMA-Punkte mit dem Punktwert Ihrer KZV. Keine Abrechnungsberatung. OPS: Herausgegeben vom Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) im Auftrag des
        Bundesministeriums für Gesundheit (BMG). Die Erstellung erfolgt unter Verwendung der maschinenlesbaren Fassung des BfArM.
      </p>
    </div>
  );
}
