import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";
import { supportEmailHtml, supportSchema } from "@/lib/leads";

const WINDOW_MS = 60 * 60 * 1000;

// Hilfe-Formular (/hilfe): Fachrichtung nicht gefunden. Wird wie eine
// Pilot-Anfrage gespeichert (Lead mit kind "hilfe") und an den Support gemeldet.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `support:${ip}`;
  if (await isRateLimited(key, 5, WINDOW_MS)) return NextResponse.json({ error: "Zu viele Anfragen von diesem Anschluss" }, { status: 429 });
  await recordAttempt(key, WINDOW_MS);

  const parsed = supportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
  const d = parsed.data;
  if (d.website && d.website.trim()) return NextResponse.json({ ok: true }, { status: 201 });

  await prisma.lead.create({
    data: { kind: "hilfe", practiceName: d.practiceName || "–", contactName: d.contactName, dentists: "–", contact: d.contact, specialty: "andere", message: `Fachrichtung: ${d.fach}${d.message ? `\n\n${d.message}` : ""}` },
  });
  const notify = process.env.SUPPORT_NOTIFY_EMAIL || process.env.LEAD_NOTIFY_EMAIL;
  if (notify) {
    try {
      await sendEmail({ to: notify, subject: `Hilfe-Anfrage: ${d.fach}`, html: supportEmailHtml(d) });
    } catch (err) {
      console.error("Support-Benachrichtigung fehlgeschlagen:", err);
    }
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
