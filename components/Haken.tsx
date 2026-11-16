/**
 * Kleiner Haken, der sich einmal zeichnet: Bestätigung nach erfolgreichem Speichern.
 * Rein schmückend (aria-hidden); der Text daneben sagt, was geschehen ist. Bewegung aus bei „Bewegung reduzieren“.
 */
export function Haken({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`haken ${className}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-testid="haken">
      <path pathLength={1} d="M4 10.5l4 4 8-9" />
    </svg>
  );
}
