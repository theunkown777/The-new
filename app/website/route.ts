import { NextResponse } from "next/server";

// Die frühere statische Website (nur Zahnmedizin) ist durch die Startseite für alle Fächer ersetzt.
// Alte Links auf /website führen dauerhaft dorthin.
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/", req.url), 308);
}
