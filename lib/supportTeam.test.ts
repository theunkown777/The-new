import { describe, expect, it } from "vitest";
import { istTeamKonto, teamEmails } from "@/lib/supportTeam";

describe("teamEmails", () => {
  it("liest kommagetrennte Adressen, klein geschrieben", () => {
    expect(teamEmails({ SUPPORT_TEAM_EMAILS: " A@x.de, b@y.de;kein-mail " })).toEqual(["a@x.de", "b@y.de"]);
    expect(teamEmails({})).toEqual([]);
  });
  it("erkennt den Namen auch in anderer Schreibweise", () => {
    expect(teamEmails({ Support_Team_Emails: "a@x.de" })).toEqual(["a@x.de"]);
    expect(teamEmails({ "support-team-emails": "b@y.de" })).toEqual(["b@y.de"]);
  });
});

describe("istTeamKonto", () => {
  const liste = ["team@sorrida.de"];
  const konto = (extra: Partial<{ email: string; emailVerifiedAt: Date | null; isDemo: boolean }> = {}) => ({
    email: extra.email ?? "Team@Sorrida.de",
    emailVerifiedAt: extra.emailVerifiedAt === undefined ? new Date() : extra.emailVerifiedAt,
    practice: { isDemo: extra.isDemo ?? false },
  });
  it("bestätigte Adresse aus der Liste gehört zum Team", () => {
    expect(istTeamKonto(konto(), liste)).toBe(true);
  });
  it("unbestätigte oder fremde Adressen nicht", () => {
    expect(istTeamKonto(konto({ emailVerifiedAt: null }), liste)).toBe(false);
    expect(istTeamKonto(konto({ email: "andere@x.de" }), liste)).toBe(false);
    expect(istTeamKonto(null, liste)).toBe(false);
  });
  it("Konten aus einem Gastzugang nie, auch nicht mit bestätigter Team-Adresse", () => {
    expect(istTeamKonto(konto({ isDemo: true }), liste)).toBe(false);
  });
});
