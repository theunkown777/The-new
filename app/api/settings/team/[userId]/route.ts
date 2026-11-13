import { auditFromSession } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { eigeneSitzungErneuern } from "@/lib/sitzungCookie";

const roleSchema = z.object({ role: z.enum(["admin", "staff"]) });
const analyticsSchema = z.object({ canSeeAnalytics: z.boolean() });

async function countAdmins(practiceId: string): Promise<number> {
  return prisma.user.count({ where: { practiceId, role: "admin" } });
}

export async function PATCH(req: Request, { params }: { params: { userId: string } }) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  const target = await prisma.user.findFirst({
    where: { id: params.userId, practiceId: session.user.practiceId },
  });
  if (!target) return NextResponse.json({ error: "Konto nicht gefunden" }, { status: 404 });

  const body = await req.json().catch(() => null);
  // Analyse-Freigabe für Mitarbeitende (nur Admins dürfen sie erteilen).
  const perm = analyticsSchema.safeParse(body);
  if (perm.success) {
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { canSeeAnalytics: perm.data.canSeeAnalytics },
      select: { id: true, name: true, email: true, role: true, canSeeAnalytics: true },
    });
    await auditFromSession(session, "team.rolle", { entityType: "Konto", entityId: params.userId, summary: `Analyse-Freigabe ${perm.data.canSeeAnalytics ? "erteilt" : "entzogen"}` });
    return NextResponse.json({ user: updated });
  }
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  // Der letzte verbleibende Admin einer Praxis darf sich nicht selbst oder
  // von einem anderen Admin degradieren lassen - sonst gäbe es niemanden
  // mehr, der Team/Abrechnung/Katalog verwalten kann.
  if (target.role === "admin" && parsed.data.role === "staff") {
    const adminCount = await countAdmins(session.user.practiceId);
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Der letzte Admin der Praxis kann nicht zu Staff herabgestuft werden." },
        { status: 400 }
      );
    }
  }

  // Neue Rolle beendet die laufenden Sitzungen der Person: Sie meldet sich neu
  // an (als Admin dann mit Zwei-Faktor-Pflicht). Unveränderte Rolle: nichts zu tun.
  const wechsel = target.role !== parsed.data.role;
  const { sessionVersion, ...updated } = await prisma.user.update({
    where: { id: target.id },
    data: { role: parsed.data.role, ...(wechsel ? { sessionVersion: { increment: 1 } } : {}) },
    select: { id: true, name: true, email: true, role: true, sessionVersion: true },
  });
  // Wer sich selbst herabstuft, bleibt auf diesem Gerät angemeldet (mit der neuen Rolle).
  if (wechsel && target.id === session.user.id) await eigeneSitzungErneuern(target.id, sessionVersion);

  await auditFromSession(session, "team.rolle", { entityType: "Konto", entityId: params.userId, summary: `Rolle ${parsed.data.role}` });
  return NextResponse.json({ user: updated });
}

export async function DELETE(_req: Request, { params }: { params: { userId: string } }) {
  const { session, error } = await requireAdmin();
  if (!session) return error;

  if (params.userId === session.user.id) {
    return NextResponse.json(
      { error: "Sie können Ihr eigenes Konto hier nicht entfernen." },
      { status: 400 }
    );
  }

  const target = await prisma.user.findFirst({
    where: { id: params.userId, practiceId: session.user.practiceId },
  });
  if (!target) return NextResponse.json({ error: "Konto nicht gefunden" }, { status: 404 });

  if (target.role === "admin") {
    const adminCount = await countAdmins(session.user.practiceId);
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Der letzte Admin der Praxis kann nicht entfernt werden." },
        { status: 400 }
      );
    }
  }

  // Mit dem Konto enden auch seine Sitzungen: Der Abgleich in lib/auth.ts findet es nicht mehr.
  await prisma.user.delete({ where: { id: target.id } });
  await auditFromSession(session, "team.entfernt", { entityType: "Konto", entityId: params.userId });
  return NextResponse.json({ ok: true });
}
