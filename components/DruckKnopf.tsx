"use client";

/** Öffnet den Druckdialog des Browsers (auch „Als PDF speichern“). */
export function DruckKnopf({ label = "Drucken oder als PDF speichern" }: { label?: string }) {
  return (
    <button type="button" className="btn-secondary print:hidden" onClick={() => window.print()}>
      {label}
    </button>
  );
}
