import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DOC_MAX_BYTES, safeFileName, sniffMime } from "@/lib/akte";
import { patientInPractice } from "@/lib/patientScope";
import { auditFromSession } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { session, patient, error } = await patientInPractice(params.id);
  if (error) return error;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Keine Datei erhalten." }, { status: 400 });
  if (file.size > DOC_MAX_BYTES) return NextResponse.json({ error: "Die Datei ist größer als 5 MB." }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) return NextResponse.json({ error: "Nur PDF, PNG und JPEG sind erlaubt." }, { status: 415 });
  const doc = await prisma.patientDocument.create({
    data: { practiceId: session.user.practiceId, patientId: patient.id, name: safeFileName(file.name), mime, size: bytes.length, data: Buffer.from(bytes), createdBy: session.user.name ?? null },
    select: { id: true, name: true, mime: true, size: true, createdAt: true, createdBy: true },
  });
  await auditFromSession(session, "akte.dokument", { entityType: "Patient", entityId: patient.id, summary: "hochgeladen" });
  return NextResponse.json({ document: doc }, { status: 201 });
}
