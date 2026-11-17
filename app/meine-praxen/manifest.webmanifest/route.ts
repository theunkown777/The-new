import { NextResponse } from "next/server";
import { GERAET_UI, pickPortalLang, portalDir } from "@/lib/portalI18n";

// Eigenes, festes Manifest für „Meine Praxen auf diesem Gerät“: ohne Token, ohne Praxis, ohne Datenbank. Einzige
// Angabe aus der Adresse ist die Sprache (?lang=), damit Name und Kurzname zur Sprache der Seite passen.
// display "browser": Das Symbol auf dem Startbildschirm öffnet die Liste im Browser. Eine eigenständige Web-App
// hätte auf dem iPhone einen eigenen Speicher, getrennt von Safari, und zeigte deshalb eine leere Liste.
// scope /meine-praxen: Ein Portal öffnet sich von dort wie ein gewöhnlicher Link (jede Praxis bleibt eine eigene Seite
// mit eigenem Token).
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const lang = pickPortalLang(new URL(req.url).searchParams.get("lang") ?? undefined, null);
  const t = GERAET_UI[lang];
  return NextResponse.json(
    {
      id: "/meine-praxen",
      name: t.liste,
      short_name: t.kurzTitel,
      start_url: lang === "de" ? "/meine-praxen" : `/meine-praxen?lang=${lang}`,
      scope: "/meine-praxen",
      display: "browser",
      background_color: "#F5F2EE",
      theme_color: "#F5F2EE",
      lang,
      dir: portalDir(lang),
      icons: [
        { src: "/brand/meine-praxen-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/brand/meine-praxen-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/brand/meine-praxen-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=86400" } },
  );
}
