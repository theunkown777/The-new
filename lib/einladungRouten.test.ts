import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

// Einladung und Annahme mit nachgestellter Datenbank: Eine E-Mail-Adresse gilt
// nur als bestätigt, wenn der Link wirklich per Mail dorthin ging.
let isDemo = false;
let mailAktiv = true;
let versendet = true;
let praxisNr = 0;
let sitzung: { user: { id: string; name: string; practiceId: string; practiceName: string; role: string } };
const einladungen: Record<string, unknown>[] = [];
const mails: { to: string; subject: string; html: string }[] = [];
let angelegt: Record<string, unknown> | null = null;
let einladung: Record<string, unknown> | null = null;

vi.mock("@/lib/permissions", () => ({ requireAdmin: async () => ({ session: sitzung, error: null }) }));
vi.mock("@/lib/demoGuard", () => ({ demoGuard: async () => null }));
vi.mock("@/lib/audit", () => ({ auditFromSession: async () => {}, audit: async () => {} }));
vi.mock("@/lib/email", async (orig) => ({
  ...(await orig<typeof import("@/lib/email")>()),
  mailVersandAktiv: () => mailAktiv,
  sendEmail: async (m: { to: string; subject: string; html: string }) => { mails.push(m); return { testMode: !mailAktiv, versendet: mailAktiv && versendet }; },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    practice: { findUnique: async () => ({ isDemo }) },
    user: {
      findUnique: async () => null,
      create: (args: { data: Record<string, unknown> }) => { angelegt = args.data; return Promise.resolve(args.data); },
    },
    staffInvite: {
      create: async ({ data }: { data: Record<string, unknown> }) => { const e = { id: `i${einladungen.length}`, mailed: false, ...data }; einladungen.push(e); return e; },
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => { const e = einladungen.find((x) => x.id === args.where.id) ?? einladung; if (e) Object.assign(e, args.data); return Promise.resolve(e); },
      findUnique: async () => einladung,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));

const einladen = async (email: string) =>
  (await import("@/app/api/settings/team/route")).POST(new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ email, role: "admin" }) }));

beforeEach(() => {
  isDemo = false; mailAktiv = true; versendet = true; einladungen.length = 0; mails.length = 0; angelegt = null; einladung = null;
  sitzung = { user: { id: "u1", name: "Dr. <b>Test</b>", practiceId: `p${++praxisNr}`, practiceName: "Praxis & Partner", role: "admin" } };
  vi.stubEnv("SUPPORT_TEAM_EMAILS", "team@sorrida.de");
});
afterEach(() => vi.unstubAllEnvs());

describe("Team-Einladung", () => {
  it("Gastzugang: Adressen des Sorrida-Teams werden abgelehnt", async () => {
    isDemo = true;
    const res = await einladen("Team@Sorrida.de");
    expect(res.status).toBe(400);
    expect(einladungen).toHaveLength(0);
  });
  it("Gastzugang: Link wird nur angezeigt, keine Mail, Einladung gilt nicht als verschickt", async () => {
    isDemo = true;
    const data = await (await einladen("kollegin@x.de")).json();
    expect(data.mailed).toBe(false);
    expect(data.inviteUrl).toContain("/accept-invite?token=");
    expect(mails).toHaveLength(0);
    expect(einladungen[0].mailed).toBe(false);
  });
  it("ohne Mailversand: Link anzeigen, nicht als verschickt merken", async () => {
    mailAktiv = false;
    const data = await (await einladen("kollegin@x.de")).json();
    expect(data).toMatchObject({ mailed: false });
    expect(data.inviteUrl).toBeTruthy();
    expect(einladungen[0].mailed).toBe(false);
  });
  it("lehnt der Maildienst ab, gilt die Einladung nicht als verschickt", async () => {
    versendet = false;
    const data = await (await einladen("kollegin@x.de")).json();
    expect(data.mailed).toBe(false);
    expect(einladungen[0].mailed).toBe(false);
  });
  it("wirklich verschickt: als verschickt gemerkt, Link nicht in der Antwort, Namen maskiert", async () => {
    const data = await (await einladen("kollegin@x.de")).json();
    expect(data).toEqual({ ok: true, mailed: true });
    expect(einladungen[0].mailed).toBe(true);
    expect(mails[0].html).toContain("Dr. &lt;b&gt;Test&lt;/b&gt;");
    expect(mails[0].html).toContain("Praxis &amp; Partner");
    expect(mails[0].html).not.toContain("<b>Test</b>");
  });
});

describe("Einladung annehmen", () => {
  const annehmen = async () =>
    (await import("@/app/api/auth/accept-invite/route")).POST(
      new Request("http://localhost/api", { method: "POST", headers: { "x-forwarded-for": `10.0.0.${praxisNr}` }, body: JSON.stringify({ token: "t", name: "Neue Person", password: "geheim-123" }) }),
    );
  const offen = (mailed: boolean) => ({ id: "i1", practiceId: "p1", email: "kollegin@x.de", role: "staff", mailed, acceptedAt: null, expiresAt: new Date(Date.now() + 60_000) });

  it("nur angezeigter Link: Konto entsteht, die Adresse gilt nicht als bestätigt", async () => {
    einladung = offen(false);
    expect((await annehmen()).status).toBe(200);
    expect(angelegt).toMatchObject({ email: "kollegin@x.de", role: "staff", emailVerifiedAt: null });
    expect(await bcrypt.compare("geheim-123", String(angelegt!.passwordHash))).toBe(true);
  });
  it("per Mail verschickter Link: Adresse ist bestätigt", async () => {
    einladung = offen(true);
    expect((await annehmen()).status).toBe(200);
    expect(angelegt!.emailVerifiedAt).toBeInstanceOf(Date);
  });
});
