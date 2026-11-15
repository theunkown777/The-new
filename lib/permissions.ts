import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";
import { darf, menueRechte, type Aktion, type MenueRechte } from "@/lib/rollen";

// Gemeinsame Admin-Prüfung für API-Routen, die praxisweite Einstellungen
// ändern (Abrechnung, Katalog, Team) statt reiner Tagesarbeit (Patienten,
// Berichte) - letztere bleiben für alle Praxismitglieder zugänglich.
export async function requireAdmin(): Promise<
  { session: Session; error: null } | { session: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Diese Aktion ist nur für Admin-Konten der Praxis verfügbar." },
        { status: 403 }
      ),
    };
  }
  return { session, error: null };
}

/**
 * Darf dieses Konto die Analyse sehen? Die Geschäftsführung (Admin) immer,
 * Mitarbeitende nur mit Freigabe durch einen Admin (Einstellungen → Team).
 */
export async function canSeeAnalytics(userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false;
  const { prisma } = await import("@/lib/prisma");
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, canSeeAnalytics: true } });
  return !!u && (u.role === "admin" || u.canSeeAnalytics);
}

// ---------------------------------------------------------------------------
// Rollen und Rechte (Matrix in lib/rollen.ts). Rolle und Freigabe kommen bei
// jeder Prüfung frisch aus der Datenbank, nicht aus dem Sitzungs-Cookie.

/** Rolle und Freigabe eines Kontos; null, wenn es das Konto in dieser Praxis nicht (mehr) gibt. */
export async function rechteVon(userId: string | undefined | null, practiceId?: string): Promise<{ role: string; freigabe: boolean } | null> {
  if (!userId) return null;
  const { prisma } = await import("@/lib/prisma");
  const u = await prisma.user.findFirst({ where: { id: userId, ...(practiceId ? { practiceId } : {}) }, select: { role: true, canSeeAnalytics: true } });
  return u ? { role: u.role, freigabe: u.canSeeAnalytics } : null;
}

/** Darf dieses Konto die Aktion ausführen? (Für Seiten und Routen mit eigener Sitzungsprüfung.) */
export async function kontoDarf(userId: string | undefined | null, aktion: Aktion, practiceId?: string): Promise<boolean> {
  const r = await rechteVon(userId, practiceId);
  return !!r && darf(r.role, aktion, { freigabe: r.freigabe });
}

/** Zahlungen und Rechnungen: Geschäftsführung und Mitarbeitende immer, Behandler nur mit Freigabe. */
export const darfZahlungen = (userId: string | undefined | null, practiceId?: string) => kontoDarf(userId, "zahlungen", practiceId);

/** Für Menüs und die Suche: was dieses Konto sehen darf. */
export async function menueRechteVon(userId: string | undefined | null, practiceId?: string): Promise<MenueRechte> {
  const r = await rechteVon(userId, practiceId);
  return r ? menueRechte(r.role, r.freigabe) : menueRechte(undefined, false);
}

/** API-Routen: Sitzung prüfen und Recht verlangen. Antwortet mit 401 bzw. 403. */
export async function requireRecht(aktion: Aktion): Promise<{ session: Session; error: null } | { session: null; error: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (!session) return { session: null, error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
  if (!(await kontoDarf(session.user.id, aktion, session.user.practiceId))) {
    return { session: null, error: NextResponse.json({ error: "Dafür hat Ihr Konto keine Berechtigung. Bitte wenden Sie sich an die Praxisleitung." }, { status: 403 }) };
  }
  return { session, error: null };
}

/**
 * Seiten unter Einstellungen (außer dem eigenen Konto): Behandler werden zur
 * Einstellungs-Übersicht geleitet, die ihnen nur „Sicherheit“ zeigt.
 */
export async function nurMitEinstellungen(): Promise<void> {
  const session = await getServerSession(authOptions);
  const { redirect } = await import("next/navigation");
  if (!session) redirect("/login");
  if (!(await kontoDarf(session!.user.id, "einstellungen.ansehen", session!.user.practiceId))) redirect("/settings");
}
