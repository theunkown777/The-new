import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { portalPatient } from "@/lib/portalAuth";

// Patientenportal als Web-App: "Zum Startbildschirm hinzufügen" öffnet
// direkt das eigene Portal, mit dem Namen der Praxis.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const patient = await portalPatient(params.token);
  if (!patient) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const practice = await prisma.practice.findUnique({ where: { id: patient.practiceId }, select: { name: true } });
  const name = practice?.name ?? "Patientenportal";
  return NextResponse.json(
    {
      name: `${name} · Patientenportal`,
      short_name: name.length > 18 ? "Mein Portal" : name,
      start_url: `/portal/${params.token}`,
      scope: `/portal/${params.token}`,
      display: "standalone",
      background_color: "#F5F2EE",
      theme_color: "#6b2a24",
      lang: "de",
      icons: [{ src: "/brand/sorrida-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" } },
  );
}
