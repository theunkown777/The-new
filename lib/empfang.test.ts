import { describe, expect, it } from "vitest";
import {
  PARKEN_STUNDEN, PIN_MAX_FEHLVERSUCHE, PIN_MAX_SPERREN, PIN_SPERRE_MINUTEN, UEBERGABE_MINUTEN, istSitzungCookie, pinGesperrt, pinProblem, pinVersuch, sitzungHolen, sitzungParken,
  uebergabeErlaubt, uebergabeLesen, uebergabeToken, type PinStand,
} from "./empfang";

const leer: PinStand = { fehlversuche: 0, sperren: 0, gesperrtBis: null };
const t0 = new Date("2026-11-15T09:00:00Z");
const nach = (minuten: number) => new Date(t0.getTime() + minuten * 60_000);

describe("Empfangs-PIN: Regeln", () => {
  it("verlangt genau vier Ziffern", () => {
    for (const pin of ["", "123", "12345", "12a4", " 1234", "１２３４"]) expect(pinProblem(pin), pin).not.toBeNull();
    expect(pinProblem("2580")).toBeNull();
    expect(pinProblem("0417")).toBeNull();
  });
  it("lehnt leicht zu ratende PINs ab", () => {
    for (const pin of ["0000", "1111", "9999", "1234", "0123", "6789", "4321", "9876"]) expect(pinProblem(pin), pin).not.toBeNull();
  });
});

describe("Empfangs-PIN: Sperre nach Fehlversuchen", () => {
  it("richtige PIN entsperrt und setzt die Zähler zurück", () => {
    const r = pinVersuch({ fehlversuche: 3, sperren: 1, gesperrtBis: null }, true, t0);
    expect(r).toEqual({ art: "ok", stand: leer });
  });
  it("zählt Fehlversuche und nennt die verbleibenden", () => {
    let stand = leer;
    for (let n = 1; n < PIN_MAX_FEHLVERSUCHE; n++) {
      const r = pinVersuch(stand, false, t0);
      expect(r.art).toBe("falsch");
      if (r.art === "falsch") expect(r.rest).toBe(PIN_MAX_FEHLVERSUCHE - n);
      stand = r.stand;
    }
    expect(stand.fehlversuche).toBe(PIN_MAX_FEHLVERSUCHE - 1);
    expect(stand.gesperrtBis).toBeNull();
  });
  it("sperrt nach dem fünften Fehlversuch für fünf Minuten", () => {
    const r = pinVersuch({ fehlversuche: PIN_MAX_FEHLVERSUCHE - 1, sperren: 0, gesperrtBis: null }, false, t0);
    expect(r.art).toBe("gesperrt");
    if (r.art !== "gesperrt") return;
    expect(r.neu).toBe(true);
    expect(r.verwerfen).toBe(false);
    expect(r.minuten).toBe(PIN_SPERRE_MINUTEN);
    expect(r.stand).toEqual({ fehlversuche: 0, sperren: 1, gesperrtBis: nach(PIN_SPERRE_MINUTEN) });
  });
  it("nimmt während der Sperre auch die richtige PIN nicht an und verlängert die Sperre nicht", () => {
    const gesperrt: PinStand = { fehlversuche: 0, sperren: 1, gesperrtBis: nach(5) };
    const richtig = pinVersuch(gesperrt, true, nach(2));
    expect(richtig.art).toBe("gesperrt");
    if (richtig.art === "gesperrt") {
      expect(richtig.neu).toBe(false);
      expect(richtig.minuten).toBe(3);
      expect(richtig.stand).toBe(gesperrt);
    }
    const falsch = pinVersuch(gesperrt, false, nach(4.5));
    expect(falsch.art).toBe("gesperrt");
    if (falsch.art === "gesperrt") expect(falsch.minuten).toBe(1);
    expect(falsch.stand).toBe(gesperrt);
  });
  it("gibt nach Ablauf der Sperre wieder fünf Versuche", () => {
    const abgelaufen: PinStand = { fehlversuche: 0, sperren: 1, gesperrtBis: nach(5) };
    expect(pinGesperrt(abgelaufen, nach(4.99))).toBe(true);
    expect(pinGesperrt(abgelaufen, nach(5))).toBe(false);
    const r = pinVersuch(abgelaufen, false, nach(5));
    expect(r.art).toBe("falsch");
    if (r.art === "falsch") {
      expect(r.rest).toBe(PIN_MAX_FEHLVERSUCHE - 1);
      expect(r.stand).toEqual({ fehlversuche: 1, sperren: 1, gesperrtBis: null });
    }
    expect(pinVersuch(abgelaufen, true, nach(6))).toEqual({ art: "ok", stand: leer });
  });
  it("verwirft die geparkte Sitzung bei der dritten Sperre in Folge: höchstens 15 Versuche", () => {
    let stand = leer, jetzt = t0, versuche = 0, verworfen = false;
    while (!verworfen && versuche < 100) {
      const r = pinVersuch(stand, false, jetzt);
      stand = r.stand;
      if (r.art === "gesperrt" && r.neu) {
        verworfen = r.verwerfen;
        jetzt = new Date(stand.gesperrtBis!.getTime()); // Sperre abwarten
      }
      versuche++;
    }
    expect(verworfen).toBe(true);
    expect(versuche).toBe(PIN_MAX_FEHLVERSUCHE * PIN_MAX_SPERREN);
    expect(stand.sperren).toBe(PIN_MAX_SPERREN);
  });
  it("eine richtige Eingabe zwischen zwei Sperren beginnt die Zählung neu", () => {
    const r = pinVersuch({ fehlversuche: 4, sperren: 2, gesperrtBis: nach(-1) }, true, t0);
    expect(r.stand).toEqual(leer);
    const danach = pinVersuch({ ...r.stand, fehlversuche: PIN_MAX_FEHLVERSUCHE - 1 }, false, t0);
    expect(danach.art === "gesperrt" && danach.verwerfen).toBe(false);
  });
});

describe("Übergabe-Token: Gültigkeit", () => {
  const a = { practiceId: "prax1", patientId: "pat1", zwecke: ["kontakt", "anamnese"] as const };
  const start = t0.getTime();
  const token = uebergabeToken({ ...a, zwecke: [...a.zwecke] }, start);
  it("gilt für genau diesen Patienten, diese Praxis und die freigegebenen Schritte", () => {
    const u = uebergabeLesen(token, start + 1000);
    expect(u).toEqual({ practiceId: "prax1", patientId: "pat1", zwecke: ["kontakt", "anamnese"], von: start, bis: start + UEBERGABE_MINUTEN * 60_000 });
    expect(uebergabeErlaubt(u, "anamnese")).toBe(true);
    expect(uebergabeErlaubt(u, "anamnese", "pat1")).toBe(true);
    expect(uebergabeErlaubt(u, "anamnese", "pat2")).toBe(false);
    expect(uebergabeErlaubt(u, "unterschrift")).toBe(false);
    expect(uebergabeErlaubt(null, "kontakt")).toBe(false);
  });
  it("läuft nach 20 Minuten ab", () => {
    expect(uebergabeLesen(token, start + UEBERGABE_MINUTEN * 60_000 - 1)).not.toBeNull();
    expect(uebergabeLesen(token, start + UEBERGABE_MINUTEN * 60_000)).toBeNull();
    expect(uebergabeLesen(token, start + 24 * 3600e3)).toBeNull();
  });
  it("gilt nicht vor seiner Ausstellung", () => {
    expect(uebergabeLesen(token, start - 1)).toBeNull();
  });
  it("erkennt jede Veränderung", () => {
    const [inhalt, s] = token.split(".");
    const anderer = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(inhalt, "base64url").toString()), pt: "pat2" })).toString("base64url");
    expect(uebergabeLesen(`${anderer}.${s}`, start + 1000)).toBeNull();
    const laenger = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(inhalt, "base64url").toString()), b: start + 999 * 60_000 })).toString("base64url");
    expect(uebergabeLesen(`${laenger}.${s}`, start + 1000)).toBeNull();
    expect(uebergabeLesen(`${inhalt}.${s.slice(0, -2)}AA`, start + 1000)).toBeNull();
    expect(uebergabeLesen(`${inhalt}.${s}.x`, start + 1000)).toBeNull();
    expect(uebergabeLesen(inhalt, start + 1000)).toBeNull();
  });
  it("weist Leeres und Unsinn ab", () => {
    for (const t of [null, undefined, "", "abc", "a.b", "..", "x".repeat(2000)]) expect(uebergabeLesen(t, start + 1000)).toBeNull();
  });
  it("jedes Token ist anders, auch für denselben Patienten zur selben Zeit", () => {
    expect(uebergabeToken({ ...a, zwecke: [...a.zwecke] }, start)).not.toBe(token);
  });
});

describe("Praxis-Sitzung parken", () => {
  const cookies = [{ name: "next-auth.session-token", value: "eyJhbGciOiJkaXIi.geheim" }];
  const start = t0.getTime();
  it("holt die Sitzung unverändert zurück", () => {
    const wert = sitzungParken({ practiceId: "prax1", cookies }, start);
    expect(sitzungHolen(wert, start + 60_000)).toEqual({ practiceId: "prax1", cookies, bis: start + PARKEN_STUNDEN * 3600e3 });
  });
  it("der geparkte Wert enthält die Sitzung nicht lesbar und ist jedes Mal anders", () => {
    const wert = sitzungParken({ practiceId: "prax1", cookies }, start);
    expect(wert).not.toContain("eyJhbGciOiJkaXIi");
    expect(Buffer.from(wert.split(".")[2], "base64url").toString("utf8")).not.toContain("geheim");
    expect(sitzungParken({ practiceId: "prax1", cookies }, start)).not.toBe(wert);
  });
  it("läuft ab und erkennt Veränderungen", () => {
    const wert = sitzungParken({ practiceId: "prax1", cookies }, start);
    expect(sitzungHolen(wert, start + PARKEN_STUNDEN * 3600e3)).toBeNull();
    const [iv, tag, daten] = wert.split(".");
    const kaputt = Buffer.from(daten, "base64url");
    kaputt[0] ^= 1;
    expect(sitzungHolen(`${iv}.${tag}.${kaputt.toString("base64url")}`, start + 1000)).toBeNull();
    for (const t of [null, "", "a.b", "a.b.c", `${iv}.${tag}`]) expect(sitzungHolen(t, start + 1000)).toBeNull();
  });
  it("nimmt nur Sitzungs-Cookies an, auch in Teilen", () => {
    expect(istSitzungCookie("next-auth.session-token")).toBe(true);
    expect(istSitzungCookie("__Secure-next-auth.session-token")).toBe(true);
    expect(istSitzungCookie("__Secure-next-auth.session-token.0")).toBe(true);
    expect(istSitzungCookie("next-auth.session-token.12")).toBe(true);
    expect(istSitzungCookie("next-auth.csrf-token")).toBe(false);
    expect(istSitzungCookie("next-auth.session-token.x")).toBe(false);
    expect(istSitzungCookie("sorrida_bereich")).toBe(false);
    const gemischt = sitzungParken({ practiceId: "prax1", cookies: [...cookies, { name: "sorrida_bereich", value: "x" }] }, start);
    expect(sitzungHolen(gemischt, start + 1000)?.cookies).toEqual(cookies);
    expect(sitzungHolen(sitzungParken({ practiceId: "prax1", cookies: [{ name: "anderes", value: "x" }] }, start), start + 1000)).toBeNull();
  });
});
