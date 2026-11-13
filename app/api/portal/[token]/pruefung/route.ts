import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { eingabeTag } from "@/lib/portalPruefung";
import { geburtsdatumPruefen } from "@/lib/portalPruefungServer";

export const dynamic = "force-dynamic";

const feld = z.union([z.string().max(8), z.number().int().min(0).max(9999)]);
const schema = z.object({ tag: feld, monat: feld, jahr: feld });

const antwort = (body: Record<string, unknown>, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Patientenportal (S5): Geburtsdatum bestätigen, bevor unterschrieben oder ein
// Lastschriftmandat erteilt wird. Die Antwort sagt nur "stimmt" oder "stimmt
// nicht" und wie viele Versuche bleiben, nie wie nah die Eingabe war. Bei
// Erfolg gilt 30 Minuten lang ein signiertes httpOnly-Cookie für genau diesen Link.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  // Grobe Bremse je Absender; die eigentliche Grenze zählt je Link in der Datenbank.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `portalpruefung:${ip}`;
  if (await isRateLimited(key, 30, 60 * 60 * 1000)) return antwort({ error: "Zu viele Anfragen. Bitte später erneut versuchen.", code: "ZU_VIELE" }, 429);
  await recordAttempt(key, 60 * 60 * 1000);

  if (!/^[A-Za-z0-9_-]{20,128}$/.test(params.token)) return antwort({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, 404);
  const patient = await prisma.patient.findUnique({
    where: { portalTokenHash: hashToken(params.token) },
    select: { id: true, practiceId: true, birthDate: true, portalExpiresAt: true },
  });
  if (!patient || !patient.portalExpiresAt || patient.portalExpiresAt < new Date()) return antwort({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, 404);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  // Kein echter Kalendertag (31.02., Jahr zweistellig, Zukunft): Eingabefehler, zählt nicht als Fehlversuch.
  if (!parsed.success || !eingabeTag(parsed.data)) return antwort({ error: "Bitte geben Sie Tag, Monat und Jahr Ihres Geburtsdatums ein.", code: "UNVOLLSTAENDIG" }, 400);

  const erg = await geburtsdatumPruefen({ token: params.token, patient, eingabe: parsed.data });
  if (erg.ok) {
    const res = antwort({ ok: true }, 200);
    res.cookies.set(erg.cookie.name, erg.cookie.wert, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
      path: "/",
      maxAge: erg.cookie.maxAge,
    });
    return res;
  }
  if (erg.code === "OHNE_GEBURTSDATUM") return antwort({ error: "Ihre Praxis hat kein Geburtsdatum hinterlegt.", code: erg.code }, 409);
  if (erg.code === "GESPERRT") return antwort({ error: `Zu viele Fehlversuche. Bitte in ${erg.minuten} Minuten erneut versuchen oder an Ihre Praxis wenden.`, code: erg.code, minuten: erg.minuten }, 429);
  return antwort({ error: "Das Geburtsdatum stimmt nicht mit den Angaben Ihrer Praxis überein.", code: erg.code, rest: erg.rest }, 403);
}
