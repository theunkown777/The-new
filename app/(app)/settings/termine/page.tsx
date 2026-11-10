import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BuchungSettings } from "@/components/BuchungSettings";
import { buchungsLage } from "@/lib/buchungLoad";
import { freieZeiten, tagName, uhr } from "@/lib/buchung";
import { whatsappApiAktiv } from "@/lib/whatsapp";

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
      <section className="card mt-5 space-y-2 text-sm text-slate-700" data-testid="whatsapp-status">
        <h2 className="font-semibold text-slate-900">Nachrichten per WhatsApp</h2>
        {whatsappApiAktiv() ? (
          <p>WhatsApp Business ist verbunden: Sorrida verschickt Terminnachrichten, den persönlichen Link und Zahlungserinnerungen direkt, sobald Sie auf „Per WhatsApp“ klicken.</p>
        ) : (
          <p>Ein Klick auf „Per WhatsApp“ öffnet WhatsApp auf diesem Gerät (App oder WhatsApp Web) mit dem Patienten als Empfänger und fertigem Text. Sie tippen dort nur noch auf „Senden“; Absender ist das WhatsApp Ihrer Praxis.</p>
        )}
        <p className="text-slate-600">Der Knopf erscheint bei Terminen, Zahlungserinnerungen und in der Patientenakte, sobald beim Patienten eine Mobilnummer und die Einwilligung für WhatsApp eingetragen sind (Akte → Kontakt und Stammdaten). In den Nachrichten stehen keine Befunde und keine Beträge.</p>
      </section>
    </div>
  );
}
