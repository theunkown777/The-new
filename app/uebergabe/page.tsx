import { uebergabeAktuell, uebergabeSchritte } from "@/lib/empfangServer";
import { EmpfangKontakt } from "@/components/EmpfangKontakt";
import { EmpfangFertig } from "@/components/EmpfangWaechter";

export const dynamic = "force-dynamic";

// Übersicht der Schritte für den Patienten, der das Tablet gerade in der Hand hat.
export default async function UebergabePage() {
  const a = await uebergabeAktuell();
  if (!a) return null; // Das Layout zeigt die Sperre.
  const { uebergabe: u, patient } = a;
  const s = await uebergabeSchritte(u);
  const datum = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
  const erledigt = <span className="rounded-full bg-salbei-100 px-2.5 py-1 text-xs font-medium text-salbei-800" data-testid="schritt-erledigt">✓ Erledigt</span>;
  const nichtsZuTun = u.zwecke.length === 1 && u.zwecke[0] === "unterschrift" && s.einverstaendnisse.length === 0 && s.unterschrieben === 0;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <h1 className="font-display text-3xl text-slate-900">Guten Tag, {patient.firstName} {patient.lastName}</h1>
      <p className="mt-2 text-slate-600">Bitte erledigen Sie die folgenden Schritte. Danach tippen Sie auf „Fertig“ und geben das Tablet am Empfang zurück.</p>

      <div className="mt-6 space-y-4">
        {u.zwecke.includes("kontakt") && (
          <section className="rounded-2xl bg-white p-5" aria-labelledby="s-kontakt" data-testid="schritt-kontakt">
            <h2 id="s-kontakt" className="text-lg font-semibold text-slate-900">Ihre Kontaktdaten</h2>
            <p className="mt-1 text-sm text-slate-600">Stimmen E-Mail-Adresse und Mobilnummer noch? Bitte prüfen und bei Bedarf berichtigen.</p>
            <EmpfangKontakt email={patient.email ?? ""} phone={patient.phone ?? ""} mail={!!patient.contactConsentAt} whatsapp={!!patient.whatsappConsentAt} praxis={patient.practice.name} />
          </section>
        )}

        {u.zwecke.includes("anamnese") && (
          <section className="rounded-2xl bg-white p-5" aria-labelledby="s-anamnese" data-testid="schritt-anamnese">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="s-anamnese" className="text-lg font-semibold text-slate-900">Anamnesebogen</h2>
              {s.anamneseFertig && erledigt}
            </div>
            {s.anamneseOffen && !s.anamneseFertig ? (
              <>
                <p className="mt-1 text-sm text-slate-600">Einige Fragen zu Ihrer Gesundheit, etwa drei Minuten. Ihre Antworten gehen direkt an die Praxis.</p>
                <a href="/uebergabe/anamnese" className="btn btn-primary mt-4 w-full sm:w-auto" data-testid="schritt-anamnese-start">Jetzt ausfüllen</a>
              </>
            ) : s.anamneseFertig ? (
              <p className="mt-1 text-sm text-slate-600">Vielen Dank. Ihr Bogen ist bei der Praxis angekommen.</p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">Zurzeit ist kein Bogen offen. Bitte fragen Sie am Empfang.</p>
            )}
          </section>
        )}

        {u.zwecke.includes("unterschrift") && (s.einverstaendnisse.length > 0 || s.unterschrieben > 0) && (
          <section className="rounded-2xl bg-white p-5" aria-labelledby="s-unterschrift" data-testid="schritt-unterschrift">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="s-unterschrift" className="text-lg font-semibold text-slate-900">Einverständnis</h2>
              {s.einverstaendnisse.length === 0 && erledigt}
            </div>
            {s.einverstaendnisse.length === 0 ? (
              <p className="mt-1 text-sm text-slate-600">Vielen Dank. Ihr Einverständnis ist bei der Praxis angekommen.</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-600">Bitte lesen Sie die Erklärung in Ruhe und unterschreiben Sie mit dem Finger.</p>
                <ul className="mt-3 space-y-2">
                  {s.einverstaendnisse.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F5F2EE] px-3 py-2.5">
                      <span className="text-sm text-slate-800">Vorschlag vom {datum(e.vom)}</span>
                      <a href={`/uebergabe/unterschrift/${e.id}`} className="btn btn-primary" data-testid="schritt-unterschrift-start">Lesen und unterschreiben</a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {nichtsZuTun && <p className="rounded-2xl bg-white p-5 text-sm text-slate-600" data-testid="schritt-nichts">Zurzeit ist nichts zu erledigen. Bitte geben Sie das Tablet am Empfang zurück.</p>}
      </div>

      <div className="mt-8 text-center">
        <EmpfangFertig gross />
        <p className="mt-3 text-xs text-slate-500">Danach sperrt sich das Tablet. Bitte geben Sie es am Empfang zurück.</p>
      </div>
    </main>
  );
}
