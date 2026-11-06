// Abgleich: Leistungen im Code (Anlässe, Optionen, Sitzungstypen je Fach)
// gegen den Leistungskatalog. Aufruf: npx tsx scripts/katalog-abgleich.ts
// Die Treffer sind Vorschläge; verbindlich ist die von Hand geprüfte
// Zuordnung in data/leistungskatalog/zuordnung-anlaesse.json.
import { SPECIALTIES } from "@/lib/specialties";
import { FACHPROFILE } from "@/lib/fachprofile";
import { DENTAL_SHOWCASE } from "@/lib/dentalShowcase";
import { LEISTUNGEN, bereicheFuerFach, normalisieren, suchen, type Leistung } from "@/lib/leistungskatalog";

// Wörter, die nichts über die Leistung sagen
const LEER = new Set("zusaetzlich zusaetzliche wunsch auf je sitzung ohne beschwerden bei medizinischer indikation inklusive mit nach oder und der die das als ab vor fuer kasse kassenleistung selbstzahler privat igel rezept verordnung zuzahlung standard erweitert erweiterte erweiterter beratung untersuchung behandlung therapie".split(" "));

type Zeile = { fach: string; art: string; name: string; katalog: Leistung | null };
const zeilen: Zeile[] = [];
// Erst die ganze Bezeichnung; sonst die Leistung, auf die die meisten aussagekräftigen Wörter passen.
const treffer = (fach: string, text: string) => {
  const bereiche = bereicheFuerFach(fach);
  for (const bereich of bereiche) {
    const t = suchen(text, { bereich }, 1)[0];
    if (t) return t;
  }
  // Leistung liegt oft in einem Nachbarbereich (HPV-Impfung unter Impfungen, Osteopathie unter Naturheilkunde)
  const global = suchen(text.replace(/\(.*?\)/g, ""), {}, 1)[0];
  if (global) return global;
  const woerter = normalisieren(text.replace(/\(z\. ?b\..*?\)/gi, "")).split(" ").filter((w) => w.length >= 4 && !LEER.has(w));
  if (!woerter.length) return null;
  const punkte = new Map<string, number>();
  for (const w of woerter) for (const bereich of bereiche) for (const l of suchen(w, { bereich }, 8)) punkte.set(l.id, (punkte.get(l.id) ?? 0) + 1);
  const best = Array.from(punkte).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] / woerter.length >= 0.5 ? LEISTUNGEN.find((l) => l.id === best[0]) ?? null : null;
};
for (const s of [DENTAL_SHOWCASE, ...SPECIALTIES]) {
  for (const a of s.anlaesse) {
    zeilen.push({ fach: s.id, art: "Anlass", name: a.label, katalog: treffer(s.id, a.label) });
    for (const o of a.options) zeilen.push({ fach: s.id, art: "Option", name: o.name, katalog: treffer(s.id, o.name) });
  }
}
for (const [fach, p] of Object.entries(FACHPROFILE)) for (const t of p.sitzungstypen) zeilen.push({ fach, art: "Sitzungstyp", name: t.name, katalog: treffer(fach, t.name) });

const gemappt = zeilen.filter((z) => z.katalog);
const nurCode = zeilen.filter((z) => !z.katalog);
const genutzt = new Set(gemappt.map((z) => z.katalog!.id));
const nurKatalog = LEISTUNGEN.filter((l) => !genutzt.has(l.id));
console.log(`| | Anzahl |\n|---|---|\n| im Code, im Katalog gefunden | ${gemappt.length} von ${zeilen.length} |\n| im Code, nicht im Katalog | ${nurCode.length} |\n| im Katalog, (noch) ohne Gegenstück im Code | ${nurKatalog.length} von ${LEISTUNGEN.length} |`);
console.log("\nBeispiele gemappt:");
for (const z of gemappt.filter((_, i) => i % 25 === 0)) console.log(`- ${z.fach} · ${z.art} „${z.name}“ → ${z.katalog!.name} (${z.katalog!.bereich})`);
console.log("\nIm Code, nicht im Katalog (Auszug):");
for (const z of nurCode.filter((_, i) => i % 6 === 0).slice(0, 25)) console.log(`- ${z.fach} · ${z.art} „${z.name}“`);
const proBereich = new Map<string, number>();
for (const l of nurKatalog) proBereich.set(l.bereich, (proBereich.get(l.bereich) ?? 0) + 1);
console.log("\nIm Katalog ohne Gegenstück, je Bereich:");
for (const [b, n] of Array.from(proBereich).sort((a, b) => b[1] - a[1])) console.log(`- ${b}: ${n}`);

