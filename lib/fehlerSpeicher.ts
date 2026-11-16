import { prisma } from "@/lib/prisma";
import { BROWSER_NEU_GRENZE_24H, fehlerAufbereiten, type FehlerRoh } from "@/lib/fehlerlog";

// Schreibt einen Fehler aus dem Betrieb in die Datenbank. Einziger Weg hinein:
// Alles läuft vorher durch fehlerAufbereiten (lib/fehlerlog.ts), roh wird nichts gespeichert.
// Wirft nie: Ein Fehler beim Protokollieren darf die eigentliche Antwort nicht stören.

export async function fehlerSchreiben(roh: FehlerRoh, practiceId?: string | null, now = new Date()): Promise<boolean> {
  try {
    const f = fehlerAufbereiten(roh);
    const praxis = typeof practiceId === "string" && /^[a-z0-9]{8,40}$/i.test(practiceId) ? practiceId : null;
    // Browser-Meldungen kommen ohne Anmeldung an. Damit niemand die Ansicht /betrieb mit erfundenen Einträgen füllt:
    // Ist die Tagesgrenze neuer Browser-Einträge erreicht, zählen weitere Meldungen nur noch bei schon bekannten Fehlern.
    if (f.quelle === "browser") {
      const bekannt = await prisma.fehlerEintrag.count({ where: { fingerabdruck: f.fingerabdruck } });
      if (!bekannt && (await prisma.fehlerEintrag.count({ where: { quelle: "browser", createdAt: { gte: new Date(now.getTime() - 24 * 3_600_000) } } })) >= BROWSER_NEU_GRENZE_24H) return false;
    }
    await prisma.fehlerEintrag.upsert({
      where: { fingerabdruck: f.fingerabdruck },
      create: { fingerabdruck: f.fingerabdruck, quelle: f.quelle, ort: f.ort, meldung: f.meldung, stack: f.stack || null, practiceId: praxis, createdAt: now, zuletztAt: now },
      // Tritt ein erledigter Fehler wieder auf, erscheint er wieder in der Ansicht.
      update: { zaehler: { increment: 1 }, zuletztAt: now, erledigtAt: null, ...(f.stack ? { stack: f.stack } : {}) },
    });
    return true;
  } catch {
    // Bewusst ohne Einzelheiten: Hier könnte die Datenbank selbst der Grund sein.
    console.error("Fehlereintrag konnte nicht gespeichert werden");
    return false;
  }
}

/**
 * Verschiedene Fehler des Servers, die in den letzten Stunden aufgetreten sind (für den Statusbericht).
 * Meldungen aus dem Browser zählen nicht: Sonst könnte jeder von außen den Statusbericht auf „nicht ok“ bringen.
 */
export async function fehlerAnzahl(stunden = 24, now = new Date()): Promise<number> {
  return prisma.fehlerEintrag.count({ where: { quelle: "server", zuletztAt: { gte: new Date(now.getTime() - stunden * 3_600_000) } } });
}

/** Orte der Fehler, die seit gestern zum ersten Mal aufgetreten sind (für die tägliche Mail). */
export async function neueFehlerOrte(now = new Date()): Promise<string[]> {
  const rows = await prisma.fehlerEintrag.findMany({ where: { createdAt: { gte: new Date(now.getTime() - 24 * 3_600_000) } }, select: { ort: true }, take: 500 });
  return rows.map((r) => r.ort);
}

/**
 * Tägliche Mail an LEAD_NOTIFY_EMAIL, wenn es seit gestern neue Fehler gibt und der Mailversand aktiv ist.
 * Inhalt: nur Zahl, Orte und der Link /betrieb (lib/fehlerlog.ts fehlerMail).
 */
export async function fehlerMailSenden(now = new Date(), env: Record<string, string | undefined> = process.env): Promise<{ neu: number; versendet: boolean }> {
  const orte = await neueFehlerOrte(now);
  const an = env.LEAD_NOTIFY_EMAIL?.trim();
  const { mailVersandAktiv, sendEmail } = await import("@/lib/email");
  const { fehlerMail } = await import("@/lib/fehlerlog");
  const { websiteBasis } = await import("@/lib/betreiber");
  const mail = fehlerMail(orte, websiteBasis(env));
  if (!mail || !an || !mailVersandAktiv()) return { neu: orte.length, versendet: false };
  const r = await sendEmail({ to: an, subject: mail.subject, html: mail.html });
  return { neu: orte.length, versendet: r.versendet };
}

/** Cookie-Kopf in Name → Wert zerlegen. */
function cookiesAus(kopf: string | string[] | null | undefined): Record<string, string> {
  const text = Array.isArray(kopf) ? kopf.join("; ") : kopf ?? "";
  const aus: Record<string, string> = {};
  for (const teil of text.split(";")) {
    const i = teil.indexOf("=");
    if (i < 1) continue;
    try { aus[teil.slice(0, i).trim()] = decodeURIComponent(teil.slice(i + 1).trim()); } catch { /* unlesbar: auslassen */ }
  }
  return aus;
}

/**
 * ID der Praxis aus dem Anmelde-Cookie, nur um einen Fehler zuordnen zu können. Das ist keine Zugangsprüfung:
 * Es wird nichts freigegeben und kein Konto nachgeschlagen. Ohne Anmeldung oder bei unlesbarem Cookie: null.
 */
export async function praxisIdAusCookie(cookieKopf: string | string[] | null | undefined): Promise<string | null> {
  try {
    if (!cookieKopf) return null;
    const { getToken } = await import("next-auth/jwt");
    const token = await getToken({ req: { headers: {}, cookies: cookiesAus(cookieKopf) } as never });
    return typeof token?.practiceId === "string" ? token.practiceId : null;
  } catch {
    return null;
  }
}

/**
 * Fehler einer Anfrage auf dem Server festhalten (aufgerufen aus instrumentation.ts, onRequestError).
 * Ort ist die Route mit Platzhaltern (/patients/[id]); nur wenn sie fehlt, der bereinigte Pfad.
 * Weiterleitungen und „nicht gefunden“ sind keine Fehler und werden übergangen.
 */
export async function serverFehlerMelden(
  error: unknown,
  request: { path: string; headers: Record<string, string | string[] | undefined> },
  context: { routePath?: string },
): Promise<boolean> {
  try {
    const fehler = error as { message?: unknown; stack?: unknown; digest?: unknown } | null;
    if (typeof fehler?.digest === "string" && /^(NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK)/.test(fehler.digest)) return false;
    // Nur die ID der Praxis, falls jemand angemeldet ist. Kein Name, kein Konto.
    const practiceId = await praxisIdAusCookie(request.headers.cookie);
    return await fehlerSchreiben({ quelle: "server", ort: context.routePath || request.path, meldung: fehler?.message ?? "", stack: fehler?.stack }, practiceId);
  } catch {
    return false;
  }
}
