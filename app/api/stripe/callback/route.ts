import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { STRIPE_CONNECT, connectStatePruefen, onlineZahlungStatus, stripeForm } from "@/lib/onlineZahlung";

// Rückkehr von Stripe: Code gegen die Konto-ID tauschen und an der Praxis speichern.
export async function GET(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const url = new URL(req.url);
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? url.origin;
  const zurueck = (s: string) => NextResponse.redirect(`${base}/zahlungen?stripe=${s}`);
  if (!onlineZahlungStatus().aktiv) return zurueck("nicht-eingerichtet");
  if (url.searchParams.get("error")) return zurueck("abgebrochen");
  if (!connectStatePruefen(url.searchParams.get("state"), session.user.practiceId)) return zurueck("ungueltig");
  const code = url.searchParams.get("code");
  if (!code) return zurueck("ungueltig");
  const res = await fetch(`${STRIPE_CONNECT}/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: stripeForm({ grant_type: "authorization_code", code }),
  }).catch(() => null);
  const d = (await res?.json().catch(() => null)) as { stripe_user_id?: string } | null;
  if (!res?.ok || !d?.stripe_user_id) return zurueck("fehler");
  // Ein Stripe-Konto gehört genau zu einer Praxis.
  const belegt = await prisma.practice.findFirst({ where: { stripeAccountId: d.stripe_user_id, NOT: { id: session.user.practiceId } }, select: { id: true } });
  if (belegt) return zurueck("schon-verbunden");
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { stripeAccountId: d.stripe_user_id } });
  return zurueck("verbunden");
}
