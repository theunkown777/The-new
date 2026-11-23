import type { Metadata } from "next";
import { PortalUngueltig } from "@/components/PortalUngueltig";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { PortalTermin } from "@/components/PortalTermin";
import { PraxisFuss } from "@/components/PraxisFuss";
import { PraxisBand } from "@/components/PraxisKennung";
import { portalKennung, portalSymbole } from "@/lib/portalKopf";

export async function generateMetadata(props: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const k = await portalKennung((await props.params).token);
  return { title: k ? `Termin buchen · ${k.name}` : "Termin buchen", icons: k ? portalSymbole(k) : undefined, robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

// Patientenportal: Termin online buchen. Zugang nur über den geheimen Patientenlink.
export default async function PortalTerminPage(props: { params: Promise<{ token: string }>; searchParams: Promise<{ anlass?: string }> }) {
  const params = await props.params;
  const anlassVor = ((await props.searchParams).anlass ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const gefunden = /^[A-Za-z0-9_-]{20,128}$/.test(params.token)
    ? await prisma.patient.findUnique({ where: { portalTokenHash: hashToken(params.token) }, select: { portalExpiresAt: true, practice: { select: { name: true, stammdaten: true, specialty: true, buchungAktiv: true } } } })
    : null;
  if (!gefunden || !gefunden.portalExpiresAt || gefunden.portalExpiresAt < new Date()) {
    return <PortalUngueltig token={params.token} fach={gefunden?.practice.specialty} />;
  }
  const kennung = await portalKennung(params.token);
  return (
    <main className="min-h-screen bg-[#F5F2EE]">
      {kennung && <PraxisBand k={kennung} />}
      <div className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:pt-10">
        <p className="text-sm"><Link href={`/portal/${params.token}`} className="ziel min-h-[44px] text-brand-700 hover:underline">← Zurück zur Übersicht</Link></p>
        <h1 className="mt-2 font-display text-2xl text-slate-900 sm:text-3xl">{gefunden.practice.buchungAktiv ? "Termin buchen" : "Ihre Termine"}</h1>
        {!kennung && <p className="mt-1 text-sm text-slate-600">{gefunden.practice.name}</p>}
        <div className="mt-5"><PortalTermin token={params.token} praxis={gefunden.practice.name} anlassVor={anlassVor} fach={gefunden.practice.specialty} buchbar={gefunden.practice.buchungAktiv} /></div>
        <PraxisFuss name={gefunden.practice.name} stammdaten={gefunden.practice.stammdaten} fach={gefunden.practice.specialty} className="mt-8 border-t border-slate-200 pt-4" />
      </div>
    </main>
  );
}
