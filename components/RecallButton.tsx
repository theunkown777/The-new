"use client";

import { useState } from "react";
import { PortalLinkButton } from "@/components/PortalLinkButton";
import { recallTerminText, recallText } from "@/lib/recall";
import { waLink } from "@/lib/whatsapp";

/**
 * Erinnerung an die Vorsorge. Bietet die Praxis Online-Termine an, führt der Link direkt zu den freien
 * Zeiten (der Anlass ist eingetragen) und der Patient bucht selbst. Verschickt wird nichts von allein:
 * Die Praxis kopiert den Text oder öffnet ihn in WhatsApp und tippt dort auf „Senden“.
 */
export function RecallButton({ patientId, firstName, practiceName, leistung, hinweis, buchungAktiv = false, whatsappNummer = null }: {
  patientId: string;
  firstName: string;
  practiceName: string;
  leistung: string;
  hinweis: string;
  /** Online-Terminbuchung der Praxis ist eingeschaltet */
  buchungAktiv?: boolean;
  /** Nur gesetzt, wenn Mobilnummer und Einwilligung vorliegen */
  whatsappNummer?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const text = (u: string) => (buchungAktiv ? recallTerminText : recallText)({ firstName, practiceName, leistung, hinweis, url: u });
  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <PortalLinkButton
        patientId={patientId}
        firstName={firstName}
        practiceName={practiceName}
        label={buchungAktiv ? "Termin anbieten" : "Erinnerung erstellen"}
        copyLabel="Text kopieren"
        message={(u) => {
          if (u !== url) setTimeout(() => setUrl(u), 0);
          return text(u);
        }}
        onCreated={async () => {
          // Nur vermerken, die Liste nicht neu laden: Sonst gilt die Person sofort als „erinnert“ und die Zeile
          // verschwindet samt dem Text, den die Praxis gerade kopieren oder senden will.
          await fetch(`/api/patients/${patientId}/recall`, { method: "POST" });
        }}
      />
      {url && whatsappNummer && (
        <a className="btn-secondary !py-1 text-xs" href={waLink(whatsappNummer, text(url))} target="_blank" rel="noopener noreferrer" data-testid="recall-whatsapp">
          In WhatsApp öffnen
        </a>
      )}
    </div>
  );
}
