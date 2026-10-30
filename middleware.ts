export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patients/:path*",
    "/reports/:path*",
    "/proposals/:path*",
    "/abschluss/:path*",
    "/settings/:path*",
    "/embed/:path*",
  ],
};
