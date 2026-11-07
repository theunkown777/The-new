import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditFromSession } from "@/lib/audit";
import { BEREICH_COOKIE, BEREICH_MINUTEN, MAX_FEHLVERSUCHE, SPERRE_MINUTEN, bereichToken, passwortProblem } from "@/lib/bereichSchutz";

// Passwort für "Mein Bereich": jede Person vergibt es selbst.
// - setzen:      erstes Passwort; außerhalb der Demo mit dem Anmeldepasswort bestätigt
// - entsperren:  öffnet den Bereich für 30 Minuten (signiertes Cookie)
// - aendern:     mit dem bisherigen Bereichs-Passwort
// - zuruecksetzen: vergessen; außerhalb der Demo mit dem Anmeldepasswort
// - sperren:     sofort wieder zu

const schema = z.discriminatedUnion("aktion", [
  z.object({ aktion: z.literal("setzen"), passwort: z.string().max(200), anmeldePasswort: z.string().max(200).optional() }),
  z.object({ aktion: z.literal("entsperren"), passwort: z.string().max(200) }),
  z.object({ aktion: z.literal("aendern"), passwort: z.string().max(200), neu: z.string().max(200) }),
  z.object({ aktion: z.literal("zuruecksetzen"), neu: z.string().max(200), anmeldePasswort: z.string().max(200).optional() }),
  z.object({ aktion: z.literal("sperren") }),
]);

function mitCookie(res: NextResponse, token: string | null) {
  res.cookies.set(BEREICH_COOKIE, token ?? "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: token ? BEREICH_MINUTEN * 60 : 0,
  });
  return res;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true, bereichPinHash: true, bereichPinFehlversuche: true, bereichPinGesperrtBis: true, practice: { select: { isDemo: true } } },
  });
  if (!user) return NextResponse.json({ error: "Konto nicht gefunden" }, { status: 404 });
  const demo = user.practice.isDemo;
  const anmeldungOk = async (pw?: string) => demo || (!!pw && (await bcrypt.compare(pw, user.passwordHash)));

  if (d.aktion === "sperren") return mitCookie(NextResponse.json({ ok: true }), null);

  if (d.aktion === "setzen" || d.aktion === "zuruecksetzen") {
    const neu = d.aktion === "setzen" ? d.passwort : d.neu;
    if (d.aktion === "setzen" && user.bereichPinHash) return NextResponse.json({ error: "Es gibt schon ein Passwort. Bitte „Passwort ändern“ nutzen." }, { status: 409 });
    const problem = passwortProblem(neu);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    if (!(await anmeldungOk(d.anmeldePasswort))) return NextResponse.json({ error: "Das Anmeldepasswort stimmt nicht." }, { status: 403 });
    await prisma.user.update({ where: { id: user.id }, data: { bereichPinHash: await bcrypt.hash(neu, 10), bereichPinFehlversuche: 0, bereichPinGesperrtBis: null } });
    await auditFromSession(session, "bereich.passwort", { entityType: "User", entityId: user.id, summary: d.aktion === "setzen" ? "vergeben" : "zurückgesetzt" });
    return mitCookie(NextResponse.json({ ok: true }), bereichToken(user.id));
  }

  // entsperren oder ändern: bisheriges Passwort prüfen, mit Sperre nach Fehlversuchen
  if (!user.bereichPinHash) return NextResponse.json({ error: "Bitte zuerst ein Passwort vergeben." }, { status: 409 });
  if (user.bereichPinGesperrtBis && user.bereichPinGesperrtBis > new Date()) {
    const min = Math.ceil((user.bereichPinGesperrtBis.getTime() - Date.now()) / 60_000);
    return NextResponse.json({ error: `Zu viele Fehlversuche. Bitte in ${min} Minuten erneut versuchen oder das Passwort zurücksetzen.` }, { status: 429 });
  }
  if (!(await bcrypt.compare(d.passwort, user.bereichPinHash))) {
    const n = user.bereichPinFehlversuche + 1;
    const sperre = n >= MAX_FEHLVERSUCHE;
    await prisma.user.update({
      where: { id: user.id },
      data: { bereichPinFehlversuche: sperre ? 0 : n, bereichPinGesperrtBis: sperre ? new Date(Date.now() + SPERRE_MINUTEN * 60_000) : null },
    });
    if (sperre) await auditFromSession(session, "bereich.gesperrt", { entityType: "User", entityId: user.id, summary: `${MAX_FEHLVERSUCHE} Fehlversuche` });
    return NextResponse.json(
      { error: sperre ? `Zu viele Fehlversuche. Mein Bereich ist für ${SPERRE_MINUTEN} Minuten gesperrt.` : `Passwort falsch. Noch ${MAX_FEHLVERSUCHE - n} Versuche.` },
      { status: sperre ? 429 : 403 },
    );
  }
  if (d.aktion === "aendern") {
    const problem = passwortProblem(d.neu);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    await prisma.user.update({ where: { id: user.id }, data: { bereichPinHash: await bcrypt.hash(d.neu, 10), bereichPinFehlversuche: 0 } });
    await auditFromSession(session, "bereich.passwort", { entityType: "User", entityId: user.id, summary: "geändert" });
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { bereichPinFehlversuche: 0 } });
  }
  return mitCookie(NextResponse.json({ ok: true }), bereichToken(user.id));
}
