import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/SignOutButton";
import { MobileNav } from "@/components/MobileNav";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { DemoBanner } from "@/components/DemoBanner";
import { isDental } from "@/lib/specialties";

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

  return (
    <div className="min-h-screen">
      <header className="relative border-b border-brand-800 bg-brand-600">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-10">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sorrida-mark-hell.svg" alt="" className="h-8 w-auto shrink-0" />
            <span className="truncate font-semibold tracking-tight text-white">
              {session.user.practiceName}
            </span>
            <span className="font-brand hidden shrink-0 text-xs text-brand-200 lg:inline">
              SORRIDA
            </span>
          </Link>

          <nav className="hidden shrink-0 items-center gap-5 text-sm text-brand-100 sm:flex">
            <Link href="/dashboard" className="hover:text-white">Übersicht</Link>
            <Link href="/patients" className="hover:text-white">Patienten</Link>
            {dental && <Link href="/reports" className="hover:text-white">Berichte</Link>}
            <Link href="/proposals" className="hover:text-white">Vorschläge</Link>
          </nav>
          <div className="hidden shrink-0 items-center gap-4 border-l border-brand-500 pl-5 text-sm text-brand-100 sm:flex">
            <span className="max-w-[10rem] truncate">{session.user.name}</span>
            <Link href="/settings" className="hover:text-white">Einstellungen</Link>
            <SignOutButton />
          </div>

          <MobileNav userName={session.user.name} dental={dental} />
        </div>
      </header>
      {demo && <DemoBanner expiresAt={demo} />}
      {!demo && !currentUser?.emailVerifiedAt && <VerifyEmailBanner />}
      <main className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
    </div>
  );
}
