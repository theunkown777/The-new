import { prisma } from "@/lib/prisma";
import { sortiereSysteme } from "@/lib/amtlich/gliederung";

const KURZ: Record<string, string> = {
  EBM: "EBM", GOAE: "GOÄ", UVGOAE: "UV-GOÄ", OPS: "OPS", GOZ: "GOZ", BEMA: "BEMA", HEILMITTEL: "Heilmittel", HEBAMME: "Hebammenhilfe",
  HKP: "Häusliche Krankenpflege", SGB_XI: "Pflegeversicherung", HMV: "Hilfsmittel-Produktarten", HMV_PRODUKT: "Hilfsmittel-Produkte",
  APOTHEKE: "Apotheke", HEILPRAKTIKER: "Heilpraktiker",
};

/**
 * Wie viele amtliche Leistungen es für ein Fach bundesweit gibt (ohne regionale KV-Ziffern,
 * die je KV-Bezirk dazukommen). null, wenn die Datenbank nicht erreichbar ist.
 */
export async function leistungenJeFach(fach: string): Promise<{ gesamt: number; regional: number; teile: { system: string; name: string; anzahl: number }[] } | null> {
  try {
    const gruppen = await prisma.amtlicheLeistung.groupBy({ by: ["system"], where: { faecher: { has: fach } }, _count: true });
    const bund = gruppen.filter((g) => g.system !== "KV_REGIONAL");
    const regional = gruppen.find((g) => g.system === "KV_REGIONAL")?._count ?? 0;
    const teile = sortiereSysteme(fach, bund).map((g) => ({ system: g.system, name: KURZ[g.system] ?? g.system, anzahl: g._count }));
    return { gesamt: teile.reduce((n, t) => n + t.anzahl, 0), regional, teile };
  } catch {
    return null;
  }
}
