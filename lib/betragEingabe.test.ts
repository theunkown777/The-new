import { describe, expect, it } from "vitest";
import { betragLesen } from "@/lib/betragEingabe";

describe("betragLesen", () => {
  it("liest deutsche und einfache Schreibweisen", () => {
    expect(betragLesen("24,90")).toBe(24.9);
    expect(betragLesen("1.250,00")).toBe(1250);
    expect(betragLesen("24.90")).toBe(24.9);
    expect(betragLesen(" 24 € ")).toBe(24);
    expect(betragLesen("0")).toBe(0);
  });
  it("gibt null bei Text, der keine Zahl ist", () => {
    expect(betragLesen("abc")).toBeNull();
    expect(betragLesen("")).toBeNull();
    expect(betragLesen("12,345")).toBeNull();
  });
});
