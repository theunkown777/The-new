import { teamEmailsRaw } from "@/lib/supportTeam";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redisStatus } from "@/lib/rateLimit";
import { databaseLocation } from "@/lib/hostingRegion";
import { resolveDatabaseUrls } from "@/lib/databaseUrl";

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
    redis.state === "erreichbar"
      ? { ok: true, info: `Upstash erreichbar (${redis.source}${redis.tried > 1 ? `, ${redis.tried - 1} weitere Zugangsdaten gesetzt, die nicht antworten – können gelöscht werden` : ""})` }
      : redis.state === "nicht angebunden"
        ? { ok: true, info: "nicht angebunden (Zähler nur im Speicher, für den Start in Ordnung)" }
        : { ok: true, info: `${redis.tried} Zugangsdaten gesetzt, keine antwortet: läuft ersatzweise im Speicher. Neue Upstash-Datenbank mit dem Projekt verbinden (Production) und neu deployen, alte KV_/UPSTASH_-Variablen löschen.` };
  checks["KI-Berichte"] = process.env.ANTHROPIC_API_KEY
    ? { ok: true, info: "Schlüssel gesetzt" }
    : { ok: true, info: "kein Schlüssel: Berichte im Testmodus" };
  // Nur ob gesetzt, nie die Werte: zeigt, ob Pilot- und Hilfe-Anfragen per Mail ankommen.
  checks["E-Mail-Versand"] = process.env.RESEND_API_KEY
    ? { ok: true, info: `Resend-Schlüssel gesetzt${process.env.RESEND_FROM_EMAIL ? ", eigene Absenderadresse" : ", Absender onboarding@resend.dev (nur an die eigene Resend-Kontoadresse zustellbar)"}` }
    : { ok: true, info: "kein Schlüssel: Mails werden nur protokolliert, Anfragen landen trotzdem in der Datenbank" };
  checks["Benachrichtigung Support"] = process.env.SUPPORT_NOTIFY_EMAIL
    ? { ok: true, info: "eigene Support-Adresse gesetzt" }
    : process.env.LEAD_NOTIFY_EMAIL
      ? { ok: true, info: "Hilfe-Anfragen gehen an die Adresse für Pilot-Anfragen" }
      : { ok: true, info: "keine Empfängeradresse: Hilfe-Anfragen nur in der Datenbank und im Postfach /anfragen" };
  // Nur Anzahl und Form prüfen, nie Adressen ausgeben.
  const rawTeam = teamEmailsRaw();
  const team = (rawTeam ?? "").split(/[,;\s]+/).filter((e) => e.includes("@")).length;
  const similar = Object.keys(process.env).filter((k) => /SUPPORT|TEAM/i.test(k) && k.toUpperCase().replace(/[^A-Z]/g, "") !== "SUPPORTTEAMEMAILS" && k !== "SUPPORT_NOTIFY_EMAIL");
  checks["Postfach Anfragen"] = team
    ? { ok: true, info: `${team} Team-${team === 1 ? "Konto" : "Konten"} freigeschaltet (/anfragen)` }
    : rawTeam !== undefined
      ? { ok: true, info: `SUPPORT_TEAM_EMAILS ist gesetzt (${rawTeam.trim().length} Zeichen), enthält aber keine E-Mail-Adresse mit @. Wert in Vercel prüfen, dann neu deployen.` }
      : {
          ok: true,
          info: `SUPPORT_TEAM_EMAILS fehlt in dieser Umgebung (${process.env.VERCEL_ENV ?? "unbekannt"}): niemand sieht das Postfach /anfragen.${similar.length ? ` Ähnlich benannte Einträge gefunden: ${similar.join(", ")} (Tippfehler?)` : ""} In Vercel für Production setzen und neu deployen.`,
        };
  checks["Deployment"] = {
    ok: true,
    info: `${process.env.VERCEL_ENV ?? "lokal"}, Stand ${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unbekannt"}${process.env.VERCEL_GIT_COMMIT_REF ? ` (${process.env.VERCEL_GIT_COMMIT_REF})` : ""}`,
  };

  // Nur Information, kein Fehler: der Betrieb funktioniert auch außerhalb Frankfurts.
  const db = databaseLocation(resolveDatabaseUrls(process.env)?.runtime);
  checks["Standort Datenbank"] = {
    ok: true,
    info: `${db.provider}, Region ${db.region}${db.eu === true ? " (EU)" : db.eu === false ? " – außerhalb der EU: Website-/AVV-Angaben anpassen oder Datenbank in eu-central-1 anlegen" : " – bitte im Dashboard des Anbieters prüfen"}`,
  };
  checks["Standort Funktionen"] = {
    ok: true,
    info: process.env.VERCEL_REGION ? `Vercel ${process.env.VERCEL_REGION}${process.env.VERCEL_REGION === "fra1" ? " (Frankfurt)" : " – erwartet fra1, vercel.json prüfen"}` : "nicht auf Vercel",
  };

  const ok = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });
}
