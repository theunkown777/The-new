import { cache } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { praxisKennzeichen, type PraxisKennzeichen } from "@/lib/praxisKennung";

/**
 * Kennzeichen der Praxis zum Portal-Link: für Seitentitel, Kopf, Farbstreifen und Startbildschirm-Symbol.
 * Genau ein Token, genau eine Praxis; geladen werden nur Name, Fach und Angaben dieser Praxis.
 * Je Aufruf einmal (React cache): Metadaten und Seite teilen sich das Ergebnis.
 */
export const portalKennung = cache(async (token: string): Promise<PraxisKennzeichen | null> => {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return null;
  const patient = await prisma.patient.findUnique({
    where: { portalTokenHash: hashToken(token) },
    select: { portalExpiresAt: true, practice: { select: { name: true, specialty: true, stammdaten: true } } },
  });
  if (!patient || !patient.portalExpiresAt || patient.portalExpiresAt < new Date()) return null;
  return praxisKennzeichen(patient.practice);
});

/**
 * Symbole der Seite: im Tab und auf dem Startbildschirm das Symbol der Gruppe (Zahn, Arzt, Therapie). So lassen sich
 * offene Tabs verschiedener Praxen unterscheiden. Feste Dateien unter public/brand (Inhaltsrichtlinie 'self').
 */
export const portalSymbole = (k: PraxisKennzeichen): Metadata["icons"] => ({
  icon: [{ url: k.symbol.svg, type: "image/svg+xml" }],
  apple: [{ url: k.symbol.apple, sizes: "180x180" }],
});
