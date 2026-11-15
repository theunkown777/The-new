import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePrices } from "@/lib/proposals";
import { ProposalEditor } from "@/components/ProposalEditor";
import { resolveMed } from "@/lib/practiceMed";
import { favoritenLesen } from "@/lib/favoriten";
import { kuerzelVorschlag } from "@/lib/ohneAkte";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schnellvorschlag ohne Akte" };

// Schnellvorschlag: Vorschlag ohne Stammdaten. Die Praxis gibt nur ein Kürzel ein, der Patient scannt
// den QR-Code am Stuhl. Gedacht für den ersten Tag mit Sorrida und für Praxen ohne Anbindung.
export default async function SchnellPage() {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const now = new Date();
  const tagBeginn = new Date(now.getTime() - 24 * 3600e3);
  const [practice, schonHeute] = await Promise.all([
    prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, proposalPrices: true, specialty: true, medPrices: true, customOffers: true, vorschlagFavoriten: true } }),
    prisma.patient.count({ where: { practiceId, ohneAkte: true, createdAt: { gte: tagBeginn } } }),
  ]);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl text-slate-900">Schnellvorschlag ohne Akte</h1>
        <Link href="/proposals/new" className="text-sm text-brand-700 underline">Vorschlag für einen Patienten aus der Liste</Link>
      </div>
      <p className="mb-6 max-w-3xl text-sm text-slate-600" data-testid="schnell-erklaerung">
        Sie brauchen weder Namen noch Geburtsdatum. Geben Sie ein Kürzel ein, wählen Sie aus, worum es geht, und speichern Sie. Danach erscheint ein QR-Code,
        den Ihre Patientin oder Ihr Patient mit dem Handy scannt. Unterschrift und Lastschrift sind ohne Akte nicht möglich; dafür legen Sie später aus dem Kürzel eine Akte an.
      </p>
      <ProposalEditor
        patients={[]}
        prices={resolvePrices(practice?.proposalPrices)}
        practiceName={practice?.name ?? "Ihre Praxis"}
        schnell={{ vorschlag: kuerzelVorschlag(now, schonHeute) }}
        favoriten={favoritenLesen(practice?.vorschlagFavoriten)}
        {...resolveMed(practice ?? {})}
      />
    </div>
  );
}
