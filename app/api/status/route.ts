import { isSupportTeam, teamEmailsRaw } from "@/lib/supportTeam";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { anmeldungPunkte, cronSecretPasst, datenbankPunkt, fehlerPunkt, kurzfassung, redisPunkt } from "@/lib/betriebsStatus";
import { FEHLER_GRENZE_24H } from "@/lib/fehlerlog";
import { fehlerAnzahl } from "@/lib/fehlerSpeicher";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { datenbankMb } from "@/lib/amtlich/import";
import { redisStatus } from "@/lib/rateLimit";
import { databaseLocation } from "@/lib/hostingRegion";
import { resolveDatabaseUrls } from "@/lib/databaseUrl";
import { impressumVollstaendig } from "@/lib/betreiber";
import { oeffentlichStufe } from "@/lib/vorschau";
import { registrierungOffen } from "@/lib/registrierung";

export const dynamic = "force-dynamic";

// Selbsttest für den Betrieb (z. B. nach einem Deploy): zeigt, ob die für
// Anmeldung und Gastzugang nötigen Einstellungen vorhanden sind. Gibt nie
// Schlüssel oder Passwörter aus.
// Öffentlich: je Punkt nur der Name und "ok" / "nicht ok" (reicht, um zu sehen,
// wo es hakt, auch wenn die Anmeldung selbst nicht geht). Die Hinweise mit
// Anbieter, Region, Commit und Variablennamen sieht nur das Sorrida-Team
// (angemeldet, SUPPORT_TEAM_EMAILS) oder wer CRON_SECRET als Bearer-Token
// mitschickt. Ein Praxis-Admin allein genügt nicht: Im Gastzugang ist jeder Admin.
async function darfDetailsSehen(req: Request): Promise<boolean> {
  if (cronSecretPasst(req.headers.get("authorization"), process.env.CRON_SECRET)) return true;
  try {
    const session = await getServerSession(authOptions);
    return await isSupportTeam(session?.user.id);
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const requestHost = new URL(req.url).host;
  // Anmeldung und Datenbank: dieselben Prüfungen wie die öffentliche Seite /status (lib/betriebsStatus.ts)
  const checks: Record<string, { ok: boolean; info: string }> = { ...anmeldungPunkte(requestHost) };

  checks.Datenbank = await datenbankPunkt(() => prisma.$queryRaw`SELECT 1`);
  if (checks.Datenbank.ok) try {
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
    const amtlich = await prisma.amtlicheLeistung.groupBy({ by: ["system"], _count: true, orderBy: { system: "asc" } });
    const summe = amtlich.reduce((a, x) => a + x._count, 0);
    checks["Amtliche Leistungen"] = summe > 0
      ? { ok: true, info: `${summe.toLocaleString("de-DE")} (${amtlich.map((x) => `${x.system} ${x._count}`).join(", ")})` }
      : { ok: false, info: "keine: Seed ist beim Deploy nicht gelaufen" };
    const mb = await datenbankMb(prisma);
    checks.Speicher = mb < 450 ? { ok: true, info: `Datenbank ${mb} MB` } : { ok: false, info: `Datenbank ${mb} MB: Speichergrenze des Neon-Tarifs prüfen` };
    // Fehler aus dem Betrieb (lib/fehlerlog.ts): nur die Zahl der verschiedenen Fehler, keine Inhalte
    // Eigene Absicherung: Fehlt die Tabelle noch, soll nicht die ganze Datenbank als „nicht erreichbar“ gelten.
    checks["Fehler (24 Std.)"] = await fehlerAnzahl(24).then(
      (anzahl) => fehlerPunkt(anzahl, FEHLER_GRENZE_24H),
      () => ({ ok: false, info: "nicht lesbar: Migration 20261116100000_fehler_eintrag einspielen (prisma migrate deploy)" }),
    );
  } catch (err) {
    const code = (err as { code?: string }).code;
    checks.Datenbank = { ok: false, info: `nicht erreichbar${code ? ` (${code})` : ""}: DATABASE_URL prüfen` };
  }

  checks["Missbrauchsschutz (Redis)"] = redisPunkt(await redisStatus());
  checks["KI-Berichte"] = await (await import("@/lib/anthropic")).kiZugangPruefen();
  {
    const { onlineZahlungStatus } = await import("@/lib/onlineZahlung");
    const o = onlineZahlungStatus();
    checks["Online-Zahlung (Stripe Connect, DATEV-Datenservice)"] = { ok: true, info: o.aktiv ? "eingerichtet: Praxen können ihr Stripe-Konto verbinden" : `nicht eingerichtet (fehlt: ${o.fehlt.join(", ")}); Patienten zahlen per Überweisung oder Lastschrift` };
  }
  checks["Löschfristen (Cron)"] = process.env.CRON_SECRET
    ? { ok: true, info: "CRON_SECRET gesetzt, täglicher Lauf aktiv" }
    : { ok: true, info: "kein CRON_SECRET: Fristen laufen nur beim Öffnen eines Gastzugangs. CRON_SECRET in Vercel setzen" };
  // Nur ob gesetzt, nie die Werte: zeigt, ob Pilot- und Hilfe-Anfragen per Mail ankommen.
  checks["E-Mail-Versand"] = process.env.RESEND_API_KEY
    ? { ok: true, info: `Resend-Schlüssel gesetzt${process.env.RESEND_FROM_EMAIL ? ", eigene Absenderadresse" : ", Absender onboarding@resend.dev (nur an die eigene Resend-Kontoadresse zustellbar)"}` }
    : { ok: true, info: "kein Schlüssel: Mails werden nicht verschickt (im Protokoll nur Empfänger und Betreff), Anfragen landen trotzdem in der Datenbank" };
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

  // Veröffentlichung: Stufe der Sichtbarkeit und die Sicherung „ohne vollständiges Impressum nicht öffentlich“.
  {
    const gewollt = (process.env.VORSCHAU_OEFFENTLICH ?? "").trim() !== "";
    const impressumOk = impressumVollstaendig();
    const stufe = oeffentlichStufe();
    const reg = registrierungOffen() ? "offen" : "geschlossen";
    // Öffentlich ohne täglichen Lauf: Die Löschfristen aus der Datenschutzerklärung (Anfragen, Fehlerprotokoll, Einmal-Links)
    // liefen dann nur noch zufällig. Das meldet der Bericht als Fehler, damit es vor dem Öffnen auffällt.
    const ohneLauf = !process.env.CRON_SECRET && (stufe !== "aus" || !process.env.VORSCHAU_HOSTS);
    checks["Veröffentlichung"] = ohneLauf && impressumOk
      ? { ok: false, info: "Die Seite ist öffentlich, aber CRON_SECRET fehlt: Der tägliche Lauf für die Löschfristen aus der Datenschutzerklärung ist nicht aktiv. CRON_SECRET in Vercel setzen, dann neu deployen" }
      : !process.env.VORSCHAU_HOSTS
      ? { ok: impressumOk, info: impressumOk ? `keine Vorschau-Sperre: alles öffentlich; Registrierung ${reg}` : "keine Vorschau-Sperre, aber das Impressum ist unvollständig (Telefonnummer in lib/betreiber.ts fehlt)" }
      : gewollt && !impressumOk
        ? { ok: false, info: "VORSCHAU_OEFFENTLICH ist gesetzt, aber das Impressum ist unvollständig (Telefonnummer fehlt): Die Seite bleibt deshalb verschlossen" }
        : { ok: true, info: `${stufe === "aus" ? "verschlossen (nur „Demnächst“)" : stufe === "seiten" ? "Informationsseiten öffentlich, App und Demo verschlossen" : "Informationsseiten und Demo öffentlich, App verschlossen"}; Impressum ${impressumOk ? "vollständig" : "unvollständig (Telefonnummer fehlt)"}; Registrierung ${reg}` };
  }

  const ok = Object.values(checks).every((c) => c.ok);
  const details = await darfDetailsSehen(req);
  const body = details
    ? { ok, checks }
    : { ok, checks: kurzfassung(checks), hinweis: "Kurzfassung. Die Hinweise je Punkt sieht das Sorrida-Team nach der Anmeldung; ohne Anmeldung mit CRON_SECRET als Bearer-Token." };
  return NextResponse.json(body, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } });
}
