// „Frag Sorrida“: feste Wissenssammlung für das Praxisteam und für die Website. Aufgeteilt nach Art:
// - bedienung.ts: je Seite der App, was es dort gibt und wie es geht
// - fehler.ts: häufige Meldungen der App, wörtlich, mit „Was bedeutet das, was kann ich tun“
// - praxismanager.ts: die Themen des Praxismanagers
// - website.ts: öffentliche Fragen zu Sorrida (nur auf der Website, nicht in HILFE_WISSEN)
// lib/hilfeSuche.ts sucht darin ohne KI. Keine Abrechnungs-, Rechts- oder Medizinauskunft.

import { BEDIENUNG } from "./bedienung";
import { FEHLER } from "./fehler";
import { PRAXISMANAGER } from "./praxismanager";
import type { HilfeEintrag } from "./typ";

export { HILFE_HINWEIS, WEBSITE_HINWEIS, type HilfeArt, type HilfeEintrag } from "./typ";
export { WEBSITE_WISSEN } from "./website";
export { BEDIENUNG, FEHLER, PRAXISMANAGER };

/** Alles Wissen für die App (ohne Website). */
export const HILFE_WISSEN: HilfeEintrag[] = [...BEDIENUNG, ...PRAXISMANAGER, ...FEHLER];
