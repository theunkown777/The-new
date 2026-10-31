import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/SignOutButton";
import { MobileNav } from "@/components/MobileNav";
import { SidebarNav } from "@/components/SidebarNav";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { DemoBanner } from "@/components/DemoBanner";
import { isDental } from "@/lib/specialties";
import { isSupportTeam } from "@/lib/supportTeam";
import { canSeeAnalytics } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerifiedAt: true, practice: { select: { isDemo: true, demoExpiresAt: true, specialty: true } } },
  });
  const demo = currentUser?.practice.isDemo ? currentUser.practice.demoExpiresAt : null;
  // Berichte (KI, BEMA/GOZ) gibt es bisher nur für Zahnarztpraxen.
  const dental = isDental(currentUser?.practice.specialty);
  const team = await isSupportTeam(session.user.id);
  const analyse = await canSeeAnalytics(session.user.id);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Desktop: feste Seitenleiste */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex" data-testid="app-sidebar">
        <Link href="/dashboard" className="flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sorrida-mark.svg" alt="" className="h-10 w-10" />
          <span className="font-brand text-brand-700">SORRIDA</span>
        </Link>
        <p className="mb-5 mt-3 truncate rounded-xl bg-[#F5F2EE] px-3 py-2 text-sm font-medium text-slate-800" title={session.user.practiceName}>
          {session.user.practiceName}
        </p>
        <SidebarNav dental={dental} team={team} analyse={analyse} />
        <div className="mt-auto border-t border-slate-100 pt-4 text-sm">
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
              <img src="/brand/sorrida-mark-hell.svg" alt="" className="h-8 w-auto shrink-0" />
              <span className="truncate font-semibold tracking-tight text-white">{session.user.practiceName}</span>
            </Link>
            <nav className="hidden shrink-0 items-center gap-5 text-sm text-brand-100 sm:flex">
              <Link href="/dashboard" className="hover:text-white">Übersicht</Link>
              <Link href="/patients" className="hover:text-white">Patienten</Link>
              {dental && <Link href="/reports" className="hover:text-white">Berichte</Link>}
              <Link href="/proposals" className="hover:text-white">Vorschläge</Link>
              <Link href="/zahlungen" className="hover:text-white">Zahlungen</Link>
              {analyse && <Link href="/analyse" className="hover:text-white">Analyse</Link>}
              <Link href="/settings" className="hover:text-white">Einstellungen</Link>
            </nav>
            <MobileNav userName={session.user.name} dental={dental} team={team} analyse={analyse} />
          </div>
        </header>
        {demo && <DemoBanner expiresAt={demo} role={session.user.role} userName={session.user.name} />}
        {!demo && !currentUser?.emailVerifiedAt && <VerifyEmailBanner />}
        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
