import { FACH_GRUPPEN } from "@/lib/specialties";

/** Zahl der Fachrichtungen mit fertigen Anlässen, aus dem Verzeichnis gezählt statt fest in Texte geschrieben. */
export const FACH_ZAHL = FACH_GRUPPEN.reduce((n, g) => n + g.faecher.length, 0);
