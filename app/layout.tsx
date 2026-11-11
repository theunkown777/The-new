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
  description: "Sorrida – damit beide Seiten lächeln. Nach der Behandlung ein Klick: Leistungen, Bericht, Behandlungsvorschlag, Patienten-Link und Anamnese für Praxen jeder Fachrichtung",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${openSans.variable} ${cormorant.variable}`}>
      <body>
        {children}
        <WegAnimationen />
      </body>
    </html>
  );
}
