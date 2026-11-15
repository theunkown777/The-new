import { NextResponse } from "next/server";
import { UEBERGABE_COOKIE } from "@/lib/empfang";
import { cookieSicher } from "@/lib/empfangServer";

// „Fertig“ oder drei Minuten ohne Eingabe: Die Patientenansicht endet sofort. Das Tablet zeigt danach
// nur noch die Sperre mit der PIN-Eingabe. Braucht keine Prüfung: Es wird nur das eigene Cookie gelöscht.
export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(UEBERGABE_COOKIE, "", { httpOnly: true, sameSite: "strict", secure: cookieSicher(), path: "/", maxAge: 0 });
  return res;
}
