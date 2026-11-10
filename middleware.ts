import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { getToken } from "next-auth/jwt";
import { VORSCHAU_COOKIE, VORSCHAU_TAGE, freiOhneZugang, istVorschauHost, vorschauCookie, vorschauCookieGueltig, vorschauPassGueltig } from "@/lib/vorschau";

// Website und App sind eins: Unter "/" sehen Besucher ohne Anmeldung die
// Startseite mit Fachauswahl, angemeldete Nutzer landen in ihrer Übersicht. Alle anderen geschützten Bereiche laufen über next-auth.
const auth = withAuth({ pages: { signIn: "/login" } });


// API-Pfade, die ein Konto mit offener 2FA-Pflicht noch braucht: Anmelden,
// Abmelden und die Einrichtung der Zwei-Faktor-Anmeldung selbst.
const MFA_FREI = ["/api/auth/", "/api/settings/2fa/"];

// Bereiche, die eine Anmeldung brauchen (next-auth)
const GESCHUETZT = ["/dashboard", "/patients", "/reports", "/proposals", "/abschluss", "/settings", "/zahlungen", "/analyse", "/anfragen", "/vorsorge", "/praxismanager", "/termine", "/abrechnungspruefung", "/abrechnung", "/mein-bereich", "/leistungsverzeichnis", "/modelle", "/eingang", "/embed"];

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  // Eigene Domain im Vorschau-Modus: ohne Zugangs-Cookie nur die Seite „Demnächst“
  if (istVorschauHost(req.headers.get("host"))) {
    const pfad = req.nextUrl.pathname;
    // Fenster aus der Praxissoftware: Passierschein aus /api/connector/launch gegen das Vorschau-Cookie tauschen.
    const pass = req.nextUrl.searchParams.get("vp");
    if (pfad === "/embed/launch" && pass && (await vorschauPassGueltig(pass))) {
      const ziel = req.nextUrl.clone();
      ziel.searchParams.delete("vp");
      const res = NextResponse.redirect(ziel);
      const sicher = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
      res.cookies.set(VORSCHAU_COOKIE, await vorschauCookie(), { httpOnly: true, secure: sicher, sameSite: "lax", path: "/", maxAge: VORSCHAU_TAGE * 86_400 });
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
    if (!freiOhneZugang(pfad) && !(await vorschauCookieGueltig(req.cookies.get(VORSCHAU_COOKIE)?.value))) {
      if (pfad.startsWith("/api/")) return NextResponse.json({ error: "Noch nicht veröffentlicht" }, { status: 403, headers: { "X-Robots-Tag": "noindex, nofollow" } });
      const ziel = req.nextUrl.clone();
      ziel.pathname = "/demnaechst";
      ziel.search = pfad === "/" ? "" : `?weiter=${encodeURIComponent(pfad + req.nextUrl.search)}`;
      const res = NextResponse.rewrite(ziel);
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
  }
  const antwort = await weiter(req, event);
  if (antwort && istVorschauHost(req.headers.get("host"))) antwort.headers.set("X-Robots-Tag", "noindex, nofollow");
  return antwort;
}

async function weiter(req: NextRequest, event: NextFetchEvent) {
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
  if (GESCHUETZT.some((p) => req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(p + "/"))) {
    return auth(req as NextRequestWithAuth, event);
  }
  return NextResponse.next();
}

export const config = {
  // Alle Seiten außer statischen Dateien: die Vorschau-Domain braucht jede Seite, die Anmeldung prüft nur GESCHUETZT.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|fonts/|og/|js/).*)"],
};
