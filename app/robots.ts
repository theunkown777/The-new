import type { MetadataRoute } from "next";

const base = (process.env.NEXTAUTH_URL ?? "https://sorrida.de").replace(/\/$/, "");

// Patienten-Links (/p/…), die App und das Praxissoftware-Fenster gehören nicht in Suchmaschinen.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/zahnmedizin", "/fachgebiete", "/ratgeber", "/demo", "/avv", "/impressum", "/datenschutz"],
      disallow: ["/p/", "/a/", "/api/", "/embed/", "/dashboard", "/patients", "/reports", "/proposals", "/abschluss", "/settings"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
