import { z } from "zod";
import { rolleVon } from "@/lib/rollen";

// Rechte je Standort. Mitarbeitende können einem oder mehreren Standorten
// zugeordnet sein (Einstellungen → Team). Wer zugeordnet ist, sieht Termine
// und Terminübersichten (Tagesliste, Auslastung, Ausfallquote) nur dieser
// Standorte. Ohne Zuordnung gelten alle Standorte. Die Geschäftsführung sieht
// immer alle.
//
// Bewusst NICHT eingeschränkt sind Patienten: Ein Patient kann mehrere
// Standorte besuchen, deshalb bleiben Patienten, Vorschläge und Berichte
// praxisweit sichtbar. Das steht so auch im Einstellungstext (STANDORT_HINWEIS).
//
// Reine Logik oben (getestet in lib/standortRechte.test.ts), der Zugriff auf
// die Datenbank unten in standortRechtVon().

/** null = keine Einschränkung (alle Standorte, auch Termine ohne Standort). Liste = nur diese Standorte. */
export type StandortRecht = string[] | null;

export const STANDORT_HINWEIS =
  "Wer Standorten zugeordnet ist, sieht Termine, Auslastung und Ausfallquote nur für diese Standorte und kann Termine nur dort eintragen. Ohne Zuordnung gelten alle Standorte. " +
  "Patienten, Vorschläge und Berichte bleiben für alle in der Praxis sichtbar, weil ein Patient mehrere Standorte besuchen kann. " +
  "Termine ohne Standort (z. B. online gebuchte) sehen nur Personen ohne Zuordnung. Die Geschäftsführung sieht immer alles.";

/**
 * Recht aus Rolle und Zuordnung. Die Geschäftsführung ist nie eingeschränkt.
 * Zuordnungen zu Standorten, die es in der Praxis nicht (mehr) gibt, zählen nicht;
 * bleibt keine übrig, gelten alle Standorte.
 */
export function standortRecht(rolle: unknown, zugeordnet: string[], praxisStandorte?: string[]): StandortRecht {
  if (rolleVon(rolle) === "admin") return null;
  const ids = [...new Set(zugeordnet)].filter((id) => !praxisStandorte || praxisStandorte.includes(id));
  return ids.length ? ids : null;
}

export const istEingeschraenkt = (recht: StandortRecht): recht is string[] => recht !== null;

/** Darf dieses Konto Termine dieses Standorts sehen und ändern? Termine ohne Standort nur ohne Einschränkung. */
export function darfStandort(recht: StandortRecht, locationId: string | null | undefined): boolean {
  if (recht === null) return true;
  return !!locationId && recht.includes(locationId);
}

/**
 * Bedingung für Termin-Abfragen (Prisma `where`, zusätzlich zu practiceId).
 * `ort`: ein bereits mit gewaehlterStandort() geprüfter Standort-Filter der Seite.
 */
export function terminFilter(recht: StandortRecht, ort?: string | null): { locationId?: string | { in: string[] } } {
  if (ort) return darfStandort(recht, ort) ? { locationId: ort } : { locationId: { in: [] } };
  if (recht === null) return {};
  return { locationId: { in: recht } };
}

/** Standorte, die dieses Konto in Filtern und Auswertungen sieht. */
export function sichtbareStandorte<T extends { id: string }>(recht: StandortRecht, standorte: T[]): T[] {
  return recht === null ? standorte : standorte.filter((s) => recht.includes(s.id));
}

/** Standort-Filter aus der Adresse (?ort=…): nur gültig, wenn es ihn gibt und das Konto ihn sehen darf. Sonst null = alle erlaubten. */
export function gewaehlterStandort(recht: StandortRecht, wunsch: string | null | undefined, standorte: { id: string }[]): string | null {
  if (!wunsch) return null;
  return sichtbareStandorte(recht, standorte).some((s) => s.id === wunsch) ? wunsch : null;
}

/**
 * Standort für einen neuen Termin. Ohne Einschränkung wie angegeben. Mit Einschränkung
 * muss es einer der eigenen Standorte sein; ist nur einer zugeordnet, wird er eingesetzt.
 */
export function standortFuerNeu(recht: StandortRecht, locationId: string | null | undefined): { ok: true; locationId: string | null } | { ok: false; grund: string } {
  if (recht === null) return { ok: true, locationId: locationId || null };
  if (locationId) return recht.includes(locationId) ? { ok: true, locationId } : { ok: false, grund: "Für diesen Standort können Sie keine Termine eintragen. Bitte wählen Sie einen Ihrer Standorte." };
  if (recht.length === 1) return { ok: true, locationId: recht[0] };
  return { ok: false, grund: "Bitte wählen Sie einen Ihrer Standorte für den Termin." };
}

/** Eingabe aus den Team-Einstellungen: Liste von Standort-IDs (leer = alle Standorte). */
export const standortZuordnungSchema = z.object({ standorte: z.array(z.string().min(1).max(40)).max(50) });

/** Gewünschte Zuordnung prüfen: nur Standorte der eigenen Praxis, ohne Doppelte. */
export function zuordnungPruefen(gewuenscht: string[], praxisStandorte: string[]): { ok: true; ids: string[] } | { ok: false; grund: string } {
  const ids = [...new Set(gewuenscht)];
  if (ids.some((id) => !praxisStandorte.includes(id))) return { ok: false, grund: "Standort nicht gefunden" };
  return { ok: true, ids };
}

/**
 * Konten, die nach dem Entfernen eines Standorts ohne Zuordnung dastünden und
 * dadurch plötzlich alle Standorte sähen. Vor dem Entfernen muss die Praxisleitung
 * deren Zuordnung ändern.
 */
export function verliertEinschraenkung<T extends { standortIds: string[] }>(konten: T[], locationId: string): T[] {
  return konten.filter((k) => k.standortIds.length === 1 && k.standortIds[0] === locationId);
}

// ------------------------------------------------------------ Datenbank ----

/**
 * Standort-Recht eines Kontos, frisch aus der Datenbank. Für Seiten und Routen:
 *
 *   const recht = await standortRechtVon(session.user.id, practiceId);
 *   prisma.appointment.findMany({ where: { practiceId, ...terminFilter(recht) } })
 *
 * Unbekanntes Konto: leere Liste (sieht keine Termine).
 */
export async function standortRechtVon(userId: string | undefined | null, practiceId: string): Promise<StandortRecht> {
  if (!userId) return [];
  const { prisma } = await import("@/lib/prisma");
  const u = await prisma.user.findFirst({
    where: { id: userId, practiceId },
    select: { role: true, standorte: { where: { location: { practiceId } }, select: { locationId: true } } },
  });
  if (!u) return [];
  return standortRecht(u.role, u.standorte.map((s) => s.locationId));
}
