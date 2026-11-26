import type { Metadata } from "next";
import { Cormorant_Garamond, Open_Sans } from "next/font/google";
import "./globals.css";
import { WegAnimationen } from "@/components/WegAnimationen";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-open-sans",
  display: "swap",
});

// Überschriften der Website: Cormorant in mehreren Schnitten und kursiv (wird beim Bauen geladen und
// von Sorrida selbst ausgeliefert, beim Besuch keine Verbindung zu Google).
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: "Sorrida",
  // Bestätigung für die Google Search Console (kein Geheimnis; Wert aus der Search Console als Variable setzen).
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
  description: "Sorrida – damit beide Seiten lächeln. Nach der Behandlung ein Klick: Leistungen, Bericht, Behandlungsvorschlag, Patienten-Link und Anamnese für Praxen jeder Fachrichtung",
};

/** Setzt .js-weg und .js-ein sofort; WegAnimationen meldet sich mit .ein-bereit. Fehlt die Meldung, fällt die Pause weg (.ein-aus), und es bleibt dabei. */
const VORAB =
  "(function(){var h=document.documentElement;h.classList.add('js-weg','js-ein');" +
  "setTimeout(function(){if(!h.classList.contains('ein-bereit')){h.classList.remove('js-weg','js-ein');h.classList.add('ein-aus');}},4000);})();";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${openSans.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        {/* Vor dem ersten Bild: Wege und Einblenden warten auf ihren Auftritt, statt erst sichtbar zu sein und dann zu springen.
            Startet components/WegAnimationen.tsx nicht (Skript lädt nicht), ist nach 4 s wieder alles sichtbar. */}
        <script dangerouslySetInnerHTML={{ __html: VORAB }} />
      </head>
      <body>
        {children}
        <WegAnimationen />
      </body>
    </html>
  );
}
