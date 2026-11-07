import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { connectState, connectUrl, onlineZahlungStatus } from "@/lib/onlineZahlung";

// Stripe-Konto der Praxis verbinden (Stripe Connect, OAuth). Nur Admins.
export async function GET(req: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  if (!onlineZahlungStatus().aktiv) return NextResponse.json({ error: "Online-Zahlung ist noch nicht eingerichtet (Schlüssel in Vercel fehlen)." }, { status: 503 });
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
  return NextResponse.redirect(connectUrl(process.env.STRIPE_CLIENT_ID!, connectState(session.user.practiceId), `${base}/api/stripe/callback`));
}
