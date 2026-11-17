import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { gelenkeFuerFach, kurzArt } from "@/lib/kurzcheck";
import { kurzPaket, kurzUebersetzer } from "@/lib/kurzcheckTexte";
import { PORTAL_LANGS, PORTAL_LANG_NAMES, pickPortalLang } from "@/lib/portalI18n";
import { Kurzcheck } from "@/components/kurzcheck/Kurzcheck";
import { PraxisFuss } from "@/components/PraxisFuss";
import { PraxisBand } from "@/components/PraxisKennung";
import { portalKennung, portalSymbole } from "@/lib/portalKopf";

export async function generateMetadata(props: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const k = await portalKennung((await props.params).token);
  return { title: k ? `Fünf Fragen vor dem Termin · ${k.name}` : "Fünf Fragen vor dem Termin", icons: k ? portalSymbole(k) : undefined, robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

// Patientenlink: Kurz-Fragebogen mit höchstens fünf Fragen, jede mit Bildern zum Antippen.
// „Wo?“ am echten Modell des Fachs (Körper, Zähne, Kopf), in der Sprache des Portals.
export default async function PortalFragenPage(props: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const lang = pickPortalLang(searchParams.lang, (await headers()).get("accept-language"));
  const paket = kurzPaket(lang);
  const { t, dir } = kurzUebersetzer(paket);
  const gefunden = /^[A-Za-z0-9_-]{20,128}$/.test(params.token)
    ? await prisma.patient.findUnique({ where: { portalTokenHash: hashToken(params.token) }, select: { firstName: true, portalExpiresAt: true, practice: { select: { name: true, specialty: true, stammdaten: true } } } })
    : null;
  if (!gefunden || !gefunden.portalExpiresAt || gefunden.portalExpiresAt < new Date()) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-slate-600">
        <h1 className="text-base font-semibold text-slate-900">Link ungültig</h1>
        <p className="mt-2">Dieser Link ist nicht mehr gültig. Bitte fragen Sie in Ihrer Praxis nach einem neuen.</p>
      </main>
    );
  }
  const praxis = gefunden.practice;
  const kennung = await portalKennung(params.token);
  return (
    <main className="min-h-screen bg-[#F5F2EE]" data-testid="portal-fragen" lang={lang} dir={dir}>
      {kennung && <PraxisBand k={kennung} />}
      <div className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:pt-10">
        <p className="text-sm"><Link href={`/portal/${params.token}${lang === "de" ? "" : `?lang=${lang}`}`} className="text-brand-700 hover:underline">{dir === "rtl" ? "→" : "←"} {t("uebersicht")}</Link></p>
        <h1 className="mt-2 font-display text-2xl text-slate-900 sm:text-3xl">{t("seitenTitel")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("seitenUnter", { praxis: praxis.name })}</p>
        <div className="mt-5"><Kurzcheck token={params.token} art={kurzArt(praxis.specialty)} praxis={praxis.name} vorname={gefunden.firstName} paket={paket} gelenkeErlaubt={gelenkeFuerFach(praxis.specialty)} /></div>
        <nav className="mt-8 flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm" aria-label="Sprache" data-testid="fragen-sprachen">
          {PORTAL_LANGS.map((l) => (
            <a key={l} href={`?lang=${l}`} lang={l} aria-current={l === lang ? "true" : undefined} className={l === lang ? "font-semibold text-brand-700 underline" : "text-slate-600 hover:text-brand-700"}>{PORTAL_LANG_NAMES[l]}</a>
          ))}
        </nav>
        <PraxisFuss name={praxis.name} stammdaten={praxis.stammdaten} className="mt-8 border-t border-slate-200 pt-4" />
      </div>
    </main>
  );
}
