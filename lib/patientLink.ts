import { z } from "zod";

// Patienten-Link: Die Praxis teilt einen Behandlungsvorschlag per Link oder
// QR-Code. Der Patient sieht seine Optionen auf dem eigenen Gerät und meldet
// zurück, was er besprechen möchte. Der Link enthält keine Patientendaten,
// nur ein zufälliges Token; gespeichert wird dessen Hash.

export const PATIENT_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const PATIENT_RESPONSE_LABELS: Record<string, string> = {
  INTERESSE: "möchte die gewählte Versorgung besprechen",
  RUECKRUF: "bittet um Rückruf",
};

export const patientResponseSchema = z.object({
  response: z.enum(["INTERESSE", "RUECKRUF"]),
  choices: z.record(z.string().max(40), z.string().max(40)).default({}),
  note: z.string().trim().max(500).optional(),
});

/** Auswahl des Patienten lesbar machen, z. B. "Zahn 36: Implantat mit Krone". */
export function describePatientChoices(
  items: { key: string; where: string; options: { id: string; name: string }[] }[],
  choices: unknown,
): string[] {
  if (!choices || typeof choices !== "object") return [];
  const c = choices as Record<string, unknown>;
  return items.flatMap((i) => {
    const o = i.options.find((opt) => opt.id === c[i.key]);
    return o ? [`${i.where}: ${o.name}`] : [];
  });
}

export type PatientLinkState = {
  active: boolean;
  expiresAt: string | null;
  viewedAt: string | null;
  response: string | null;
  respondedAt: string | null;
  note: string | null;
  choiceLabels: string[];
};

export function patientLinkState(
  p: {
    shareTokenHash: string | null;
    shareExpiresAt: Date | null;
    patientViewedAt: Date | null;
    patientResponse: string | null;
    patientRespondedAt: Date | null;
    patientNote: string | null;
    patientChoices: unknown;
  },
  items: Parameters<typeof describePatientChoices>[0],
  now = new Date(),
): PatientLinkState {
  return {
    active: !!p.shareTokenHash && !!p.shareExpiresAt && p.shareExpiresAt > now,
    expiresAt: p.shareExpiresAt?.toISOString() ?? null,
    viewedAt: p.patientViewedAt?.toISOString() ?? null,
    response: p.patientResponse,
    respondedAt: p.patientRespondedAt?.toISOString() ?? null,
    note: p.patientNote,
    choiceLabels: describePatientChoices(items, p.patientChoices),
  };
}
