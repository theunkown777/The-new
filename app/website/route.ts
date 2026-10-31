// Liefert die statische Website (public/landing.html) mit der eigenen Adresse
// in Link-Vorschau und Canonical aus. Messenger brauchen absolute Bild-URLs,
// die eine statische Datei nicht kennen kann. "/" wird hierher umgeleitet.
const ORIGIN = /__ORIGIN__/g;

export async function GET(req: Request) {
  const origin = (process.env.NEXTAUTH_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  const res = await fetch(new URL("/landing.html", req.url), { cache: "force-cache" });
  if (!res.ok) return new Response("Website nicht gefunden", { status: 502 });
  const html = (await res.text()).replace(ORIGIN, origin);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400" },
  });
}
