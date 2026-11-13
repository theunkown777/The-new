import Link from "next/link";

// Deutsche Seite für Adressen, die es nicht gibt (statt der englischen Standardseite).
export default function NichtGefunden() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#F5F2EE] px-4 py-16 text-center">
      <div className="max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/sorrida-mark.webp" alt="" className="mx-auto h-14 w-14" />
        <h1 className="font-display mt-6 text-4xl text-slate-900">Diese Seite gibt es nicht</h1>
        <p className="mt-3 text-slate-600">
          Vielleicht ist der Link unvollständig oder die Seite wurde verschoben. Patienten: Bitte öffnen Sie den Link aus der Nachricht Ihrer Praxis noch einmal
          oder rufen Sie in der Praxis an.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">Zur Startseite</Link>
          <Link href="/login" className="btn-secondary">Zur Anmeldung</Link>
        </div>
      </div>
    </main>
  );
}
