import { NextResponse } from "next/server";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { cleanupExpiredDemos, createDemoPractice } from "@/lib/demo";
import { aufraeumen } from "@/lib/aufraeumen";

let letztesAufraeumen = 0;
import { DENTAL_ID, specialty } from "@/lib/specialties";

// Anlegen von rund 1000 Beispielpatienten braucht einige Sekunden.
export const maxDuration = 60;

const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

// Legt einen Gastzugang an (eigene Demo-Praxis mit Beispieldaten) und gibt
// die Wegwerf-Zugangsdaten zurück, mit denen sich die Seite /demo sofort
// anmeldet. Abgelaufene Demo-Praxen werden dabei aufgeräumt.
export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    // Letzte Sicherung: immer eine lesbare Antwort statt einer leeren 500.
    console.error("Gastzugang fehlgeschlagen:", err);
    const message = err instanceof Error ? err.message.split("\n").filter(Boolean).pop()?.slice(0, 200) : undefined;
    return NextResponse.json(
      { error: `Der Gastzugang konnte nicht angelegt werden${message ? `: ${message}` : ""}. Details unter /api/status.` },
      { status: 500 }
    );
  }
}

async function handle(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `demo:${ip}`;
  if (await isRateLimited(key, LIMIT, WINDOW_MS)) {
    return NextResponse.json({ error: "Zu viele Gastzugänge von diesem Anschluss. Bitte später erneut versuchen." }, { status: 429 });
  }
  await recordAttempt(key, WINDOW_MS);

  try {
    // Löschfristen auch ohne Cron anwenden, höchstens einmal pro Stunde je Instanz.
    if (Date.now() - letztesAufraeumen > 3600e3) {
      letztesAufraeumen = Date.now();
      await aufraeumen();
    } else {
      await cleanupExpiredDemos();
    }
  } catch (err) {
    console.error("Aufräumen abgelaufener Gastzugänge fehlgeschlagen:", err);
  }
  try {
    const body = await req.json().catch(() => ({}));
    const fach = typeof body?.fach === "string" && specialty(body.fach) ? body.fach : DENTAL_ID;
    const { email, password } = await createDemoPractice(new Date(), fach);
    return NextResponse.json({ email, password }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Gastzugang konnte nicht angelegt werden:", err);
    const code = (err as { code?: string }).code;
    return NextResponse.json(
      { error: `Der Gastzugang konnte nicht angelegt werden${code ? ` (Datenbankfehler ${code})` : ""}. Details unter /api/status.` },
      { status: 500 }
    );
  }
}
