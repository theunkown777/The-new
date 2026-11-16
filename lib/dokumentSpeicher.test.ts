import { describe, expect, it } from "vitest";
import { dbSpeicher, dokumentSchluessel, dokumentTreiber, s3AusUmgebung, s3Speicher, sigV4, type DbZugriff } from "@/lib/dokumentSpeicher";

// Beispielwerte aus der AWS-Dokumentation „Signature Calculations for the Authorization Header:
// Transferring Payload in a Single Chunk (AWS Signature Version 4)“. Zugangsdaten sind die öffentlichen Beispiel-Schlüssel von AWS.
const ZUGANG = "AKIAIOSFODNN7EXAMPLE";
const GEHEIM = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
const ZEIT = new Date("2013-05-24T00:00:00Z");
const LEER = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("SigV4 gegen die veröffentlichten AWS-Beispiele", () => {
  it("GET Object", () => {
    const k = sigV4({ methode: "GET", url: new URL("https://examplebucket.s3.amazonaws.com/test.txt"), kopf: { Range: "bytes=0-9" }, inhaltHash: LEER, region: "us-east-1", zugang: ZUGANG, geheim: GEHEIM, zeit: ZEIT });
    expect(k["x-amz-date"]).toBe("20130524T000000Z");
    expect(k.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request,SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });

  it("PUT Object (Sonderzeichen im Namen, weitere Kopfzeilen)", () => {
    const k = sigV4({
      methode: "PUT",
      url: new URL("https://examplebucket.s3.amazonaws.com/test%24file.text"),
      kopf: { Date: "Fri, 24 May 2013 00:00:00 GMT", "x-amz-storage-class": "REDUCED_REDUNDANCY" },
      inhaltHash: "44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072",
      region: "us-east-1", zugang: ZUGANG, geheim: GEHEIM, zeit: ZEIT,
    });
    expect(k.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request,SignedHeaders=date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class,Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd",
    );
  });

  it("GET Bucket Lifecycle (Abfrage ohne Wert)", () => {
    const k = sigV4({ methode: "GET", url: new URL("https://examplebucket.s3.amazonaws.com/?lifecycle"), kopf: {}, inhaltHash: LEER, region: "us-east-1", zugang: ZUGANG, geheim: GEHEIM, zeit: ZEIT });
    expect(k.authorization).toContain("Signature=fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543");
  });

  it("GET Bucket (Abfrage mit zwei Werten, sortiert)", () => {
    const k = sigV4({ methode: "GET", url: new URL("https://examplebucket.s3.amazonaws.com/?prefix=J&max-keys=2"), kopf: {}, inhaltHash: LEER, region: "us-east-1", zugang: ZUGANG, geheim: GEHEIM, zeit: ZEIT });
    expect(k.authorization).toContain("Signature=34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7");
  });
});

describe("Schlüssel und Wahl des Treibers", () => {
  it("legt Dateien immer unter der Praxis ab", () => {
    expect(dokumentSchluessel("praxisA", "dok1")).toBe("praxisA/dok1");
    expect(() => dokumentSchluessel("../praxisB", "dok1")).toThrow();
    expect(() => dokumentSchluessel("praxisA", "a/b")).toThrow();
    expect(() => dokumentSchluessel("", "dok1")).toThrow();
  });

  const voll = { DOKUMENT_SPEICHER: "s3", DOKUMENT_S3_ENDPOINT: "https://s3.eu-central-1.example.org", DOKUMENT_S3_REGION: "eu-central-1", DOKUMENT_S3_BUCKET: "akte", DOKUMENT_S3_ACCESS_KEY: "k", DOKUMENT_S3_SECRET_KEY: "s" };

  it("Standard ist die Datenbank", () => {
    expect(dokumentTreiber({})).toBe("db");
    expect(dokumentTreiber({ DOKUMENT_SPEICHER: "db" })).toBe("db");
    expect(s3AusUmgebung({})).toBeNull();
  });

  it("s3 gilt nur mit vollständigen Einstellungen und https", () => {
    expect(dokumentTreiber(voll)).toBe("s3");
    expect(dokumentTreiber({ ...voll, DOKUMENT_S3_SECRET_KEY: "" })).toBe("db");
    expect(dokumentTreiber({ ...voll, DOKUMENT_S3_ENDPOINT: "http://unverschluesselt.example.org" })).toBe("db");
    expect(dokumentTreiber({ ...voll, DOKUMENT_SPEICHER: "" })).toBe("db");
    expect(s3AusUmgebung({ ...voll, DOKUMENT_S3_VERSCHLUESSELUNG: "AES256" })?.verschluesselung).toBe("AES256");
  });
});

describe("Treiber db", () => {
  const lager = new Map<string, Uint8Array>([["praxisA/dok1", new Uint8Array([1, 2, 3])]]);
  const db: DbZugriff = {
    lesen: async (p, d) => lager.get(`${p}/${d}`) ?? null,
    schreiben: async (p, d, daten) => { if (!lager.has(`${p}/${d}`)) return false; lager.set(`${p}/${d}`, daten); return true; },
    entfernen: async (p, d) => { lager.delete(`${p}/${d}`); },
  };
  const s = dbSpeicher(db);

  it("liest, schreibt und löscht über die Datenbank, immer mit Praxis und Dokument", async () => {
    expect(s.treiber).toBe("db");
    expect(await s.lesen("praxisA/dok1")).toEqual(new Uint8Array([1, 2, 3]));
    expect(await s.lesen("praxisB/dok1")).toBeNull();
    await s.speichern("praxisA/dok1", new Uint8Array([9]), "application/pdf");
    expect(await s.lesen("praxisA/dok1")).toEqual(new Uint8Array([9]));
    await expect(s.speichern("praxisB/dok1", new Uint8Array([9]), "application/pdf")).rejects.toThrow();
    await s.loeschen("praxisA/dok1");
    expect(await s.lesen("praxisA/dok1")).toBeNull();
  });

  it("weist Schlüssel ohne Praxis zurück", async () => {
    expect(() => s.lesen("dok1")).toThrow();
    expect(() => s.lesen("a/b/c")).toThrow();
  });
});

describe("Treiber s3", () => {
  const einstellung = { endpunkt: "https://speicher.example.org/", region: "eu-central-1", bucket: "akte", zugang: ZUGANG, geheim: GEHEIM, verschluesselung: "AES256" };
  const aufrufe: { url: string; method: string; headers: Record<string, string>; body?: Uint8Array }[] = [];
  const antwort = (status: number, daten = new Uint8Array()) => ({ ok: status >= 200 && status < 300, status, arrayBuffer: async () => daten.buffer as ArrayBuffer });
  let naechste = antwort(200);
  const s = s3Speicher(einstellung, async (url, init) => { aufrufe.push({ url, ...init }); return naechste; }, () => ZEIT);

  it("speichert mit Signatur, Inhaltsangabe und Verschlüsselung", async () => {
    await s.speichern("praxisA/dok1", new TextEncoder().encode("Welcome to Amazon S3."), "text/plain");
    const a = aufrufe.at(-1)!;
    expect(a.method).toBe("PUT");
    expect(a.url).toBe("https://speicher.example.org/akte/praxisA/dok1");
    expect(a.headers["x-amz-content-sha256"]).toBe("44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072");
    expect(a.headers["x-amz-server-side-encryption"]).toBe("AES256");
    expect(a.headers["content-type"]).toBe("text/plain");
    expect(a.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE\/20130524\/eu-central-1\/s3\/aws4_request,SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date;x-amz-server-side-encryption,Signature=[0-9a-f]{64}$/);
    // host setzt fetch selbst
    expect("host" in a.headers).toBe(false);
  });

  it("liest; 404 heißt: gibt es nicht", async () => {
    naechste = antwort(200, new Uint8Array([7, 8]));
    expect(await s.lesen("praxisA/dok1")).toEqual(new Uint8Array([7, 8]));
    expect(aufrufe.at(-1)!.method).toBe("GET");
    expect(aufrufe.at(-1)!.headers["x-amz-content-sha256"]).toBe(LEER);
    naechste = antwort(404);
    expect(await s.lesen("praxisA/fehlt")).toBeNull();
  });

  it("löscht; Fehler des Anbieters werden gemeldet, ohne Inhalte", async () => {
    naechste = antwort(204);
    await s.loeschen("praxisA/dok1");
    expect(aufrufe.at(-1)!.method).toBe("DELETE");
    naechste = antwort(403);
    await expect(s.speichern("praxisA/dok1", new Uint8Array([1]), "application/pdf")).rejects.toThrow("Dokumentenspeicher: Speichern fehlgeschlagen (403)");
    await expect(s.lesen("praxisA/dok1")).rejects.toThrow("(403)");
  });

  it("nimmt nur https an", () => {
    expect(() => s3Speicher({ ...einstellung, endpunkt: "http://speicher.example.org" })).toThrow();
  });
});
