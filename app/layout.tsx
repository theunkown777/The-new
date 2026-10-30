import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sorrida",
  description: "Nach der Behandlung ein Klick: Leistungen, Bericht, Behandlungsvorschlag und Patientenschreiben für Zahnarztpraxen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={openSans.variable}>
      <body>{children}</body>
    </html>
  );
}
