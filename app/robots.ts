import type { MetadataRoute } from "next";

const base = (process.env.NEXTAUTH_URL ?? "https://www.sorrida.com").replace(/\/$/, "");

// Suchmaschinen sehen nur die Informationsseiten. App, Anmeldung, Gastzugang, Patientenlinks, die Terminseiten
// der Praxen und alle Schnittstellen gehören nicht hinein. Zusätzlich senden diese Seiten „noindex“ (proxy.ts, next.config.js).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/"],
      disallow: [
        "/api/", "/p/", "/a/", "/t/", "/portal/", "/embed/", "/uebergabe", "/empfang",
        "/login", "/register", "/demo", "/demnaechst", "/verify-email", "/reset-password", "/forgot-password", "/accept-invite",
        "/dashboard", "/patients", "/reports", "/proposals", "/abschluss", "/settings", "/zahlungen", "/analyse", "/anfragen", "/vorsorge",
        "/praxismanager", "/termine", "/abrechnungspruefung", "/abrechnung", "/mein-bereich", "/leistungsverzeichnis", "/modelle", "/eingang", "/anatomie",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
