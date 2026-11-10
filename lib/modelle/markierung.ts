import { z } from "zod";
import { teilLesen, teilName } from "./koerper";
import { zahnNach, zahnTitel } from "./gebiss";
import { SCHNITTMODELLE, schnittTeil, type SchnittId } from "./schnitt";

export const MODELLE = ["gebiss", "koerper", "auge", "ohr", "haut"] as const;
export type Modell = (typeof MODELLE)[number];
const istSchnitt = (m: Modell): m is SchnittId => m === "auge" || m === "ohr" || m === "haut";

/** Gibt es dieses Teil im Modell? Gebiss: FDI-Nummer; Körper: Struktur mit Seite; Auge, Ohr, Haut: Name des Teils. */
export const teilGueltig = (modell: Modell, teil: string) =>
  modell === "gebiss" ? /^\d{2}$/.test(teil) && !!zahnNach(teil) : istSchnitt(modell) ? !!schnittTeil(modell, teil) : !!teilLesen(teil);
export const teilBezeichnung = (modell: Modell, teil: string) =>
  modell === "gebiss" ? zahnTitel(teil) : istSchnitt(modell) ? `${schnittTeil(modell, teil)?.name ?? teil} (${SCHNITTMODELLE[modell].titel.replace(/^(Das|Die) /, "")})` : teilName(teil);

export const markierungSchema = z
  .object({
    modell: z.enum(MODELLE),
    teil: z.string().min(2).max(60),
    notiz: z.string().max(300, "Hinweis höchstens 300 Zeichen").transform((s) => s.replace(/\s+/g, " ").trim()).default(""),
  })
  .refine((d) => teilGueltig(d.modell, d.teil), { message: "Dieses Teil gibt es im Modell nicht." });
