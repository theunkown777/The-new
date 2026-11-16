import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRecht } from "@/lib/permissions";
import { auditFromSession } from "@/lib/audit";
import { kiFehlerGrund } from "@/lib/anthropic";
import { KI_ANTWORT_HINWEIS, KiAntwortFehler, kiHilfenZugang, kiLeistungUebersetzen } from "@/lib/kiHilfen";

// Entwurf einer Übersetzung für eine eigene Leistung (Name und Hinweis) in en, tr, uk, ru, pl, ar.
// Nur für die Praxisleitung und nur mit eingeschalteten KI-Hilfen. Gespeichert wird hier nichts:
// Der Entwurf erscheint in den Einstellungen als „maschinell übersetzt, bitte prüfen“. Patienten
// sehen ihn erst, wenn die Praxis ihn als geprüft bestätigt und speichert (lib/eigeneLeistung.ts).
const schema = z.object({ name: z.string().trim().min(2).max(120), kurz: z.string().trim().max(300).optional().nullable() });

export async function POST(req: Request) {
  const { session, error } = await requireRecht("einstellungen.aendern");
  if (!session) return error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte zuerst den Namen der Leistung eintragen." }, { status: 400 });

  const zugang = await kiHilfenZugang(session.user.practiceId, "uebersetzung");
  if (!zugang.ok) return NextResponse.json({ error: zugang.error }, { status: zugang.status });

  try {
    const uebersetzungen = await kiLeistungUebersetzen({ name: parsed.data.name, kurz: parsed.data.kurz });
    await auditFromSession(session, "ki.uebersetzung", { summary: "Entwurf in sechs Sprachen" });
    return NextResponse.json({ uebersetzungen, entwurf: true });
  } catch (e) {
    if (e instanceof KiAntwortFehler) return NextResponse.json({ error: KI_ANTWORT_HINWEIS }, { status: 502 });
    console.error("KI-Übersetzung fehlgeschlagen", e instanceof Error ? e.name : "Fehler");
    return NextResponse.json({ error: `Übersetzen mit KI nicht möglich: ${kiFehlerGrund(e)} Sie können die Felder selbst ausfüllen.` }, { status: 502 });
  }
}
