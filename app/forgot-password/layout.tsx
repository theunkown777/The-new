import type { Metadata } from "next";

// Eigener Titel im Browser-Tab (die Seite selbst ist eine Client-Seite und kann kein metadata ausgeben).
export const metadata: Metadata = { title: "Passwort vergessen – Sorrida" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
