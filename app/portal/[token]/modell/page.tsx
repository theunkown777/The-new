import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { headers } from "next/headers";
import { ModellWahl } from "@/components/modelle/ModellWahl";
import { PORTAL_LANGS, PORTAL_LANG_NAMES, pickPortalLang } from "@/lib/portalI18n";
import { modellTexte } from "@/lib/modelle/i18n/laden";
import { MODELL_SPRACHEN_FERTIG, uebersetze } from "@/lib/modelle/i18n/schluessel";
import { PraxisFuss } from "@/components/PraxisFuss";
import { PraxisBand } from "@/components/PraxisKennung";
import { portalKennung, portalSymbole } from "@/lib/portalKopf";

export async function generateMetadata(props: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const k = await portalKennung((await props.params).token);
  return { title: k ? `Ihr Modell · ${k.name}` : "Ihr Modell", icons: k ? portalSymbole(k) : undefined, robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

// Patientenansicht des Modells: Der Patient sieht die Stellen, die seine Praxis markiert hat,
// mit Hinweis und allgemeiner Erklärung. Zugang nur über den geheimen Patientenlink.
export default async function PortalModellPage(props: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const lang = pickPortalLang(searchParams.lang, (await headers()).get("accept-language"));
  const texte = await modellTexte(lang);
  const t = (de: string, werte?: Record<string, string | number>) => uebersetze(texte, de, werte);
  const gueltig = /^[A-Za-z0-9_-]{20,128}$/.test(params.token);
  const gefunden = gueltig ? await prisma.patient.findUnique({
    where: { portalTokenHash: hashToken(params.token) },
    select: { firstName: true, geschlecht: true, portalExpiresAt: true, practice: { select: { name: true, specialty: true, stammdaten: true } }, modellMarkierungen: { select: { modell: true, teil: true, notiz: true }, orderBy: { createdAt: "asc" } } },
  }) : null;
  const patient = gefunden && gefunden.portalExpiresAt && gefunden.portalExpiresAt > new Date() ? gefunden : null;
  if (!patient) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-slate-600">
        <h1 className="text-base font-semibold text-slate-900">{t("Link ungültig")}</h1>
        <p className="mt-2">{t("Dieser Link ist nicht mehr gültig. Bitte fragen Sie in Ihrer Praxis nach einem neuen.")}</p>
      </main>
    );
  }
  const marken = patient.modellMarkierungen;
  const kennung = await portalKennung(params.token);
  return (
    <main className="min-h-screen bg-[#F5F2EE]" lang={lang} data-testid="portal-modell">
      {kennung && <PraxisBand k={kennung} breite="max-w-5xl" />}
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-10">
        <p className="text-sm"><Link href={`/portal/${params.token}${lang === "de" ? "" : `?lang=${lang}`}`} className="text-brand-700 hover:underline">← {t("Zurück zur Übersicht")}</Link></p>
        <h1 className="mt-2 font-display text-2xl text-slate-900 sm:text-3xl">{t("Im Modell ansehen")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {marken.length === 0
            ? t("Tippen Sie auf eine Stelle, um die Erklärung zu lesen. Ihre Praxis kann hier Stellen für Sie markieren.")
            : marken.length === 1
              ? t("{praxis} hat eine Stelle für Sie markiert (orange). Tippen Sie darauf, um den Hinweis und die Erklärung zu lesen.", { praxis: patient.practice.name })
              : t("{praxis} hat {n} Stellen für Sie markiert (orange). Tippen Sie darauf, um den Hinweis und die Erklärung zu lesen.", { praxis: patient.practice.name, n: marken.length })}
        </p>
        {texte && (
          <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200" data-testid="modell-uebersetzt">
            {t("Die Erklärungen wurden automatisch übersetzt. Maßgeblich ist der deutsche Text. Hinweise Ihrer Praxis stehen in der Sprache, in der die Praxis sie geschrieben hat.")}
          </p>
        )}
        <div className="mt-5"><ModellWahl fach={patient.practice.specialty} markierungen={marken} geschlecht={patient.geschlecht === "M" ? "M" : patient.geschlecht === "W" ? "W" : null} texte={texte} /></div>
        <nav className="mt-8 flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm" aria-label="Sprache" data-testid="modell-sprachen">
          {PORTAL_LANGS.filter((l) => l === "de" || (MODELL_SPRACHEN_FERTIG as readonly string[]).includes(l)).map((l) => (
            <a key={l} href={`?lang=${l}`} lang={l} aria-current={l === lang ? "true" : undefined} className={l === lang ? "font-semibold text-brand-700 underline" : "text-slate-600 hover:text-brand-700"}>{PORTAL_LANG_NAMES[l]}</a>
          ))}
        </nav>
        <PraxisFuss name={patient.practice.name} stammdaten={patient.practice.stammdaten} className="mt-8 border-t border-slate-200 pt-4" />
      </div>
    </main>
  );
}
