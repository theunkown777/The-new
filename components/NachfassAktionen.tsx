"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PortalLinkButton } from "@/components/PortalLinkButton";
import { nachfassText } from "@/lib/nachfassen";
import { waLink } from "@/lib/whatsapp";

/** Knöpfe je Zeile der Nachfass-Liste: erinnern (Link + Text, auf Wunsch per WhatsApp) und „HKP eingereicht“. */
export function NachfassAktionen({ id, patientId, firstName, practiceName, zahnersatz, hkp, hkpEingereicht, whatsappNummer }: {
  id: string;
  patientId: string;
  firstName: string;
  practiceName: string;
  zahnersatz: boolean;
  /** Ob die Zeile einen Heil- und Kostenplan braucht (Zahnersatz vor dem Stichtag). */
  hkp: boolean;
  hkpEingereicht: boolean;
  /** Nur gesetzt, wenn Mobilnummer und Einwilligung vorliegen. */
  whatsappNummer: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  // Häkchen sofort zeigen, nicht erst nach dem Neuladen der Liste.
  const [eingereicht, setEingereicht] = useState(hkpEingereicht);

  async function melden(aktion: "nachgefasst" | "hkp" | "hkp-zurueck") {
    setBusy(true);
    setFehler(null);
    const res = await fetch(`/api/proposals/${id}/nachfassen`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aktion }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      if (aktion !== "nachgefasst") setEingereicht(aktion !== "hkp");
      return setFehler("Hat nicht geklappt. Bitte noch einmal versuchen.");
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <PortalLinkButton
        patientId={patientId}
        firstName={firstName}
        practiceName={practiceName}
        label="Erinnern"
        className="btn-secondary !py-1 text-xs"
        copyLabel="Text kopieren"
        message={(u) => {
          if (u !== url) setTimeout(() => setUrl(u), 0);
          return nachfassText({ firstName, practiceName, url: u, zahnersatz });
        }}
        onCreated={() => melden("nachgefasst")}
      />
      {url && whatsappNummer && (
        <a className="btn-secondary !py-1 text-xs" href={waLink(whatsappNummer, nachfassText({ firstName, practiceName, url, zahnersatz }))} target="_blank" rel="noopener noreferrer">
          In WhatsApp öffnen
        </a>
      )}
      {hkp && (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={eingereicht}
            disabled={busy}
            onChange={(e) => {
              setEingereicht(e.target.checked);
              melden(e.target.checked ? "hkp" : "hkp-zurueck");
            }}
            data-testid="hkp-eingereicht"
          />
          Heil- und Kostenplan eingereicht
        </label>
      )}
      {fehler && <span className="text-xs text-red-700">{fehler}</span>}
    </div>
  );
}
