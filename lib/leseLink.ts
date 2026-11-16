import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/tokens";

// Lese-Link für eine Vertrauensperson: Die Patientin oder der Patient erzeugt in der eigenen Ansicht des Vorschlags
// einen zweiten Link nur zum Lesen. Wer ihn hat, sieht Möglichkeiten und Eigenanteile, kann aber nichts auswählen,
// senden, unterschreiben oder herunterladen. Gespeichert wird nur der Hash; für wen der Link ist, weiß Sorrida nicht.
// Der Link gilt nur, solange der Zugang des Patienten gilt (Patienten-Link bzw. Portal), und ist jederzeit widerrufbar.

export const LESE_LINK_MAX = 3;
export const TOKEN_FORM = /^[A-Za-z0-9_-]{20,128}$/;

type Zeile = { expiresAt: Date; revokedAt: Date | null };

/** Aktiv ist ein Lese-Link, der nicht widerrufen und nicht abgelaufen ist. */
export const leseLinkAktiv = (l: Zeile, now = new Date()) => !l.revokedAt && l.expiresAt > now;

/** Ob noch ein weiterer Lese-Link erzeugt werden darf (höchstens drei gleichzeitig). */
export const darfNeuenLeseLink = (links: Zeile[], now = new Date()) => links.filter((l) => leseLinkAktiv(l, now)).length < LESE_LINK_MAX;

/**
 * Bis wann der Zugang des Patienten gilt, über den der Lese-Link erzeugt wurde; null = Zugang besteht nicht mehr
 * (Link gesperrt, abgelaufen oder Vorschlag nicht mehr für den Patienten sichtbar). Der Lese-Link endet dann mit.
 */
export function zugangBis(
  l: { quelle: string; zugangHash: string },
  p: { status: string; shareTokenHash: string | null; shareExpiresAt: Date | null; shareCreatedAt: Date | null; patient: { portalTokenHash: string | null; portalExpiresAt: Date | null } },
  now = new Date(),
): Date | null {
  // Derselbe Zugang wie beim Erzeugen: Sperrt oder ersetzt die Praxis den Link des Patienten, gilt auch der Lese-Link nicht mehr.
  if (!l.zugangHash) return null;
  if (l.quelle === "PORTAL") {
    const sichtbar = !!p.shareCreatedAt || p.status === "BESPROCHEN" || p.status === "ANGENOMMEN";
    return sichtbar && p.patient.portalTokenHash === l.zugangHash && p.patient.portalExpiresAt && p.patient.portalExpiresAt > now ? p.patient.portalExpiresAt : null;
  }
  return p.shareTokenHash === l.zugangHash && p.shareExpiresAt && p.shareExpiresAt > now ? p.shareExpiresAt : null;
}

/** Zeile für die Praxis im Vorschlag: dass es Lese-Links gibt, nicht für wen. Leer, wenn nie einer erzeugt wurde. */
export function leseLinkVermerk(links: Zeile[], now = new Date()): string {
  if (!links.length) return "";
  const aktiv = links.filter((l) => leseLinkAktiv(l, now)).length;
  const basis = links.length === 1 ? "Der Patient hat einen Lese-Link für eine Vertrauensperson erzeugt" : `Der Patient hat ${links.length} Lese-Links für Vertrauenspersonen erzeugt`;
  return `${basis} (${aktiv === 0 ? "keiner mehr aktiv" : aktiv === 1 ? "1 aktiv" : `${aktiv} aktiv`}). Darüber kann nur gelesen werden.`;
}

/** Hashes der Zugänge, die der Patient gerade hat (Patienten-Link und Portal); Lese-Links zu älteren Zugängen sind erloschen. */
async function zugaenge(proposalId: string, db: Prisma.TransactionClient = prisma): Promise<string[]> {
  const p = await db.treatmentProposal.findUnique({ where: { id: proposalId }, select: { shareTokenHash: true, patient: { select: { portalTokenHash: true } } } });
  return [p?.shareTokenHash, p?.patient.portalTokenHash].filter((x): x is string => !!x);
}

/** Aktive Lese-Links eines Vorschlags für die Liste in der Patientenansicht (ohne Token; den kennt nur, wer den Link bekam). */
export async function leseLinksAktiv(proposalId: string, now = new Date(), db: Prisma.TransactionClient = prisma) {
  const links = await db.leseLink.findMany({
    where: { proposalId, revokedAt: null, expiresAt: { gt: now }, zugangHash: { in: await zugaenge(proposalId, db) } },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true },
  });
  return links.map((l) => ({ id: l.id, createdAt: l.createdAt.toISOString() }));
}

/** Neuen Lese-Link anlegen. Der Rohwert des Tokens wird nur hier einmal zurückgegeben. Null, wenn schon drei aktiv sind. */
export async function leseLinkErzeugen(proposalId: string, quelle: "LINK" | "PORTAL", expiresAt: Date, zugangHash: string) {
  const { raw, hash } = generateToken();
  // Zählen und Anlegen in einem Schritt: Die Sperre je Vorschlag lässt gleichzeitige Anfragen nacheinander zählen.
  // Ohne sie könnten mehrere Anfragen im selben Augenblick alle „noch unter drei“ sehen und zusammen mehr Links anlegen.
  const l = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${leseLinkSperre(proposalId)}))`;
    if ((await leseLinksAktiv(proposalId, new Date(), tx)).length >= LESE_LINK_MAX) return null;
    return tx.leseLink.create({ data: { proposalId, tokenHash: hash, quelle, expiresAt, zugangHash }, select: { id: true, createdAt: true } });
  });
  return l ? { id: l.id, createdAt: l.createdAt.toISOString(), raw } : null;
}

/** Name der Sperre für das Anlegen von Lese-Links eines Vorschlags (eine Sperre je Vorschlag, nicht je Praxis). */
export const leseLinkSperre = (proposalId: string) => `leselink:${proposalId}`;

export const leseLinkWiderrufen = async (proposalId: string, id: string) =>
  (await prisma.leseLink.updateMany({ where: { id, proposalId, revokedAt: null }, data: { revokedAt: new Date() } })).count > 0;

/** Vorschlag zu einem Lese-Link; null, wenn der Link unbekannt, widerrufen oder abgelaufen ist oder der Zugang des Patienten endete. */
export async function leseLinkVorschlag(token: string, now = new Date()) {
  if (!TOKEN_FORM.test(token)) return null;
  const l = await prisma.leseLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      proposal: {
        select: {
          id: true, practiceId: true, status: true, input: true, choices: true, shareTokenHash: true, shareExpiresAt: true, shareCreatedAt: true,
          patient: { select: { portalTokenHash: true, portalExpiresAt: true } },
          practice: { select: { name: true, proposalPrices: true } },
        },
      },
    },
  });
  if (!l || !leseLinkAktiv(l, now)) return null;
  const bis = zugangBis(l, l.proposal, now);
  if (!bis) return null;
  return { proposal: l.proposal, expiresAt: bis < l.expiresAt ? bis : l.expiresAt };
}
