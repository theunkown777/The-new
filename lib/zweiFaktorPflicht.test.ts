import { describe, expect, it } from "vitest";
import { zweiFaktorPflicht } from "./zweiFaktorPflicht";
describe("2FA-Pflicht", () => {
  it("gilt für Admins immer, für Mitarbeitende nur auf Wunsch der Praxis, nie in der Demo", () => {
    expect(zweiFaktorPflicht({ role: "admin", require2faAll: false, isDemo: false })).toBe(true);
    expect(zweiFaktorPflicht({ role: "staff", require2faAll: false, isDemo: false })).toBe(false);
    expect(zweiFaktorPflicht({ role: "staff", require2faAll: true, isDemo: false })).toBe(true);
    expect(zweiFaktorPflicht({ role: "admin", require2faAll: true, isDemo: true })).toBe(false);
  });
});
