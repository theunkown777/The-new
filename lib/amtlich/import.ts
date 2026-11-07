import { readFileSync } from "fs";
import path from "path";
import type { PrismaClient } from "@prisma/client";
import { SDEBM_URL, ebmAusXml, ebmFaecher, zipEintraege } from "./ebm";

// Import der amtlichen Leistungsverzeichnisse in die Tabelle AmtlicheLeistung.
// Die frei nutzbaren Verzeichnisse liegen als JSON unter data/amtlich (aus den
// amtlichen Quellen erzeugt, siehe meta.quelle in jeder Datei). Der EBM wird
// wegen der KBV-Lizenz nicht im Repository gespeichert, sondern beim Import
// direkt von der KBV geladen (Lizenz vom Betreiber akzeptiert; abschaltbar mit
// KBV_STAMMDATEN_LIZENZ=abgelehnt).

export const DATEIEN = ["goae", "goz", "bema", "hebamme", "heilmittel", "hkp", "sgb11", "hilfsmittel", "apotheke", "heilpraktiker", "uvgoae"] as const;

type Eintrag = { code: string; text: string; hinweis?: string | null; kapitel?: string | null; abschnitt?: string | null; abschnittTitel?: string | null; punkte?: number | null; euroCent?: number | null; faecher?: string[] };
type Datei = { meta: { system: string; titel: string; quelle: string; stand?: string }; leistungen: Eintrag[] };

export function ladeDatei(name: (typeof DATEIEN)[number], basis = process.cwd()): Datei {
  return JSON.parse(readFileSync(path.join(basis, "data", "amtlich", `${name}.json`), "utf8")) as Datei;
}

type Zeile = {
  system: string; code: string; text: string; hinweis: string | null; kapitel: string | null; abschnitt: string | null;
  punkte: number | null; euroCent: number | null; faecher: string[]; arztgruppen: string[]; gueltigAb: Date | null; gueltigBis: Date | null; stand: string | null;
};

/** Ein Verzeichnis vollständig ersetzen (in einer Transaktion), damit gestrichene Positionen verschwinden. */
async function ersetze(prisma: PrismaClient, system: string, zeilen: Zeile[]) {
  const ops = [prisma.amtlicheLeistung.deleteMany({ where: { system } })];
  for (let i = 0; i < zeilen.length; i += 1000) ops.push(prisma.amtlicheLeistung.createMany({ data: zeilen.slice(i, i + 1000), skipDuplicates: true }) as never);
  await prisma.$transaction(ops);
}

export async function importiereAmtlich(prisma: PrismaClient, opts: { ebm?: boolean; log?: (s: string) => void; heute?: Date } = {}) {
  const log = opts.log ?? (() => {});
  const ergebnis: Record<string, number> = {};
  for (const name of DATEIEN) {
    const d = ladeDatei(name);
    const zeilen: Zeile[] = d.leistungen.map((l) => ({
      system: d.meta.system,
      code: l.code,
      text: l.text.slice(0, 1000),
      hinweis: l.hinweis ? l.hinweis.slice(0, 3000) : null,
      kapitel: l.kapitel ?? (l.abschnitt && l.abschnittTitel ? `${l.abschnitt} ${l.abschnittTitel}` : null),
      abschnitt: l.kapitel ? l.abschnitt ?? null : null,
      punkte: l.punkte ?? null,
      euroCent: l.euroCent ?? null,
      faecher: l.faecher ?? [],
      arztgruppen: [],
      gueltigAb: null,
      gueltigBis: null,
      stand: d.meta.stand ?? null,
    }));
    await ersetze(prisma, d.meta.system, zeilen);
    ergebnis[d.meta.system] = zeilen.length;
    log(`${d.meta.system}: ${zeilen.length}`);
  }
  if (opts.ebm) {
    const res = await fetch(SDEBM_URL);
    if (!res.ok) throw new Error(`KBV-Stammdatei nicht erreichbar (${res.status})`);
    const zip = Buffer.from(await res.arrayBuffer());
    const eintrag = zipEintraege(zip).find((e) => /^XML\/.*\.xml$/.test(e.name));
    if (!eintrag) throw new Error("Keine EBM-XML in der KBV-Stammdatei");
    const xml = new TextDecoder("iso-8859-15").decode(eintrag.daten());
    const heute = opts.heute ?? new Date();
    const pos = ebmAusXml(xml).filter((p) => !p.gueltigBis || p.gueltigBis >= heute);
    const stand = xml.match(/<ehd:service_tmr V="([^"]+)"/)?.[1] ?? null;
    await ersetze(
      prisma,
      "EBM",
      pos.map((p) => ({ system: "EBM", code: p.code, text: p.text.slice(0, 1000), hinweis: p.hinweis, kapitel: p.kapitel, abschnitt: p.abschnitt, punkte: p.punkte, euroCent: p.euroCent, faecher: ebmFaecher(p), arztgruppen: p.arztgruppen, gueltigAb: p.gueltigAb, gueltigBis: p.gueltigBis, stand: stand ? `KBV SDEBM, Gültigkeit ${stand}` : "KBV SDEBM" })),
    );
    ergebnis.EBM = pos.length;
    log(`EBM: ${pos.length} (KBV-Stammdatei, Lizenz bestätigt)`);
  }
  return ergebnis;
}
