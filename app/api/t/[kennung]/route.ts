import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeAttempt, releaseAttempt } from "@/lib/rateLimit";
import { istFrei } from "@/lib/buchung";
import { LIMIT_IP_STUNDE, LIMIT_PRAXIS_TAG, MAX_OFFEN_JE_KONTAKT, anfrageSchema, geburtstag, lockfeldGefuellt, reserviertBis, sauber, stempel, stempelPruefen } from "@/lib/terminanfrage";
import { oeffentlicheLage, praxisZurKennung } from "@/lib/terminanfrageLoad";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Öffentliche Terminbuchung für neue Patienten (/t/<kennung>). Ohne Anmeldung erreichbar, deshalb:
// Begrenzung je Anschluss und je Praxis, strenge Prüfung der Eingaben, verstecktes Lockfeld,
// Mindestzeit zwischen Laden und Absenden. Die Antworten verraten nie, ob es eine Person schon
// als Patienten gibt: Hier wird nicht im Bestand nachgesehen, es entsteht nur eine Anfrage.

const STUNDE = 3600e3;
const kopf = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const antwort = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: kopf });
const ipVon = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
const gibtEsNicht = () => antwort({ error: "Diese Buchungsseite gibt es nicht oder sie ist ausgeschaltet. Bitte rufen Sie in der Praxis an." }, 404);
const zuViele = () => antwort({ error: "Zu viele Anfragen. Bitte versuchen Sie es später noch einmal oder rufen Sie in der Praxis an." }, 429);
const vergeben = () => antwort({ error: "Diese Zeit ist gerade vergeben worden. Bitte wählen Sie eine andere.", vergeben: true }, 409);

// Freie Zeiten neu laden (z. B. wenn eine Zeit inzwischen vergeben ist).
export async function GET(req: Request, props: { params: Promise<{ kennung: string }> }) {
  const params = await props.params;
  if (!(await consumeAttempt(`neuanfrage-lesen:${ipVon(req)}`, 120, STUNDE))) return zuViele();
  const praxis = await praxisZurKennung(params.kennung);
  if (!praxis) return gibtEsNicht();
  const l = await oeffentlicheLage(praxis.id);
  if (!l) return gibtEsNicht();
  return antwort({ aktiv: l.aktiv, minuten: l.minuten, tage: l.aktiv ? l.tage : [], stempel: stempel(params.kennung) });
}

// Termin anfragen. Es entsteht eine Anfrage, die die Praxis bestätigt; die Zeit ist 24 Stunden reserviert.
export async function POST(req: Request, props: { params: Promise<{ kennung: string }> }) {
  const params = await props.params;
  const ip = ipVon(req);
  // Grobe Bremse für alles, was hier ankommt; die eigentliche Grenze (5 je Stunde) zählt weiter unten nur echte Anfragen.
  if (!(await consumeAttempt(`neuanfrage-alle:${ip}`, 30, STUNDE))) return zuViele();
  const praxis = await praxisZurKennung(params.kennung);
  if (!praxis) return gibtEsNicht();

  const roh = await req.text().catch(() => "");
  if (roh.length > 4000) return antwort({ error: "Ungültige Angaben" }, 400);
  let json: unknown = null;
  try { json = JSON.parse(roh); } catch { /* unten */ }
  const parsed = anfrageSchema.safeParse(json);
  if (!parsed.success) return antwort({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, 400);
  const d = parsed.data;

  // Automat: gleiche Antwort wie bei Erfolg, aber es wird nichts gespeichert.
  if (lockfeldGefuellt(d)) return antwort({ ok: true, start: new Date(d.start).toISOString(), reserviertStd: 24, beispiel: praxis.isDemo }, 201);

  const st = stempelPruefen(d.stempel, params.kennung);
  if (st === "zu-schnell") return antwort({ error: "Das ging sehr schnell. Bitte prüfen Sie Ihre Angaben und senden Sie in ein paar Sekunden noch einmal." }, 400);
  if (st !== "ok") return antwort({ error: "Die Seite war zu lange geöffnet. Bitte senden Sie in ein paar Sekunden noch einmal.", stempel: stempel(params.kennung) }, 400);

  if (!praxis.anlaesse.includes(d.anlass)) return antwort({ error: "Bitte einen Anlass aus der Liste wählen." }, 400);

  const l = await oeffentlicheLage(praxis.id);
  if (!l?.aktiv) return antwort({ error: "Diese Praxis bietet zurzeit keine Online-Termine an. Bitte rufen Sie an." }, 409);
  const start = new Date(d.start);
  if (!istFrei(l.lage.eingabe, start.toISOString())) return vergeben();

  const now = new Date();
  const phone = d.mobil ? sauber(d.mobil) : null;
  const email = d.email ? d.email.toLowerCase() : null;
  const offen = await prisma.terminanfrage.count({
    where: { practiceId: praxis.id, status: "OFFEN", start: { gte: now }, OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] },
  });
  if (offen >= MAX_OFFEN_JE_KONTAKT) return antwort({ error: `Mit diesen Kontaktdaten gibt es schon ${MAX_OFFEN_JE_KONTAKT} offene Anfragen. Bitte warten Sie auf die Rückmeldung der Praxis oder rufen Sie an.` }, 409);

  // Echte Anfrage: jetzt zählen (je Anschluss und Stunde, je Praxis und Tag).
  const ipKey = `neuanfrage:${ip}`, praxisKey = `neuanfrage-praxis:${praxis.id}`;
  if (!(await consumeAttempt(ipKey, LIMIT_IP_STUNDE, STUNDE))) return zuViele();
  if (!(await consumeAttempt(praxisKey, LIMIT_PRAXIS_TAG, 24 * STUNDE))) {
    await releaseAttempt(ipKey);
    return antwort({ error: "Heute sind online keine weiteren Anfragen möglich. Bitte rufen Sie in der Praxis an." }, 429);
  }

  const minuten = l.minuten;
  const anfrage = await prisma.terminanfrage.create({
    data: {
      practiceId: praxis.id, firstName: sauber(d.vorname), lastName: sauber(d.nachname), birthDate: geburtstag(d.geburtsdatum), phone, email,
      anlass: d.anlass, start, minutes: minuten, reserviertBis: reserviertBis(now), datenschutzAt: now, beispiel: praxis.isDemo,
    },
    select: { id: true, createdAt: true },
  });

  // Zwei gleichzeitig: Wer zuletzt kam, tritt zurück, wenn das Fenster dadurch überbucht ist.
  const ende = new Date(start.getTime() + minuten * 60000);
  const fenster = { lt: ende, gt: new Date(start.getTime() - 8 * STUNDE) };
  const [termine, anfragen] = await Promise.all([
    prisma.appointment.findMany({ where: { practiceId: praxis.id, status: { not: "ABGESAGT" }, start: fenster }, select: { id: true, start: true, minutes: true, createdAt: true } }),
    prisma.terminanfrage.findMany({ where: { practiceId: praxis.id, status: "OFFEN", reserviertBis: { gt: now }, start: fenster }, select: { id: true, start: true, minutes: true, createdAt: true } }),
  ]);
  const ueberlappend = [...termine, ...anfragen].filter((t) => t.start.getTime() + t.minutes * 60000 > start.getTime());
  const zuletzt = [...ueberlappend].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))[0];
  if (ueberlappend.length > l.lage.eingabe.plaetze && zuletzt?.id === anfrage.id) {
    await prisma.terminanfrage.delete({ where: { id: anfrage.id } });
    await Promise.all([releaseAttempt(ipKey), releaseAttempt(praxisKey)]);
    return vergeben();
  }

  await audit({ practiceId: praxis.id, userName: "Buchungsseite für neue Patienten", action: "terminanfrage", entityType: "Terminanfrage", entityId: anfrage.id, summary: "eingegangen" });
  return antwort({ ok: true, start: start.toISOString(), reserviertStd: 24, beispiel: praxis.isDemo }, 201);
}
