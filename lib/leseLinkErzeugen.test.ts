// Lese-Links: Auch bei gleichzeitigen Anfragen entstehen höchstens drei (lib/leseLink.ts, leseLinkErzeugen).
// Die Datenbank wird hier nachgestellt: Abfragen brauchen einen Augenblick, und pg_advisory_xact_lock lässt
// Transaktionen zum selben Vorschlag nacheinander laufen. Ohne die Sperre zählten alle Anfragen „noch unter drei“.
import { beforeEach, describe, expect, it, vi } from "vitest";

type Zeile = { id: string; proposalId: string; tokenHash: string; zugangHash: string; expiresAt: Date; revokedAt: Date | null; createdAt: Date };
const db = vi.hoisted(() => ({ zeilen: [] as Zeile[], sperren: new Map<string, Promise<void>>(), gesperrt: [] as string[] }));
const augenblick = () => new Promise((r) => setTimeout(r, 1));

vi.mock("@/lib/prisma", () => {
  const abfragen = {
    treatmentProposal: { findUnique: async () => (await augenblick(), { shareTokenHash: "zugang", patient: { portalTokenHash: null } }) },
    leseLink: {
      findMany: async ({ where }: { where: { proposalId: string } }) => (await augenblick(), db.zeilen.filter((z) => z.proposalId === where.proposalId && !z.revokedAt)),
      create: async ({ data }: { data: Omit<Zeile, "id" | "revokedAt" | "createdAt"> }) => {
        await augenblick();
        const z = { ...data, id: `l${db.zeilen.length + 1}`, revokedAt: null, createdAt: new Date() };
        db.zeilen.push(z);
        return z;
      },
    },
  };
  return {
    prisma: {
      ...abfragen,
      $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
        let freigeben: (() => void) | undefined;
        const tx = {
          ...abfragen,
          // SELECT pg_advisory_xact_lock(hashtext(<Name>)): wartet, bis die vorige Transaktion mit demselben Namen fertig ist
          $executeRaw: async (_sql: TemplateStringsArray, name: string) => {
            db.gesperrt.push(name);
            const vorher = db.sperren.get(name) ?? Promise.resolve();
            db.sperren.set(name, new Promise<void>((r) => (freigeben = r)));
            await vorher;
            return 1;
          },
        };
        try {
          return await fn(tx);
        } finally {
          freigeben?.();
        }
      },
    },
  };
});

import { LESE_LINK_MAX, leseLinkErzeugen, leseLinkSperre } from "@/lib/leseLink";

const bis = new Date(Date.now() + 7 * 864e5);

describe("Lese-Link anlegen", () => {
  beforeEach(() => {
    db.zeilen.length = 0;
    db.sperren.clear();
    db.gesperrt.length = 0;
  });

  it("legt nacheinander höchstens drei an und gibt den Rohwert nur einmal zurück", async () => {
    const ergebnisse = [];
    for (let i = 0; i < 5; i++) ergebnisse.push(await leseLinkErzeugen("v1", "LINK", bis, "zugang"));
    expect(ergebnisse.filter(Boolean)).toHaveLength(LESE_LINK_MAX);
    expect(ergebnisse.slice(3)).toEqual([null, null]);
    // gespeichert ist nur der Hash, nie der Rohwert
    for (const e of ergebnisse.filter(Boolean)) expect(db.zeilen.some((z) => z.tokenHash === e!.raw)).toBe(false);
  });

  it("acht gleichzeitige Anfragen ergeben zusammen nur drei Links", async () => {
    const ergebnisse = await Promise.all(Array.from({ length: 8 }, () => leseLinkErzeugen("v1", "LINK", bis, "zugang")));
    expect(ergebnisse.filter(Boolean)).toHaveLength(LESE_LINK_MAX);
    expect(db.zeilen).toHaveLength(LESE_LINK_MAX);
    expect(db.gesperrt).toHaveLength(8);
    expect(new Set(db.gesperrt)).toEqual(new Set([leseLinkSperre("v1")]));
  });

  it("sperrt je Vorschlag: ein anderer Vorschlag wartet nicht und hat seine eigenen drei", async () => {
    const alle = await Promise.all([...Array.from({ length: 4 }, () => leseLinkErzeugen("v1", "LINK", bis, "zugang")), ...Array.from({ length: 4 }, () => leseLinkErzeugen("v2", "PORTAL", bis, "zugang"))]);
    expect(alle.filter(Boolean)).toHaveLength(6);
    expect(db.zeilen.filter((z) => z.proposalId === "v1")).toHaveLength(3);
    expect(db.zeilen.filter((z) => z.proposalId === "v2")).toHaveLength(3);
    expect(leseLinkSperre("v1")).not.toBe(leseLinkSperre("v2"));
  });
});
