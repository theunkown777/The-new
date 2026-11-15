import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { GOOGLE_PROFIL_HINWEIS, googleProfilUrl } from "@/lib/rueckmeldung";
import { auditFromSession } from "@/lib/audit";

// Link zum Google-Profil der Praxis für den neutralen Bewertungs-Hinweis nach der Rückmeldung im Portal.
// Streng geprüft (lib/rueckmeldung.ts): nur https auf google.com, g.page oder maps.app.goo.gl. Leer = kein Hinweis.
export async function POST(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  const r = googleProfilUrl(body?.url ?? "");
  if (!r.ok) return NextResponse.json({ error: GOOGLE_PROFIL_HINWEIS }, { status: 400 });
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { googleProfilUrl: r.url } });
  await auditFromSession(session, "praxis.bewertungslink", { entityType: "Praxis", entityId: session.user.practiceId });
  return NextResponse.json({ ok: true, url: r.url });
}
