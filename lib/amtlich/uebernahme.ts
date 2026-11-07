import { prisma } from "@/lib/prisma";
import { katalogEintrag } from "@/lib/amtlich/katalog";

/**
 * Amtliche Leistungen in den Abrechnungskatalog der Praxis übernehmen (falls noch nicht da)
 * und die Katalogpositionen zurückgeben, in der Reihenfolge der übergebenen ids.
 */
export async function uebernehme(practiceId: string, ids: string[]) {
  const amtlich = await prisma.amtlicheLeistung.findMany({ where: { id: { in: ids } } });
  const eintraege = amtlich.map((a) => ({ id: a.id, e: katalogEintrag(a) }));
  const schluessel = (s: string, c: string) => `${s}|${c}`;
  const vorhanden = eintraege.length
    ? await prisma.serviceCatalogItem.findMany({ where: { practiceId, OR: eintraege.map(({ e }) => ({ code: e.code, system: e.system })) } })
    : [];
  const schon = new Map(vorhanden.map((v) => [schluessel(v.system, v.code), v]));
  const neu = eintraege.filter(({ e }) => !schon.has(schluessel(e.system, e.code)));
  // Doppelte Ziffern innerhalb der Auswahl nur einmal anlegen
  const einmal = Array.from(new Map(neu.map((n) => [schluessel(n.e.system, n.e.code), n.e])).values());
  if (einmal.length) await prisma.serviceCatalogItem.createMany({ data: einmal.map((e) => ({ ...e, practiceId })) });
  const alle = einmal.length
    ? await prisma.serviceCatalogItem.findMany({ where: { practiceId, OR: eintraege.map(({ e }) => ({ code: e.code, system: e.system })) } })
    : vorhanden;
  const nachSchluessel = new Map(alle.map((v) => [schluessel(v.system, v.code), v]));
  const reihe = ids.map((id) => eintraege.find((x) => x.id === id)).filter(Boolean).map((x) => nachSchluessel.get(schluessel(x!.e.system, x!.e.code))!).filter(Boolean);
  return { items: Array.from(new Map(reihe.map((r) => [r.id, r])).values()), neu: einmal.length, schonVorhanden: amtlich.length - neu.length };
}
