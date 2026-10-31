/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
    // Die Website-Route liest public/landing.html direkt von der Platte.
    outputFileTracingIncludes: { "/website": ["./public/landing.html"] },
  },
};

module.exports = nextConfig;
