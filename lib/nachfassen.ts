import {
  buildProposal,
  showsJahresvergleich,
  summarize,
  tageBisStichtag,
  vergleicheJahre,
  type Prices,
} from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";

// Nachfass-Liste: offene Vorschläge, bei denen die Praxis nachhaken sollte. Vor dem 1.1.2027 stehen
// Zahnersatz-Vorschläge oben, weil die Kasse bei späterer Bewilligung weniger zuzahlt. Danach bleibt
// die Liste als allgemeine Übersicht „Wer hat noch nicht entschieden?“.

export interface NachfassQuelle {
  id: string;
  status: string;
  input: unknown;
  choices: unknown;
  createdAt: Date;
  shareCreatedAt: Date | null;
  shareExpiresAt: Date | null;
  patientViewedAt: Date | null;
  patientResponse: string | null;
  patientRespondedAt: Date | null;
  agreedAt: Date | null;
  nachgefasstAt: Date | null;
  hkpEingereichtAt: Date | null;
  patient: { id: string; firstName: string; lastName: string; phone: string | null; whatsappConsentAt: Date | null };
}

export type NachfassStand = "ohne-link" | "nicht-geoeffnet" | "geoeffnet" | "rueckmeldung" | "unterschrieben";

export interface NachfassZeile {
  id: string;
  patient: NachfassQuelle["patient"];
  alterTage: number;
  eigenanteil: number;
  /** Nur bei Zahnersatz für Kassenpatienten vor dem Stichtag: Eigenanteil bei Bewilligung ab 1.1.2027 und Unterschied. */
  stichtag: { eigenanteil2027: number; mehr: number } | null;
  stand: NachfassStand;
  standText: string;
  nachgefasstAt: Date | null;
  hkpEingereichtAt: Date | null;
  /** Was die Praxis als Nächstes tun sollte. */
  tun: string;
}

const tage = (von: Date, bis: Date) => Math.max(0, Math.floor((bis.getTime() - von.getTime()) / 864e5));

export function nachfassZeile(p: NachfassQuelle, prices: Prices, now = new Date()): NachfassZeile | null {
  if (p.status !== "ENTWURF" && p.status !== "BESPROCHEN") return null;
  const input = proposalInputSchema.safeParse(p.input);
  const choices = choicesSchema.safeParse(p.choices);
  if (!input.success || !choices.success) return null;
  const items = buildProposal(input.data, prices);
  if (!items.length) return null;
  const sum = summarize(items, choices.data, input.data.patient);
  const jv = vergleicheJahre(items, choices.data, input.data.patient);
  const stichtag =
    showsJahresvergleich(now) && jv.betroffen && (input.data.patient.zuschussJahr ?? 2026) === 2026 && jv.mehrkosten > 0.5
      ? { eigenanteil2027: jv.netto2027, mehr: jv.mehrkosten }
      : null;

  const linkAktiv = !!p.shareExpiresAt && p.shareExpiresAt > now;
  let stand: NachfassStand, standText: string, tun: string;
  if (p.agreedAt) {
    stand = "unterschrieben";
    standText = "Einverständnis unterschrieben";
    tun = "Als angenommen eintragen und Termin planen.";
  } else if (p.patientRespondedAt) {
    stand = "rueckmeldung";
    standText = p.patientResponse === "RUECKRUF" ? "bittet um Rückruf" : "hat geantwortet";
    tun = p.patientResponse === "RUECKRUF" ? "Anrufen." : "Vorschlag öffnen, Wahl ansehen, Termin anbieten.";
  } else if (p.patientViewedAt) {
    stand = "geoeffnet";
    standText = `geöffnet vor ${tage(p.patientViewedAt, now)} Tagen, keine Antwort`;
    tun = "Freundlich nachfragen, ob noch Fragen offen sind.";
  } else if (p.shareCreatedAt) {
    stand = "nicht-geoeffnet";
    standText = linkAktiv ? `Link seit ${tage(p.shareCreatedAt, now)} Tagen nicht geöffnet` : "Link abgelaufen, nicht geöffnet";
    tun = "Erinnern oder beim nächsten Termin ansprechen.";
  } else {
    stand = "ohne-link";
    standText = "noch kein Link gesendet";
    tun = "Vorschlag öffnen und Link mitgeben.";
  }
  if (stichtag && !p.hkpEingereichtAt && (stand === "unterschrieben" || stand === "rueckmeldung")) tun = `${tun} Heil- und Kostenplan einreichen.`;

  return {
    id: p.id,
    patient: p.patient,
    alterTage: tage(p.createdAt, now),
    eigenanteil: sum.netto,
    stichtag,
    stand,
    standText,
    nachgefasstAt: p.nachgefasstAt,
    hkpEingereichtAt: p.hkpEingereichtAt,
    tun,
  };
}

const RANG: Record<NachfassStand, number> = { unterschrieben: 0, rueckmeldung: 1, geoeffnet: 2, "nicht-geoeffnet": 3, "ohne-link": 4 };

/** Zeilen für die Liste: zuerst, wo der Stichtag Geld kostet und der Plan noch nicht eingereicht ist, dann nach Stand und Alter. */
export function nachfassListe(list: NachfassQuelle[], prices: Prices, now = new Date()): NachfassZeile[] {
  return list
    .map((p) => nachfassZeile(p, prices, now))
    .filter((z): z is NachfassZeile => !!z)
    .sort((a, b) => {
      const sa = a.stichtag && !a.hkpEingereichtAt ? 0 : 1;
      const sb = b.stichtag && !b.hkpEingereichtAt ? 0 : 1;
      if (sa !== sb) return sa - sb;
      if (RANG[a.stand] !== RANG[b.stand]) return RANG[a.stand] - RANG[b.stand];
      return b.alterTage - a.alterTage;
    });
}

export interface NachfassSumme {
  offen: number;
  stichtagOffen: number;
  stichtagMehr: number;
  tage: number;
}

export function nachfassSumme(zeilen: NachfassZeile[], now = new Date()): NachfassSumme {
  const s = zeilen.filter((z) => z.stichtag && !z.hkpEingereichtAt);
  return { offen: zeilen.length, stichtagOffen: s.length, stichtagMehr: s.reduce((a, z) => a + (z.stichtag?.mehr ?? 0), 0), tage: tageBisStichtag(now) };
}

/**
 * Text der Erinnerung. Bewusst sachlich und ohne Befund, Betrag oder Frist-Druck: nur der Hinweis,
 * dass der Vorschlag noch offen ist, und der persönliche Link (Heilmittelwerbegesetz, Berufsordnung).
 */
export function nachfassText(a: { firstName: string; practiceName: string; url: string; zahnersatz: boolean }): string {
  const hinweis = a.zahnersatz
    ? " Für Zahnersatz ändern sich zum 1. Januar 2027 die Zuschüsse der Krankenkassen; wir beraten Sie gern dazu."
    : "";
  return `Hallo ${a.firstName}, Ihr Behandlungsvorschlag von ${a.practiceName} ist noch offen.${hinweis} Unter Ihrem persönlichen Link können Sie ihn in Ruhe ansehen und uns antworten: ${a.url} Bei Fragen rufen Sie uns einfach an.`;
}
