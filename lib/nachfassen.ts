import { anrede } from "@/lib/ohneAkte";
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
  patient: { id: string; firstName: string; lastName: string; phone: string | null; whatsappConsentAt: Date | null; /** Einwilligung in Erinnerungen an offene Vorschläge */ nachfassConsentAt?: Date | null };
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

/**
 * Was die Praxis bei einem Link tun kann, den der Patient nicht geöffnet hat. Erinnern (anrufen, Nachricht) nennt Sorrida
 * nur, wenn die Einwilligung in Erinnerungen dokumentiert ist (Patient.nachfassConsentAt, § 7 Abs. 2 UWG). Sonst bleibt
 * das Gespräch beim nächsten Termin.
 */
export const ungeoeffnetTun = (einwilligung: boolean) => (einwilligung ? "erinnern oder beim nächsten Termin ansprechen" : "beim nächsten Termin ansprechen");
const satz = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;

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
  const einwilligung = !!p.patient.nachfassConsentAt;
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
    tun = einwilligung ? "Freundlich nachfragen, ob noch Fragen offen sind." : "Beim nächsten Termin fragen, ob noch Fragen offen sind.";
  } else if (p.shareCreatedAt) {
    stand = "nicht-geoeffnet";
    standText = linkAktiv ? `Link seit ${tage(p.shareCreatedAt, now)} Tagen nicht geöffnet` : "Link abgelaufen, nicht geöffnet";
    tun = satz(ungeoeffnetTun(einwilligung));
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
 * Text der Erinnerung. Sachlich, ohne Befund, Betrag und Zeitdruck: nur der persönliche Link, das Angebot zum Anruf
 * und der Hinweis, wie man Erinnerungen abbestellt (Heilmittelwerbegesetz, Berufsordnung, § 7 UWG).
 * Der Satz zum 1. Januar 2027 nennt einen Stichtag und kann als Werbung gelten. Er steht nur im Text, wenn der
 * Patient ausdrücklich eingewilligt hat, an offene Vorschläge erinnert zu werden (`einwilligung`, Patient.nachfassConsentAt).
 */
export function nachfassText(a: { firstName: string; practiceName: string; url: string; zahnersatz: boolean; einwilligung?: boolean }): string {
  const hinweis = a.zahnersatz && a.einwilligung
    ? " Für Zahnersatz ändern sich zum 1. Januar 2027 die Zuschüsse der Krankenkassen; wir beraten Sie gern dazu."
    : "";
  return `${anrede("Hallo", a.firstName)}, hier ist noch einmal Ihr persönlicher Link von ${a.practiceName}: ${a.url}${hinweis} Wenn Sie Fragen haben, rufen Sie uns an. Wenn Sie keine Erinnerung mehr möchten, sagen Sie es uns.`;
}
