/** @type {import('next').NextConfig} */

// Sicherheits-Header für alle Seiten (Art. 32 DSGVO, Stand der Technik):
// nur HTTPS, kein Einbetten in fremde Seiten, keine Pfade mit Portal-Token
// im Referrer an Dritte, Mikrofon nur für das eigene Befund-Diktat.
// Inhaltsrichtlinie: Sorrida lädt nichts von fremden Servern. Skripte, Schriften, Bilder und
// Verbindungen sind nur von der eigenen Adresse erlaubt; eingeschleuster Code kann so weder fremde
// Skripte nachladen noch Daten an fremde Server schicken. 'unsafe-inline' bleibt nötig, weil Next.js
// beim Seitenaufbau eigene Inline-Skripte und -Stile setzt. blob: und data: braucht es für die
// 3D-Modelle (Rechenkern im Hintergrund), QR-Codes und Datei-Downloads.
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' blob: data:${dev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "frame-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()" },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Portal- und Freigabe-Links enthalten das Zugangstoken im Pfad.
      { source: "/(portal|p|a)/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
};

module.exports = nextConfig;
