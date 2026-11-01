/** @type {import('next').NextConfig} */

// Sicherheits-Header für alle Seiten (Art. 32 DSGVO, Stand der Technik):
// nur HTTPS, kein Einbetten in fremde Seiten, keine Pfade mit Portal-Token
// im Referrer an Dritte, Mikrofon nur für das eigene Befund-Diktat.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" },
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
    // Die Website-Route liest public/landing.html direkt von der Platte.
    outputFileTracingIncludes: { "/website": ["./public/landing.html"] },
  },
};

module.exports = nextConfig;
