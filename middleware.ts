export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patients/:path*",
    "/reports/:path*",
    "/proposals/:path*",
    "/settings/:path*",
    "/embed/:path*",
  ],
};
