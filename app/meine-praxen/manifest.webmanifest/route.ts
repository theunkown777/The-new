import { NextResponse } from "next/server";

// Eigenes, festes Manifest für „Meine Praxen auf diesem Gerät“: ohne Token, ohne Praxis, ohne Datenbank.
// scope /meine-praxen: Als Web-App auf dem Startbildschirm öffnet sie nur die Liste. Ein Portal öffnet sich von dort
// wie ein gewöhnlicher Link (jede Praxis bleibt eine eigene Seite mit eigenem Token).
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    {
      id: "/meine-praxen",
      name: "Meine Praxen auf diesem Gerät",
      short_name: "Meine Praxen",
      start_url: "/meine-praxen",
      scope: "/meine-praxen",
      display: "standalone",
      background_color: "#F5F2EE",
      theme_color: "#F5F2EE",
      lang: "de",
      icons: [
        { src: "/brand/meine-praxen-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/brand/meine-praxen-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/brand/meine-praxen-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=86400" } },
  );
}
