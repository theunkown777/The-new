import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BuchungSettings } from "@/components/BuchungSettings";
import { buchungsLage } from "@/lib/buchungLoad";
import { freieZeiten, tagName, uhr } from "@/lib/buchung";

export const dynamic = "force-dynamic";

export default async function TermineOnlinePage() {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const lage = await buchungsLage(practiceId);
  const [abo, datei, feed] = await Promise.all([
    prisma.kalenderBelegung.count({ where: { practiceId, quelle: "abo" } }),
    prisma.kalenderBelegung.count({ where: { practiceId, quelle: "datei" } }),
    prisma.practice.findUnique({ where: { id: practiceId }, select: { kalenderFeedHash: true } }),
  ]);
  const p = lage!.praxis;
  const tage = p.buchungAktiv ? lage!.tage : freieZeiten(lage!.eingabe);
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm"><Link href="/settings" className="text-brand-700 hover:underline">← Einstellungen</Link></p>
      <h1 className="mt-1 font-display text-3xl text-slate-900">Online-Termine und Kalender</h1>
      <p className="mt-1 text-sm text-slate-500">Patienten buchen selbst und sehen nur freie Zeiten. Ihr vorhandener Kalender wird dabei berücksichtigt.</p>
      <div className="mt-5">
        <BuchungSettings
          admin={session!.user.role === "admin"}
          demo={p.isDemo}
          start={{ buchungAktiv: p.buchungAktiv, sprechzeiten: lage!.eingabe.sprechzeiten, buchungMinuten: p.buchungMinuten, buchungVorlaufStd: p.buchungVorlaufStd, buchungTageVoraus: p.buchungTageVoraus }}
          kalender={{ verbunden: !!p.kalenderUrl, host: p.kalenderUrl ? new URL(p.kalenderUrl).hostname : null, syncAt: p.kalenderSyncAt ? p.kalenderSyncAt.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }) : null, fehler: p.kalenderSyncFehler, abo, datei, feed: !!feed?.kalenderFeedHash }}
          plaetze={lage!.eingabe.plaetze}
          vorschau={tage.map((t) => ({ tag: t.tag, name: tagName(t.tag), zeiten: t.zeiten.map(uhr) }))}
        />
      </div>
    </div>
  );
}
