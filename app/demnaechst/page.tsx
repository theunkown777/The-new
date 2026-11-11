import type { Metadata } from "next";
import { VorschauLogin } from "@/components/VorschauLogin";

export const metadata: Metadata = {
  title: "Sorrida – demnächst",
  description: "Sorrida wird demnächst veröffentlicht.",
  robots: { index: false, follow: false },
};

// Seite für die eigene Domain, solange Sorrida noch nicht öffentlich ist (lib/vorschau.ts).
export default function Demnaechst({ searchParams }: { searchParams: { weiter?: string } }) {
  const weiter = searchParams.weiter && searchParams.weiter.startsWith("/") && !searchParams.weiter.startsWith("//") ? searchParams.weiter : "/";
  const zugangAktiv = !!(process.env.VORSCHAU_BENUTZER && process.env.VORSCHAU_PASSWORT);
  return (
    <main
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-12 text-center text-white"
      style={{ background: "radial-gradient(120% 140% at 85% 20%, #6b2a24 0%, #5a1d1d 45%, #431515 100%)" }}
      data-testid="demnaechst"
    >
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-56 h-[42rem] w-[42rem] rounded-full border border-white/10" />
      <div className="relative w-full max-w-2xl">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sorrida-mark-hell.webp" alt="" className="h-24 w-24 sm:h-28 sm:w-28" />
          <div className="sm:text-left">
            <h1 className="font-brand text-5xl text-white sm:text-6xl">SORRIDA</h1>
            <p className="mt-2 text-base text-brand-100 sm:text-lg">Nach dem Patientengespräch ein Klick. Für jede Praxis.</p>
            <p className="mt-1 text-sm text-brand-300">Praxissoftware für Arzt-, Zahnarzt- und Therapiepraxen</p>
          </div>
        </div>
        <p className="mt-10 font-display text-3xl sm:text-4xl">Wird demnächst veröffentlicht.</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-brand-100">Wir bereiten den Start mit unseren ersten Praxen vor. Bald finden Sie hier alles über Sorrida.</p>
        {zugangAktiv && <VorschauLogin weiter={weiter} />}
      </div>
    </main>
  );
}
