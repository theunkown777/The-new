import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/SignOutButton";
import { MobileNav } from "@/components/MobileNav";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { DemoBanner } from "@/components/DemoBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerifiedAt: true, practice: { select: { isDemo: true, demoExpiresAt: true } } },
  });
  const demo = currentUser?.practice.isDemo ? currentUser.practice.demoExpiresAt : null;

  return (
    <div className="min-h-screen">
      <header className="relative border-b border-brand-800 bg-brand-600">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 truncate">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sorrida-mark-hell.svg" alt="" className="h-8 w-auto shrink-0" />
            <span className="truncate font-semibold tracking-tight text-white">
              {session.user.practiceName}
            </span>
            <span className="font-brand hidden shrink-0 text-xs text-brand-200 sm:inline">
              SORRIDA
            </span>
          </Link>

          <nav className="hidden items-center gap-4 text-sm text-brand-100 sm:flex">
            <Link href="/dashboard" className="hover:text-white">Übersicht</Link>
            <Link href="/patients" className="hover:text-white">Patienten</Link>
            <Link href="/reports" className="hover:text-white">Berichte</Link>
            <Link href="/proposals" className="hover:text-white">Vorschläge</Link>
          </nav>
          <div className="hidden items-center gap-4 text-sm text-brand-100 sm:flex">
            <span className="max-w-[10rem] truncate">{session.user.name}</span>
            <Link href="/settings" className="hover:text-white">Einstellungen</Link>
            <SignOutButton />
          </div>

          <MobileNav userName={session.user.name} />
        </div>
      </header>
      {demo && <DemoBanner expiresAt={demo} />}
      {!demo && !currentUser?.emailVerifiedAt && <VerifyEmailBanner />}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
