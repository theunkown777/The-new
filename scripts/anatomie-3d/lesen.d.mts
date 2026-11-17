// Typen für lesen.mjs (Tests und Skripte lesen die gepackten Modelle).
export interface GelesenesTeil { name: string; extras: Record<string, unknown>; pos: Float32Array; idx: Uint32Array; attribute: Record<string, { daten: Float32Array; groesse: number; komp: number; normalized: boolean }>; material?: number }
export function leseGlb(pfad: string): Promise<{ json: Record<string, unknown>; teile: GelesenesTeil[]; bin: Uint8Array }>;
export function normalen(pos: Float32Array, idx: Uint32Array): Float32Array;
