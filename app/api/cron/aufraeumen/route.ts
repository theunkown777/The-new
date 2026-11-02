import { NextResponse } from "next/server";
import { aufraeumen } from "@/lib/aufraeumen";

// Täglich von Vercel Cron aufgerufen (vercel.json). Mit gesetztem
// CRON_SECRET schickt Vercel es als Bearer-Token mit; nur dann läuft der Job.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 401 });
  }
  const ergebnis = await aufraeumen();
  console.log("Löschfristen angewendet", ergebnis);
  return NextResponse.json({ ok: true, ergebnis });
}
