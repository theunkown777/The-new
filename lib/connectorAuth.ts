import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { hashConnectorKey } from "@/lib/connector";

/**
 * Anmeldung des Sorrida-Connectors mit dem Praxis-Schlüssel (Authorization: Bearer sor_conn_...).
 * Gemeinsam für Start, Verbindungstest und Abholen der Ergebnisse; 60 Aufrufe je Minute und Schlüssel.
 */
export async function connectorAnmelden(req: Request) {
  const match = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) return { fehler: NextResponse.json({ error: "Connector-Schlüssel fehlt." }, { status: 401 }) } as const;
  const keyHash = hashConnectorKey(match[1].trim());
  const rateKey = `connector:${keyHash.slice(0, 16)}`;
  if (await isRateLimited(rateKey, 60, 60_000)) {
    return { fehler: NextResponse.json({ error: "Zu viele Aufrufe. Bitte kurz warten." }, { status: 429 }) } as const;
  }
  await recordAttempt(rateKey, 60_000);
  const key = await prisma.connectorKey.findUnique({ where: { keyHash }, include: { practice: { select: { name: true } } } });
  if (!key || key.revokedAt) {
    return {
      fehler: NextResponse.json(
        { error: "Connector-Schlüssel ungültig oder widerrufen. Bitte in Sorrida unter Einstellungen → Praxissoftware einen neuen erzeugen." },
        { status: 401 }
      ),
    } as const;
  }
  return { key } as const;
}

/** Rückmeldung des Connectors ("SorridaConnector/2.0; rueckweg=1"): nur Version und Schalter, keine Patientendaten. */
export const connectorInfoAus = (req: Request) => (req.headers.get("x-sorrida-connector") ?? "").replace(/[^\w ./;=,:-]/g, "").slice(0, 120) || null;
