import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { GEPARKT_COOKIE, PIN_MAX_FEHLVERSUCHE, PIN_SPERRE_MINUTEN, UEBERGABE_COOKIE, sitzungHolen } from "@/lib/empfang";
import { pinEntsperren } from "@/lib/empfangParkung";
import { cookieSicher } from "@/lib/empfangServer";
import { consumeAttempt, releaseAttempt } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { anschluss } from "@/lib/anschluss";

export const dynamic = "force-dynamic";
const schema = z.object({ pin: z.string().max(12) }).strict();
const antwort = (body: Record<string, unknown>, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
/** Fehlversuche je Praxis und Stunde, zusätzlich zur Sperre nach fünf Fehlversuchen und zur Grenze je Anschluss. */
const FEHLVERSUCHE_PRAXIS_STUNDE = 40;

function ohneCookies(res: NextResponse, namen: string[]) {
  for (const n of namen) res.cookies.set(n, "", { httpOnly: true, sameSite: "strict", secure: cookieSicher(), path: "/", maxAge: 0 });
  return res;
}

// Tablet zurück am Empfang: Mit der vierstelligen Empfangs-PIN kommt die geparkte Praxis-Sitzung zurück.
// 5 Fehlversuche sperren die PIN für 5 Minuten (Zähler je Praxis in der Datenbank); nach der dritten
// Sperre in Folge wird die geparkte Sitzung verworfen und es hilft nur noch die normale Anmeldung.
// Die geparkte Sitzung gilt nur, solange der Server sie kennt (lib/empfangParkung.ts): Nach dem Entsperren
// und nach dem Verwerfen ist auch ein kopierter Cookie-Wert wertlos. Prüfen und Zählen laufen je Praxis
// nacheinander, gleichzeitige Anfragen kommen nicht über die Grenze.
export async function POST(req: Request) {
  const ip = anschluss(req.headers);
  if (!(await consumeAttempt(`empfang-pin:${ip}`, 40, 3600e3))) return antwort({ error: "Zu viele Versuche. Bitte melden Sie sich neu an.", code: "ZU_VIELE" }, 429);
  const jar = await cookies();
  const geparkt = sitzungHolen(jar.get(GEPARKT_COOKIE)?.value);
  const keineSitzung = () => ohneCookies(antwort({ error: "Die Praxis-Sitzung ist abgelaufen. Bitte melden Sie sich neu an.", code: "KEINE_SITZUNG" }, 401), [GEPARKT_COOKIE]);
  if (!geparkt) return keineSitzung();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return antwort({ error: "Bitte die vierstellige PIN eingeben." }, 400);

  // Zweite Bremse je Praxis: Sie gilt auch, wenn die Anfragen von vielen Anschlüssen kommen. Richtige Eingaben zählen nicht.
  const praxisKey = `empfang-pin-praxis:${geparkt.practiceId}`;
  if (!(await consumeAttempt(praxisKey, FEHLVERSUCHE_PRAXIS_STUNDE, 3600e3))) return antwort({ error: "Zu viele Versuche. Bitte melden Sie sich neu an.", code: "ZU_VIELE" }, 429);

  const erg = await pinEntsperren({ practiceId: geparkt.practiceId, kennung: geparkt.kennung, pin: parsed.data.pin });
  if (erg.art === "keine-sitzung") return keineSitzung();
  if (erg.art === "keine-pin") return antwort({ error: "Es ist keine Empfangs-PIN festgelegt. Bitte melden Sie sich neu an.", code: "KEINE_PIN" }, 409);

  if (erg.art === "falsch") return antwort({ error: `PIN falsch. Noch ${erg.rest} ${erg.rest === 1 ? "Versuch" : "Versuche"}.`, code: "FALSCH", rest: erg.rest }, 403);
  if (erg.art === "gesperrt") {
    if (erg.neu) await audit({ practiceId: geparkt.practiceId, userName: "Empfangs-Tablet", action: "empfang.gesperrt", summary: `${PIN_MAX_FEHLVERSUCHE} Fehlversuche${erg.verwerfen ? ", geparkte Sitzung verworfen" : ""}` });
    if (erg.verwerfen) {
      return ohneCookies(antwort({ error: "Zu viele Fehlversuche. Bitte melden Sie sich mit E-Mail und Passwort neu an.", code: "VERWORFEN" }, 429), [GEPARKT_COOKIE, UEBERGABE_COOKIE]);
    }
    return antwort({ error: `Zu viele Fehlversuche. Die PIN ist für ${erg.neu ? PIN_SPERRE_MINUTEN : erg.minuten} Minuten gesperrt. Sie können sich auch neu anmelden.`, code: "GESPERRT", minuten: erg.minuten }, 429);
  }

  // Richtig: Sitzung zurück in den Browser, Übergabe beenden.
  await releaseAttempt(praxisKey);
  const res = ohneCookies(antwort({ ok: true, ziel: "/empfang" }, 200), [GEPARKT_COOKIE, UEBERGABE_COOKIE]);
  const rest = Math.max(1, Math.floor((geparkt.bis - Date.now()) / 1000));
  for (const c of geparkt.cookies) res.cookies.set(c.name, c.value, { httpOnly: true, sameSite: "lax", secure: c.name.startsWith("__Secure-"), path: "/", maxAge: rest });
  return res;
}
