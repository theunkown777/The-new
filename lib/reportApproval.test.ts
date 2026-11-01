import { describe, expect, it } from "vitest";
import { approvalUpdate } from "./reportApproval";
const user = { id: "u1", name: "Dr. A" };
const now = new Date("2026-11-01T10:00:00Z");
describe("Berichtsfreigabe", () => {
  it("merkt sich bei Freigabe wer und wann", () => {
    const r = approvalUpdate({ previousStatus: "ENTWURF", requestedStatus: "FINAL", textChanging: false, user, now });
    expect(r.data).toEqual({ status: "FINAL", approvedById: "u1", approvedByName: "Dr. A", approvedAt: now });
    expect(r.event).toBe("bericht.freigegeben");
  });
  it("Textänderung an freigegebenem Bericht macht ihn wieder zum Entwurf", () => {
    const r = approvalUpdate({ previousStatus: "FINAL", textChanging: true, user });
    expect(r.data.status).toBe("ENTWURF");
    expect(r.data.approvedById).toBeNull();
  });
  it("Text ändern und zugleich freigeben gibt neu frei", () => {
    const r = approvalUpdate({ previousStatus: "FINAL", requestedStatus: "FINAL", textChanging: true, user, now });
    expect(r.data.status).toBe("FINAL");
    expect(r.event).toBe("bericht.freigegeben");
  });
  it("Entwurf bearbeiten ändert nichts an der Freigabe", () => {
    expect(approvalUpdate({ previousStatus: "ENTWURF", textChanging: true, user })).toEqual({ data: {}, event: null });
  });
});
