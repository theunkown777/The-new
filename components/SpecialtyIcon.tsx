// Schlichte Liniensymbole je Fachgebiet (24×24, Strichstärke wie die Schrift).
// Bewusst zurückhaltend, damit kein Fach optisch dominiert.
const PATHS: Record<string, string> = {
  zahn: "M7 3.5c-2 0-3.5 1.7-3.5 4.2 0 2 .7 3.4 1.2 4.8.6 1.7.6 3.8 1 5.6.4 1.9 1 3.4 1.9 3.4 1.2 0 1.3-2.4 1.7-4.3.3-1.4.8-2.2 1.7-2.2s1.4.8 1.7 2.2c.4 1.9.5 4.3 1.7 4.3.9 0 1.5-1.5 1.9-3.4.4-1.8.4-3.9 1-5.6.5-1.4 1.2-2.8 1.2-4.8 0-2.5-1.5-4.2-3.5-4.2-1.6 0-2.5 1-4 1s-2.4-1-4-1Z",
  hausarzt: "M6 3v5a4 4 0 0 0 8 0V3M6 3H5M14 3h1M10 12v3a5 5 0 0 0 10 0v-2M20 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  augen: "M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  haut: "M12 21c-4.4 0-8-3.3-8-7.5C4 8.6 12 3 12 3s8 5.6 8 10.5c0 4.2-3.6 7.5-8 7.5ZM9.5 13.5h.01M14 11h.01M13.5 16h.01",
  gyn: "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 13v8M8.5 17.5h7",
  uro: "M10 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM14.3 10.7 20 5M15 5h5v5",
  ortho: "M8.5 4.5a2.2 2.2 0 0 0-3.8 2.2 2.2 2.2 0 0 0-1.2 3.7 2.2 2.2 0 0 0 3.1 0l8.2 8.2a2.2 2.2 0 0 0 0 3.1 2.2 2.2 0 0 0 3.7-1.2 2.2 2.2 0 0 0 2.2-3.8 2.2 2.2 0 0 0-3.1 0L9.4 8.5a2.2 2.2 0 0 0-.9-4Z",
  hno: "M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3.5 3.5 0 0 1-7 0M10 9a2 2 0 0 1 4 0c0 1.5-2 2-2 3.5",
  kinder: "M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 14v3M10 21l2-4 2 4M10 8.5h.01M14 8.5h.01M10.5 11a2 2 0 0 0 3 0",
  kardio: "M20.5 8.6c0 5-8.5 11.4-8.5 11.4S3.5 13.6 3.5 8.6A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.5 2.6ZM3.5 12h4l1.5-3 3 6 1.5-3h7",
  andere: "M12 5v14M5 12h14",
};

export function SpecialtyIcon({ id, className = "h-7 w-7" }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[id] ?? PATHS.andere} />
    </svg>
  );
}
