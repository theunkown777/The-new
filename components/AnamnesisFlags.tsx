import type { AnamnesisFlag } from "@/lib/anamnesis";

const tagFmt = (tag: string) => new Date(`${tag}T00:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Hinweise aus der Anamnese, kompakt über Abschluss und Patient (Akte, Abschluss, Einbettung in die Praxissoftware).
 * Hat der Patient Angaben von seinem eigenen Gerät übernommen, steht das hier mit dem Stand. Woher die Angaben stammen,
 * erfährt die Praxis nicht (lib/meineAngaben.ts).
 */
export function AnamnesisFlags({ flags, submittedAt, vorbefuelltStand }: { flags: AnamnesisFlag[]; submittedAt: string | null; vorbefuelltStand?: string | null }) {
  if (!submittedAt) return null;
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${flags.some((f) => f.level === "warn") ? "border-red-200 bg-red-50 text-red-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}
      data-testid="anamnesis-flags"
    >
      <p>
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
      </p>
      {vorbefuelltStand && (
        <p className="mt-1 text-xs" data-testid="anamnese-vorbefuellt">
          Teilweise mit gespeicherten Angaben des Patienten vorausgefüllt (Stand {tagFmt(vorbefuelltStand)}), vom Patienten geprüft.
        </p>
      )}
    </div>
  );
}
