import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { kurzArt } from "@/lib/kurzcheck";
import { Kurzcheck } from "@/components/kurzcheck/Kurzcheck";
import { PraxisFuss } from "@/components/PraxisFuss";

export const metadata: Metadata = { title: "Fünf Fragen vor dem Termin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Patientenlink: Kurz-Fragebogen mit höchstens fünf Fragen, jede mit Bildern zum Antippen.
export default async function PortalFragenPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
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
  return (
    <main className="min-h-screen bg-[#F5F2EE]" data-testid="portal-fragen">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:pt-10">
        <p className="text-sm"><Link href={`/portal/${params.token}`} className="text-brand-700 hover:underline">← Zurück zur Übersicht</Link></p>
        <h1 className="mt-2 font-display text-2xl text-slate-900 sm:text-3xl">Fünf Fragen vor dem Termin</h1>
        <p className="mt-1 text-sm text-slate-600">Dauert etwa eine Minute. So weiß {gefunden.practice.name} schon vorher, worum es geht.</p>
        <div className="mt-5"><Kurzcheck token={params.token} art={kurzArt(gefunden.practice.specialty)} praxis={gefunden.practice.name} vorname={gefunden.firstName} /></div>
        <PraxisFuss name={gefunden.practice.name} stammdaten={gefunden.practice.stammdaten} className="mt-8 border-t border-slate-200 pt-4" />
      </div>
    </main>
  );
}
