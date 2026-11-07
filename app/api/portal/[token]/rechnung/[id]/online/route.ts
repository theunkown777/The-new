import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { portalPatient } from "@/lib/portalAuth";
import { STRIPE_API, checkoutParameter, onlineZahlungStatus, stripeForm } from "@/lib/onlineZahlung";

// Patient startet die Online-Zahlung einer offenen Rechnung aus dem Portal.
export async function POST(req: Request, { params }: { params: { token: string; id: string } }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (await isRateLimited(`online:${ip}`, 20, 60 * 60 * 1000)) return NextResponse.json({ error: "Zu viele Anfragen. Bitte später erneut versuchen." }, { status: 429 });
  await recordAttempt(`online:${ip}`, 60 * 60 * 1000);
  const patient = await portalPatient(params.token);
  if (!patient) return NextResponse.json({ error: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an Ihre Praxis." }, { status: 404 });
  if (!onlineZahlungStatus().aktiv) return NextResponse.json({ error: "Online-Zahlung ist bei dieser Praxis nicht verfügbar." }, { status: 503 });
  const rechnung = await prisma.invoice.findFirst({
    where: { id: params.id, patientId: patient.id, status: { in: ["OFFEN", "GEMELDET"] }, amountCent: { gt: 0 } },
    select: { id: true, number: true, amountCent: true, practiceId: true, practice: { select: { name: true, stripeAccountId: true } } },
  });
  if (!rechnung || !rechnung.practice.stripeAccountId) return NextResponse.json({ error: "Online-Zahlung ist für diese Rechnung nicht verfügbar." }, { status: 404 });
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
  const res = await fetch(`${STRIPE_API}/v1/checkout/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Stripe-Account": rechnung.practice.stripeAccountId, "Content-Type": "application/x-www-form-urlencoded" },
    body: stripeForm(
      checkoutParameter({
        invoiceId: rechnung.id,
        practiceId: rechnung.practiceId,
        number: rechnung.number,
        amountCent: rechnung.amountCent,
        practiceName: rechnung.practice.name,
        successUrl: `${base}/portal/${params.token}?bezahlt=${rechnung.id}`,
        cancelUrl: `${base}/portal/${params.token}`,
      }),
    ),
  }).catch(() => null);
  const d = (await res?.json().catch(() => null)) as { url?: string } | null;
  if (!res?.ok || !d?.url) return NextResponse.json({ error: "Die Zahlungsseite konnte nicht geöffnet werden. Bitte überweisen Sie den Betrag oder versuchen Sie es später." }, { status: 502 });
  return NextResponse.json({ url: d.url });
}
