import Link from "next/link";
import { getServerSession } from "next-auth";
import { nurMitEinstellungen } from "@/lib/permissions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveMed } from "@/lib/practiceMed";
import { isDental, specialty } from "@/lib/specialties";
import { PRICE_DEFS, resolvePrices } from "@/lib/proposals";
import { kiHilfenStand } from "@/lib/kiHilfen";
import { PreislisteEinlesen, type PreislisteZiel } from "@/components/PreislisteEinlesen";

export const metadata = { title: "Preisliste einlesen" };

export default async function PreislistePage() {
  await nurMitEinstellungen();
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { specialty: true, medPrices: true, customOffers: true, proposalPrices: true, kiHilfen: true },
  });
  const { fach, med } = resolveMed(practice ?? {});
  const dental = isDental(fach);
  const spec = specialty(fach);
  const vorschlagspreise = resolvePrices(practice?.proposalPrices);

  // Vorhandene Leistungen, denen eine Zeile zugeordnet werden kann. Alles nur aus der eigenen Praxis.
  const ziele: PreislisteZiel[] = dental
    ? [
        ...PRICE_DEFS.map((d) => ({ id: `vorschlag:${d.key}`, art: "vorschlag" as const, name: d.label, preisCent: Math.round(vorschlagspreise[d.key] * 100) })),
        ...(await prisma.serviceCatalogItem.findMany({ where: { practiceId }, select: { id: true, title: true, code: true, festbetragCent: true }, orderBy: { title: "asc" }, take: 300 })).map((k) => ({
          id: `katalog:${k.id}`,
          art: "katalog" as const,
          name: k.title,
          preisCent: k.festbetragCent,
        })),
      ]
    : [
        ...(spec?.anlaesse ?? []).flatMap((a) => a.options.map((o) => ({ id: `leistung:${o.id}`, art: "leistung" as const, name: o.name, preisCent: Math.round((med.prices?.[o.id] ?? o.price) * 100) }))),
        ...(med.custom ?? []).map((c) => ({ id: `eigen:${c.id}`, art: "eigen" as const, name: c.name, preisCent: Math.round(c.price * 100) })),
      ];

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-2 text-sm">
        <Link href="/settings/fachgebiet" className="text-brand-700 underline">← Fachgebiet und Leistungen</Link>
      </p>
      <h1 className="mb-2 font-display text-3xl text-slate-900">Preisliste einlesen</h1>
      <p className="mb-6 text-sm text-slate-500">
        Fügen Sie Ihre Preisliste als Text ein oder wählen Sie eine Text- oder CSV-Datei. Sorrida liest Zeilen mit Leistung und Betrag und ordnet sie Ihren
        vorhandenen Leistungen zu. Gespeichert wird erst, was Sie in der Vorschau bestätigen.
      </p>
      <PreislisteEinlesen
        dental={dental}
        readOnly={session!.user.role !== "admin"}
        ziele={ziele}
        ki={kiHilfenStand(practice?.kiHilfen)}
        start={{ specialty: fach, medPrices: med.prices ?? {}, customOffers: med.custom ?? [], vorschlagspreise }}
      />
    </div>
  );
}
