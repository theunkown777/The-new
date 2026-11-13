"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Zahlungsseite: Stripe-Konto der Praxis verbinden (Online-Zahlung im Portal, Daten über den DATEV-Datenservice). */
export function OnlineZahlungEinrichten({ aktiv, fehlt, konto, istAdmin, meldung }: { aktiv: boolean; fehlt: string[]; konto: string | null; istAdmin: boolean; meldung?: string }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const texte: Record<string, string> = {
    verbunden: "Stripe-Konto verbunden. Patientinnen und Patienten können offene Rechnungen jetzt im Portal online bezahlen.",
    abgebrochen: "Verbindung abgebrochen.",
    ungueltig: "Die Verbindung ist abgelaufen. Bitte erneut verbinden.",
    fehler: "Stripe hat die Verbindung nicht bestätigt. Bitte erneut versuchen.",
    "nicht-eingerichtet": "Online-Zahlung ist noch nicht freigeschaltet.",
    "schon-verbunden": "Dieses Stripe-Konto ist bereits mit einer anderen Praxis verbunden. Bitte das Stripe-Konto dieser Praxis verwenden.",
  };
  return (
    <div data-testid="online-zahlung">
      {meldung && texte[meldung] && <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700" role="status">{texte[meldung]}</p>}
      {!aktiv ? (
        <p className="text-sm text-slate-600" data-testid="online-nicht-eingerichtet">
          Online-Zahlung mit Karte ist für Ihre Praxis noch nicht freigeschaltet. Überweisung per GiroCode und Lastschrift funktionieren unabhängig davon. Wenn Sie Kartenzahlung nutzen möchten, schreiben Sie uns über „Hilfe“.
        </p>
      ) : konto ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-salbei-800">
            Verbunden mit Stripe-Konto <span className="font-mono">…{konto.slice(-6)}</span>. Offene Rechnungen sind im Portal online bezahlbar.
          </p>
          {istAdmin && (
            <button
              type="button"
              className="text-slate-500 underline"
              disabled={laeuft}
              onClick={async () => {
                setLaeuft(true);
                await fetch("/api/stripe/trennen", { method: "POST" }).catch(() => null);
                router.refresh();
              }}
            >
              Verbindung trennen
            </button>
          )}
        </div>
      ) : istAdmin ? (
        <a className="btn-primary" href="/api/stripe/verbinden">
          Stripe-Konto der Praxis verbinden
        </a>
      ) : (
        <p className="text-sm text-slate-500">Ein Admin der Praxis kann das Stripe-Konto verbinden.</p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        Patientinnen und Patienten zahlen mit Karte, PayPal, Klarna oder Lastschrift, je nachdem, was im Stripe-Konto freigeschaltet ist. Das Geld geht direkt an die
        Praxis. Für DATEV richtet die Steuerberatung den „DATEV Datenservice Zahlungsdienstleister“ für Stripe ein; im Sorrida-Buchungsstapel stehen Online-Zahlungen auf
        dem Geldtransitkonto.
      </p>
    </div>
  );
}
