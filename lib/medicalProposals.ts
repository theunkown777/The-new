import { isTherapie, specialty, type MedOption } from "@/lib/specialties";
import type { MedInput, ProposalInput, ProposalItem, ProposalOption } from "@/lib/proposals";

// Vorschläge für Arztpraxen außerhalb der Zahnmedizin: je gewähltem Anlass
// die Kassenleistung zuerst, dann Selbstzahlerleistungen (IGeL) mit Hinweis,
// wann die Kasse zahlt, und dem Kasten zum Nutzen (mit Quelle oder neutral). Empfohlen wird nur
// die Kassenleistung; eine IGeL wird erst durch die Wahl der Ärztin/des Arztes
// zur besprochenen Option.

export const CUSTOM_PREFIX = "eigen_";

/** Texte, die von der gesetzlichen Krankenkasse sprechen (nicht Pflegekasse). Bei Privatversicherten passen sie nicht. */
const KASSEN_TEXT = /\bKass|Krankenkass/;
const TARIF_HINWEIS = "Ob Ihre Versicherung zahlt, hängt von Ihrem Tarif ab. Bitte vorher fragen.";

function toOption(o: MedOption, med: MedInput, age: number | null, therapie: boolean, insurance: "GKV" | "PKV" = "GKV"): ProposalOption {
  const pkv = insurance === "PKV";
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
  // Privatversicherte: keine Kassen-Bezeichnung und keine Kassen-Texte; die Bezeichnung kommt aus optionTypeLabel (PKV).
  const typeLabel = o.kostentraeger === "bg"
    ? "Zahlt die Berufsgenossenschaft"
    : therapie && type === "igel"
      ? "Selbstzahlerleistung"
      : o.zuzahlung && type === "kasse" && !pkv
        ? "Kassenleistung mit Zuzahlung"
        : undefined;
  const benefits = pkv && o.kostentraeger !== "bg" ? o.benefits.filter((b) => !KASSEN_TEXT.test(b)) : o.benefits;
  if (pkv && o.kostentraeger !== "bg" && hinweis && KASSEN_TEXT.test(hinweis)) hinweis = TARIF_HINWEIS;
  const erstattung = o.ohneErstattung || o.kostentraeger === "bg" ? { ohneErstattung: true } : {};
  // Festbetrag + Aufzahlung (z. B. höherwertiges Hörgerät): Kasse zahlt den Anteil, Patient die Differenz.
  if (o.kasseAnteil != null && type === "igel") {
    return { id: o.id, type: "mehrkosten", base: o.kasseAnteil, name: o.name, total: price, benefits, hinweis, nutzen: o.nutzen, nutzenQuelle: o.nutzenQuelle, zuzahlung: o.zuzahlung, typeLabel: pkv ? undefined : "Kassenanteil + Aufzahlung", ...erstattung };
  }
  return { id: o.id, type, name: o.name, total: price, benefits, hinweis, nutzen: o.nutzen, nutzenQuelle: o.nutzenQuelle, zuzahlung: o.zuzahlung, typeLabel, ...erstattung };
}

export function buildMedicalProposal(input: ProposalInput): ProposalItem[] {
  const med = input.med ?? {};
  const spec = specialty(input.fach);
  const chosen = new Set(input.anlaesse ?? []);
  const items: ProposalItem[] = [];

  for (const a of spec?.anlaesse ?? []) {
    if (!chosen.has(a.id)) continue;
    const alle = a.options.map((o) => ({ roh: o, opt: toOption(o, med, input.patient.age, isTherapie(spec), input.patient.insurance) }));
    // Zusatzleistungen (z. B. Auflichtmikroskopie zum Hautkrebs-Screening) werden eigene Positionen zum Ankreuzen,
    // damit die Kassenleistung daneben gewählt bleibt. Voraussetzung: Es bleibt eine Hauptleistung übrig.
    const istZusatz = (x: (typeof alle)[number]) => !!x.roh.zusatz && x.opt.type === "igel";
    const haupt = alle.filter((x) => !istZusatz(x));
    const zusaetze = haupt.length ? alle.filter(istZusatz) : [];
    const options = (zusaetze.length ? haupt : alle).map((x) => x.opt);
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
    for (const z of zusaetze) {
      items.push({ key: `a_${a.id}__${z.opt.id}`, where: a.bereich, title: a.label, options: [z.opt], recommended: null, notes: [], excluded: [], zusatz: true, hauptKey: `a_${a.id}` });
    }
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
      // Text der Praxis, keine Angabe mit Quelle: erscheint als „Hinweis der Praxis“ (lib/proposals.ts ProposalOption)
      ...(c.nutzen ? { nutzenVonPraxis: true } : {}),
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
