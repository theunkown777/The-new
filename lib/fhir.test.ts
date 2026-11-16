import { describe, expect, it } from "vitest";
import { fhirBundle, fhirGeschlecht, fhirRechnungStatus, fhirTerminStatus, icdZerlegen, type FhirEingabe } from "@/lib/fhir";
import { OHNE_AKTE } from "@/lib/ohneAkte";

const tag = (s: string) => new Date(`${s}T00:00:00.000Z`);
const eingabe = (teil: Partial<FhirEingabe> = {}): FhirEingabe => ({
  basis: "https://sorrida.example/fhir/",
  erstelltAm: new Date("2026-11-16T10:00:00.000Z"),
  patient: { id: "pat1", firstName: "Anna", lastName: "Beispiel", birthDate: tag("1980-05-06"), geschlecht: "W", email: "anna@example.org", phone: "030 123456", insuranceType: "GKV", insuranceName: "Musterkasse", insuranceNumber: "A123456789", patientNummer: "1007" },
  entries: [
    { id: "e1", art: "DIAGNOSE", text: "Karies", code: "K02.1 G R", datum: tag("2026-01-10"), inaktiv: false, createdAt: new Date("2026-01-10T09:00:00.000Z") },
    { id: "e2", art: "DIAGNOSE", text: "Rückenschmerz", code: null, datum: null, inaktiv: true, createdAt: new Date("2026-02-01T09:00:00.000Z") },
    { id: "e3", art: "ALLERGIE", text: "Penicillin", code: null, datum: null, inaktiv: false, createdAt: new Date("2026-02-02T09:00:00.000Z") },
    { id: "e4", art: "NOTIZ", text: "ruft lieber an", code: null, datum: null, inaktiv: false, createdAt: new Date("2026-02-03T09:00:00.000Z") },
    { id: "e5", art: "MEDIKATION", text: "Ibuprofen", code: null, datum: null, inaktiv: false, createdAt: new Date("2026-02-03T09:00:00.000Z") },
  ],
  appointments: [
    { id: "t1", start: new Date("2026-12-01T09:00:00.000Z"), minutes: 30, reason: "Kontrolle", status: "GEPLANT", location: { name: "Hauptstandort" } },
    { id: "t2", start: new Date("2026-10-01T09:00:00.000Z"), minutes: 45, reason: "Behandlung", status: "ERSCHIENEN", location: null },
  ],
  documents: [{ id: "d1", name: "Befund.pdf", mime: "application/pdf", size: 12345, createdAt: new Date("2026-03-01T09:00:00.000Z") }],
  invoices: [
    { id: "r1", number: "2026-0001", title: "Rechnung Behandlung", amountCent: 12345, dueDate: tag("2026-12-15"), status: "OFFEN", paidAt: null, createdAt: new Date("2026-11-15T09:00:00.000Z") },
    { id: "r2", number: "2026-0002", title: "Rechnung", amountCent: 5000, dueDate: tag("2026-10-15"), status: "BEZAHLT", paidAt: tag("2026-10-10"), createdAt: new Date("2026-10-01T09:00:00.000Z") },
  ],
  ...teil,
});

const vonArt = (b: ReturnType<typeof fhirBundle>, art: string) => b.entry.map((x) => x.resource).filter((r) => r.resourceType === art);

describe("FHIR-Export der Akte", () => {
  it("liefert ein Bundle vom Typ collection mit einer Ressource je Datensatz", () => {
    const b = fhirBundle(eingabe());
    expect(b.resourceType).toBe("Bundle");
    expect(b.type).toBe("collection");
    expect(b.timestamp).toBe("2026-11-16T10:00:00.000Z");
    const zahl = (art: string) => vonArt(b, art).length;
    expect([zahl("Patient"), zahl("Coverage"), zahl("Condition"), zahl("AllergyIntolerance"), zahl("Appointment"), zahl("DocumentReference"), zahl("Invoice")]).toEqual([1, 1, 2, 1, 2, 1, 2]);
    // Notiz und Medikation haben keine vorgesehene Ressource und werden nicht umgedeutet
    expect(b.entry).toHaveLength(10);
  });

  it("jede Ressource hat eine eindeutige fullUrl und verweist auf den Patienten", () => {
    const b = fhirBundle(eingabe());
    const urls = b.entry.map((x) => x.fullUrl);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls[0]).toBe("https://sorrida.example/fhir/Patient/pat1");
    for (const r of b.entry.map((x) => x.resource)) {
      expect(r.id).toMatch(/^[A-Za-z0-9.-]{1,64}$/);
      if (r.resourceType === "Patient") continue;
      const text = JSON.stringify(r);
      expect(text, r.resourceType).toContain('"reference":"Patient/pat1"');
    }
  });

  it("Patient: Name, Geburtsdatum, Geschlecht, Kontakt", () => {
    const [p] = vonArt(fhirBundle(eingabe()), "Patient");
    expect(p.name).toEqual([{ use: "official", family: "Beispiel", given: ["Anna"] }]);
    expect(p.birthDate).toBe("1980-05-06");
    expect(p.gender).toBe("female");
    expect(p.telecom).toEqual([{ system: "phone", value: "030 123456" }, { system: "email", value: "anna@example.org" }]);
    expect(p.identifier).toEqual([{ system: "https://sorrida.example/fhir/patientennummer", value: "1007" }]);
  });

  it("lässt weg, was nicht gespeichert ist", () => {
    const b = fhirBundle(eingabe({ patient: { id: "p2", firstName: "Max", lastName: "Ohne", birthDate: null, geschlecht: null, email: null, phone: null, insuranceType: null, insuranceName: null, insuranceNumber: null }, entries: [], appointments: [], documents: [], invoices: [] }));
    expect(b.entry).toHaveLength(1);
    const p = b.entry[0].resource;
    expect(p.gender).toBe("unknown");
    expect("birthDate" in p).toBe(false);
    expect("telecom" in p).toBe(false);
    expect("identifier" in p).toBe(false);
  });

  it("Schnellvorschlag ohne Akte: nur das Kürzel, kein erfundener Name", () => {
    const b = fhirBundle(eingabe({ patient: { id: "p3", firstName: OHNE_AKTE, lastName: "K-17", birthDate: null, geschlecht: null, email: null, phone: null, insuranceType: "PKV", insuranceName: null, insuranceNumber: null, ohneAkte: true } }));
    expect(vonArt(b, "Patient")[0].name).toEqual([{ text: "K-17" }]);
    expect(JSON.stringify(b)).not.toContain(`"given"`);
  });

  it("Coverage: Kassenart, Kasse und Versichertennummer", () => {
    const [c] = vonArt(fhirBundle(eingabe()), "Coverage");
    expect(c.status).toBe("active");
    expect(c.type).toEqual({ coding: [{ system: "http://fhir.de/CodeSystem/versicherungsart-de-basis", code: "GKV" }], text: "gesetzlich versichert" });
    expect(c.payor).toEqual([{ display: "Musterkasse" }]);
    expect(c.subscriberId).toBe("A123456789");
  });

  it("Condition: ICD-10 ohne Zusatzkennzeichen, Sicherheit und Seite getrennt", () => {
    const [a, b] = vonArt(fhirBundle(eingabe()), "Condition");
    expect(a.code).toEqual({ coding: [{ system: "http://fhir.de/CodeSystem/bfarm/icd-10-gm", code: "K02.1" }], text: "Karies" });
    expect(JSON.stringify(a.verificationStatus)).toContain("confirmed");
    expect(a.bodySite).toEqual([{ text: "rechts" }]);
    expect(a.onsetDateTime).toBe("2026-01-10");
    expect(JSON.stringify(a.clinicalStatus)).toContain('"active"');
    // ohne Code: nur der Text, nichts erfunden
    expect(b.code).toEqual({ text: "Rückenschmerz" });
    expect("verificationStatus" in b).toBe(false);
    expect(JSON.stringify(b.clinicalStatus)).toContain('"inactive"');
  });

  it("AllergyIntolerance je Allergie-Eintrag", () => {
    const [a] = vonArt(fhirBundle(eingabe()), "AllergyIntolerance");
    expect(a.code).toEqual({ text: "Penicillin" });
    expect(a.patient).toEqual({ reference: "Patient/pat1" });
  });

  it("Appointment: Beginn, Ende, Dauer, Status, Standort", () => {
    const [a, b] = vonArt(fhirBundle(eingabe()), "Appointment");
    expect(a.status).toBe("booked");
    expect(a.start).toBe("2026-12-01T09:00:00.000Z");
    expect(a.end).toBe("2026-12-01T09:30:00.000Z");
    expect(a.minutesDuration).toBe(30);
    expect(a.participant).toEqual([{ actor: { reference: "Patient/pat1" }, status: "accepted" }, { actor: { display: "Hauptstandort" }, status: "accepted" }]);
    expect(b.status).toBe("fulfilled");
    expect(b.participant).toHaveLength(1);
  });

  it("DocumentReference: nur Metadaten, kein Inhalt", () => {
    const [d] = vonArt(fhirBundle(eingabe()), "DocumentReference");
    expect(d.content).toEqual([{ attachment: { contentType: "application/pdf", title: "Befund.pdf", size: 12345, creation: "2026-03-01T09:00:00.000Z" } }]);
    const text = JSON.stringify(d);
    expect(text).not.toContain('"data"');
    expect(text).not.toContain('"url"');
  });

  it("Invoice: Betrag in Euro und Status", () => {
    const [a, b] = vonArt(fhirBundle(eingabe()), "Invoice");
    expect(a.totalGross).toEqual({ value: 123.45, currency: "EUR" });
    expect(a.status).toBe("issued");
    expect(a.identifier).toEqual([{ system: "https://sorrida.example/fhir/rechnungsnummer", value: "2026-0001" }]);
    expect(a.paymentTerms).toBe("Fällig am 2026-12-15");
    expect(b.status).toBe("balanced");
    expect(b.paymentTerms).toBe("Fällig am 2026-10-15, bezahlt am 2026-10-10");
  });

  it("übersetzt Status und Geschlecht", () => {
    expect([fhirGeschlecht("W"), fhirGeschlecht("M"), fhirGeschlecht("D"), fhirGeschlecht(null), fhirGeschlecht("x")]).toEqual(["female", "male", "other", "unknown", "unknown"]);
    expect(["GEPLANT", "BESTAETIGT", "ERSCHIENEN", "NICHT_ERSCHIENEN", "ABGESAGT"].map(fhirTerminStatus)).toEqual(["booked", "booked", "fulfilled", "noshow", "cancelled"]);
    expect(["OFFEN", "GEMELDET", "BEZAHLT", "STORNIERT"].map(fhirRechnungStatus)).toEqual(["issued", "issued", "balanced", "cancelled"]);
  });

  it("zerlegt ICD-10-GM und weist Unpassendes zurück", () => {
    expect(icdZerlegen("k02.1")).toEqual({ code: "K02.1" });
    expect(icdZerlegen("M54.5 V")).toEqual({ code: "M54.5", sicherheit: "V" });
    expect(icdZerlegen("S83.2GL")).toEqual({ code: "S83.2", sicherheit: "G", seite: "L" });
    expect(icdZerlegen("Karies")).toBeNull();
    expect(icdZerlegen(null)).toBeNull();
  });
});
