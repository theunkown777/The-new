import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";
import { isSpam, leadEmailHtml, leadSchema } from "@/lib/leads";

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

// Formular "Pilotplatz anfragen" der öffentlichen Website (public/landing.html).
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `lead:${ip}`;
  if (await isRateLimited(key, LIMIT, WINDOW_MS)) {
    return NextResponse.json({ error: "Zu viele Anfragen von diesem Anschluss" }, { status: 429 });
  }
  await recordAttempt(key, WINDOW_MS);

  const parsed = leadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  }
  // Bots bekommen dieselbe Antwort wie Menschen, damit sie nichts lernen.
  if (isSpam(parsed.data)) return NextResponse.json({ ok: true }, { status: 201 });

  const { practiceName, contactName, dentists, contact } = parsed.data;
  await prisma.lead.create({ data: { practiceName, contactName, dentists, contact } });

  const notify = process.env.LEAD_NOTIFY_EMAIL;
  if (notify) {
    try {
      await sendEmail({ to: notify, subject: `Neue Pilot-Anfrage: ${practiceName}`, html: leadEmailHtml(parsed.data) });
    } catch (err) {
      // Die Anfrage ist gespeichert; eine fehlgeschlagene Benachrichtigung soll den Besucher nicht blockieren.
      console.error("Lead-Benachrichtigung fehlgeschlagen:", err);
    }
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
