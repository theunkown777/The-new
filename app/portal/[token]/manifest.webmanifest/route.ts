import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { portalPatient } from "@/lib/portalAuth";
import { praxisKennzeichen } from "@/lib/praxisKennung";

// Patientenportal als Web-App: "Zum Startbildschirm hinzufügen" öffnet
// direkt das eigene Portal, mit dem Namen der Praxis.
// Jede Praxis bekommt ein eigenes Erscheinungsbild auf dem Startbildschirm: kurzer Praxisname statt „Mein Portal“,
// Farbe und Symbol der Gruppe (Zahn, Arzt, Therapie; feste Dateien unter public/brand, Inhaltsrichtlinie 'self').
// Abwägung Diskretion: Der kurze Praxisname ist auf dem Startbildschirm für jeden sichtbar, der das Gerät sieht.
// Er erscheint nur, wenn der Patient das Portal selbst dort ablegt. Auf dem iPhone kann er den Namen dabei ändern,
// im Installationsdialog von Chrome unter Android nicht immer. name nennt Praxis und Fach (Android zeigt das beim
// Start). Chrome kann installierte Web-Apps samt start_url mit dem Google-Konto abgleichen. Ohne Namen sähen
// Hausarzt und Zahnarzt gleich aus; das wiegt schwerer. Die ganze Abwägung, auch zum Tab-Titel, steht in
// app/portal/[token]/page.tsx; die Rechtsfrage dazu ist offen.
export async function GET(_req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const patient = await portalPatient(params.token);
  if (!patient) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const practice = await prisma.practice.findUnique({ where: { id: patient.practiceId }, select: { name: true, specialty: true, stammdaten: true } });
  const k = praxisKennzeichen({ name: practice?.name ?? "Behandlungsweg", specialty: practice?.specialty, stammdaten: practice?.stammdaten });
  return NextResponse.json(
    {
      // Eigene Kennung je Link: Zwei Praxen ergeben zwei getrennte Web-Apps.
      id: `/portal/${params.token}`,
      name: `${k.name} · ${k.fachKurz}`,
      short_name: k.kurzName,
      start_url: `/portal/${params.token}`,
      scope: `/portal/${params.token}`,
      display: "standalone",
      background_color: "#F5F2EE",
      theme_color: k.farbe,
      lang: "de",
      icons: [
        { src: k.symbol.png192, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: k.symbol.png512, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: k.symbol.png512, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" } },
  );
}
