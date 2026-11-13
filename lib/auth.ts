import { audit } from "@/lib/audit";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt, clearAttempts, consumeAttempt, releaseAttempt } from "@/lib/rateLimit";
import { SITZUNG_MAX_SEKUNDEN, tokenAbgleichen } from "@/lib/sitzung";
import { verifyTotpToken, consumeBackupCode } from "@/lib/twoFactor";
import { zweiFaktorPflicht } from "@/lib/zweiFaktorPflicht";

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
// Zusätzlich je Anschluss, damit niemand viele Konten nacheinander durchprobiert.
const LOGIN_IP_LIMIT = 30;

export const authOptions: AuthOptions = {
  session: { strategy: "jwt", maxAge: SITZUNG_MAX_SEKUNDEN },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
        token: { label: "2FA-Code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const rateLimitKey = `login:${email}`;

        if (await isRateLimited(rateLimitKey, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW_MS)) {
          throw new Error(
            "Zu viele fehlgeschlagene Anmeldeversuche. Bitte in 15 Minuten erneut versuchen."
          );
        }

        // Vorab gezählt (auch bei vielen gleichzeitigen Versuchen wirksam);
        // gelungene Schritte geben ihren Versuch unten wieder zurück.
        const ip = String(req?.headers?.["x-forwarded-for"] ?? "").split(",")[0].trim() || "unknown";
        const ipKey = `login-ip:${ip}`;
        if (!(await consumeAttempt(ipKey, LOGIN_IP_LIMIT, LOGIN_ATTEMPT_WINDOW_MS))) {
          throw new Error("Zu viele Anmeldeversuche von diesem Anschluss. Bitte in 15 Minuten erneut versuchen.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { practice: true },
        });
        if (!user) {
          await recordAttempt(rateLimitKey, LOGIN_ATTEMPT_WINDOW_MS);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          await recordAttempt(rateLimitKey, LOGIN_ATTEMPT_WINDOW_MS);
          await audit({ practiceId: user.practiceId, userId: user.id, userName: user.name, action: "login.fehlgeschlagen", summary: "falsches Passwort" });
          return null;
        }

        // Ein leeres Codefeld kommt je nach Client als "" oder als Text
        // "undefined"/"null" an; das gilt als „kein Code“, nicht als falscher Code.
        const code = (credentials.token ?? "").trim();
        const ohneCode = code === "" || code === "undefined" || code === "null";
        if (user.totpEnabled && user.totpSecret) {
          if (ohneCode) {
            // Passwort stimmt, der Code folgt im nächsten Schritt: kein Fehlversuch.
            await releaseAttempt(ipKey);
            throw new Error("2FA_REQUIRED");
          }
          const tokenValid = await verifyTotpToken(code, user.totpSecret);
          if (!tokenValid) {
            // Kein gültiger TOTP-Code - ggf. handelt es sich um einen
            // Einmal-Backup-Code (für den Fall, dass die Authenticator-App
            // nicht verfügbar ist).
            const remainingCodes = await consumeBackupCode(code, user.totpBackupCodes);
            if (remainingCodes === null) {
              await recordAttempt(rateLimitKey, LOGIN_ATTEMPT_WINDOW_MS);
              await audit({ practiceId: user.practiceId, userId: user.id, userName: user.name, action: "login.fehlgeschlagen", summary: "falscher 2FA-Code" });
              throw new Error("2FA_INVALID");
            }
            await prisma.user.update({
              where: { id: user.id },
              data: { totpBackupCodes: remainingCodes || null },
            });
          }
        }

        await clearAttempts(rateLimitKey);
        await releaseAttempt(ipKey);
        await audit({ practiceId: user.practiceId, userId: user.id, userName: user.name, action: "login", summary: user.totpEnabled ? "mit 2FA" : "ohne 2FA" });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          practiceId: user.practiceId,
          practiceName: user.practice.name,
          sessionVersion: user.sessionVersion,
          mfaPending: !user.totpEnabled && zweiFaktorPflicht({ role: user.role, require2faAll: user.practice.require2faAll, isDemo: user.practice.isDemo }),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.practiceId = user.practiceId;
        token.practiceName = user.practiceName;
        token.mfaPending = !!user.mfaPending;
        token.sessionVersion = user.sessionVersion;
        return token;
      }
      // Bei jedem Abruf der Sitzung: Konto noch da, Stand unverändert? Rolle
      // und Praxis kommen frisch aus der Datenbank, nicht aus dem Cookie.
      if (token.widerrufen) return token;
      const konto = token.id
        ? await prisma.user.findUnique({
            where: { id: token.id },
            select: { id: true, role: true, practiceId: true, sessionVersion: true, totpEnabled: true, practice: { select: { name: true, require2faAll: true, isDemo: true } } },
          })
        : null;
      return tokenAbgleichen(token, konto);
    },
    async session({ session, token }) {
      // Widerrufen: leere Antwort, getServerSession liefert damit null.
      if (token.widerrufen) return {} as typeof session;
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.practiceId = token.practiceId;
        session.user.practiceName = token.practiceName;
        session.user.mfaPending = !!token.mfaPending;
      }
      return session;
    },
  },
};
