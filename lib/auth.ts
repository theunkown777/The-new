import { audit } from "@/lib/audit";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt, clearAttempts } from "@/lib/rateLimit";
import { verifyTotpToken, consumeBackupCode } from "@/lib/twoFactor";
import { zweiFaktorPflicht } from "@/lib/zweiFaktorPflicht";

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const rateLimitKey = `login:${email}`;

        if (await isRateLimited(rateLimitKey, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW_MS)) {
          throw new Error(
            "Zu viele fehlgeschlagene Anmeldeversuche. Bitte in 15 Minuten erneut versuchen."
          );
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
        await audit({ practiceId: user.practiceId, userId: user.id, userName: user.name, action: "login", summary: user.totpEnabled ? "mit 2FA" : "ohne 2FA" });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          practiceId: user.practiceId,
          practiceName: user.practice.name,
          mfaPending: !user.totpEnabled && zweiFaktorPflicht({ role: user.role, require2faAll: user.practice.require2faAll, isDemo: user.practice.isDemo }),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.practiceId = (user as any).practiceId;
        token.practiceName = (user as any).practiceName;
        token.mfaPending = !!(user as any).mfaPending;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).practiceId = token.practiceId;
        (session.user as any).practiceName = token.practiceName;
        (session.user as any).mfaPending = !!token.mfaPending;
      }
      return session;
    },
  },
};
