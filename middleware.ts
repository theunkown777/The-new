import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { getToken } from "next-auth/jwt";

// Website und App sind eins: Unter "/" sehen Besucher ohne Anmeldung die
// Startseite mit Fachauswahl, angemeldete Nutzer landen in ihrer Übersicht. Alle anderen geschützten Bereiche laufen über next-auth.
const auth = withAuth({ pages: { signIn: "/login" } });


// API-Pfade, die ein Konto mit offener 2FA-Pflicht noch braucht: Anmelden,
// Abmelden und die Einrichtung der Zwei-Faktor-Anmeldung selbst.
const MFA_FREI = ["/api/auth/", "/api/settings/2fa/"];

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    // Nur angemeldete Konten mit offener 2FA-Pflicht werden hier gestoppt;
    // alle anderen Prüfungen machen die Routen selbst.
    const token = await getToken({ req }).catch(() => null);
    if (token?.mfaPending && !MFA_FREI.some((p) => req.nextUrl.pathname.startsWith(p))) {
      return NextResponse.json({ error: "Bitte zuerst die Zwei-Faktor-Anmeldung einrichten und neu anmelden." }, { status: 403 });
    }
    return NextResponse.next();
  }
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
    "/praxismanager/:path*",
    "/termine/:path*",
    "/abrechnungspruefung/:path*",
    "/abrechnung/:path*",
    "/mein-bereich/:path*",
    "/leistungsverzeichnis/:path*",
    "/embed/:path*",
    "/api/:path*",
  ],
};
