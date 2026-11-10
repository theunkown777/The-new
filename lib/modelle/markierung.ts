import { z } from "zod";
import { teilLesen, teilName } from "./koerper";
import { zahnNach, zahnTitel } from "./gebiss";
import { SCHNITTMODELLE, schnittTeil, type SchnittId } from "./schnitt";
import { FINDINGS } from "@/lib/dentalFindings";

export const MODELLE = ["gebiss", "koerper", "auge", "ohr", "haut"] as const;
export type Modell = (typeof MODELLE)[number];
const istSchnitt = (m: Modell): m is SchnittId => m === "auge" || m === "ohr" || m === "haut";

/** Gibt es dieses Teil im Modell? Gebiss: FDI-Nummer; Körper: Struktur mit Seite; Auge, Ohr, Haut: Name des Teils. */
export const teilGueltig = (modell: Modell, teil: string) =>
  modell === "gebiss" ? /^\d{2}$/.test(teil) && !!zahnNach(teil) : istSchnitt(modell) ? !!schnittTeil(modell, teil) : !!teilLesen(teil);
export const teilBezeichnung = (modell: Modell, teil: string) =>
  modell === "gebiss" ? zahnTitel(teil) : istSchnitt(modell) ? `${schnittTeil(modell, teil)?.name ?? teil} (${SCHNITTMODELLE[modell].titel.replace(/^(Das|Die) /, "")})` : teilName(teil);

/** Befunde, die sich im Gebiss-Modell zu einem bleibenden Zahn wählen lassen (dieselben wie im Zahnschema des Vorschlags). */
export const MODELL_BEFUNDE = FINDINGS;
/** Bleibender Zahn (11–48)? Nur für diese kennt der Behandlungsvorschlag ein Zahnschema. */
export const istBleibenderZahn = (teil: string) => /^[1-4][1-8]$/.test(teil);

const notiz = z.string().max(300, "Hinweis höchstens 300 Zeichen").transform((s) => s.replace(/\s+/g, " ").trim()).default("");

/** Eine Stelle (teil) oder mehrere auf einmal (teile) markieren; alle bekommen denselben Hinweis und Befund. */
export const markierungSchema = z
  .object({
    modell: z.enum(MODELLE),
    teil: z.string().min(2).max(60).optional(),
    teile: z.array(z.string().min(2).max(60)).min(1).max(40).optional(),
    notiz,
    befund: z.string().max(30).nullable().optional(),
  })
  .transform((d) => ({ modell: d.modell, teile: Array.from(new Set(d.teile ?? (d.teil ? [d.teil] : []))), notiz: d.notiz, befund: d.befund || null, befundGesetzt: d.befund !== undefined }))
  .refine((d) => d.teile.length > 0, { message: "Bitte mindestens eine Stelle wählen." })
  .refine((d) => d.teile.every((t) => teilGueltig(d.modell, t)), { message: "Dieses Teil gibt es im Modell nicht." })
  .refine((d) => !d.befund || (d.modell === "gebiss" && Object.prototype.hasOwnProperty.call(MODELL_BEFUNDE, d.befund) && d.teile.every(istBleibenderZahn)), { message: "Ein Befund lässt sich nur für bleibende Zähne wählen." });
