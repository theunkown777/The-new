import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { VorschauDemo } from "@/components/VorschauDemo";

export const metadata: Metadata = {
  title: "Sorrida ansehen – Vorschau ohne Anmeldung",
  description: "So arbeitet Sorrida: Befund anklicken, Patient vergleicht auf dem Handy, Rückmeldung und To-dos entstehen automatisch. Interaktiv, ohne Anmeldung.",
};

export default function Vorschau() {
  return (
    <PublicShell full>
      <p className="text-sm font-semibold text-brand-700">Vorschau · ohne Anmeldung, es wird nichts gespeichert</p>
      <h1 className="font-display mt-2 text-3xl leading-tight text-slate-900">So arbeitet Sorrida in einer Beispielpraxis</h1>
      <p className="mb-8 mt-3 max-w-2xl text-lg text-slate-600">
        Wählen Sie oben ein Fach, tippen Sie im Handy eine Option an und schicken Sie die Rückmeldung ab. Gerechnet wird mit dem echten
        Regelwerk und Beispielpreisen.
      </p>
      <VorschauDemo />
    </PublicShell>
  );
}
