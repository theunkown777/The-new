import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EINGANG_ARTEN, eingangZiel, istEingangArt } from "@/lib/eingang";
import { EingangAktion, EingangAlle } from "@/components/EingangAktion";
import { MorgenMail } from "@/components/MorgenMail";
import { mailVersandAktiv } from "@/lib/email";

export const dynamic = "force-dynamic";
export const metadata = { title: "Eingang" };

const zeit = (d: Date) => d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const TON: Record<string, string> = { Geld: "bg-emerald-50 text-emerald-800", Unterlagen: "bg-sky-50 text-sky-800", Vorschläge: "bg-brand-50 text-brand-800", Termine: "bg-amber-50 text-amber-800" };

export default async function EingangPage() {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const sel = { id: true, art: true, entityId: true, hinweis: true, createdAt: true, erledigtAt: true, erledigtVon: true, patientId: true, patient: { select: { firstName: true, lastName: true } } } as const;
  const praxis = await prisma.practice.findUnique({ where: { id: practiceId }, select: { morgenMail: true, morgenMailAn: true, isDemo: true } });
  const [offen, erledigt] = await Promise.all([
    prisma.eingang.findMany({ where: { practiceId, erledigtAt: null }, orderBy: { createdAt: "desc" }, take: 200, select: sel }),
    prisma.eingang.findMany({ where: { practiceId, erledigtAt: { gte: new Date(Date.now() - 14 * 864e5) } }, orderBy: { erledigtAt: "desc" }, take: 50, select: sel }),
  ]);
  // Für Termin-Einträge den Tag nachschlagen, damit der Klick direkt im Kalender landet.
  const terminIds = [...offen, ...erledigt].filter((e) => e.art.startsWith("TERMIN_") && e.entityId).map((e) => e.entityId!);
  const termine = terminIds.length ? await prisma.appointment.findMany({ where: { id: { in: terminIds }, practiceId }, select: { id: true, start: true } }) : [];
  const tagVon = new Map(termine.map((t) => [t.id, t.start.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" })]));

  const zeile = (e: (typeof offen)[number], fertig: boolean) => {
    const a = istEingangArt(e.art) ? EINGANG_ARTEN[e.art] : null;
    const ziel = eingangZiel({ art: e.art, entityId: e.entityId, patientId: e.patientId, tag: e.entityId ? tagVon.get(e.entityId) : null });
    return (
      <li key={e.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4" data-testid={fertig ? "eingang-fertig" : "eingang-eintrag"}>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs ${TON[a?.gruppe ?? ""] ?? "bg-slate-100 text-slate-700"}`}>{a?.gruppe ?? "Sonstiges"}</span>
            <span className={`font-medium ${fertig ? "text-slate-600" : "text-slate-900"}`}>{a?.titel ?? e.art}</span>
            <span className="text-xs text-slate-500">{zeit(e.createdAt)}</span>
          </p>
          <p className="mt-0.5 text-sm text-slate-700">
            <Link href={`/patients/${e.patientId}`} className="ziel font-medium hover:text-brand-700">{e.patient.lastName}, {e.patient.firstName}</Link>
            {e.hinweis ? <span className="text-slate-500"> · {e.hinweis}</span> : null}
          </p>
          {!fertig && a && <p className="mt-0.5 text-xs text-slate-500">{a.tun}</p>}
          {fertig && <p className="mt-0.5 text-xs text-slate-500">abgehakt {e.erledigtAt ? zeit(e.erledigtAt) : ""}{e.erledigtVon ? ` von ${e.erledigtVon}` : ""}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href={ziel} className={fertig ? "ziel text-xs text-brand-700 underline" : "btn-primary"} data-testid="eingang-ziel">Öffnen</Link>
          <EingangAktion id={e.id} erledigt={fertig} />
        </div>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-slate-900">Eingang</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Alles, was Patienten über ihren Link selbst auslösen, kommt hier an: gemeldete Zahlungen, abgeschickte Anamnesebögen, Rückmeldungen zu Vorschlägen und online gebuchte Termine.</p>
        </div>
        <EingangAlle anzahl={offen.length} />
      </div>

      <section className="card mt-5 p-0" data-testid="eingang-offen">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Offen ({offen.length})</h2>
        {offen.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">Nichts offen. Sobald ein Patient im Portal etwas abschickt, steht es hier, und in der Seitenleiste erscheint eine Zahl neben „Eingang“.</p>
        ) : (
          <ul className="divide-y divide-slate-100">{offen.map((e) => zeile(e, false))}</ul>
        )}
      </section>

      {erledigt.length > 0 && (
        <details className="card mt-5 p-0">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">Erledigt in den letzten 14 Tagen ({erledigt.length})</summary>
          <ul className="divide-y divide-slate-100 border-t border-slate-100">{erledigt.map((e) => zeile(e, true))}</ul>
        </details>
      )}

      {session!.user.role === "admin" && praxis && !praxis.isDemo && <MorgenMail aktiv={praxis.morgenMail} an={praxis.morgenMailAn ?? session!.user.email ?? ""} versandBereit={mailVersandAktiv()} />}

      <section className="card mt-5 text-sm text-slate-700">
        <h2 className="font-semibold text-slate-900">Was wo ankommt</h2>
        <ul className="mt-2 space-y-1.5">
          <li><b>„Ich habe überwiesen“</b> im Portal: Die Rechnung steht unter Zahlungen auf „Gemeldet“. Sie prüfen den Kontoeingang und bestätigen dort; der Eintrag hier hakt sich dann von selbst ab.</li>
          <li><b>Online bezahlt, Ratenwunsch, Lastschriftmandat:</b> unter Zahlungen bei der Rechnung.</li>
          <li><b>Anamnesebogen:</b> in der Akte des Patienten, mit Warnhinweisen (z. B. Allergien) oben.</li>
          <li><b>Rückmeldung zum Vorschlag, Unterschrift, Zweitmeinung:</b> im jeweiligen Vorschlag.</li>
          <li><b>Online gebuchte oder abgesagte Termine:</b> im Kalender unter Termine, mit dem Hinweis „online gebucht“.</li>
        </ul>
      </section>
    </div>
  );
}
