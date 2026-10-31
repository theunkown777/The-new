import { isTherapie, specialty, type MedOption } from "@/lib/specialties";
import type { MedInput, ProposalInput, ProposalItem, ProposalOption } from "@/lib/proposals";

// Vorschläge für Arztpraxen außerhalb der Zahnmedizin: je gewähltem Anlass
// die Kassenleistung zuerst, dann Selbstzahlerleistungen (IGeL) mit Hinweis,
// wann die Kasse zahlt, und ehrlicher Angabe zum Nutzen. Empfohlen wird nur
// die Kassenleistung; eine IGeL wird erst durch die Wahl der Ärztin/des Arztes
// zur besprochenen Option.

export const CUSTOM_PREFIX = "eigen_";

function toOption(o: MedOption, med: MedInput, age: number | null, therapie: boolean): ProposalOption {
  const price = med.prices?.[o.id] ?? o.price;
  let type: ProposalOption["type"] = o.type;
  let hinweis = o.kasseWenn;
  if (o.kasseAbAlter != null) {
    if (age != null && age < o.kasseAbAlter) {
      type = "igel";
      hinweis = `Kassenleistung erst ab ${o.kasseAbAlter} Jahren.${o.kasseWenn ? ` ${o.kasseWenn}` : ""}`;
    } else if (age == null) {
      hinweis = `Kassenleistung ab ${o.kasseAbAlter} Jahren.${o.kasseWenn ? ` ${o.kasseWenn}` : ""}`;
    }
  }
  const typeLabel = therapie
    ? type === "igel"
      ? "Selbstzahlerleistung"
      : o.zuzahlung
        ? "Kassenleistung mit Zuzahlung"
        : undefined
    : o.zuzahlung && type === "kasse"
      ? "Kassenleistung mit Zuzahlung"
      : undefined;
  // Festbetrag + Aufzahlung (z. B. höherwertiges Hörgerät): Kasse zahlt den Anteil, Patient die Differenz.
  if (o.kasseAnteil != null && type === "igel") {
    return { id: o.id, type: "mehrkosten", base: o.kasseAnteil, name: o.name, total: price, benefits: o.benefits, hinweis, nutzen: o.nutzen, typeLabel: "Kassenanteil + Aufzahlung" };
  }
  return { id: o.id, type, name: o.name, total: price, benefits: o.benefits, hinweis, nutzen: o.nutzen, zuzahlung: o.zuzahlung, typeLabel };
}

export function buildMedicalProposal(input: ProposalInput): ProposalItem[] {
  const med = input.med ?? {};
  const spec = specialty(input.fach);
  const chosen = new Set(input.anlaesse ?? []);
  const items: ProposalItem[] = [];

  for (const a of spec?.anlaesse ?? []) {
    if (!chosen.has(a.id)) continue;
    const options = a.options.map((o) => toOption(o, med, input.patient.age, isTherapie(spec)));
    const kasse = options.find((o) => o.type === "kasse");
    items.push({
      key: `a_${a.id}`,
      where: a.bereich,
      title: a.label,
      options,
      recommended: kasse?.id ?? null,
      notes: (a.notes ?? []).map((text) => ({ kind: "info" as const, text })),
      excluded: [],
    });
  }

  // Eigene Leistungen der Praxis, gruppiert nach ihrem Anlass.
  const groups = new Map<string, ProposalOption[]>();
  for (const c of med.custom ?? []) {
    if (!chosen.has(`${CUSTOM_PREFIX}${c.id}`)) continue;
    const list = groups.get(c.anlass) ?? [];
    list.push({
      id: `${CUSTOM_PREFIX}${c.id}`,
      type: c.kasse ? "kasse" : "igel",
      name: c.name,
      total: c.price,
      benefits: c.benefits ?? [],
      hinweis: c.kasseWenn,
      nutzen: c.nutzen,
      typeLabel: isTherapie(spec) && !c.kasse ? "Selbstzahlerleistung" : undefined,
    });
    groups.set(c.anlass, list);
  }
  let i = 0;
  for (const [anlass, options] of groups) {
    items.push({
      key: `e_${i++}`,
      where: "Leistung der Praxis",
      title: anlass,
      options: [...options].sort((x, y) => (x.type === y.type ? 0 : x.type === "kasse" ? -1 : 1)),
      recommended: options.find((o) => o.type === "kasse")?.id ?? null,
      notes: [],
      excluded: [],
    });
  }
  return items;
}
