import { createHash, createHmac } from "node:crypto";

// Speicher für Dokumente der Patientenakte: eine Schnittstelle, zwei Treiber.
//
//   "db"  der heutige Weg: Die Datei liegt in der Datenbank (PatientDocument.data). Standard.
//   "s3"  S3-kompatibler Speicher in der EU, angesprochen über fetch mit SigV4-Signatur (ohne zusätzliches Paket).
//
// NUR VORBEREITET: Die Schnittstellen der Akte (app/api/patients/[id]/documents) lesen und schreiben weiter direkt
// in die Datenbank und nutzen diese Datei noch nicht. Umschalten heißt später: dort speichern/lesen/loeschen aufrufen
// und die vorhandenen Dateien einmal umziehen (siehe docs/BETRIEB.md). Ohne DOKUMENT_SPEICHER="s3" und vollständige
// Zugangsdaten gilt immer "db".

export interface DokumentSpeicher {
  readonly treiber: "db" | "s3";
  speichern(schluessel: string, daten: Uint8Array, mime: string): Promise<void>;
  /** null, wenn es die Datei nicht gibt */
  lesen(schluessel: string): Promise<Uint8Array | null>;
  loeschen(schluessel: string): Promise<void>;
}

/** Schlüssel einer Datei im Objektspeicher: immer unter der Praxis, damit Praxen auch dort getrennt liegen. */
export function dokumentSchluessel(practiceId: string, dokumentId: string): string {
  const sauber = (t: string) => {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(t)) throw new Error("Ungültige Kennung für den Dokumentenspeicher");
    return t;
  };
  return `${sauber(practiceId)}/${sauber(dokumentId)}`;
}

// ---------------------------------------------------------------- Treiber "db"

/** Was der Treiber "db" von der Datenbank braucht (in Tests ersetzbar). Schlüssel ist "<Praxis>/<Dokument>". */
export interface DbZugriff {
  lesen(practiceId: string, dokumentId: string): Promise<Uint8Array | null>;
  schreiben(practiceId: string, dokumentId: string, daten: Uint8Array, mime: string): Promise<boolean>;
  entfernen(practiceId: string, dokumentId: string): Promise<void>;
}

const teile = (schluessel: string): [string, string] => {
  const [practiceId, dokumentId, ...rest] = schluessel.split("/");
  if (!practiceId || !dokumentId || rest.length) throw new Error("Ungültiger Schlüssel für den Dokumentenspeicher");
  return [practiceId, dokumentId];
};

export function dbSpeicher(db: DbZugriff): DokumentSpeicher {
  return {
    treiber: "db",
    async speichern(schluessel, daten, mime) {
      const [p, d] = teile(schluessel);
      if (!(await db.schreiben(p, d, daten, mime))) throw new Error("Dokument nicht gefunden");
    },
    lesen: (schluessel) => db.lesen(...teile(schluessel)),
    loeschen: (schluessel) => db.entfernen(...teile(schluessel)),
  };
}

/** Der heutige Weg: Spalte data der Tabelle PatientDocument, immer auf die Praxis begrenzt. */
async function prismaZugriff(): Promise<DbZugriff> {
  const { prisma } = await import("@/lib/prisma");
  return {
    async lesen(practiceId, id) {
      const d = await prisma.patientDocument.findFirst({ where: { id, practiceId }, select: { data: true } });
      return d ? new Uint8Array(d.data) : null;
    },
    async schreiben(practiceId, id, daten, mime) {
      const r = await prisma.patientDocument.updateMany({ where: { id, practiceId }, data: { data: Buffer.from(daten), mime, size: daten.byteLength } });
      return r.count > 0;
    },
    async entfernen(practiceId, id) {
      await prisma.patientDocument.deleteMany({ where: { id, practiceId } });
    },
  };
}

// ---------------------------------------------------------------- SigV4

const sha256Hex = (daten: string | Uint8Array) => createHash("sha256").update(daten).digest("hex");
const hmac = (schluessel: string | Buffer, text: string) => createHmac("sha256", schluessel).update(text, "utf8").digest();
/** Kodierung nach RFC 3986, wie SigV4 sie verlangt (auch ! * ' ( ) werden kodiert). */
const kodiert = (t: string) => encodeURIComponent(t).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export interface SigV4Eingabe {
  methode: string;
  url: URL;
  /** Kopfzeilen, die mit signiert werden (host kommt aus der Adresse dazu) */
  kopf: Record<string, string>;
  /** SHA-256 des Inhalts als Hex */
  inhaltHash: string;
  region: string;
  zugang: string;
  geheim: string;
  zeit: Date;
  dienst?: string;
}

/**
 * AWS Signature Version 4 für eine Anfrage. Liefert alle Kopfzeilen samt Authorization.
 * Geprüft gegen die Beispielwerte aus der AWS-Dokumentation (lib/dokumentSpeicher.test.ts).
 */
export function sigV4(e: SigV4Eingabe): Record<string, string> {
  const dienst = e.dienst ?? "s3";
  const amzDate = e.zeit.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const tag = amzDate.slice(0, 8);
  const alle: Record<string, string> = { host: e.url.host, "x-amz-content-sha256": e.inhaltHash, "x-amz-date": amzDate };
  for (const [k, v] of Object.entries(e.kopf)) alle[k.toLowerCase()] = v.trim().replace(/\s+/g, " ");
  const namen = Object.keys(alle).sort();
  const pfad = e.url.pathname.split("/").map((s) => kodiert(decodeURIComponent(s))).join("/") || "/";
  const abfrage = Array.from(e.url.searchParams.entries())
    .map(([k, v]) => [kodiert(k), kodiert(v)] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const kanonisch = [e.methode.toUpperCase(), pfad, abfrage, ...namen.map((n) => `${n}:${alle[n]}`), "", namen.join(";"), e.inhaltHash].join("\n");
  const bereich = `${tag}/${e.region}/${dienst}/aws4_request`;
  const zuSignieren = ["AWS4-HMAC-SHA256", amzDate, bereich, sha256Hex(kanonisch)].join("\n");
  const schluessel = hmac(hmac(hmac(hmac(`AWS4${e.geheim}`, tag), e.region), dienst), "aws4_request");
  const signatur = createHmac("sha256", schluessel).update(zuSignieren, "utf8").digest("hex");
  return { ...alle, authorization: `AWS4-HMAC-SHA256 Credential=${e.zugang}/${bereich},SignedHeaders=${namen.join(";")},Signature=${signatur}` };
}

// ---------------------------------------------------------------- Treiber "s3"

export interface S3Einstellung {
  /** z. B. https://s3.eu-central-1.amazonaws.com oder die Adresse eines anderen Anbieters in der EU */
  endpunkt: string;
  region: string;
  bucket: string;
  zugang: string;
  geheim: string;
  /** Verschlüsselung beim Anbieter anfordern, z. B. "AES256" (nur wenn der Anbieter die Kopfzeile kennt) */
  verschluesselung?: string;
}

type Abruf = (url: string, init: { method: string; headers: Record<string, string>; body?: Uint8Array }) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>;

export function s3Speicher(s: S3Einstellung, abruf: Abruf = fetch as unknown as Abruf, jetzt: () => Date = () => new Date()): DokumentSpeicher {
  const basis = s.endpunkt.replace(/\/+$/, "");
  if (!/^https:\/\//.test(basis)) throw new Error("Dokumentenspeicher: Der Endpunkt muss mit https:// beginnen");
  const anfrage = async (methode: string, schluessel: string, daten?: Uint8Array, mime?: string) => {
    teile(schluessel);
    const url = new URL(`${basis}/${s.bucket}/${schluessel.split("/").map(kodiert).join("/")}`);
    const kopf: Record<string, string> = {};
    if (mime) kopf["content-type"] = mime;
    if (daten && s.verschluesselung) kopf["x-amz-server-side-encryption"] = s.verschluesselung;
    const signiert = sigV4({ methode, url, kopf, inhaltHash: sha256Hex(daten ?? ""), region: s.region, zugang: s.zugang, geheim: s.geheim, zeit: jetzt() });
    const { host: _host, ...senden } = signiert;
    return abruf(url.toString(), { method: methode, headers: senden, ...(daten ? { body: daten } : {}) });
  };
  return {
    treiber: "s3",
    async speichern(schluessel, daten, mime) {
      const r = await anfrage("PUT", schluessel, daten, mime);
      if (!r.ok) throw new Error(`Dokumentenspeicher: Speichern fehlgeschlagen (${r.status})`);
    },
    async lesen(schluessel) {
      const r = await anfrage("GET", schluessel);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`Dokumentenspeicher: Lesen fehlgeschlagen (${r.status})`);
      return new Uint8Array(await r.arrayBuffer());
    },
    async loeschen(schluessel) {
      const r = await anfrage("DELETE", schluessel);
      if (!r.ok && r.status !== 404) throw new Error(`Dokumentenspeicher: Löschen fehlgeschlagen (${r.status})`);
    },
  };
}

/** Einstellungen aus der Umgebung; null, wenn "s3" nicht gewählt oder nicht vollständig eingerichtet ist. */
export function s3AusUmgebung(env: Record<string, string | undefined> = process.env): S3Einstellung | null {
  if ((env.DOKUMENT_SPEICHER ?? "").trim().toLowerCase() !== "s3") return null;
  const wert = (n: string) => (env[n] ?? "").trim();
  const s = { endpunkt: wert("DOKUMENT_S3_ENDPOINT"), region: wert("DOKUMENT_S3_REGION"), bucket: wert("DOKUMENT_S3_BUCKET"), zugang: wert("DOKUMENT_S3_ACCESS_KEY"), geheim: wert("DOKUMENT_S3_SECRET_KEY") };
  if (Object.values(s).some((v) => !v) || !/^https:\/\//.test(s.endpunkt)) return null;
  const sse = wert("DOKUMENT_S3_VERSCHLUESSELUNG");
  return { ...s, ...(sse ? { verschluesselung: sse } : {}) };
}

/** Welcher Treiber gilt? "s3" nur mit vollständigen Einstellungen, sonst der heutige Weg "db". */
export const dokumentTreiber = (env: Record<string, string | undefined> = process.env): "db" | "s3" => (s3AusUmgebung(env) ? "s3" : "db");

/** Der eingestellte Speicher. */
export async function dokumentSpeicher(env: Record<string, string | undefined> = process.env): Promise<DokumentSpeicher> {
  const s3 = s3AusUmgebung(env);
  return s3 ? s3Speicher(s3) : dbSpeicher(await prismaZugriff());
}
