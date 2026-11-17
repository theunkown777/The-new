"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

async function senden(body: unknown) {
  const res = await fetch("/api/eingang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return res?.ok ? await res.json().catch(() => ({})) : null;
}

export function EingangAktion({ id, erledigt }: { id: string; erledigt: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function setzen() {
    setBusy(true);
    await senden({ id, erledigt: !erledigt });
    setBusy(false);
    router.refresh();
  }
  return (
    <button type="button" className={erledigt ? "ziel text-xs text-slate-500 underline" : "btn-secondary"} onClick={setzen} disabled={busy} data-testid={erledigt ? "eingang-oeffnen" : "eingang-erledigt"}>
      {erledigt ? "wieder öffnen" : "Erledigt"}
    </button>
  );
}

/** „Ich übernehme“: zeigt dem Team, wer sich um den Eintrag kümmert. */
export function EingangUebernehmen({ id, name, meiner }: { id: string; /** Wer übernommen hat, sonst null */ name: string | null; meiner: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function setzen(uebernehmen: boolean) {
    setBusy(true);
    await senden({ id, uebernehmen });
    setBusy(false);
    router.refresh();
  }
  if (name)
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-salbei-50 px-2.5 py-1 text-xs text-salbei-800" data-testid="eingang-zustaendig">
        {meiner ? "Sie übernehmen" : `${name} übernimmt`}
        {meiner && <button type="button" className="underline" disabled={busy} onClick={() => setzen(false)} data-testid="eingang-abgeben">abgeben</button>}
      </span>
    );
  return (
    <button type="button" className="ziel text-xs text-brand-700 underline" disabled={busy} onClick={() => setzen(true)} data-testid="eingang-uebernehmen">
      Ich übernehme
    </button>
  );
}

/** Alle offenen Einträge abhaken; statt einer Nachfrage gibt es danach kurz „Rückgängig“. */
export function EingangAlle({ anzahl }: { anzahl: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [zurueck, setZurueck] = useState<string[] | null>(null);
  useEffect(() => {
    if (!zurueck) return;
    const t = setTimeout(() => setZurueck(null), 10_000);
    return () => clearTimeout(t);
  }, [zurueck]);
  if (zurueck)
    return (
      <span className="inline-flex items-center gap-3 rounded-full bg-slate-900 px-4 py-2 text-sm text-white" role="status" data-testid="eingang-rueckgaengig">
        {zurueck.length} Einträge abgehakt
        <button
          type="button"
          className="font-semibold underline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await senden({ ids: zurueck, erledigt: false });
            setBusy(false);
            setZurueck(null);
            router.refresh();
          }}
        >
          Rückgängig
        </button>
      </span>
    );
  if (anzahl < 2) return null;
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={busy}
      data-testid="eingang-alle"
      onClick={async () => {
        setBusy(true);
        const r = await senden({ alle: true });
        setBusy(false);
        if (r?.ids?.length) setZurueck(r.ids);
        router.refresh();
      }}
    >
      Alle abhaken
    </button>
  );
}

/** Hinweis im Browser: Zahl im Tab-Titel und, wenn erlaubt, eine Meldung ohne Namen. Läuft in der ganzen App. */
export function EingangWaechter({ start }: { start: number }) {
  useEffect(() => {
    let zahl = start;
    const basis = () => document.title.replace(/^\(\d+\+?\)\s/, "");
    const titel = () => { document.title = zahl > 0 ? `(${zahl > 99 ? "99+" : zahl}) ${basis()}` : basis(); };
    titel();
    const pruefen = async () => {
      if (document.visibilityState === "hidden" && zahl === -1) return;
      const res = await fetch("/api/eingang", { cache: "no-store" }).catch(() => null);
      const d = res?.ok ? await res.json().catch(() => null) : null;
      if (!d || typeof d.offen !== "number") return;
      if (d.offen > zahl && "Notification" in window && Notification.permission === "granted" && document.visibilityState === "hidden") {
        try { new Notification("Sorrida: neue Rückmeldung im Eingang", { body: `${d.offen} offen. Namen stehen nur in Sorrida.`, tag: "sorrida-eingang" }); } catch { /* nicht erlaubt */ }
      }
      zahl = d.offen;
      titel();
    };
    const t = setInterval(pruefen, 60_000);
    // Next.js setzt den Titel bei jedem Seitenwechsel neu (und tauscht dabei auch das title-Element aus):
    // den ganzen Kopf beobachten und die Zahl danach wieder davorsetzen.
    const beobachter = new MutationObserver(() => { if (zahl > 0 && !/^\(\d+\+?\)\s/.test(document.title)) titel(); });
    beobachter.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => { clearInterval(t); beobachter.disconnect(); document.title = basis(); };
  }, [start]);
  return null;
}

/** Schalter im Eingang: Meldungen des Browsers erlauben. */
export function EingangMeldungen() {
  const [stand, setStand] = useState<string>("unbekannt");
  useEffect(() => { setStand("Notification" in window ? Notification.permission : "fehlt"); }, []);
  if (stand === "fehlt" || stand === "unbekannt") return null;
  return (
    <p className="text-xs text-slate-500" data-testid="eingang-meldungen" data-hilfe="eingang-meldungen">
      {stand === "granted" ? "Meldungen des Browsers sind eingeschaltet: Bei neuen Rückmeldungen erscheint ein Hinweis ohne Namen." : stand === "denied" ? "Meldungen sind im Browser gesperrt. Die Zahl im Tab-Titel sehen Sie trotzdem." : (
        <>Neue Rückmeldungen zeigt Sorrida als Zahl im Tab-Titel. <button type="button" className="text-brand-700 underline" onClick={async () => setStand(await Notification.requestPermission())}>Zusätzlich eine Meldung des Browsers erlauben</button> (ohne Namen).</>
      )}
    </p>
  );
}
