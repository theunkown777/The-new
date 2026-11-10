import { z } from "zod";
import { teilLesen, teilName } from "./koerper";
import { zahnNach, zahnTitel } from "./gebiss";

export const MODELLE = ["gebiss", "koerper"] as const;
export type Modell = (typeof MODELLE)[number];

/** Gibt es dieses Teil im Modell? Gebiss: FDI-Nummer; Körper: Struktur mit Seite. */
export const teilGueltig = (modell: Modell, teil: string) => (modell === "gebiss" ? /^\d{2}$/.test(teil) && !!zahnNach(teil) : !!teilLesen(teil));
export const teilBezeichnung = (modell: Modell, teil: string) => (modell === "gebiss" ? zahnTitel(teil) : teilName(teil));

export const markierungSchema = z
  .object({
    modell: z.enum(MODELLE),
    teil: z.string().min(2).max(60),
    notiz: z.string().max(300, "Hinweis höchstens 300 Zeichen").transform((s) => s.replace(/\s+/g, " ").trim()).default(""),
  })
  .refine((d) => teilGueltig(d.modell, d.teil), { message: "Dieses Teil gibt es im Modell nicht." });

/** Welches Modell passt zur Praxis? Zahnarztpraxen das Gebiss, alle anderen den Körper. */
export const modellFuerFach = (dental: boolean): Modell => (dental ? "gebiss" : "koerper");
