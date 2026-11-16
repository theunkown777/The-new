import { NextResponse } from "next/server";
import { requireRecht } from "@/lib/permissions";
import { auditFromSession } from "@/lib/audit";
import { kiFehlerGrund } from "@/lib/anthropic";
import { KI_ANTWORT_HINWEIS, KiAntwortFehler, PREISLISTE_DATEI_MAX, dateitypPasst, istPreislisteDateityp, kiHilfenZugang, kiPreislisteLesen } from "@/lib/kiHilfen";

// Preisliste von einem Foto oder einer PDF-Seite lesen (Einstellungen → Fachgebiet und Leistungen →
// Preisliste einlesen). Nur für die Praxisleitung, nur mit eingeschalteten KI-Hilfen. Die Datei bleibt
// im Arbeitsspeicher und wird nicht gespeichert. Zurück kommen Zeilen „Bezeichnung, Betrag“ als
// Entwurf; gespeichert wird erst, was die Praxis in der Vorschau Zeile für Zeile bestätigt.
export async function POST(req: Request) {
  const { session, error } = await requireRecht("einstellungen.aendern");
  if (!session) return error;

  const zuGross = NextResponse.json({ error: "Die Datei ist größer als 5 MB. Bitte ein kleineres Foto oder eine einzelne PDF-Seite wählen." }, { status: 413 });
  if (Number(req.headers.get("content-length") ?? 0) > PREISLISTE_DATEI_MAX + 64 * 1024) return zuGross;
  const form = await req.formData().catch(() => null);
  const datei = form?.get("datei");
  if (!(datei instanceof File) || datei.size === 0) return NextResponse.json({ error: "Bitte ein Foto oder eine PDF-Seite wählen." }, { status: 400 });
  if (datei.size > PREISLISTE_DATEI_MAX) return zuGross;
  const typ = datei.type;
  if (!istPreislisteDateityp(typ)) return NextResponse.json({ error: "Bitte ein Foto (JPG, PNG, WebP) oder eine PDF-Datei wählen." }, { status: 415 });
  const bytes = Buffer.from(await datei.arrayBuffer());
  if (!dateitypPasst(bytes, typ)) return NextResponse.json({ error: "Die Datei passt nicht zu ihrem Dateityp. Bitte ein Foto oder eine PDF-Datei wählen." }, { status: 415 });

  const zugang = await kiHilfenZugang(session.user.practiceId, "preisliste");
  if (!zugang.ok) return NextResponse.json({ error: zugang.error }, { status: zugang.status });

  try {
    const zeilen = await kiPreislisteLesen({ mediaType: typ, base64: bytes.toString("base64") });
    await auditFromSession(session, "ki.preisliste", { summary: `${zeilen.length} Zeilen gelesen` });
    return NextResponse.json({ zeilen, entwurf: true });
  } catch (e) {
    if (e instanceof KiAntwortFehler) return NextResponse.json({ error: KI_ANTWORT_HINWEIS }, { status: 502 });
    console.error("KI-Preisliste fehlgeschlagen", e instanceof Error ? e.name : "Fehler");
    return NextResponse.json({ error: `Lesen mit KI nicht möglich: ${kiFehlerGrund(e)} Sie können die Liste als Text einfügen.` }, { status: 502 });
  }
}
