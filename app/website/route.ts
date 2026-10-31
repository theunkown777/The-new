import { readFile } from "fs/promises";
import path from "path";

// Liefert die statische Website (public/landing.html) mit der eigenen Adresse
// in Link-Vorschau und Canonical aus. Messenger brauchen absolute Bild-URLs,
// die eine statische Datei nicht kennen kann. "/" wird hierher umgeleitet.
//
// Gelesen wird direkt von der Platte, nicht per HTTP: Bei aktivem
// Vercel-Schutz kam sonst die Login-Seite zurück und wurde zwischengespeichert.
const ORIGIN = /__ORIGIN__/g;
const MARKER = "SORRIDA";

export const dynamic = "force-dynamic";

async function loadLanding(req: Request): Promise<string | null> {
  try {
    return await readFile(path.join(process.cwd(), "public", "landing.html"), "utf8");
  } catch {
    const res = await fetch(new URL("/landing.html", req.url), { cache: "no-store" }).catch(() => null);
    return res?.ok ? res.text() : null;
  }
}

export async function GET(req: Request) {
  const origin = (process.env.NEXTAUTH_URL?.startsWith("http") ? process.env.NEXTAUTH_URL : `https://${process.env.NEXTAUTH_URL ?? new URL(req.url).host}`).replace(/\/$/, "");
  const html = await loadLanding(req);
  if (!html || !html.includes(MARKER)) {
    // Nie eine fremde Seite (z. B. Login-Schutz) zwischenspeichern.
    return new Response("Website vorübergehend nicht verfügbar", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(html.replace(ORIGIN, origin), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300" },
  });
}
