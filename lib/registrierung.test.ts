import { describe, expect, it } from "vitest";
import { registrierungOffen } from "./registrierung";

describe("Registrierung", () => {
  it("ist ohne ausdrückliche Freigabe geschlossen", () => {
    expect(registrierungOffen({})).toBe(false);
    expect(registrierungOffen({ REGISTRIERUNG_OFFEN: "" })).toBe(false);
    expect(registrierungOffen({ REGISTRIERUNG_OFFEN: "0" })).toBe(false);
    expect(registrierungOffen({ REGISTRIERUNG_OFFEN: "true" })).toBe(false);
  });
  it("ist nur mit REGISTRIERUNG_OFFEN=1 offen", () => {
    expect(registrierungOffen({ REGISTRIERUNG_OFFEN: "1" })).toBe(true);
  });
});
