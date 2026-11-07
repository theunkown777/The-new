import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { bezahlteRechnung, signaturGueltig, type StripeEreignis } from "@/lib/onlineZahlung";

// Stripe meldet abgeschlossene Zahlungen (Connect-Webhook). Nur mit gültiger
// Signatur; die Rechnung muss zur Praxis des zahlenden Stripe-Kontos gehören.
export async function POST(req: Request) {
  const geheim = process.env.STRIPE_WEBHOOK_SECRET;
  if (!geheim) return NextResponse.json({ error: "nicht eingerichtet" }, { status: 503 });
  const body = await req.text();
  if (!signaturGueltig(body, req.headers.get("stripe-signature"), geheim)) return NextResponse.json({ error: "Signatur ungültig" }, { status: 400 });
  const ereignis = JSON.parse(body) as StripeEreignis;
  const z = bezahlteRechnung(ereignis);
  if (!z) return NextResponse.json({ received: true });
  const rechnung = await prisma.invoice.findUnique({ where: { id: z.invoiceId }, select: { id: true, status: true, amountCent: true, practiceId: true, practice: { select: { stripeAccountId: true } } } });
  if (!rechnung || !rechnung.practice.stripeAccountId || rechnung.practice.stripeAccountId !== z.account) return NextResponse.json({ received: true });
  if (z.amountCent != null && z.amountCent !== rechnung.amountCent) return NextResponse.json({ received: true, hinweis: "Betrag weicht ab" });
  if (rechnung.status !== "BEZAHLT" && rechnung.status !== "STORNIERT") {
    await prisma.invoice.update({ where: { id: rechnung.id }, data: { status: "BEZAHLT", paidAt: new Date(), paidVia: "ONLINE", stripeSessionId: z.sessionId } });
    await audit({ practiceId: rechnung.practiceId, action: "rechnung.status", entityType: "Invoice", entityId: rechnung.id, summary: "Online bezahlt (Stripe)" });
  }
  return NextResponse.json({ received: true });
}
