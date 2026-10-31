import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";

// Website und App sind eins: Unter "/" sehen Besucher ohne Anmeldung die
// Startseite mit Fachauswahl, angemeldete Nutzer landen in ihrer Übersicht. Alle anderen geschützten Bereiche laufen über next-auth.
const auth = withAuth({ pages: { signIn: "/login" } });

const SESSION_COOKIES = ["next-auth.session-token", "__Secure-next-auth.session-token"];

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (req.nextUrl.pathname === "/") {
    const loggedIn = SESSION_COOKIES.some((c) => req.cookies.has(c));
    // Besucher sehen die Startseite mit Fachauswahl (app/page.tsx).
    return loggedIn ? NextResponse.redirect(new URL("/dashboard", req.url)) : NextResponse.next();
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
    "/embed/:path*",
  ],
};
