import { NextResponse } from "next/server";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { cleanupExpiredDemos, createDemoPractice } from "@/lib/demo";

const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

// Legt einen Gastzugang an (eigene Demo-Praxis mit Beispieldaten) und gibt
// die Wegwerf-Zugangsdaten zurück, mit denen sich die Seite /demo sofort
// anmeldet. Abgelaufene Demo-Praxen werden dabei aufgeräumt.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `demo:${ip}`;
  if (await isRateLimited(key, LIMIT, WINDOW_MS)) {
    return NextResponse.json({ error: "Zu viele Gastzugänge von diesem Anschluss. Bitte später erneut versuchen." }, { status: 429 });
  }
  await recordAttempt(key, WINDOW_MS);

  try {
    await cleanupExpiredDemos();
  } catch (err) {
    console.error("Aufräumen abgelaufener Gastzugänge fehlgeschlagen:", err);
  }
  const credentials = await createDemoPractice();
  return NextResponse.json(credentials, { status: 201, headers: { "Cache-Control": "no-store" } });
}
