import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anlaesseSchema, neueKennung } from "@/lib/terminanfrage";
import { auditFromSession } from "@/lib/audit";
import { buchungsseiteFehlt, leseStammdaten } from "@/lib/praxisStammdaten";

const schema = z.discriminatedUnion("aktion", [
  z.object({ aktion: z.literal("speichern"), aktiv: z.boolean(), anlaesse: anlaesseSchema }).strict(),
  z.object({ aktion: z.literal("neue-kennung") }).strict(),
]);

// Terminbuchung für neue Patienten: Schalter, Anlässe und Kennung der öffentlichen Seite /t/<kennung>.
// Die Kennung entsteht beim ersten Einschalten; eine neue Kennung macht den alten Link ungültig.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Nur die Geschäftsführung kann Online-Termine einstellen." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  const practiceId = session.user.practiceId;
  const praxis = await prisma.practice.findUnique({ where: { id: practiceId }, select: { buchungKennung: true, buchungAktiv: true, isDemo: true, stammdaten: true } });
  if (!praxis) return NextResponse.json({ error: "Praxis nicht gefunden" }, { status: 404 });
  const basis = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || new URL(req.url).origin;

  if (d.aktion === "neue-kennung") {
    const kennung = neueKennung();
    await prisma.practice.update({ where: { id: practiceId }, data: { buchungKennung: kennung } });
    await auditFromSession(session, "kalender", { summary: "Buchungsseite für neue Patienten: neuer Link, alter Link ungültig" });
    return NextResponse.json({ ok: true, kennung, url: `${basis}/t/${kennung}` });
  }

  if (d.aktiv && !praxis.buchungAktiv) return NextResponse.json({ error: "Bitte schalten Sie zuerst oben „Online-Termine anbieten“ ein und speichern Sie die Sprechzeiten." }, { status: 409 });
  // Die Seite erhebt Daten von Menschen, die noch keine Patienten sind: Sie zeigt Anschrift und Datenschutzhinweise der
  // Praxis. Ohne diese Angaben lässt sie sich nicht einschalten (Gastzugang ausgenommen: dort ist alles ein Beispiel).
  if (d.aktiv && !praxis.isDemo) {
    const fehlt = buchungsseiteFehlt(leseStammdaten(praxis.stammdaten));
    if (fehlt.length) return NextResponse.json({ error: `Bitte tragen Sie zuerst unter Einstellungen → Angaben der Praxis ein: ${fehlt.join(" und ")}. Die Buchungsseite zeigt diese Angaben den Anfragenden.`, code: "STAMMDATEN" }, { status: 409 });
  }
  const anlaesse = Array.from(new Set(d.anlaesse.map((a) => a.replace(/\s+/g, " "))));
  const kennung = praxis.buchungKennung ?? (d.aktiv ? neueKennung() : null);
  await prisma.practice.update({ where: { id: practiceId }, data: { neupatientenBuchung: d.aktiv, buchungAnlaesse: anlaesse, buchungKennung: kennung } });
  await auditFromSession(session, "kalender", { summary: `Buchungsseite für neue Patienten ${d.aktiv ? "eingeschaltet" : "ausgeschaltet"}` });
  return NextResponse.json({ ok: true, kennung, url: kennung ? `${basis}/t/${kennung}` : null });
}
