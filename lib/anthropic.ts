import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
// Ohne echten, kostenpflichtigen API-Key (z. B. im Testbetrieb) wird auf eine
// kostenlose, rein regelbasierte Vorlage ausgewichen, statt die KI-Anfrage
// fehlschlagen zu lassen - so lässt sich der volle Ablauf (Erfassung, Bericht,
// Bearbeitung, PDF) ohne Anthropic-Guthaben testen. Sobald ein echter Key
// gesetzt wird, greift automatisch wieder die echte KI-Generierung.
const HAS_REAL_KEY = Boolean(apiKey && apiKey !== "dummy-key-for-build");
const anthropic = new Anthropic({ apiKey });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export type ReportType = "BEFUND" | "KRANKENKASSE";

interface GenerateReportInput {
  reportType: ReportType;
  practiceName: string;
  authorName: string;
  patient: {
    firstName: string;
    lastName: string;
    birthDate: string | null;
    insuranceName: string | null;
    insuranceNumber: string | null;
  };
  treatmentDate: string | null;
  serviceSummary: string;
  additionalContext: string | null;
}

const TYPE_INSTRUCTIONS: Record<ReportType, string> = {
  BEFUND: `Verfasse einen Befund- und Behandlungsbericht für die Patientenakte bzw. zur Weitergabe an
mit- oder weiterbehandelnde Kolleg:innen. Gliedere in: Anrede/Betreff (falls an eine andere Praxis
gerichtet, sonst neutraler Titel), Befund, durchgeführte Behandlung, ggf. Empfehlung / weiteres
Vorgehen. Sachlicher, präziser zahnmedizinischer Fachstil.`,
  KRANKENKASSE: `Verfasse ein formelles Schreiben an die gesetzliche/private Krankenkasse zur Begründung
der medizinischen Notwendigkeit einer Behandlung bzw. zur Beantragung der Kostenübernahme/-erstattung.
Gliedere in: Anschrift/Betreff, Anrede, kurze Darstellung des Befunds, Begründung der medizinischen
Notwendigkeit der geplanten bzw. durchgeführten Behandlung, konkrete Bitte (z. B. um Kostenübernahme
oder Genehmigung), Grußformel. Formeller, überzeugender, aber sachlicher Stil, wie er gegenüber
Kostenträgern üblich ist.`,
};

// Datenminimierung (Art. 5 und 25 DSGVO, § 203 StGB): An den KI-Dienst gehen
// keine Namen, kein Geburtsdatum und keine Versichertennummer. Stattdessen
// stehen Platzhalter im Auftrag; die echten Angaben setzt erst Sorrida nach
// der Antwort wieder ein. Medizinische Inhalte (Leistungen, Notiz) bleiben,
// sonst kann kein Bericht entstehen; darin vorkommende Namen werden ersetzt.
export const PLATZHALTER = {
  name: "[PATIENT]",
  vorname: "[VORNAME]",
  nachname: "[NACHNAME]",
  geburtsdatum: "[GEBURTSDATUM]",
  versichertennummer: "[VERSICHERTENNUMMER]",
} as const;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Ersetzt Namen (ganzes Wort, ohne Groß/Klein) im Freitext durch Platzhalter. */
export function maskNames(text: string, p: { firstName: string; lastName: string }): string {
  let out = text;
  const full = `${p.firstName} ${p.lastName}`.trim();
  const reps: [string, string][] = [
    [full, PLATZHALTER.name],
    [p.lastName, PLATZHALTER.nachname],
    [p.firstName, PLATZHALTER.vorname],
  ];
  for (const [needle, ph] of reps) {
    if (needle.trim().length < 2) continue;
    out = out.replace(new RegExp(`(?<![\\p{L}])${escapeRe(needle.trim())}(?![\\p{L}])`, "giu"), ph);
  }
  return out;
}

export function pseudonymize(input: GenerateReportInput): GenerateReportInput {
  const p = input.patient;
  return {
    ...input,
    patient: {
      firstName: PLATZHALTER.vorname,
      lastName: PLATZHALTER.nachname,
      birthDate: p.birthDate ? PLATZHALTER.geburtsdatum : null,
      insuranceName: p.insuranceName,
      insuranceNumber: p.insuranceNumber ? PLATZHALTER.versichertennummer : null,
    },
    serviceSummary: maskNames(input.serviceSummary, p),
    additionalContext: input.additionalContext ? maskNames(input.additionalContext, p) : null,
  };
}

/** Setzt die echten Angaben nach der KI-Antwort wieder ein. */
export function reidentify(text: string, p: GenerateReportInput["patient"]): string {
  const name = `${p.firstName} ${p.lastName}`.trim();
  return text
    .split(`${PLATZHALTER.vorname} ${PLATZHALTER.nachname}`).join(name)
    .split(PLATZHALTER.name).join(name)
    .split(PLATZHALTER.vorname).join(p.firstName)
    .split(PLATZHALTER.nachname).join(p.lastName)
    .split(PLATZHALTER.geburtsdatum).join(p.birthDate ?? "[Geburtsdatum ergänzen]")
    .split(PLATZHALTER.versichertennummer).join(p.insuranceNumber ?? "[Versichertennummer ergänzen]");
}

function buildPrompt(input: GenerateReportInput): string {
  const { patient } = input;
  return `Praxis: ${input.practiceName}
Verfasst von: ${input.authorName}
Patient: ${patient.firstName} ${patient.lastName}
Geburtsdatum: ${patient.birthDate ?? "nicht angegeben"}
Krankenkasse: ${patient.insuranceName ?? "nicht angegeben"}${
    patient.insuranceNumber ? ` (Versichertennummer: ${patient.insuranceNumber})` : ""
  }
Behandlungsdatum: ${input.treatmentDate ?? "nicht angegeben"}

Erfasste, tatsächlich erbrachte Leistungen dieser Sitzung (geprüfte Leistungserfassung der Praxis):
${input.serviceSummary}

${
    input.additionalContext
      ? `Zusätzlicher Kontext (ggf. eine kurze, diktierte Notiz der Praxis - formuliere sie sinngemäß
etwas ausführlicher aus, ohne neue Fakten hinzuzuerfinden):\n${input.additionalContext}\n`
      : ""
  }
Erstelle daraus jetzt den vollständigen Bericht.`;
}

const TYPE_HEADING: Record<ReportType, string> = {
  BEFUND: "Befund- und Behandlungsbericht",
  KRANKENKASSE: "Bericht an die Krankenkasse zur Kostenübernahme/-erstattung",
};

// Kostenlose, rein regelbasierte Alternative zur KI-Formulierung: stellt aus
// denselben strukturierten Angaben einen Bericht zusammen, ohne Fließtext zu
// erfinden. Deutlich als Testmodus gekennzeichnet, damit ein so entstandener
// Text nicht mit einem echten KI-Entwurf verwechselt und ungeprüft
// weiterverwendet wird.
function buildTemplateReportText(input: GenerateReportInput): string {
  const { patient } = input;
  const lines: string[] = [];

  lines.push(
    "[TESTMODUS – automatisch aus den erfassten Daten zusammengestellt, ohne KI-Formulierung. " +
      "Kein fertiger Fließtext; vor Verwendung entsprechend ausformulieren und prüfen. " +
      "Für echte KI-generierte Berichte einen Anthropic-API-Key hinterlegen.]"
  );
  lines.push("");
  lines.push(TYPE_HEADING[input.reportType]);
  lines.push(`Praxis: ${input.practiceName}`);
  lines.push(`Verfasst von: ${input.authorName}`);
  lines.push("");
  lines.push(`Patient/in: ${patient.firstName} ${patient.lastName}`);
  lines.push(`Geburtsdatum: ${patient.birthDate ?? "nicht angegeben"}`);
  lines.push(
    `Krankenkasse: ${patient.insuranceName ?? "nicht angegeben"}${
      patient.insuranceNumber ? ` (Versichertennummer: ${patient.insuranceNumber})` : ""
    }`
  );
  lines.push(`Behandlungsdatum: ${input.treatmentDate ?? "nicht angegeben"}`);
  lines.push("");
  lines.push("Erbrachte Leistungen:");
  lines.push(input.serviceSummary);

  if (input.additionalContext) {
    lines.push("");
    lines.push("Zusätzlicher Kontext (unverändert übernommen):");
    lines.push(input.additionalContext);
  }

  return lines.join("\n");
}

export async function generateReportText(input: GenerateReportInput): Promise<string> {
  if (!HAS_REAL_KEY) {
    return buildTemplateReportText(input);
  }

  const systemPrompt = `Du unterstützt eine Zahnarztpraxis dabei, professionelle schriftliche Berichte zu
verfassen. Du bekommst strukturierte Angaben und Stichpunkte der Praxis und formulierst daraus einen
fertigen, gut lesbaren Bericht auf Deutsch.

${TYPE_INSTRUCTIONS[input.reportType]}

Wichtige Regeln:
- Nutze ausschließlich die gegebenen Informationen. Erfinde keine Diagnosen, Befunde, Maßnahmen,
  Zähne/Zahnschemata, Daten oder Zahlen, die nicht genannt wurden.
- Falls für den Berichtstyp üblicherweise eine Angabe fehlt (z. B. Zahnnummer, genaues Datum), lass an
  der Stelle einen Platzhalter in eckigen Klammern stehen, z. B. [Zahnnummer ergänzen], statt zu raten.
- Schreibe im Fließtext bzw. mit klaren Absätzen, keine rohe Stichpunktliste, sofern es sich nicht um
  eine tabellarische Aufstellung handelt.
- Gib ausschließlich den fertigen Berichtstext zurück, ohne einleitende Kommentare wie "Hier ist der Bericht:".
- Der "Zusätzliche Kontext" ist oft eine kurze, ggf. diktierte Stichnotiz. Arbeite ihren Inhalt
  sinngemäß und etwas ausführlicher in den Bericht ein, aber halte dich dabei an die oben
  vorgegebene Gliederung/Struktur des Berichtstyps - die Kürze der Notiz rechtfertigt keine
  Abweichung vom üblichen Aufbau.
- Angaben in eckigen Großbuchstaben wie [VORNAME], [NACHNAME], [PATIENT], [GEBURTSDATUM] oder
  [VERSICHERTENNUMMER] sind Platzhalter für Daten, die die Praxis später einsetzt. Übernimm sie
  unverändert, genau so geschrieben, und ersetze sie nicht durch erfundene Angaben.
- Der Bericht ist ein Entwurf und wird vor Versand von einer approbierten Zahnärztin / einem approbierten
  Zahnarzt geprüft und freigegeben.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: buildPrompt(pseudonymize(input)) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Keine Textantwort vom KI-Modell erhalten.");
  }

  return reidentify(textBlock.text.trim(), input.patient);
}

/** Ist ein echter KI-Zugang hinterlegt? (Sonst Testmodus.) */
export const kiVerfuegbar = () => HAS_REAL_KEY;

/**
 * Formuliert den regelbasierten Überblick vor dem Termin in drei bis vier
 * Sätzen. Eingabe enthält keine Namen; Namen im Freitext werden zusätzlich
 * ersetzt. Gibt null zurück, wenn kein KI-Zugang hinterlegt ist.
 */
export async function generateBriefingSummary(facts: string, patient: { firstName: string; lastName: string }): Promise<string | null> {
  if (!HAS_REAL_KEY) return null;
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: `Du fasst für eine Ärztin oder einen Arzt die Akte vor einem Termin zusammen. Drei bis vier kurze Sätze auf Deutsch.
Regeln: Nur die gegebenen Fakten verwenden, nichts ergänzen, keine Diagnosen oder Therapien vorschlagen.
Zeilen mit ACHTUNG gehören in den ersten Satz. Platzhalter in eckigen Klammern unverändert lassen.`,
    messages: [{ role: "user", content: maskNames(facts, patient) }],
  });
  const t = message.content.find((b) => b.type === "text");
  return t && t.type === "text" ? t.text.trim() : null;
}

/**
 * Übersetzt einen Fehler des KI-Dienstes in einen verständlichen Grund,
 * ohne Schlüssel oder Inhalte preiszugeben.
 */
export function kiFehlerGrund(e: unknown): string {
  if (e instanceof Anthropic.APIError) {
    const msg = String((e as { message?: string }).message ?? "").toLowerCase();
    if (e.status === 401) return "Der KI-Schlüssel ist ungültig (in Vercel prüfen).";
    if (e.status === 403) return "Der KI-Schlüssel hat keine Berechtigung für dieses Modell.";
    if (e.status === 404) return `Das eingestellte Modell ist nicht verfügbar (${MODEL}).`;
    if (e.status === 400 && msg.includes("credit")) return "Das Guthaben beim KI-Anbieter ist aufgebraucht.";
    if (e.status === 429) return "Der KI-Dienst ist gerade ausgelastet. Bitte gleich noch einmal versuchen.";
    if (e.status && e.status >= 500) return "Der KI-Dienst hat gerade eine Störung.";
    return `Der KI-Dienst hat die Anfrage abgelehnt (Status ${e.status ?? "unbekannt"}).`;
  }
  return "Der KI-Dienst ist nicht erreichbar.";
}
