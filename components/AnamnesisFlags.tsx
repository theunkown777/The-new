import type { AnamnesisFlag } from "@/lib/anamnesis";

/** Hinweise aus der Anamnese, kompakt über Abschluss und Patient. */
export function AnamnesisFlags({ flags, submittedAt }: { flags: AnamnesisFlag[]; submittedAt: string | null }) {
  if (!submittedAt) return null;
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${flags.some((f) => f.level === "warn") ? "border-red-200 bg-red-50 text-red-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}
      data-testid="anamnesis-flags"
    >
      <span className="font-medium">Anamnese vom {new Date(submittedAt).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}:</span>{" "}
      {flags.length === 0
        ? "keine Auffälligkeiten angegeben"
        : flags.map((f, i) => (
            <span key={f.text}>
              {i > 0 && " · "}
              <span className={f.level === "warn" ? "font-semibold" : ""}>{f.text}</span>
              {f.detail && ` (${f.detail})`}
            </span>
          ))}
    </div>
  );
}
