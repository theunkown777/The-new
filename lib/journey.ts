// Der Behandlungsweg: Sorridas Leitidee. Jeder Patient läuft dieselben
// fünf Stationen ab, vom Gespräch bis zur bezahlten Rechnung. Praxis und
// Patient sehen denselben Weg, jeweils mit ihrem nächsten Schritt.

export const STATIONEN = ["Gespräch", "Vorschlag", "Entscheidung", "Vereinbart", "Bezahlt"] as const;
export type Station = (typeof STATIONEN)[number];

export interface JourneyInput {
  proposal?: {
    status: string;
    shareCreatedAt?: Date | null;
    patientViewedAt?: Date | null;
    patientResponse?: string | null;
    patientRespondedAt?: Date | null;
    eigenanteilCent?: number;
    createdAt?: Date;
    agreedAt?: Date | null;
  } | null;
  invoices?: { status: string; dueDate: Date }[];
  anamnesisSubmitted?: boolean;
}

export type Tone = "aktiv" | "warten" | "erledigt" | "achtung" | "ruhig";

export interface Journey {
  /** Erreichte Stationen, 0 = noch nichts. */
  erreicht: number;
  /** Station, an der es gerade hängt (Index), null wenn alles erledigt oder kein Vorgang. */
  aktuell: number | null;
  /** Nächster Schritt für die Praxis. */
  praxis: { text: string; tone: Tone };
  /** Nächster Schritt aus Sicht des Patienten. */
  patient: string;
  abgelehnt: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

export function journey(input: JourneyInput, now = new Date()): Journey {
  const p = input.proposal;
  const inv = input.invoices ?? [];
  if (!p) {
    return {
      erreicht: 0,
      aktuell: 0,
      praxis: input.anamnesisSubmitted
        ? { text: "Anamnese liegt vor: Gespräch führen und Vorschlag erstellen", tone: "aktiv" }
        : { text: "Nach dem Gespräch: Vorschlag erstellen", tone: "ruhig" },
      patient: "Ihr Gespräch in der Praxis steht an.",
      abgelehnt: false,
    };
  }
  if (p.status === "ABGELEHNT") {
    return { erreicht: 3, aktuell: null, praxis: { text: "Abgelehnt: bei Bedarf später erneut anbieten", tone: "ruhig" }, patient: "Sie haben sich gegen die Behandlung entschieden.", abgelehnt: true };
  }
  if (p.status === "ANGENOMMEN") {
    const open = inv.filter((i) => i.status === "OFFEN" || i.status === "GEMELDET");
    const paid = inv.some((i) => i.status === "BEZAHLT");
    if ((p.eigenanteilCent ?? 0) === 0 || (paid && open.length === 0)) {
      return { erreicht: 5, aktuell: null, praxis: { text: "Abgeschlossen", tone: "erledigt" }, patient: "Alles erledigt. Vielen Dank!", abgelehnt: false };
    }
    if (!inv.length) return { erreicht: 4, aktuell: 4, praxis: { text: "Vereinbart: Rechnung für den Eigenanteil erstellen", tone: "aktiv" }, patient: "Die Rechnung für Ihren Eigenanteil folgt.", abgelehnt: false };
    if (open.some((i) => i.status === "GEMELDET")) return { erreicht: 4, aktuell: 4, praxis: { text: "Zahlung gemeldet: Eingang prüfen", tone: "aktiv" }, patient: "Danke, Ihre Zahlung wird geprüft.", abgelehnt: false };
    const overdue = open.some((i) => i.dueDate.getTime() < now.getTime() - DAY);
    return overdue
      ? { erreicht: 4, aktuell: 4, praxis: { text: "Rechnung überfällig: erinnern", tone: "achtung" }, patient: "Bitte begleichen Sie Ihren Eigenanteil.", abgelehnt: false }
      : { erreicht: 4, aktuell: 4, praxis: { text: "Rechnung offen: Zahlung abwarten", tone: "warten" }, patient: "Ihren Eigenanteil überweisen.", abgelehnt: false };
  }
  // ENTWURF / BESPROCHEN
  if (p.agreedAt) {
    return { erreicht: 4, aktuell: 4, praxis: { text: "Einverständnis unterschrieben: Termin planen, Vereinbarung gegenzeichnen", tone: "aktiv" }, patient: "Danke für Ihr Einverständnis. Die Praxis plant Ihren Termin.", abgelehnt: false };
  }
  if (p.patientResponse) {
    const wartet = p.patientRespondedAt && now.getTime() - p.patientRespondedAt.getTime() > 2 * DAY;
    return {
      erreicht: 3,
      aktuell: 3,
      praxis: {
        text: p.patientResponse === "RUECKRUF" ? "Rückruf gewünscht: heute anrufen" : "Patient möchte besprechen: Termin vereinbaren",
        tone: wartet ? "achtung" : "aktiv",
      },
      patient: "Danke für Ihre Rückmeldung. Die Praxis meldet sich bei Ihnen.",
      abgelehnt: false,
    };
  }
  if (p.shareCreatedAt) {
    if (!p.patientViewedAt && now.getTime() - p.shareCreatedAt.getTime() > 3 * DAY) {
      return { erreicht: 2, aktuell: 2, praxis: { text: "Link seit Tagen ungeöffnet: kurz anrufen", tone: "achtung" }, patient: "Ihren Vorschlag ansehen und wählen.", abgelehnt: false };
    }
    return { erreicht: 2, aktuell: 2, praxis: { text: p.patientViewedAt ? "Vorschlag angesehen: Rückmeldung abwarten" : "Link gesendet: Öffnen abwarten", tone: "warten" }, patient: "Ihren Vorschlag ansehen und wählen.", abgelehnt: false };
  }
  return { erreicht: 1, aktuell: 1, praxis: { text: "Vorschlag erstellt: Patienten-Link senden", tone: "aktiv" }, patient: "Ihre Praxis bereitet Ihren Vorschlag vor.", abgelehnt: false };
}

export const TONE_STYLE: Record<Tone, string> = {
  aktiv: "text-brand-700",
  warten: "text-slate-600",
  erledigt: "text-salbei-700",
  achtung: "text-red-700",
  ruhig: "text-slate-500",
};
