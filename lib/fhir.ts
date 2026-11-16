// Export der Akte eines Patienten als FHIR-R4-Bundle (type "collection").
// Rein: bekommt die Daten, liefert das Bundle. Es steht nur drin, was in Sorrida gespeichert ist; nichts wird ergänzt
// oder geschätzt. Dokumente erscheinen nur mit ihren Metadaten (Name, Art, Größe, Datum), nie mit Inhalt.
// Kein Anspruch auf ein bestimmtes deutsches Profil (KBV, ISiK): Es ist schlichtes FHIR R4, damit andere Programme
// die Daten lesen können.

import { ICD_RE } from "@/lib/akte";
import { OHNE_AKTE } from "@/lib/ohneAkte";

export interface FhirEingabe {
  /** Namensraum für fullUrl, z. B. "https://www.sorrida.com/fhir". Nur eine Kennung, keine abrufbare Adresse. */
  basis: string;
  erstelltAm: Date;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    geschlecht: string | null;
    email: string | null;
    phone: string | null;
    insuranceType: string | null;
    insuranceName: string | null;
    insuranceNumber: string | null;
    patientNummer?: string | null;
    ohneAkte?: boolean | null;
  };
  entries: { id: string; art: string; text: string; code: string | null; datum: Date | null; inaktiv: boolean; createdAt: Date }[];
  appointments: { id: string; start: Date; minutes: number; reason: string; status: string; location?: { name: string } | null }[];
  documents: { id: string; name: string; mime: string; size: number; createdAt: Date }[];
  invoices: { id: string; number: string; title: string; amountCent: number; dueDate: Date; status: string; paidAt: Date | null; createdAt: Date }[];
}

export type FhirResource = { resourceType: string; id: string } & Record<string, unknown>;
export interface FhirBundle {
  resourceType: "Bundle";
  type: "collection";
  timestamp: string;
  entry: { fullUrl: string; resource: FhirResource }[];
}

const ICD_SYSTEM = "http://fhir.de/CodeSystem/bfarm/icd-10-gm";
const VERSICHERUNGSART = "http://fhir.de/CodeSystem/versicherungsart-de-basis";

/** Kalendertag (als Mitternacht UTC gespeichert) → "JJJJ-MM-TT". */
export const fhirDatum = (d: Date): string => d.toISOString().slice(0, 10);

/** "W" | "M" | "D" → FHIR administrative gender. Ohne Angabe: "unknown". */
export function fhirGeschlecht(g: string | null | undefined): "female" | "male" | "other" | "unknown" {
  return g === "W" ? "female" : g === "M" ? "male" : g === "D" ? "other" : "unknown";
}

/** Termin-Status aus Sorrida → FHIR Appointment.status. */
export function fhirTerminStatus(status: string): "booked" | "fulfilled" | "noshow" | "cancelled" {
  return status === "ERSCHIENEN" ? "fulfilled" : status === "NICHT_ERSCHIENEN" ? "noshow" : status === "ABGESAGT" ? "cancelled" : "booked";
}

/** Rechnungs-Status aus Sorrida → FHIR Invoice.status. "GEMELDET" (Patient meldet Zahlung) gilt bis zur Prüfung als gestellt. */
export function fhirRechnungStatus(status: string): "issued" | "balanced" | "cancelled" {
  return status === "BEZAHLT" ? "balanced" : status === "STORNIERT" ? "cancelled" : "issued";
}

/**
 * ICD-10-GM aus der Akte zerlegen: "K02.1 G R" → Code "K02.1", Sicherheit "G", Seite "R".
 * Passt der Text nicht zum Muster, gibt es keinen Code (dann steht nur der Text im Export).
 */
export function icdZerlegen(roh: string | null | undefined): { code: string; sicherheit?: "G" | "V" | "Z" | "A"; seite?: "R" | "L" | "B" } | null {
  const t = (roh ?? "").trim().toUpperCase();
  if (!t || !ICD_RE.test(t)) return null;
  const m = /^([A-Z]\d{2}(?:\.\d{1,2})?)\s?([GVZA])?\s?([RLB])?$/.exec(t);
  if (!m) return null;
  return { code: m[1], ...(m[2] ? { sicherheit: m[2] as "G" | "V" | "Z" | "A" } : {}), ...(m[3] ? { seite: m[3] as "R" | "L" | "B" } : {}) };
}

const SEITE: Record<string, string> = { R: "rechts", L: "links", B: "beidseits" };
// Diagnosesicherheit: gesichert, Verdacht, ausgeschlossen. "Z" (Zustand nach) hat in FHIR keine Entsprechung und bleibt ohne Angabe.
const SICHERHEIT: Record<string, string> = { G: "confirmed", V: "provisional", A: "refuted" };

const kodiert = (system: string, code: string) => ({ coding: [{ system, code }] });

export function fhirBundle(e: FhirEingabe): FhirBundle {
  const basis = e.basis.replace(/\/+$/, "");
  const p = e.patient;
  const patientRef = { reference: `Patient/${p.id}` };
  const resources: FhirResource[] = [];

  // Schnellvorschlag ohne Akte: Es gibt nur ein Kürzel, keinen Namen.
  const ohneAkte = !!p.ohneAkte || p.firstName === OHNE_AKTE;
  const telecom = [
    ...(p.phone ? [{ system: "phone", value: p.phone }] : []),
    ...(p.email ? [{ system: "email", value: p.email }] : []),
  ];
  resources.push({
    resourceType: "Patient",
    id: p.id,
    ...(p.patientNummer ? { identifier: [{ system: `${basis}/patientennummer`, value: p.patientNummer }] } : {}),
    name: ohneAkte ? [{ text: p.lastName }] : [{ use: "official", family: p.lastName, given: [p.firstName] }],
    gender: fhirGeschlecht(p.geschlecht),
    ...(p.birthDate ? { birthDate: fhirDatum(p.birthDate) } : {}),
    ...(telecom.length ? { telecom } : {}),
  });

  if (p.insuranceType || p.insuranceName || p.insuranceNumber) {
    const art = p.insuranceType === "GKV" || p.insuranceType === "PKV" ? p.insuranceType : null;
    resources.push({
      resourceType: "Coverage",
      id: `${p.id}-versicherung`,
      status: "active",
      ...(art ? { type: { ...kodiert(VERSICHERUNGSART, art), text: art === "GKV" ? "gesetzlich versichert" : "privat versichert" } } : {}),
      beneficiary: patientRef,
      ...(p.insuranceNumber ? { subscriberId: p.insuranceNumber } : {}),
      payor: [{ display: p.insuranceName || (art === "GKV" ? "Gesetzliche Krankenversicherung (Kasse nicht hinterlegt)" : art === "PKV" ? "Private Krankenversicherung (Versicherer nicht hinterlegt)" : "nicht hinterlegt") }],
    });
  }

  for (const x of e.entries) {
    if (x.art === "DIAGNOSE") {
      const icd = icdZerlegen(x.code);
      resources.push({
        resourceType: "Condition",
        id: x.id,
        clinicalStatus: kodiert("http://terminology.hl7.org/CodeSystem/condition-clinical", x.inaktiv ? "inactive" : "active"),
        ...(icd?.sicherheit && SICHERHEIT[icd.sicherheit] ? { verificationStatus: kodiert("http://terminology.hl7.org/CodeSystem/condition-ver-status", SICHERHEIT[icd.sicherheit]) } : {}),
        code: { ...(icd ? { coding: [{ system: ICD_SYSTEM, code: icd.code }] } : {}), text: x.text },
        ...(icd?.seite ? { bodySite: [{ text: SEITE[icd.seite] }] } : {}),
        subject: patientRef,
        ...(x.datum ? { onsetDateTime: fhirDatum(x.datum) } : {}),
        recordedDate: x.createdAt.toISOString(),
      });
    } else if (x.art === "ALLERGIE") {
      resources.push({
        resourceType: "AllergyIntolerance",
        id: x.id,
        clinicalStatus: kodiert("http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", x.inaktiv ? "inactive" : "active"),
        code: { text: x.text },
        patient: patientRef,
        ...(x.datum ? { onsetDateTime: fhirDatum(x.datum) } : {}),
        recordedDate: x.createdAt.toISOString(),
      });
    }
  }

  for (const t of e.appointments) {
    const minuten = Math.max(1, Math.round(t.minutes));
    resources.push({
      resourceType: "Appointment",
      id: t.id,
      status: fhirTerminStatus(t.status),
      ...(t.reason ? { description: t.reason } : {}),
      start: t.start.toISOString(),
      end: new Date(t.start.getTime() + minuten * 60_000).toISOString(),
      minutesDuration: minuten,
      participant: [
        { actor: patientRef, status: "accepted" },
        ...(t.location?.name ? [{ actor: { display: t.location.name }, status: "accepted" }] : []),
      ],
    });
  }

  for (const d of e.documents) {
    resources.push({
      resourceType: "DocumentReference",
      id: d.id,
      status: "current",
      subject: patientRef,
      date: d.createdAt.toISOString(),
      description: d.name,
      // Nur Metadaten: bewusst ohne data und ohne url.
      content: [{ attachment: { contentType: d.mime, title: d.name, size: d.size, creation: d.createdAt.toISOString() } }],
    });
  }

  for (const r of e.invoices) {
    resources.push({
      resourceType: "Invoice",
      id: r.id,
      identifier: [{ system: `${basis}/rechnungsnummer`, value: r.number }],
      status: fhirRechnungStatus(r.status),
      subject: patientRef,
      date: r.createdAt.toISOString(),
      totalGross: { value: Math.round(r.amountCent) / 100, currency: "EUR" },
      paymentTerms: `Fällig am ${fhirDatum(r.dueDate)}${r.paidAt ? `, bezahlt am ${fhirDatum(r.paidAt)}` : ""}`,
      ...(r.title ? { note: [{ text: r.title }] } : {}),
    });
  }

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: e.erstelltAm.toISOString(),
    entry: resources.map((resource) => ({ fullUrl: `${basis}/${resource.resourceType}/${resource.id}`, resource })),
  };
}
