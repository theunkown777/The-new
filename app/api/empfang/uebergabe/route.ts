import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GEPARKT_COOKIE, PARKEN_STUNDEN, UEBERGABE_COOKIE, UEBERGABE_MINUTEN, istSitzungCookie, sitzungParken, uebergabeToken, type UebergabeZweck } from "@/lib/empfang";
import { parkKennungHash, parkKennungNeu } from "@/lib/empfangParkung";
import { cookieSicher, offeneEinverstaendnisseWhere } from "@/lib/empfangServer";
import { agreementContext } from "@/lib/agreementContext";
import { auditFromSession } from "@/lib/audit";

const schema = z.object({ patientId: z.string().min(1).max(40), kontakt: z.boolean().default(true), anamnese: z.boolean().default(false), unterschrift: z.boolean().default(true) }).strict();

// Vor der Übergabe: Was liegt für diesen Patienten an? (offener Anamnesebogen, letzte Anamnese, offene Einverständnisse)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const practiceId = session.user.practiceId;
  const patientId = new URL(req.url).searchParams.get("patientId") ?? "";
  const patient = await prisma.patient.findFirst({ where: { id: patientId, practiceId }, select: { id: true } });
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  const [offen, letzte, vorschlaege] = await Promise.all([
    prisma.anamnesisForm.count({ where: { practiceId, patientId: patient.id, submittedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.anamnesisForm.findFirst({ where: { practiceId, patientId: patient.id, submittedAt: { not: null } }, orderBy: { submittedAt: "desc" }, select: { submittedAt: true } }),
    prisma.treatmentProposal.findMany({
      where: { practiceId, ...offeneEinverstaendnisseWhere(patient.id) }, take: 10,
      select: { id: true, status: true, createdAt: true, input: true, choices: true, patientChoices: true, practice: { select: { name: true, proposalPrices: true } } },
    }),
  ]);
  return NextResponse.json({
    anamneseOffen: offen > 0,
    anamneseZuletzt: letzte?.submittedAt ? letzte.submittedAt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }) : null,
    einverstaendnisse: vorschlaege.filter((p) => agreementContext(p)).length,
  }, { headers: { "Cache-Control": "no-store" } });
}

// „An Patient übergeben“: Das Tablet zeigt danach nur noch die Schritte für diesen Patienten.
// Die Praxis-Sitzung wird aus dem Browser genommen und verschlüsselt geparkt; zurück führt nur die
// Empfangs-PIN (app/api/empfang/entsperren). Die Patientenansicht hängt am Übergabe-Token.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  const practiceId = session.user.practiceId;
  const [praxis, patient] = await Promise.all([
    prisma.practice.findUnique({ where: { id: practiceId }, select: { empfangPinHash: true } }),
    prisma.patient.findFirst({ where: { id: d.patientId, practiceId }, select: { id: true } }),
  ]);
  if (!praxis?.empfangPinHash) return NextResponse.json({ error: "Bitte legen Sie zuerst eine Empfangs-PIN fest (Einstellungen → Empfang). Ohne PIN käme niemand zurück in die Praxis-Ansicht.", code: "KEINE_PIN" }, { status: 409 });
  if (!patient) return NextResponse.json({ error: "Patient nicht gefunden" }, { status: 404 });
  const zwecke: UebergabeZweck[] = [...(d.kontakt ? (["kontakt"] as const) : []), ...(d.anamnese ? (["anamnese"] as const) : []), ...(d.unterschrift ? (["unterschrift"] as const) : [])];
  if (zwecke.length === 0) return NextResponse.json({ error: "Bitte mindestens einen Schritt auswählen." }, { status: 400 });

  const jar = await cookies();
  const sitzung = jar.getAll().filter((c) => istSitzungCookie(c.name)).map((c) => ({ name: c.name, value: c.value }));
  if (sitzung.length === 0) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  // Die Parkung wird auf dem Server geführt (lib/empfangParkung.ts): Nach dem Entsperren oder Verwerfen gilt das Cookie nicht mehr.
  const kennung = parkKennungNeu();
  const geparkt = sitzungParken({ practiceId, cookies: sitzung, kennung });
  if (geparkt.length > 3800) return NextResponse.json({ error: "Die Übergabe ist auf diesem Gerät nicht möglich. Bitte melden Sie sich neu an und versuchen Sie es noch einmal." }, { status: 500 });

  const now = Date.now();
  if (d.anamnese) {
    // Offenen Bogen weiterverwenden; sonst einen neuen anlegen, der kurz nach der Übergabe verfällt.
    const offen = await prisma.anamnesisForm.findFirst({ where: { practiceId, patientId: patient.id, submittedAt: null, expiresAt: { gt: new Date(now + UEBERGABE_MINUTEN * 60_000) } }, select: { id: true } });
    if (!offen) await prisma.anamnesisForm.create({ data: { practiceId, patientId: patient.id, expiresAt: new Date(now + (UEBERGABE_MINUTEN + 5) * 60_000) } });
  }
  await prisma.empfangParkung.create({ data: { id: parkKennungHash(kennung), practiceId, expiresAt: new Date(now + PARKEN_STUNDEN * 3600e3) } });
  await auditFromSession(session, "empfang.uebergabe", { entityType: "Patient", entityId: patient.id, summary: `Schritte: ${zwecke.join(", ")}` });

  const res = NextResponse.json({ ok: true, ziel: "/uebergabe" }, { headers: { "Cache-Control": "no-store" } });
  const basis = { httpOnly: true, sameSite: "strict" as const, secure: cookieSicher(), path: "/" };
  res.cookies.set(UEBERGABE_COOKIE, uebergabeToken({ practiceId, patientId: patient.id, zwecke }, now), { ...basis, maxAge: UEBERGABE_MINUTEN * 60 });
  res.cookies.set(GEPARKT_COOKIE, geparkt, { ...basis, maxAge: PARKEN_STUNDEN * 3600 });
  // Praxis-Sitzung aus dem Browser nehmen: Solange das Tablet beim Patienten ist, ist dort niemand angemeldet.
  for (const c of sitzung) res.cookies.set(c.name, "", { httpOnly: true, sameSite: "lax", secure: c.name.startsWith("__Secure-"), path: "/", maxAge: 0 });
  return res;
}
