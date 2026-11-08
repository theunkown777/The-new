import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { connectorAnmelden, connectorInfoAus } from "@/lib/connectorAuth";
import { generateToken } from "@/lib/tokens";
import {
  EMBED_VIEWS,
  LAUNCH_TOKEN_TTL_MS,
  extractHandoverPatient,
  kennungMerken,
  vddsToPatientFields,
  type EmbedView,
} from "@/lib/connector";
import { istVorschauHost, vorschauPass } from "@/lib/vorschau";

const MAX_BODY_BYTES = 16 * 1024;

// Vom Sorrida-Connector aufgerufen, wenn die Praxissoftware über VDDS-media
// einen Patienten übergibt. Body: der [PATIENT]-Abschnitt der
// Übergabedatei als Text. Antwort: eine Start-URL mit Einmal-Token für das
// Fenster - Patientendaten stehen nie in der URL.
export async function POST(req: Request) {
  const anmeldung = await connectorAnmelden(req);
  if ("fehler" in anmeldung) return anmeldung.fehler;
  const key = anmeldung.key;

  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Übergabedatei zu groß." }, { status: 413 });
  }
  const { data, error, sorridaKennung } = extractHandoverPatient(text);
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

  const info = connectorInfoAus(req);
  await prisma.connectorKey.update({
    where: { id: key.id },
    // Kennung je Praxissoftware merken: Die Rückgabe (6310) muss den Absender tragen, unter dem genau diese Software Sorrida führt.
    data: { lastUsedAt: new Date(), ...(sorridaKennung ? { gdtKennung: kennungMerken(key.gdtKennung, data.PVS.toUpperCase(), sorridaKennung) } : {}), ...(info ? { connectorInfo: info } : {}) },
  });

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

  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || url.origin;
  // Eigene Domain noch im Vorschau-Modus: Passierschein mitgeben, sonst zeigt das Fenster nur „Demnächst“.
  const pass = istVorschauHost(new URL(base).host) ? `&vp=${encodeURIComponent(await vorschauPass())}` : "";
  return NextResponse.json({ ok: true, url: `${base}/embed/launch?t=${raw}${pass}` });
}
