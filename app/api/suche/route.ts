import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeAttempt } from "@/lib/rateLimit";
import { menueRechteVon } from "@/lib/permissions";
import { fachprofil, abschlussWort } from "@/lib/fachprofile";
import { isDental } from "@/lib/specialties";
import { modelleFuerFach } from "@/lib/modelle/fach";
import { PROPOSAL_STATUS_LABELS } from "@/lib/proposals";
import { formatCent, invoiceView } from "@/lib/invoices";
import { MAX_JE_GRUPPE, aktionenSuchen, nachRang, patientBedingung, patientRang, seitenSuchen, suchbegriffe, sucheLangGenug, type Treffer } from "@/lib/suche";

export const dynamic = "force-dynamic";

// Suche über alles: Patienten (Name, Geburtsdatum), Vorschläge und Rechnungen
// (über den Patienten bzw. die Rechnungsnummer), Seiten und Aktionen.
// Alles auf die eigene Praxis begrenzt; Rechnungen nur mit Recht auf Zahlungen.
// Keine Suche in Befunden, Notizen oder Berichtstexten.
const SUCHEN_PRO_MINUTE = 120;

const datum = (d: Date) => d.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });
// Geburtsdaten liegen als UTC-Mitternacht in der Datenbank.
const geburt = (d: Date | null) => (d ? `geb. ${d.toLocaleDateString("de-DE", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" })}` : undefined);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const practiceId = session.user.practiceId;

  const b = suchbegriffe(new URL(req.url).searchParams.get("q") ?? "");
  if (!sucheLangGenug(b)) return NextResponse.json({ treffer: [], hinweis: "Bitte mindestens 2 Zeichen eingeben." });

  if (!(await consumeAttempt(`suche:${session.user.id}`, SUCHEN_PRO_MINUTE, 60_000))) {
    return NextResponse.json({ error: "Zu viele Suchanfragen. Bitte kurz warten." }, { status: 429 });
  }

  const [rechte, practice] = await Promise.all([
    menueRechteVon(session.user.id, practiceId),
    prisma.practice.findUnique({ where: { id: practiceId }, select: { specialty: true } }),
  ]);
  const P = fachprofil(practice?.specialty).person;

  const bedingung = patientBedingung(b) as { AND: Prisma.PatientWhereInput[] } | null;
  // Rechnungsnummern enthalten Ziffern („2026-0042“); nur dann nach der Nummer suchen.
  const nummer = /\d/.test(b.text) && !b.geburt ? b.text : null;

  const [patienten, vorschlaege, rechnungen] = await Promise.all([
    bedingung
      ? prisma.patient.findMany({
          where: { practiceId, ...bedingung },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          take: 40,
          select: { id: true, firstName: true, lastName: true, birthDate: true },
        })
      : [],
    bedingung
      ? prisma.treatmentProposal.findMany({
          where: { practiceId, patient: { practiceId, ...bedingung } },
          orderBy: { createdAt: "desc" },
          take: MAX_JE_GRUPPE,
          select: { id: true, status: true, createdAt: true, patient: { select: { firstName: true, lastName: true } } },
        })
      : [],
    rechte.zahlungen && (bedingung || nummer)
      ? prisma.invoice.findMany({
          where: {
            practiceId,
            OR: [
              ...(nummer ? [{ number: { contains: nummer, mode: "insensitive" as const } }] : []),
              ...(bedingung ? [{ patient: { practiceId, ...bedingung } }] : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: MAX_JE_GRUPPE,
          select: { id: true, number: true, amountCent: true, status: true, dueDate: true, patientId: true, patient: { select: { firstName: true, lastName: true } } },
        })
      : [],
  ]);

  const besteP = nachRang(patienten, (p) => patientRang(p, b));
  const treffer: Treffer[] = [
    ...besteP.map((p): Treffer => ({
      id: `patient-${p.id}`,
      gruppe: "patienten",
      titel: `${p.lastName}, ${p.firstName}`,
      unter: geburt(p.birthDate),
      href: `/patients/${p.id}`,
      patientId: p.id,
    })),
    ...aktionenSuchen(b.text, besteP.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` })), P.sg),
    ...vorschlaege.map((v): Treffer => ({
      id: `vorschlag-${v.id}`,
      gruppe: "vorschlaege",
      titel: `Vorschlag für ${v.patient.lastName}, ${v.patient.firstName}`,
      unter: `${PROPOSAL_STATUS_LABELS[v.status] ?? v.status} · vom ${datum(v.createdAt)}`,
      href: `/proposals/${v.id}`,
    })),
    ...rechnungen.map((r): Treffer => ({
      id: `rechnung-${r.id}`,
      gruppe: "rechnungen",
      titel: `Rechnung ${r.number}`,
      unter: `${r.patient.lastName}, ${r.patient.firstName} · ${formatCent(r.amountCent)} · ${invoiceView(r).label}`,
      href: `/patients?sel=${r.patientId}`,
    })),
    ...seitenSuchen(b.text, {
      rechte,
      zahn: isDental(practice?.specialty),
      gebiss: modelleFuerFach(practice?.specialty).modelle.includes("gebiss"),
      personPl: P.pl,
      abschluss: abschlussWort(practice?.specialty),
    }),
  ];

  return NextResponse.json({ treffer }, { headers: { "Cache-Control": "no-store" } });
}
