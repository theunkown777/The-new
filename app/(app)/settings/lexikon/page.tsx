import { prisma } from "@/lib/prisma";

export default async function LexikonPage() {
  const entries = await prisma.lexikonEntry.findMany({
    orderBy: [{ category: "asc" }, { position: "asc" }],
  });

  const byCategory = new Map<string, typeof entries>();
  for (const entry of entries) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 font-display text-3xl text-slate-900">Leistungslexikon</h1>
      <p className="mb-6 text-sm text-slate-500">
        Allgemeine Hintergrundinfos zu gängigen Selbstzahlerleistungen (IGEL) – zum Nachschlagen im
        Beratungsgespräch, nicht patientenbezogen.
      </p>

      <p className="mb-6 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
        Dies ist ein reines Nachschlagewerk, keine Empfehlung für einen bestimmten Patienten. Ob eine
        Selbstzahlerleistung im Einzelfall sinnvoll ist, bleibt allein die fachliche Einschätzung der
        behandelnden Person im persönlichen Gespräch (§1 GOZ / Musterberufsordnung). Die Angaben zur
        GKV-Abgrenzung sind allgemeine Richtwerte – die genaue Ausgestaltung variiert je Krankenkasse
        und Bundesland und ist gegen den aktuell gültigen Leistungskatalog zu prüfen.
      </p>

      <div className="space-y-6">
        {Array.from(byCategory.entries()).map(([category, items]) => (
          <div key={category} className="card p-0">
            <h2 className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {category}
            </h2>
            <div className="divide-y divide-slate-100">
              {items.map((entry) => (
                <div key={entry.id} className="px-4 py-3">
                  <h3 className="text-sm font-medium text-slate-900">{entry.title}</h3>
                  <p className="mt-1.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">GKV-Einordnung: </span>
                    {entry.gkvEinordnung}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">Mögliche Selbstzahler-Option: </span>
                    {entry.selbstzahlerOption}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
