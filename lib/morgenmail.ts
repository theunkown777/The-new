import { prisma } from "@/lib/prisma";
import { EINGANG_ARTEN, istEingangArt } from "@/lib/eingang";

// Morgen-Mail an die Praxis: damit Rückmeldungen von Patienten nicht liegen bleiben, wenn Sorrida nicht geöffnet ist.
// In der Mail stehen nur Zahlen und ein Link in den Eingang, keine Namen und keine Gesundheitsangaben.

export interface MorgenZahlen {
  /** Offene Einträge im Eingang je Gruppe (Geld, Unterlagen, Vorschläge, Termine). */
  eingang: Record<string, number>;
  rueckrufe: number;
  ungeoeffnet: number;
  ueberfaellig: number;
}

export const morgenSumme = (z: MorgenZahlen) => Object.values(z.eingang).reduce((a, b) => a + b, 0) + z.ungeoeffnet + z.ueberfaellig;

export async function morgenZahlen(practiceId: string, now = new Date()): Promise<MorgenZahlen> {
  const [offen, ungeoeffnet, ueberfaellig] = await Promise.all([
    prisma.eingang.groupBy({ by: ["art"], where: { practiceId, erledigtAt: null }, _count: { _all: true } }),
    prisma.treatmentProposal.count({
      where: { practiceId, status: { in: ["ENTWURF", "BESPROCHEN"] }, shareCreatedAt: { lt: new Date(now.getTime() - 3 * 864e5) }, shareExpiresAt: { gt: now }, patientViewedAt: null },
    }),
    prisma.invoice.count({ where: { practiceId, status: "OFFEN", dueDate: { lt: now } } }),
  ]);
  const eingang: Record<string, number> = {};
  let rueckrufe = 0;
  for (const o of offen) {
    const gruppe = istEingangArt(o.art) ? EINGANG_ARTEN[o.art].gruppe : "Sonstiges";
    eingang[gruppe] = (eingang[gruppe] ?? 0) + o._count._all;
    if (o.art === "VORSCHLAG_RUECKRUF") rueckrufe += o._count._all;
  }
  return { eingang, rueckrufe, ungeoeffnet, ueberfaellig };
}

const mz = (n: number, eins: string, viele: string) => `${n} ${n === 1 ? eins : viele}`;

/** Betreff und Inhalt der Mail. Ohne Namen, ohne Beträge, ohne Befunde. */
export function morgenMailText(z: MorgenZahlen, a: { practiceName: string; baseUrl: string }): { subject: string; html: string; zeilen: string[] } {
  const zeilen: string[] = [];
  if (z.rueckrufe) zeilen.push(`${mz(z.rueckrufe, "Patient bittet", "Patienten bitten")} um Rückruf`);
  const v = (z.eingang["Vorschläge"] ?? 0) - z.rueckrufe;
  if (v > 0) zeilen.push(`${mz(v, "Rückmeldung", "Rückmeldungen")} zu Vorschlägen`);
  if (z.eingang["Geld"]) zeilen.push(`${mz(z.eingang["Geld"], "Meldung", "Meldungen")} zu Zahlungen`);
  if (z.eingang["Unterlagen"]) zeilen.push(`${mz(z.eingang["Unterlagen"], "ausgefüllter Fragebogen", "ausgefüllte Fragebögen")}`);
  if (z.eingang["Termine"]) zeilen.push(`${mz(z.eingang["Termine"], "Termin", "Termine")} online gebucht oder abgesagt`);
  if (z.ungeoeffnet) zeilen.push(`${mz(z.ungeoeffnet, "Patienten-Link", "Patienten-Links")} seit über drei Tagen nicht geöffnet`);
  if (z.ueberfaellig) zeilen.push(`${mz(z.ueberfaellig, "Rechnung", "Rechnungen")} überfällig`);
  const subject = `Sorrida: ${mz(morgenSumme(z), "Punkt wartet", "Punkte warten")} in Ihrer Praxis`;
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `
    <p>Guten Morgen,</p>
    <p>in Sorrida wartet heute Folgendes auf Ihr Team (${esc(a.practiceName)}):</p>
    <ul>${zeilen.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
    <p><a href="${a.baseUrl}/eingang">Eingang öffnen</a> · <a href="${a.baseUrl}/proposals/nachfassen">Nachfassen</a></p>
    <p style="color:#666;font-size:12px">Diese Mail enthält bewusst keine Namen und keine Gesundheitsangaben. Abbestellen: in Sorrida unter „Eingang“.</p>`;
  return { subject, html, zeilen };
}
