import { describe, it, expect } from "vitest";
import {
  parseIni,
  extractVddsPatient,
  parseVddsDate,
  vddsToPatientFields,
  generateConnectorKey,
  hashConnectorKey,
  connectorKeyPrefix,
} from "./connector";
import { safeCallbackPath } from "./safeRedirect";

// Beispiel nach VDDS-media 1.4, Tabelle 3 (Übergabe der Patientendaten an die BVS).
const SAMPLE = [
  "[PATIENT]",
  "PVS=DSWIN",
  "BVS=SORRIDA",
  "PATID=1234",
  "LASTNAME=Müller",
  "FIRSTNAME=Jürgen",
  "TITLE=Dr.",
  "BIRTHDAY=19800312",
  "SEX=M",
  "STREET=Am See 1",
  "HOMEPHONE=0301234567",
  "INSURANCESTATUS=M",
  "INSURANCE=Barmer",
  "POLICYNUMBER=12345",
  "ERRORLEVEL=0",
  "READY=0",
].join("\r\n");

describe("parseIni", () => {
  it("treats sections and keys case-insensitively and ignores comments", () => {
    const ini = parseIni("; Kommentar\n[patient]\npatid = 7\n\n[Other]\nx=1");
    expect(ini.PATIENT.PATID).toBe("7");
    expect(ini.OTHER.X).toBe("1");
  });
  it("strips a UTF-8 byte order mark", () => {
    expect(parseIni("﻿[PATIENT]\nPVS=Z1").PATIENT.PVS).toBe("Z1");
  });
});

describe("extractVddsPatient", () => {
  it("keeps only the whitelisted fields", () => {
    const { data } = extractVddsPatient(SAMPLE);
    expect(data).toMatchObject({ PVS: "DSWIN", PATID: "1234", LASTNAME: "Müller", FIRSTNAME: "Jürgen" });
    expect(data).not.toHaveProperty("STREET");
    expect(data).not.toHaveProperty("HOMEPHONE");
    expect(data).not.toHaveProperty("POLICYNUMBER");
  });
  it("rejects files without a [PATIENT] section", () => {
    expect(extractVddsPatient("[FOO]\nA=1").error).toMatch(/PATIENT/);
  });
  it("rejects a PATID longer than twelve characters", () => {
    expect(extractVddsPatient(SAMPLE.replace("PATID=1234", "PATID=1234567890123")).error).toBeDefined();
  });
  it("requires the name of the calling PVS", () => {
    expect(extractVddsPatient(SAMPLE.replace("PVS=DSWIN", "")).error).toMatch(/PVS/);
  });
});

describe("parseVddsDate", () => {
  it("parses CCYYMMDD", () => {
    expect(parseVddsDate("19800312")?.toISOString().slice(0, 10)).toBe("1980-03-12");
  });
  it("returns null for impossible dates instead of rolling over", () => {
    expect(parseVddsDate("19590231")).toBeNull();
    expect(parseVddsDate("1980-03-12")).toBeNull();
  });
});

describe("vddsToPatientFields", () => {
  it("maps INSURANCESTATUS P to PKV and everything else to GKV", () => {
    const gkv = extractVddsPatient(SAMPLE).data!;
    expect(vddsToPatientFields(gkv).insuranceType).toBe("GKV");
    const pkv = extractVddsPatient(SAMPLE.replace("INSURANCESTATUS=M", "INSURANCESTATUS=P")).data!;
    expect(vddsToPatientFields(pkv).insuranceType).toBe("PKV");
  });
});

describe("safeCallbackPath", () => {
  const origin = "https://app.example.de";
  it("allows paths of the same origin", () => {
    expect(safeCallbackPath("https://app.example.de/embed/launch?t=abc", origin)).toBe("/embed/launch?t=abc");
    expect(safeCallbackPath("/proposals", origin)).toBe("/proposals");
  });
  it("blocks other origins", () => {
    expect(safeCallbackPath("https://evil.example/x", origin)).toBe("/dashboard");
    expect(safeCallbackPath("//evil.example/x", origin)).toBe("/dashboard");
  });
});

describe("connector keys", () => {
  it("are prefixed, random and stored only as hash", () => {
    const a = generateConnectorKey();
    expect(a).toMatch(/^sor_conn_[0-9a-f]{64}$/);
    expect(a).not.toBe(generateConnectorKey());
    expect(hashConnectorKey(a)).toHaveLength(64);
    expect(connectorKeyPrefix(a)).toBe(a.slice(0, 15));
  });
});

import { extractHandoverPatient } from "@/lib/connector";
describe("GDT (Arzt-Praxissoftware)", () => {
  const gdt = ["01380006311", "014810000276", "0158316MEDISTAR", "0143000A12345", "0163101Krüger", "0133102Anna", "017310302041975", "01031102", "0213108Versichert"].join("\r\n");
  it("liest Patientennummer, Name, Geburtsdatum und Geschlecht", () => {
    const r = extractHandoverPatient(gdt);
    expect(r.format).toBe("GDT");
    expect(r.data).toMatchObject({ PVS: "GDT-MEDISTAR", PATID: "A12345", LASTNAME: "Krüger", FIRSTNAME: "Anna", BIRTHDAY: "19750402", SEX: "W" });
  });
  it("meldet fehlende Patientennummer verständlich", () => {
    expect(extractHandoverPatient("01380006311\r\n0163101Krüger").error).toContain("Patientennummer");
  });
  it("VDDS-media bleibt unverändert", () => {
    expect(extractHandoverPatient("[PATIENT]\nPVS=DSWIN\nPATID=4711\nLASTNAME=Weber\nFIRSTNAME=Martina").format).toBe("VDDS");
  });
});
