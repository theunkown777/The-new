import { NextResponse } from "next/server";
import { z } from "zod";
import { VORSCHAU_COOKIE, VORSCHAU_TAGE, vorschauCookie, zugangPasst } from "@/lib/vorschau";
import { clearAttempts, isRateLimited, recordAttempt } from "@/lib/rateLimit";

// Anmeldung für die Vorschau der eigenen Domain (siehe lib/vorschau.ts).
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unbekannt";
  const schluessel = `vorschau:${ip}`;
  if (await isRateLimited(schluessel, 8, 15 * 60_000)) {
    return NextResponse.json({ error: "Zu viele Versuche. Bitte in 15 Minuten erneut versuchen." }, { status: 429 });
  }
  const parsed = z.object({ benutzer: z.string().max(100), passwort: z.string().max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await zugangPasst(parsed.data.benutzer.trim(), parsed.data.passwort))) {
    await recordAttempt(schluessel, 15 * 60_000);
    return NextResponse.json({ error: "Benutzername oder Passwort stimmt nicht." }, { status: 401 });
  }
  await clearAttempts(schluessel);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VORSCHAU_COOKIE, await vorschauCookie(), { httpOnly: true, secure: new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https", sameSite: "lax", path: "/", maxAge: VORSCHAU_TAGE * 86_400 });
  return res;
}
