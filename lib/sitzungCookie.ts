import { cookies } from "next/headers";
import { decode, encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// Namen wie bei next-auth: mit HTTPS "__Secure-…", lokal ohne Vorsatz.
const COOKIE_NAMEN = ["__Secure-next-auth.session-token", "next-auth.session-token"];

/**
 * Alle Sitzungen eines Kontos beenden (sessionVersion erhöhen). Mit
 * `eigeneBehalten` bleibt das Gerät angemeldet, das die Änderung gerade selbst
 * gemacht hat (z. B. 2FA ein- oder ausgeschaltet): Sein Cookie bekommt den
 * neuen Stand, alle anderen Sitzungen des Kontos enden. Nur in Route-Handlern
 * aufrufen, dort lässt sich das Cookie setzen.
 */
export async function sitzungenBeenden(userId: string, opt: { eigeneBehalten?: boolean } = {}): Promise<void> {
  const { sessionVersion } = await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } }, select: { sessionVersion: true } });
  if (opt.eigeneBehalten) await eigeneSitzungErneuern(userId, sessionVersion);
}

/** Cookie der laufenden Sitzung auf den neuen Stand heben. Klappt das nicht, endet auch diese Sitzung (neu anmelden). */
export async function eigeneSitzungErneuern(userId: string, sessionVersion: number): Promise<boolean> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return false;
  try {
    const jar = cookies();
    for (const name of COOKIE_NAMEN) {
      const wert = jar.get(name)?.value;
      if (!wert) continue;
      const token = await decode({ token: wert, secret });
      if (!token || token.id !== userId || token.widerrufen) return false;
      // Ablauf bleibt, wie er war: Die Änderung verlängert die Sitzung nicht.
      const rest = Math.floor(Number(token.exp ?? 0) - Date.now() / 1000);
      if (rest <= 0) return false;
      jar.set(name, await encode({ token: { ...token, sessionVersion }, secret, maxAge: rest }), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: name.startsWith("__Secure-"),
        maxAge: rest,
      });
      return true;
    }
  } catch (err) {
    console.error("Sitzung konnte nicht erneuert werden", err);
  }
  return false;
}
