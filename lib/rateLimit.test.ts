import { describe, it, expect, beforeEach, vi } from "vitest";
import { isRateLimited, recordAttempt, clearAttempts, consumeAttempt, releaseAttempt } from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("is not rate limited before any attempts are recorded", async () => {
    const key = `test-${Math.random()}`;
    expect(await isRateLimited(key, 5, 60_000)).toBe(false);
  });

  it("becomes rate limited once the limit is reached", async () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) await recordAttempt(key, 60_000);
    expect(await isRateLimited(key, 5, 60_000)).toBe(true);
  });

  it("stays under the limit while below the threshold", async () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 4; i++) await recordAttempt(key, 60_000);
    expect(await isRateLimited(key, 5, 60_000)).toBe(false);
  });

  it("clearAttempts resets the counter", async () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) await recordAttempt(key, 60_000);
    expect(await isRateLimited(key, 5, 60_000)).toBe(true);
    await clearAttempts(key);
    expect(await isRateLimited(key, 5, 60_000)).toBe(false);
  });

  it("resets the window once it has expired", async () => {
    vi.useFakeTimers();
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) await recordAttempt(key, 1000);
    expect(await isRateLimited(key, 5, 1000)).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(await isRateLimited(key, 5, 1000)).toBe(false);

    await recordAttempt(key, 1000);
    expect(await isRateLimited(key, 5, 1000)).toBe(false);
    vi.useRealTimers();
  });
});

describe("rateLimit: zählen und prüfen in einem Schritt", () => {
  it("recordAttempt liefert den neuen Zählerstand", async () => {
    const key = `test-${Math.random()}`;
    expect(await recordAttempt(key, 60_000)).toBe(1);
    expect(await recordAttempt(key, 60_000)).toBe(2);
  });

  it("consumeAttempt lässt auch bei gleichzeitigen Aufrufen nur `limit` Versuche durch", async () => {
    const key = `test-${Math.random()}`;
    const ergebnisse = await Promise.all(Array.from({ length: 12 }, () => consumeAttempt(key, 5, 60_000)));
    expect(ergebnisse.filter(Boolean)).toHaveLength(5);
    expect(await isRateLimited(key, 5, 60_000)).toBe(true);
  });

  it("releaseAttempt gibt einen Versuch zurück, nie unter null", async () => {
    const key = `test-${Math.random()}`;
    await releaseAttempt(key);
    expect(await recordAttempt(key, 60_000)).toBe(1);
    await releaseAttempt(key);
    await releaseAttempt(key);
    expect(await recordAttempt(key, 60_000)).toBe(1);
  });
});
