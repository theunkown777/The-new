// Route POST /api/ki/hilfe mit nachgebildetem KI-Dienst, Datenbank und Sitzung:
// Schalter aus → 409 ohne Anfrage; Namen eigener Patienten (nur dieser Praxis) und Namen nach Anrede werden ersetzt;
// nur ein fester Seitentitel geht mit, keine Kennungen; Quellenpflicht; Rechte filtern das Wissen.
import { afterEach, describe, expect, it, vi } from "vitest";
import { KI_ANTWORT_HINWEIS } from "@/lib/kiHilfen";
import { menueRechte } from "@/lib/rollen";

afterEach(() => {
  for (const m of ["next-auth", "@/lib/auth", "@/lib/prisma", "@/lib/audit", "@/lib/rateLimit", "@/lib/permissions", "@/lib/anthropic"]) vi.doUnmock(m);
  vi.resetModules();
});

type Patient = { firstName: string; lastName: string };

async function laden(o: { kiHilfen?: boolean; verfuegbar?: boolean; antwort?: string; patienten?: Patient[]; rolle?: "admin" | "staff" | "behandler"; sitzung?: boolean }) {
  vi.resetModules();
  const create = vi.fn(async (_p: unknown, _o?: unknown) => ({ content: [{ type: "text", text: o.antwort ?? '{"passt":true,"antwort":"So geht es.","quellen":["H1"]}' }], stop_reason: "end_turn" }));
  const findUnique = vi.fn(async (_a: unknown) => ({ kiHilfen: o.kiHilfen ?? true, isDemo: false, specialty: "allgemein" }));
  const findMany = vi.fn(async (_a: { where: { practiceId: string; OR: unknown[] } }) => o.patienten ?? []);
  const audit = vi.fn(async () => undefined);
  vi.doMock("next-auth", () => ({ getServerSession: async () => (o.sitzung === false ? null : { user: { id: "u1", practiceId: "praxis-a", role: o.rolle ?? "admin", name: "Test", email: "t@example.org", practiceName: "Praxis A" } }) }));
  vi.doMock("@/lib/auth", () => ({ authOptions: {} }));
  vi.doMock("@/lib/prisma", () => ({ prisma: { practice: { findUnique }, patient: { findMany } } }));
  vi.doMock("@/lib/audit", () => ({ auditFromSession: audit }));
  vi.doMock("@/lib/rateLimit", () => ({ consumeAttempt: async () => true }));
  vi.doMock("@/lib/permissions", () => ({ menueRechteVon: async () => menueRechte(o.rolle ?? "admin", false) }));
  vi.doMock("@/lib/anthropic", async (original) => ({
    ...(await original<typeof import("@/lib/anthropic")>()),
    kiVerfuegbar: () => o.verfuegbar ?? true,
    kiClient: () => ({ messages: { create } }),
    KI_MODELL: "test-modell",
  }));
  const { POST } = await import("@/app/api/ki/hilfe/route");
  const fragen = (body: unknown) => POST(new Request("http://localhost/api/ki/hilfe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  const gesendet = () => JSON.stringify(create.mock.calls[0]?.[0] ?? null);
  const inhalt = () => (create.mock.calls[0]?.[0] as { messages: { content: string }[] } | undefined)?.messages[0].content ?? "";
  return { fragen, create, findMany, findUnique, audit, gesendet, inhalt };
}

describe("POST /api/ki/hilfe", () => {
  it("ohne Sitzung: 401, keine Anfrage", async () => {
    const t = await laden({ sitzung: false });
    expect((await t.fragen({ frage: "Wie lege ich einen Vorschlag an?" })).status).toBe(401);
    expect(t.create).not.toHaveBeenCalled();
  });
  it("Schalter der Praxis aus: 409, keine Anfrage und kein Blick in die Patienten", async () => {
    const t = await laden({ kiHilfen: false });
    const res = await t.fragen({ frage: "Wie lege ich einen Vorschlag für Frau Müller an?" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("Einstellungen → Sicherheit");
    expect(t.create).not.toHaveBeenCalled();
    expect(t.findMany).not.toHaveBeenCalled();
  });
  it("ohne KI-Zugang: 503, keine Anfrage", async () => {
    const t = await laden({ verfuegbar: false });
    expect((await t.fragen({ frage: "Wie lege ich einen Vorschlag an?" })).status).toBe(503);
    expect(t.create).not.toHaveBeenCalled();
  });
  it("ungültige Eingabe: 400", async () => {
    const t = await laden({});
    expect((await t.fragen({ frage: "x" })).status).toBe(400);
    expect((await t.fragen({ frage: "Wie geht das?", verlauf: ["a", "b", "c", "d"] })).status).toBe(400);
    expect(t.create).not.toHaveBeenCalled();
  });
  it("maskiert Namen eigener Patienten (Abgleich nur in dieser Praxis), Anrede-Namen und Kontaktdaten, auch im Verlauf", async () => {
    const t = await laden({ patienten: [{ firstName: "Erika", lastName: "Mustermann" }] });
    const res = await t.fragen({
      frage: "Wie lege ich für Erika Mustermann und Frau Yilmaz einen Vorschlag an? Tel. 0171 2345678",
      verlauf: ["Wo ist die Akte von Mustermann?"],
    });
    expect(res.status).toBe(200);
    const where = t.findMany.mock.calls[0][0].where;
    expect(where.practiceId).toBe("praxis-a");
    expect(JSON.stringify(where.OR)).toContain("Mustermann");
    expect(t.inhalt()).not.toMatch(/Erika|Mustermann|Yilmaz|0171/);
    expect(t.inhalt()).toContain("Frau [NAME]");
    expect(t.gesendet()).not.toMatch(/Erika|Mustermann|Yilmaz/);
  });
  it("Seitentitel nur aus der festen Liste, nie die Kennung aus dem Pfad", async () => {
    const t = await laden({});
    await t.fragen({ frage: "Wo trage ich die Einwilligung ein?", seite: "/patients/clx9geheim7" });
    expect(t.inhalt()).toContain("Geöffnete Seite (nur Kontext): Akte");
    expect(t.gesendet()).not.toContain("clx9geheim7");
    const u = await laden({});
    await u.fragen({ frage: "Wo trage ich die Einwilligung ein?", seite: "/Frau-Mueller/x" });
    expect(u.inhalt()).not.toContain("Geöffnete Seite");
    expect(u.gesendet()).not.toContain("Mueller");
  });
  it("Grundlage ist das ganze Wissen, gefiltert nach Rechten; Zeitgrenze 20 s, eine Wiederholung", async () => {
    const admin = await laden({ rolle: "admin" });
    await admin.fragen({ frage: "Wie exportiere ich für den Steuerberater?" });
    const behandler = await laden({ rolle: "behandler" });
    await behandler.fragen({ frage: "Wie exportiere ich für den Steuerberater?" });
    expect(admin.gesendet()).toContain("DATEV");
    expect(behandler.gesendet()).not.toContain("Buchungsstapel");
    expect(admin.gesendet().length).toBeGreaterThan(behandler.gesendet().length);
    expect(admin.create.mock.calls[0][1]).toEqual({ timeout: 20_000, maxRetries: 1 });
  });
  it("Quellen werden zu Einträgen der Sammlung; das Protokoll nennt nur die Zahl", async () => {
    const t = await laden({ antwort: '{"passt":true,"antwort":"Öffnen Sie Vorschläge.","quellen":["H1"]}' });
    const d = await (await t.fragen({ frage: "Wie geht das mit dem Vorschlag?" })).json();
    expect(d.passt).toBe(true);
    expect(d.quellen).toHaveLength(1);
    expect(d.quellen[0]).toMatchObject({ id: expect.any(String), frage: expect.any(String), href: expect.stringMatching(/^\//) });
    expect(t.audit).toHaveBeenCalledWith(expect.anything(), "ki.hilfe", { summary: "1 Quellen" });
  });
  it("Quellenpflicht: Antwort ohne Quelle wird nicht übernommen (502)", async () => {
    const t = await laden({ antwort: '{"passt":true,"antwort":"Einfach so.","quellen":[]}' });
    const res = await t.fragen({ frage: "Wie geht das?" });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe(KI_ANTWORT_HINWEIS);
  });
  it("passt nichts: keine Antwort, keine Quelle", async () => {
    const t = await laden({ antwort: '{"passt":false,"antwort":"","quellen":[]}' });
    expect(await (await t.fragen({ frage: "Wie rechne ich GOÄ 5 ab?" })).json()).toMatchObject({ passt: false, antwort: "", quellen: [] });
  });
});
