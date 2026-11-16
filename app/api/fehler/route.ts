import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeAttempt } from "@/lib/rateLimit";
import { fehlerSchreiben, praxisIdAusCookie } from "@/lib/fehlerSpeicher";

import { anschluss } from "@/lib/anschluss";
// Fehlermeldung aus dem Browser (app/error.tsx, app/(app)/error.tsx, app/global-error.tsx).
// Ohne Anmeldung erreichbar, deshalb eng begrenzt: nur von der eigenen Seite, höchstens 20 Meldungen
// je Stunde und IP, höchstens 2 kB. Gespeichert wird nur Bereinigtes (lib/fehlerlog.ts);
// die Antwort verrät nichts.

export const dynamic = "force-dynamic";

const MAX_BYTES = 2048;
const schema = z.object({
  ort: z.string().max(400),
  meldung: z.string().max(1200),
  stack: z.string().max(1500).optional(),
});

/** Gleiche Herkunft: Der Browser nennt sie selbst (Sec-Fetch-Site) oder die Origin passt zum Host. */
function gleicheHerkunft(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return site === "same-origin";
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!gleicheHerkunft(req)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 403 });
  const ip = anschluss(req.headers);
  if (!(await consumeAttempt(`fehler:${ip}`, 20, 60 * 60 * 1000))) return NextResponse.json({ error: "Zu viele Meldungen" }, { status: 429 });

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return NextResponse.json({ error: "Zu groß" }, { status: 413 });
  const text = await req.text().catch(() => "");
  if (new TextEncoder().encode(text).length > MAX_BYTES) return NextResponse.json({ error: "Zu groß" }, { status: 413 });
  let roh: unknown = null;
  try { roh = JSON.parse(text); } catch { /* bleibt null */ }
  const parsed = schema.safeParse(roh);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Meldung" }, { status: 400 });

  // Nur die ID der Praxis, falls jemand angemeldet ist (zum Zuordnen, keine Zugangsprüfung). Kein Name, kein Konto.
  const practiceId = await praxisIdAusCookie(req.headers.get("cookie"));
  await fehlerSchreiben({ quelle: "browser", ort: parsed.data.ort, meldung: parsed.data.meldung, stack: parsed.data.stack }, practiceId);
  return new NextResponse(null, { status: 204 });
}
