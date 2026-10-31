// "Kasse zuerst" zum Ansehen: Unten (links) der Kassenanteil in Salbei als
// Sockel, darauf der Eigenanteil in Bordeaux. Beträge stehen als Text daneben,
// damit nichts nur über Farbe erkennbar ist.

const eur = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;

export function KassenSockel({ kasse, eigen, labels = { kasse: "Kasse zahlt", eigen: "Ihr Anteil" }, className = "" }: { kasse: number; eigen: number; labels?: { kasse: string; eigen: string }; className?: string }) {
  const total = Math.max(kasse + eigen, 1);
  return (
    <div className={className} data-testid="kassen-sockel">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        {kasse > 0 && <span className="h-full rounded-l-full bg-salbei-500" style={{ width: `${(kasse / total) * 100}%` }} />}
        {eigen > 0 && <span className={`h-full bg-brand-600 ${kasse > 0 ? "" : "rounded-l-full"} rounded-r-full`} style={{ width: `${(eigen / total) * 100}%` }} />}
      </div>
      <div className="mt-1.5 flex justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-salbei-500" />{labels.kasse} <b className="tabular-nums text-slate-900">{eur(kasse)}</b></span>
        <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full bg-brand-600" />{labels.eigen} <b className="tabular-nums text-slate-900">{eur(eigen)}</b></span>
      </div>
    </div>
  );
}
