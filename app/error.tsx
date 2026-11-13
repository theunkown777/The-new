"use client";

// Deutsche Fehlerseite statt einer leeren oder englischen Seite. Details stehen im Server-Protokoll, nicht hier.
export default function Fehler({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#F5F2EE] px-4 py-16 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-4xl text-slate-900">Das hat nicht geklappt</h1>
        <p className="mt-3 text-slate-600">
          Beim Laden ist ein Fehler aufgetreten. Ihre Daten sind nicht verloren. Bitte versuchen Sie es noch einmal; wenn es wieder passiert, schreiben Sie uns über
          „Hilfe“.
        </p>
        <button type="button" onClick={reset} className="btn-primary mt-6">
          Noch einmal versuchen
        </button>
      </div>
    </main>
  );
}
