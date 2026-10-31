import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { STANDARD_GOZ_PUNKTWERT_CENT } from "@/lib/billing";
import { DENTAL_ID, SPECIALTY_IDS } from "@/lib/specialties";
import { sendVerificationEmail } from "@/lib/emailVerification";

const registerSchema = z.object({
  practiceName: z.string().min(2, "Praxisname ist zu kurz"),
  specialty: z.enum(SPECIALTY_IDS as unknown as [string, ...string[]]).default(DENTAL_ID),
  name: z.string().min(2, "Name ist zu kurz"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
});

const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rateLimitKey = `register:${ip}`;
  if (await isRateLimited(rateLimitKey, REGISTER_LIMIT, REGISTER_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Zu viele Registrierungsversuche. Bitte in einer Stunde erneut versuchen." },
      { status: 429 }
    );
  }
  await recordAttempt(rateLimitKey, REGISTER_WINDOW_MS);

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 }
    );
  }

  const { practiceName, name, email, password, specialty } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "Für diese E-Mail-Adresse existiert bereits ein Konto." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const practice = await prisma.practice.create({
    data: {
      name: practiceName,
      specialty,
      // GOZ-Punktwert ist bundeseinheitlich fixiert und wird vorbelegt; der
      // BEMA-Punktwert ist regional unterschiedlich und muss von der Praxis
      // selbst unter "Einstellungen > Abrechnung" eingetragen werden.
      gozPunktwertCent: STANDARD_GOZ_PUNKTWERT_CENT,
      users: {
        create: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: "admin",
        },
      },
    },
    include: { users: true },
  });

  await sendVerificationEmail(practice.users[0]);

  return NextResponse.json({ ok: true });
}
