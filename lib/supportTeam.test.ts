import { describe, expect, it } from "vitest";
import { teamEmails } from "@/lib/supportTeam";

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
