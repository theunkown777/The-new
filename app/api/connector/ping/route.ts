import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connectorAnmelden, connectorInfoAus } from "@/lib/connectorAuth";

export const dynamic = "force-dynamic";

// Verbindungstest des Connectors ("SorridaConnector.exe --test" und nach der Installation):
// prüft Adresse, Netz, Zertifikat und Schlüssel und meldet die Praxis zurück.
export async function GET(req: Request) {
  const a = await connectorAnmelden(req);
  if ("fehler" in a) return a.fehler;
  const info = connectorInfoAus(req);
  await prisma.connectorKey.update({ where: { id: a.key.id }, data: { lastUsedAt: new Date(), ...(info ? { connectorInfo: info } : {}) } });
  return NextResponse.json({ ok: true, praxis: a.key.practice.name, arbeitsplatz: a.key.name, zeit: new Date().toISOString() });
}
