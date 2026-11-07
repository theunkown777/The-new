import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { praxisFach } from "@/lib/katalogScope";
import { fachFilter, kvName, sortiereSysteme } from "@/lib/amtlich/gliederung";
import { SYSTEM_TITEL } from "@/lib/amtlich/katalog";

const natuerlich = (a: string | null, b: string | null) => (a ?? "").localeCompare(b ?? "", "de", { numeric: true });

// Amtliche Leistungen des eigenen Fachs, geordnet: Verzeichnis → Kapitel → Leistungen.
// Ohne Parameter: Gliederung mit Anzahlen. Mit system (+ kapitel) oder q: die Leistungen.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const url = new URL(req.url);
  const practice = await prisma.practice.findUnique({ where: { id: session.user.practiceId }, select: { kvBezirk: true } });
  const fach = await praxisFach(session.user.practiceId);
  const basis: Prisma.AmtlicheLeistungWhereInput = fachFilter(fach, practice?.kvBezirk ?? null);
  const system = url.searchParams.get("system");
  const kapitel = url.searchParams.get("kapitel");
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);

  if (!system && !q) {
    const proSystem = await prisma.amtlicheLeistung.groupBy({ by: ["system"], where: basis, _count: true });
    const proKapitel = await prisma.amtlicheLeistung.groupBy({ by: ["system", "kapitel"], where: basis, _count: true });
    const gliederung = sortiereSysteme(fach, proSystem).map((s) => ({
      system: s.system,
      titel: SYSTEM_TITEL[s.system] ?? s.system,
      anzahl: s._count,
      kapitel: proKapitel.filter((k) => k.system === s.system).sort((a, b) => natuerlich(a.kapitel, b.kapitel)).map((k) => ({ name: k.kapitel ?? "ohne Kapitel", anzahl: k._count })),
    }));
    return NextResponse.json({ fach, kvBezirk: practice?.kvBezirk ?? null, kvName: kvName(practice?.kvBezirk), gliederung });
  }

  const worte = q.split(/\s+/).filter(Boolean);
  const where: Prisma.AmtlicheLeistungWhereInput = {
    ...basis,
    ...(system ? { system } : {}),
    ...(kapitel ? { kapitel: kapitel === "ohne Kapitel" ? null : kapitel } : {}),
    AND: worte.map((w) => ({ OR: [{ text: { contains: w, mode: "insensitive" as const } }, { code: { startsWith: w, mode: "insensitive" as const } }] })),
  };
  const [anzahl, leistungen] = await Promise.all([
    prisma.amtlicheLeistung.count({ where }),
    prisma.amtlicheLeistung.findMany({ where, take: q ? 400 : 80, orderBy: [{ system: "asc" }, { code: "asc" }], select: { id: true, system: true, code: true, text: true, kapitel: true, abschnitt: true, punkte: true, euroCent: true } }),
  ]);
  // Bei der Suche zuerst: genaue Ziffer, dann Texte, die mit dem Suchwort beginnen; danach Verzeichnis-Reihenfolge des Fachs
  const ql = q.toLowerCase();
  const rang = (l: { code: string; text: string }) => (!q ? 0 : l.code.toLowerCase() === ql ? 0 : l.text.toLowerCase().startsWith(ql) ? 1 : l.text.toLowerCase().split(/[\s,(/-]+/).some((w) => w.startsWith(ql)) ? 2 : 3);
  const sortiert = sortiereSysteme(fach, leistungen.sort((a, b) => (a.system === b.system ? natuerlich(a.code, b.code) : 0)));
  const ergebnis = sortiert.map((l, i) => ({ l, i })).sort((a, b) => rang(a.l) - rang(b.l) || a.i - b.i).map((x) => x.l).slice(0, 80);
  return NextResponse.json({ anzahl, leistungen: ergebnis });
}
