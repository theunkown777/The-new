import type { MetadataRoute } from "next";
import { RATGEBER } from "@/lib/ratgeber";

const base = (process.env.NEXTAUTH_URL ?? "https://sorrida.de").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/ratgeber`, changeFrequency: "monthly", priority: 0.7 },
    ...RATGEBER.map((a) => ({ url: `${base}/ratgeber/${a.slug}`, lastModified: a.updated, changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: `${base}/demo`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/impressum`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/datenschutz`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
