import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";

// Website und App sind eins: Unter "/" sehen Besucher ohne Anmeldung die
// Startseite mit Fachauswahl, angemeldete Nutzer landen in ihrer Übersicht. Alle anderen geschützten Bereiche laufen über next-auth.
const auth = withAuth({ pages: { signIn: "/login" } });


export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (req.nextUrl.pathname === "/") {
    // Alle sehen die Startseite mit Praxiswahl (app/page.tsx); Angemeldete
    // bekommen dort zusätzlich den Weg zurück in ihre Übersicht.
    return NextResponse.next();
  }
  return auth(req as NextRequestWithAuth, event);
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/patients/:path*",
    "/reports/:path*",
    "/proposals/:path*",
    "/abschluss/:path*",
    "/settings/:path*",
    "/zahlungen/:path*",
    "/analyse/:path*",
    "/anfragen/:path*",
    "/vorsorge/:path*",
    "/embed/:path*",
  ],
};
