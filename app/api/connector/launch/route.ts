import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";
import { generateToken } from "@/lib/tokens";
import {
  EMBED_VIEWS,
  LAUNCH_TOKEN_TTL_MS,
  extractHandoverPatient,
  hashConnectorKey,
  vddsToPatientFields,
  type EmbedView,
} from "@/lib/connector";

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_BODY_BYTES = 16 * 1024;

// Vom Sorrida-Connector aufgerufen, wenn die Praxissoftware über VDDS-media
// einen Patienten übergibt. Body: der [PATIENT]-Abschnitt der
// Übergabedatei als Text. Antwort: eine Start-URL mit Einmal-Token für das
// Fenster - Patientendaten stehen nie in der URL.
export async function POST(req: Request) {
  const match = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) return NextResponse.json({ error: "Connector-Schlüssel fehlt." }, { status: 401 });

  const keyHash = hashConnectorKey(match[1].trim());
  const rateKey = `connector:${keyHash.slice(0, 16)}`;
  if (await isRateLimited(rateKey, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: "Zu viele Aufrufe. Bitte kurz warten." }, { status: 429 });
  }
  await recordAttempt(rateKey, RATE_WINDOW_MS);

  const key = await prisma.connectorKey.findUnique({ where: { keyHash } });
  if (!key || key.revokedAt) {
    return NextResponse.json(
      { error: "Connector-Schlüssel ungültig oder widerrufen. Bitte in Sorrida unter Einstellungen → Praxissoftware einen neuen erzeugen." },
      { status: 401 }
    );
  }

  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Übergabedatei zu groß." }, { status: 413 });
  }
  const { data, error } = extractHandoverPatient(text);
  if (!data) return NextResponse.json({ error }, { status: 400 });

  const url = new URL(req.url);
  const requestedView = url.searchParams.get("view");
  const view: EmbedView = (EMBED_VIEWS as readonly string[]).includes(requestedView ?? "")
    ? (requestedView as EmbedView)
    : "abschluss";

  const fields = vddsToPatientFields(data);
  const patient = await prisma.patient.upsert({
    where: {
      practiceId_externalSource_externalId: {
        practiceId: key.practiceId,
        externalSource: data.PVS.toUpperCase(),
        externalId: data.PATID,
      },
    },
    create: {
      practiceId: key.practiceId,
      externalSource: data.PVS.toUpperCase(),
      externalId: data.PATID,
      ...fields,
    },
    // Leere Angaben der PVS überschreiben vorhandene Daten nicht.
    update: Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null)),
    select: { id: true },
  });

  await prisma.connectorKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });

  // INFO=1: PVS meldet nur Stammdatenänderungen, ohne dass ein Fenster aufgeht.
  if (data.INFO === "1") return NextResponse.json({ ok: true, info: true });

  const { raw, hash } = generateToken();
  await prisma.launchToken.create({
    data: {
      practiceId: key.practiceId,
      patientId: patient.id,
      view,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + LAUNCH_TOKEN_TTL_MS),
    },
  });

  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? url.origin;
  return NextResponse.json({ ok: true, url: `${base}/embed/launch?t=${raw}` });
}
