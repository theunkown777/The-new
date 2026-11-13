import type { MetadataRoute } from "next";
import { RATGEBER } from "@/lib/ratgeber";
import { SPECIALTIES } from "@/lib/specialties";

const base = (process.env.NEXTAUTH_URL ?? "https://sorrida.de").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/vorschau`, changeFrequency: "monthly", priority: 0.8 },
    ...["zahn", ...SPECIALTIES.map((x) => x.id)].map((id) => ({ url: `${base}/fachgebiete/${id}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${base}/ratgeber`, changeFrequency: "monthly", priority: 0.7 },
    ...["/anatomie", "/anatomie/koerper", "/anatomie/gebiss", "/anatomie/auge", "/anatomie/ohr", "/anatomie/haut"].map((p) => ({ url: `${base}${p}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...RATGEBER.map((a) => ({ url: `${base}/ratgeber/${a.slug}`, lastModified: a.updated, changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: `${base}/hilfe`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/demo`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/avv`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/impressum`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/datenschutz`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
