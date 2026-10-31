"use client";

import { useEffect, useRef, useState } from "react";

// Einverständnis im Patientenportal: Erklärung lesen, Namen eintippen, mit
// Finger oder Maus unterschreiben. Die Unterschrift wird als kleines PNG
// gespeichert.
export function SignAgreement({ postUrl, backHref, text, defaultName }: { postUrl: string; backHref: string; text: string; defaultName: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState(defaultName);
  const [accept, setAccept] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#24201f";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const [x, y] = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const [x, y] = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };
  const up = () => (drawing.current = false);
  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasInk) return setError("Bitte unterschreiben Sie im Feld.");
    setState("busy");
    setError(null);
    // Verkleinert speichern (max. 600 px breit), damit die Unterschrift klein bleibt.
    const src = canvas.current!;
    const out = document.createElement("canvas");
    const scale = Math.min(1, 600 / src.width);
    out.width = Math.round(src.width * scale);
    out.height = Math.round(src.height * scale);
    out.getContext("2d")!.drawImage(src, 0, 0, out.width, out.height);
    const res = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, accept, signature: out.toDataURL("image/png") }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState("idle");
      return setError(data.error ?? "Das hat nicht geklappt. Bitte versuchen Sie es erneut.");
    }
    setState("done");
  }

  if (state === "done")
    return (
      <div className="rounded-3xl bg-white p-6 text-center" role="status" data-testid="vereinbarung-fertig">
        <p className="font-display text-3xl text-slate-900">Vielen Dank</p>
        <p className="mt-2 text-slate-600">Ihr Einverständnis ist bei Ihrer Praxis angekommen. Die schriftliche Vereinbarung unterschreiben Sie vor der Behandlung in der Praxis.</p>
        <a href={backHref} className="btn-primary mt-6 inline-block">Zurück zu Ihrem Behandlungsweg</a>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-5" data-testid="vereinbarung-form">
      <p className="rounded-2xl bg-[#F5F2EE] p-4 text-sm leading-relaxed text-slate-800" data-testid="vereinbarung-text">{text}</p>
      <label className="block text-sm">
        <span className="text-slate-700">Ihr vollständiger Name</span>
        <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={120} autoComplete="name" />
      </label>
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-slate-700">Unterschrift</span>
          <button type="button" onClick={clear} className="text-xs text-slate-500 underline">Löschen</button>
        </div>
        <canvas
          ref={canvas}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          className="mt-1 h-36 w-full touch-none rounded-2xl border-2 border-dashed border-brand-200 bg-[#FFFDFB]"
          aria-label="Unterschriftsfeld: mit Finger oder Maus unterschreiben"
          data-testid="unterschrift"
        />
        <svg viewBox="0 0 40 8" className="-mt-6 ml-4 h-2 w-24 text-brand-300" aria-hidden="true">
          <path d="M2 2 Q20 10 38 2" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" className="mt-1" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
        Ich bestätige die obige Erklärung.
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button className="btn-primary w-full py-3" disabled={state === "busy"}>{state === "busy" ? "Wird gesendet …" : "Einverständnis senden"}</button>
    </form>
  );
}
