import { abschlussWort, fachprofil } from "@/lib/fachprofile";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/SignOutButton";
import { MobileNav } from "@/components/MobileNav";
import { SidebarNav } from "@/components/SidebarNav";
import { EingangWaechter } from "@/components/EingangAktion";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { DemoBanner } from "@/components/DemoBanner";
import { isDental } from "@/lib/specialties";
import { isSupportTeam } from "@/lib/supportTeam";
import { menueRechteVon } from "@/lib/permissions";
import { zweiFaktorPflicht } from "@/lib/zweiFaktorPflicht";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { eingangOffen } from "@/lib/eingang";
import { Suche, SucheKnopf } from "@/components/Suche";
import { UntereLeiste } from "@/components/UntereLeiste";
import { DemoFuehrung } from "@/components/DemoFuehrung";
import { AnsichtWaechter } from "@/components/Ansicht";
import { ANSICHT_SKRIPT } from "@/lib/ansicht";
import { KopfLink } from "@/components/KopfLink";
import { EmpfangWache } from "@/components/EmpfangWache";
import { FragSorrida } from "@/components/FragSorrida";
import { HilfeZeiger } from "@/components/HilfeZeiger";
import { kiHilfenStand } from "@/lib/kiHilfen";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerifiedAt: true, role: true, totpEnabled: true, practice: { select: { isDemo: true, demoExpiresAt: true, specialty: true, require2faAll: true, kiHilfen: true } } },
  });
  const demo = currentUser?.practice.isDemo ? currentUser.practice.demoExpiresAt : null;
  // Berichte (KI, BEMA/GOZ) gibt es bisher nur für Zahnarztpraxen.
  const dental = isDental(currentUser?.practice.specialty);
  // Andere Fächer: Der Menüpunkt erscheint, sobald es einen Bericht gibt (z. B. „Bericht an die überweisende Praxis“
  // aus „Behandlung abschließen“). Ohne Bericht bleibt das Menü kurz.
  const berichte = dental || (await prisma.report.findFirst({ where: { practiceId: session.user.practiceId }, select: { id: true } }).catch(() => null)) !== null;
  const personen = fachprofil(currentUser?.practice.specialty ?? "zahn").person.pl;
  const person = fachprofil(currentUser?.practice.specialty ?? "zahn").person.sg;
  const team = await isSupportTeam(session.user.id);
  // Menü nach Rolle und Freigabe (lib/rollen.ts): Zahlungen, Analyse und Einstellungen der Praxis.
  const menue = await menueRechteVon(session.user.id, session.user.practiceId);
  const analyse = menue.analyse;
  const eingang = await eingangOffen(session.user.practiceId).catch(() => 0);
  // Ohne eingerichtete Zwei-Faktor-Anmeldung zeigt Sorrida bei Pflicht nur die
  // Einrichtung, keine Patientendaten.
  // Auch nach dem Einrichten bleibt die Sitzung gesperrt, bis man sich mit
  // Code neu angemeldet hat (die API-Sperre hängt am Anmelde-Token).
  const nachEinrichtungNeuAnmelden = !!session.user.mfaPending && !!currentUser?.totpEnabled;
  const sperre =
    !!currentUser &&
    (!currentUser.totpEnabled || nachEinrichtungNeuAnmelden) &&
    zweiFaktorPflicht({ role: currentUser.role, require2faAll: currentUser.practice.require2faAll, isDemo: currentUser.practice.isDemo });

  return (
    <>
    {/* Dunkle Ansicht (Beta): nur wenn ausdrücklich gewählt; vor dem ersten Bild gesetzt, damit nichts aufblitzt. */}
    <script dangerouslySetInnerHTML={{ __html: ANSICHT_SKRIPT }} />
    <AnsichtWaechter />
    {/* Übergabe an einen Patienten in einem anderen Tab: auch dieser Tab wird leer (components/EmpfangWache.tsx). */}
    <EmpfangWache />
    <a href="#inhalt" className="sprunglink" data-testid="sprunglink">Zum Inhalt</a>
    <div className="praxis-app min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Desktop: feste Seitenleiste */}
      <aside className="praxis-leiste sticky top-0 hidden h-screen flex-col overflow-y-auto px-4 py-5 lg:flex [&>*]:shrink-0" data-testid="app-sidebar">
        <Link href="/dashboard" className="flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sorrida-mark.webp" alt="" className="hell-nur h-10 w-10" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sorrida-mark-hell.webp" alt="" className="dunkel-nur h-10 w-auto" />
          <span className="font-brand text-brand-700">SORRIDA</span>
        </Link>
        <p className="mb-5 mt-3 truncate rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-800" title={session.user.practiceName}>
          {session.user.practiceName}
        </p>
        <EingangWaechter start={eingang} />
        {!sperre && <SucheKnopf />}
        <SidebarNav eingang={eingang} dental={dental} berichte={berichte} team={team} analyse={analyse} zahlungen={menue.zahlungen} einstellungen={menue.einstellungen} personPl={personen} abschluss={abschlussWort(currentUser?.practice.specialty)} />
        <div className="mt-auto border-t border-slate-200 pt-4 text-sm">
          <p className="truncate px-2 text-slate-700">{session.user.name}</p>
          <div className="px-2 pt-1">
            <SignOutButton className="text-sm text-slate-500 hover:text-brand-700" />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Handy und Tablet: Kopfzeile wie bisher */}
        <header className="relative border-b border-brand-800 bg-brand-600 lg:hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/sorrida-mark-hell.webp" alt="" className="h-8 w-auto shrink-0" />
              <span className="truncate font-semibold tracking-tight text-white">{session.user.practiceName}</span>
            </Link>
            {!sperre && <SucheKnopf variante="kopf" />}
            <nav className="auf-dunkel hidden shrink-0 items-center gap-5 text-sm text-brand-100 sm:flex" aria-label="Hauptnavigation">
              <KopfLink href="/dashboard">Übersicht</KopfLink>
              <KopfLink href="/eingang">Eingang{eingang > 0 ? ` (${eingang})` : ""}</KopfLink>
              <KopfLink href="/patients">{personen}</KopfLink>
              {berichte && <KopfLink href="/reports">Berichte</KopfLink>}
              <KopfLink href="/proposals">Vorschläge</KopfLink>
              {menue.zahlungen && <KopfLink href="/zahlungen">Zahlungen</KopfLink>}
              {analyse && <KopfLink href="/analyse">Analyse</KopfLink>}
              <KopfLink href="/settings">{menue.einstellungen ? "Einstellungen" : "Mein Konto"}</KopfLink>
            </nav>
            <MobileNav eingang={eingang} userName={session.user.name} dental={dental} berichte={berichte} team={team} analyse={analyse} zahlungen={menue.zahlungen} einstellungen={menue.einstellungen} personPl={personen} abschluss={abschlussWort(currentUser?.practice.specialty)} />
          </div>
        </header>
        {/* Suche über alles (Strg+K) und Tastenkürzel; ohne eingerichtete Pflicht-2FA nicht verfügbar */}
        {!sperre && <Suche personPl={personen} personSg={person} />}
        {demo && <DemoBanner expiresAt={demo} role={session.user.role} userName={session.user.name} />}
        {demo && !sperre && <DemoFuehrung />}
        {!demo && !currentUser?.emailVerifiedAt && <VerifyEmailBanner />}
        <main id="inhalt" className="praxis-inhalt px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {sperre ? (
            <div className="mx-auto max-w-xl space-y-4" data-testid="zwei-faktor-pflicht">
              <h1 className="font-display text-3xl text-slate-900">Zwei-Faktor-Anmeldung einrichten</h1>
              <p className="text-sm text-slate-600">
                {currentUser?.role === "admin"
                  ? "Für Konten der Praxisleitung ist die Zwei-Faktor-Anmeldung Pflicht, weil sie Zugriff auf alle Patientendaten, Exporte und Einstellungen haben."
                  : "Ihre Praxis verlangt die Zwei-Faktor-Anmeldung für alle Konten."}{" "}
                Sie brauchen eine Authenticator-App (z. B. die von Microsoft, Google oder Apple). Danach geht es direkt weiter.
              </p>
              <TwoFactorSettings initialEnabled={currentUser?.totpEnabled ?? false} />
              <p className="text-sm text-slate-600">Wenn die Zwei-Faktor-Anmeldung eingerichtet ist und Sie die Backup-Codes gesichert haben, melden Sie sich einmal neu an, diesmal mit Code.</p>
              <SignOutButton className="btn-primary" />
            </div>
          ) : (
            children
          )}
        </main>
        {/* Handy und Tablet: vier Ziele am unteren Rand; „Mehr“ öffnet das Menü aus der Kopfzeile. */}
        {!sperre && <UntereLeiste eingang={eingang} personPl={personen} />}
        {/* Frag Sorrida: schwebender Knopf unten rechts (nicht am Tablet im Wartezimmer, /empfang), und „Zeig mir wo“. */}
        {!sperre && (
          <FragSorrida
            modus="app"
            fach={dental ? "zahn" : "andere"}
            rechte={menue}
            ki={kiHilfenStand(currentUser?.practice.kiHilfen).aktiv}
            personPl={personen}
            abschluss={abschlussWort(currentUser?.practice.specialty)}
          />
        )}
        {!sperre && <HilfeZeiger />}
      </div>
    </div>
    </>
  );
}
