import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redisStatus } from "@/lib/rateLimit";
import { databaseLocation } from "@/lib/hostingRegion";

export const dynamic = "force-dynamic";

// Selbsttest für den Betrieb (z. B. nach einem Deploy): zeigt, ob die für
// Anmeldung und Gastzugang nötigen Einstellungen vorhanden sind. Gibt nur
// ja/nein und Hostnamen aus, niemals Schlüssel oder Passwörter.
export async function GET(req: Request) {
  const requestHost = new URL(req.url).host;
  let nextauthHost: string | null = null;
  try {
    nextauthHost = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).host : null;
  } catch {
    nextauthHost = "ungültig";
  }

  const checks: Record<string, { ok: boolean; info: string }> = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET
      ? { ok: true, info: "gesetzt" }
      : { ok: false, info: "fehlt: in Vercel als Environment Variable setzen und neu deployen" },
    NEXTAUTH_URL: !nextauthHost
      ? { ok: !!process.env.VERCEL_URL, info: process.env.VERCEL_URL ? "nicht gesetzt (Vercel-Adresse wird automatisch genutzt)" : "fehlt" }
      : nextauthHost === requestHost
        ? { ok: true, info: nextauthHost }
        : { ok: false, info: `zeigt auf ${nextauthHost}, geöffnet ist aber ${requestHost}: auf https://${requestHost} ändern oder die Seite unter ${nextauthHost} öffnen` },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.Datenbank = { ok: true, info: "erreichbar" };
    const rows = await prisma.$queryRaw<{ name: string }[]>`SELECT migration_name AS name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1`;
    const last = rows[0]?.name ?? "keine";
    const current = last >= "20261030210000_guest_demo";
    checks.Migrationen = current
      ? { ok: true, info: `aktuell (${last})` }
      : { ok: false, info: `veraltet (${last}): Deploy mit "prisma migrate deploy" wiederholen` };
    const templates = await prisma.serviceTemplate.count({ where: { practiceId: null } });
    checks.Leistungsvorlagen = templates > 0
      ? { ok: true, info: `${templates} vorhanden` }
      : { ok: false, info: "keine: Seed (tsx prisma/seed.ts) ist beim Deploy nicht gelaufen" };
  } catch (err) {
    const code = (err as { code?: string }).code;
    checks.Datenbank = { ok: false, info: `nicht erreichbar${code ? ` (${code})` : ""}: DATABASE_URL prüfen` };
  }

  const redis = await redisStatus();
  checks["Missbrauchsschutz (Redis)"] =
    redis === "erreichbar"
      ? { ok: true, info: "Upstash erreichbar" }
      : redis === "nicht angebunden"
        ? { ok: true, info: "nicht angebunden (Zähler nur im Speicher, für den Start in Ordnung)" }
        : { ok: true, info: "Zugangsdaten gesetzt, aber Upstash antwortet nicht: läuft ersatzweise im Speicher. KV_/UPSTASH_-Variablen in Vercel löschen oder Datenbank neu anlegen." };
  checks["KI-Berichte"] = process.env.ANTHROPIC_API_KEY
    ? { ok: true, info: "Schlüssel gesetzt" }
    : { ok: true, info: "kein Schlüssel: Berichte im Testmodus" };

  // Nur Information, kein Fehler: der Betrieb funktioniert auch außerhalb Frankfurts.
  const db = databaseLocation(process.env.DATABASE_URL);
  checks["Standort Datenbank"] = {
    ok: true,
    info: `${db.provider}, Region ${db.region}${db.eu === true ? " (EU)" : db.eu === false ? " – außerhalb der EU: Website-/AVV-Angaben anpassen oder Datenbank in eu-central-1 anlegen" : " – bitte im Dashboard des Anbieters prüfen"}`,
  };
  checks["Standort Funktionen"] = {
    ok: true,
    info: process.env.VERCEL_REGION ? `Vercel ${process.env.VERCEL_REGION}${process.env.VERCEL_REGION === "fra1" ? " (Frankfurt)" : " – erwartet fra1, vercel.json prüfen"}` : "nicht auf Vercel",
  };

  const ok = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
