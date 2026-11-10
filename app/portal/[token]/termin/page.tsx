import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { PortalTermin } from "@/components/PortalTermin";

export const metadata: Metadata = { title: "Termin buchen", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Patientenportal: Termin online buchen. Zugang nur über den geheimen Patientenlink.
export default async function PortalTerminPage({ params }: { params: { token: string } }) {
  const gefunden = /^[A-Za-z0-9_-]{20,128}$/.test(params.token)
    ? await prisma.patient.findUnique({ where: { portalTokenHash: hashToken(params.token) }, select: { portalExpiresAt: true, practice: { select: { name: true } } } })
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
    <main className="min-h-screen bg-[#F5F2EE]">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:pt-10">
        <p className="text-sm"><Link href={`/portal/${params.token}`} className="text-brand-700 hover:underline">← Zurück zur Übersicht</Link></p>
        <h1 className="mt-2 font-display text-2xl text-slate-900 sm:text-3xl">Termin buchen</h1>
        <p className="mt-1 text-sm text-slate-600">{gefunden.practice.name}</p>
        <div className="mt-5"><PortalTermin token={params.token} praxis={gefunden.practice.name} /></div>
      </div>
    </main>
  );
}
