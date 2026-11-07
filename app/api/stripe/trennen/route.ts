import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

// Verbindung zum Stripe-Konto der Praxis lösen; danach bietet das Portal keine Online-Zahlung mehr an.
export async function POST() {
  const { session, error } = await requireAdmin();
  if (error) return error;
  await prisma.practice.update({ where: { id: session.user.practiceId }, data: { stripeAccountId: null } });
  return NextResponse.json({ ok: true });
}
