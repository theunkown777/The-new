import Link from "next/link";

// Rahmen für Impressum und Datenschutz: öffentlich, ohne App-Navigation.
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/sorrida-mark.svg" alt="" className="h-10 w-auto" />
        <span className="font-brand text-brand-700">SORRIDA</span>
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">{title}</h1>
      <div className="space-y-5 text-sm leading-relaxed text-slate-700 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 [&_a]:text-brand-600 [&_a]:underline">
        {children}
      </div>
    </main>
  );
}
