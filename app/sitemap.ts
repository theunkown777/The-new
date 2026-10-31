import type { MetadataRoute } from "next";
import { RATGEBER } from "@/lib/ratgeber";
import { SPECIALTIES } from "@/lib/specialties";

const base = (process.env.NEXTAUTH_URL ?? "https://sorrida.de").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/zahnmedizin`, changeFrequency: "weekly", priority: 0.9 },
    ...SPECIALTIES.map((x) => ({ url: `${base}/fachgebiete/${x.id}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${base}/ratgeber`, changeFrequency: "monthly", priority: 0.7 },
    ...RATGEBER.map((a) => ({ url: `${base}/ratgeber/${a.slug}`, lastModified: a.updated, changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: `${base}/demo`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/avv`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/impressum`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/datenschutz`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
