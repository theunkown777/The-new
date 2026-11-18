import Link from "next/link";
import { Leer } from "@/components/Leer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  STATUS_CLS, STATUS_LABEL, auslastung, ausfallquote, bestaetigungText, erinnerungText, heuteTag, tagesGrenzen, uhrzeit, type TerminStatus,
} from "@/lib/termine";
import { TerminAktionen } from "@/components/TerminAktionen";
import { whatsappApiAktiv } from "@/lib/whatsapp";
import { TerminNeu } from "@/components/TerminNeu";
import { leistungenFuerFach } from "@/lib/leistungskatalog";
import { fachprofil } from "@/lib/fachprofile";
import { WartelisteKarte } from "@/components/WartelisteKarte";
import { WartelisteAngebot } from "@/components/WartelisteAngebot";
import { TerminAnfragen } from "@/components/TerminAnfragen";
import { passende, wunschText } from "@/lib/warteliste";
import { offeneAnfragen } from "@/lib/terminanfrageLoad";
import { gewaehlterStandort, sichtbareStandorte, standortRechtVon, terminFilter } from "@/lib/standortRechte";

export const dynamic = "force-dynamic";
export const metadata = { title: "Termine" };

const verschiebe = (tag: string, n: number) => {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export default async function TerminePage(props: { searchParams: Promise<{ tag?: string; ort?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const tag = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.tag ?? "") ? searchParams.tag! : heuteTag();
  const { von, bis } = tagesGrenzen(tag);
  // Konten mit Standort-Zuordnung sehen nur ihre Standorte und deren Termine (lib/standortRechte.ts).
  const recht = await standortRechtVon(session!.user.id, practiceId);
  const standorte = sichtbareStandorte(recht, await prisma.location.findMany({ where: { practiceId }, orderBy: { createdAt: "asc" } }));
  const ort = gewaehlterStandort(recht, searchParams.ort, standorte);
  const [termine, letzte, practice, warteliste, anfragen] = await Promise.all([
    prisma.appointment.findMany({
      where: { practiceId, start: { gte: von, lt: bis }, ...terminFilter(recht, ort) },
      orderBy: { start: "asc" },
      include: { patient: { select: { id: true, firstName: true, lastName: true, email: true, contactConsentAt: true, phone: true, whatsappConsentAt: true } }, location: { select: { name: true } } },
    }),
    prisma.appointment.findMany({ where: { practiceId, ...terminFilter(recht), start: { gte: new Date(Date.now() - 60 * 864e5), lt: new Date() } }, select: { status: true } }),
    prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, specialty: true } }),
    // Warteliste: offene Einträge, wer am längsten wartet zuerst
    prisma.warteliste.findMany({ where: { practiceId, erledigtAt: null }, orderBy: { createdAt: "asc" }, take: 300, include: { patient: { select: { firstName: true, lastName: true } } } }),
    // Online-Anfragen neuer Patienten (Buchungsseite /t/<kennung>), mit Vorschlägen aus dem Bestand
    offeneAnfragen(practiceId),
  ]);
  const a = auslastung(termine, standorte, ort);
  const quote = ausfallquote(letzte);
  const unbestaetigt = termine.filter((t) => t.status === "GEPLANT" && !t.confirmedAt).length;
  const datum = new Date(`${tag}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
  const kurz = (d: Date) => d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const q = (t: string, o: string | null = ort) => `/termine?tag=${t}${o ? `&ort=${o}` : ""}`;
  const tagKurz = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });
  const anlaesse = Array.from(new Set([...fachprofil(practice?.specialty).termine, ...leistungenFuerFach(practice?.specialty ?? "").map((l) => l.name)]));
  const jetzt = new Date();
  // Abgesagte Termine in der Zukunft: bis zu zwei passende Personen von der Warteliste vorschlagen
  const vorschlaege = (t: { start: Date; status: string; patientId: string }) =>
    t.status === "ABGESAGT" && t.start > jetzt
      ? passende(warteliste, t).map((w) => ({ id: w.id, name: `${w.patient.lastName}, ${w.patient.firstName}`, anlass: w.anlass, wunsch: wunschText(w), seit: tagKurz(w.createdAt), angeboten: w.angebotenAt ? tagKurz(w.angebotenAt) : null }))
      : [];

  return (
    <div className="space-y-6" data-testid="termine">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-slate-900">Termine</h1>
          <p className="mt-1 text-sm text-slate-600">{datum}</p>
        </div>
        <nav className="flex items-center gap-1 rounded-full bg-white p-1 text-sm shadow-sm ring-1 ring-slate-200" aria-label="Tag">
          <Link href={q(verschiebe(tag, -1))} className="rounded-full px-3 py-1.5 text-slate-600 hover:text-brand-700" aria-label="Vortag">‹</Link>
          <Link href={q(heuteTag())} className={`rounded-full px-3 py-1.5 ${tag === heuteTag() ? "bg-brand-600 text-white" : "text-slate-600"}`}>Heute</Link>
          <Link href={q(verschiebe(tag, 1))} className="rounded-full px-3 py-1.5 text-slate-600 hover:text-brand-700" aria-label="Folgetag">›</Link>
        </nav>
      </div>

      {standorte.length > 1 && (
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Standort">
          <Link href={q(tag, null)} className={`rounded-full px-3 py-1.5 ring-1 ${!ort ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200"}`}>Alle Standorte</Link>
          {standorte.map((s) => (
            <Link key={s.id} href={q(tag, s.id)} className={`rounded-full px-3 py-1.5 ring-1 ${ort === s.id ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200"}`}>{s.name}</Link>
          ))}
        </nav>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="card !p-3 sm:!p-5" data-testid="auslastung" data-hilfe="termine-auslastung">
          <p className="text-xs text-slate-500 sm:text-sm">Auslastung</p>
          <p className="mt-1 text-xl font-semibold sm:text-2xl tabular-nums text-slate-900">{a.prozent} %</p>
          <div className="mt-2 h-2 rounded-full bg-slate-200"><div className={`h-2 rounded-full ${a.prozent > 95 ? "bg-red-600" : "bg-brand-600"}`} style={{ width: `${Math.min(100, a.prozent)}%` }} /></div>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">
            {(Math.round(a.gebucht / 60 * 10) / 10).toLocaleString("de-DE")} von {Math.round(a.kapazitaet / 60)} Std.{a.angenommen ? " · angenommen: 1 Platz, 8 Std. Standorte unter Einstellungen pflegen." : ""}
          </p>
        </div>
        <div className="card !p-3 sm:!p-5">
          <p className="text-xs text-slate-500 sm:text-sm">Noch nicht bestätigt</p>
          <p className={`mt-1 text-xl font-semibold sm:text-2xl tabular-nums ${unbestaetigt ? "text-amber-700" : "text-slate-900"}`}>{unbestaetigt}</p>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">Bestätigte Termine fallen seltener aus.</p>
        </div>
        <div className="card !p-3 sm:!p-5">
          <p className="text-xs text-slate-500 sm:text-sm">Ausfallquote, 60 Tage</p>
          <p className="mt-1 text-xl font-semibold sm:text-2xl tabular-nums text-slate-900">{quote == null ? "–" : `${quote} %`}</p>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">{quote == null ? "Ab fünf abgeschlossenen Terminen." : "Nicht erschienen im Verhältnis zu allen abgeschlossenen Terminen."}</p>
        </div>
      </div>

      <TerminAnfragen
        personPl={fachprofil(practice?.specialty).person.pl}
        anfragen={anfragen.map((a) => ({
          id: a.id, name: `${a.lastName}, ${a.firstName}`, geboren: a.birthDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }),
          phone: a.phone, email: a.email, anlass: a.anlass,
          zeit: `${a.start.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" })}, ${uhrzeit(a.start)} Uhr`,
          tag: a.start.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }), eingegangen: kurz(a.createdAt),
          reserviert: a.reserviert, vergangen: a.vergangen, belegt: a.belegt, beispiel: a.beispiel,
          gleicherKontakt: a.gleicherKontakt,
          kandidaten: a.kandidaten.map((k) => ({ id: k.id, name: `${k.lastName}, ${k.firstName}`, neuerKontakt: [k.neuerKontakt.phone, k.neuerKontakt.email].filter((x): x is string => !!x) })),
        }))}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="card divide-y divide-slate-100 p-0">
          {termine.length === 0 && <Leer symbol="kalender" eng>Für diesen Tag ist nichts eingetragen. Termine tragen Sie rechts ein{standorte.length === 0 ? "; für eine genaue Auslastung legen Sie unter Einstellungen → Standorte Ihre Behandlungsplätze an" : ""}.</Leer>}
          {termine.map((t) => (
            <div key={t.id} className="flex flex-col gap-2 p-4" data-testid="termin">
              <div className="flex min-w-0 gap-4">
                <p className="w-14 shrink-0 font-semibold tabular-nums text-slate-900">{uhrzeit(t.start)}<span className="block text-xs font-normal text-slate-500">{t.minutes} Min.</span></p>
                <div className="min-w-0">
                  <Link href={`/patients/${t.patient.id}`} className="ziel font-medium text-slate-900 hover:text-brand-700">{t.patient.lastName}, {t.patient.firstName}</Link>
                  <p className="text-sm text-slate-600">{t.reason}{t.location && standorte.length > 1 ? ` · ${t.location.name}` : ""}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_CLS[t.status as TerminStatus]}`}>{STATUS_LABEL[t.status as TerminStatus]}</span>
                  {t.quelle === "PATIENT" && <span className="ml-1 mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800" data-testid="termin-online">online gebucht</span>}
                  {t.quelle === "NEU" && <span className="ml-1 mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800" data-testid="termin-neu-online">neu, online angefragt</span>}
                </div>
              </div>
              <div className="sm:pl-[4.5rem]"><TerminAktionen
                id={t.id}
                status={t.status as TerminStatus}
                mail={!!t.patient.email && !!t.patient.contactConsentAt}
                whatsapp={!!t.patient.phone && !!t.patient.whatsappConsentAt}
                whatsappDirekt={whatsappApiAktiv()}
                confirmedAt={t.confirmedAt ? kurz(t.confirmedAt) : null}
                remindedAt={t.remindedAt ? kurz(t.remindedAt) : null}
                bestaetigung={bestaetigungText({ firstName: t.patient.firstName, practiceName: practice?.name ?? "Ihrer Praxis", start: t.start, ort: standorte.length > 1 ? t.location?.name ?? null : null })}
                erinnerung={erinnerungText({ firstName: t.patient.firstName, practiceName: practice?.name ?? "Ihrer Praxis", start: t.start, ort: standorte.length > 1 ? t.location?.name ?? null : null, fach: practice?.specialty })}
              />
                <WartelisteAngebot terminId={t.id} kandidaten={vorschlaege(t)} />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <TerminNeu
            tag={tag}
            standorte={standorte.map((s) => ({ id: s.id, name: s.name }))}
            anlaesse={anlaesse}
          />
          <WartelisteKarte
            anlaesse={anlaesse}
            eintraege={warteliste.map((w) => ({ id: w.id, patientId: w.patientId, name: `${w.patient.lastName}, ${w.patient.firstName}`, anlass: w.anlass, wunsch: wunschText(w), notiz: w.notiz, seit: tagKurz(w.createdAt), angeboten: w.angebotenAt ? tagKurz(w.angebotenAt) : null }))}
          />
          <p className="text-xs leading-relaxed text-slate-500">
            Termine werden hier eingetragen und noch nicht aus Ihrer Praxissoftware übernommen. Bestätigungen und Erinnerungen kopieren Sie als Text in SMS,
            Messenger oder Mail; Sorrida verschickt sie noch nicht selbst.
          </p>
        </div>
      </div>
    </div>
  );
}
