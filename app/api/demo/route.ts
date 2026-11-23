import { NextResponse, after } from "next/server";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { cleanupExpiredDemos, createDemoPractice } from "@/lib/demo";
import { aufraeumen } from "@/lib/aufraeumen";
import { DENTAL_ID, specialty, istSichtbar } from "@/lib/specialties";
import { anschluss } from "@/lib/anschluss";

let letztesAufraeumen = 0;
/** So viele abgelaufene Demo-Praxen löscht ein Gastzugang höchstens nebenbei. Den Rest erledigt der tägliche Cron. */
const DEMOS_JE_AUFRUF = 3;
// Anlegen der Beispieldaten (je nach Fach bis etwa 1800 Einträge) braucht einige Sekunden.
export const maxDuration = 60;

const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

// Legt einen Gastzugang an (eigene Demo-Praxis mit Beispieldaten) und gibt
// die Wegwerf-Zugangsdaten zurück, mit denen sich die Seite /demo sofort
// anmeldet. Abgelaufene Demo-Praxen werden erst nach der Antwort aufgeräumt
// (after), einige je Aufruf, damit der Gast nicht darauf warten muss.
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
  const ip = anschluss(req.headers);
  const key = `demo:${ip}`;
  if (await isRateLimited(key, LIMIT, WINDOW_MS)) {
    return NextResponse.json({ error: "Zu viele Gastzugänge von diesem Anschluss. Bitte später erneut versuchen." }, { status: 429 });
  }
  await recordAttempt(key, WINDOW_MS);

  try {
    const body = await req.json().catch(() => ({}));
    // Fehlt das Fach oder ist es unbekannt, gibt es keinen stillen Rückfall auf Zahnmedizin.
    // Ausgeblendete Fächer (Gruppe „versorgung“) gibt es auch als Gastzugang nicht.
    const gewaehlt = typeof body?.fach === "string" ? specialty(body.fach) : null;
    const fach = body?.fach === DENTAL_ID || (gewaehlt && istSichtbar(gewaehlt)) ? (body.fach as string) : null;
    if (!fach) return NextResponse.json({ error: "Bitte wählen Sie zuerst Ihr Fachgebiet." }, { status: 400 });
    const { email, password } = await createDemoPractice(new Date(), fach);
    after(aufraeumenNebenbei);
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

/** Löschfristen auch ohne Cron anwenden: höchstens einmal pro Stunde je Instanz alles, sonst nur abgelaufene Demos. */
async function aufraeumenNebenbei() {
  try {
    if (Date.now() - letztesAufraeumen > 3600e3) {
      letztesAufraeumen = Date.now();
      await aufraeumen(new Date(), { demosHoechstens: DEMOS_JE_AUFRUF });
    } else {
      await cleanupExpiredDemos(new Date(), { hoechstens: DEMOS_JE_AUFRUF });
    }
  } catch (err) {
    console.error("Aufräumen abgelaufener Gastzugänge fehlgeschlagen:", err);
  }
}
