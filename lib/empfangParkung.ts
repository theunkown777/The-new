import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { PARKEN_STUNDEN, pinGesperrt, pinVersuch, type PinErgebnis } from "@/lib/empfang";

// Empfangsmodus, Serverseite der geparkten Praxis-Sitzung.
//
// Das Cookie auf dem Tablet enthält die verschlüsselte Sitzung und eine zufällige Kennung. Der Server führt
// je Übergabe einen Eintrag mit dem Hashwert dieser Kennung. Nur solange der Eintrag besteht, nimmt der Server
// eine PIN an. Er wird gelöscht
//   - nach dem richtigen Entsperren (der Wert gilt genau einmal),
//   - beim Verwerfen nach der dritten Sperre in Folge (dann für alle Tablets der Praxis),
//   - nach Ablauf (lib/aufraeumen.ts).
// Wer den Cookie-Wert vom Gerät kopiert hat, kann danach nicht weiter raten.
//
// Lesen, Vergleichen und Schreiben des Zählers laufen je Praxis nacheinander (pg_advisory_xact_lock):
// Gleichzeitige Anfragen können die Grenze von fünf Fehlversuchen nicht umgehen.

export const parkKennungNeu = () => crypto.randomBytes(18).toString("base64url");
export const parkKennungHash = (kennung: string) => crypto.createHash("sha256").update(`empfang-parkung:${kennung}`).digest("hex");
/** Name der Sperre: eine je Praxis, weil auch die PIN und ihr Zähler je Praxis gelten. */
export const pinSperre = (practiceId: string) => `empfang-pin:${practiceId}`;

/** Neue Parkung anlegen (für Tests und Skripte; die Übergabe-Route legt den Eintrag selbst an, nachdem das Cookie gebaut ist). */
export async function parkungAnlegen(practiceId: string, now = Date.now()): Promise<string> {
  const kennung = parkKennungNeu();
  await prisma.empfangParkung.create({ data: { id: parkKennungHash(kennung), practiceId, expiresAt: new Date(now + PARKEN_STUNDEN * 3600e3) } });
  return kennung;
}

export type EntsperrErgebnis =
  /** Der Server kennt diese Parkung nicht (mehr): schon entsperrt, verworfen oder abgelaufen. Die PIN wird nicht geprüft. */
  | { art: "keine-sitzung" }
  | { art: "keine-pin" }
  | PinErgebnis;

/**
 * Eine PIN-Eingabe prüfen und den Zähler fortschreiben, in einem Schritt je Praxis.
 * Bei „ok“ ist die Parkung danach verbraucht, bei „verwerfen“ sind alle Parkungen der Praxis gelöscht.
 */
export async function pinEntsperren(a: { practiceId: string; kennung: string | null; pin: string }, now = new Date()): Promise<EntsperrErgebnis> {
  if (!a.kennung) return { art: "keine-sitzung" };
  const id = parkKennungHash(a.kennung);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pinSperre(a.practiceId)}))`;
    const parkung = await tx.empfangParkung.findFirst({ where: { id, practiceId: a.practiceId, expiresAt: { gt: now } }, select: { id: true } });
    if (!parkung) return { art: "keine-sitzung" } as const;
    const praxis = await tx.practice.findUnique({ where: { id: a.practiceId }, select: { empfangPinHash: true, empfangPinFehlversuche: true, empfangPinSperren: true, empfangPinGesperrtBis: true } });
    if (!praxis?.empfangPinHash) return { art: "keine-pin" } as const;
    const stand = { fehlversuche: praxis.empfangPinFehlversuche, sperren: praxis.empfangPinSperren, gesperrtBis: praxis.empfangPinGesperrtBis };
    // Während der Sperre wird die PIN gar nicht erst verglichen.
    const richtig = !pinGesperrt(stand, now) && /^\d{4}$/.test(a.pin) && (await bcrypt.compare(a.pin, praxis.empfangPinHash));
    const erg = pinVersuch(stand, richtig, now);
    if (erg.stand !== stand) {
      await tx.practice.update({ where: { id: a.practiceId }, data: { empfangPinFehlversuche: erg.stand.fehlversuche, empfangPinSperren: erg.stand.sperren, empfangPinGesperrtBis: erg.stand.gesperrtBis } });
    }
    if (erg.art === "ok") await tx.empfangParkung.delete({ where: { id: parkung.id } });
    else if (erg.art === "gesperrt" && erg.verwerfen) await tx.empfangParkung.deleteMany({ where: { practiceId: a.practiceId } });
    return erg;
  }, { maxWait: 10_000, timeout: 15_000 });
}

/** Abgelaufene Parkungen löschen (nächtlicher Lauf). */
export const parkungenAufraeumen = async (now = new Date()) => (await prisma.empfangParkung.deleteMany({ where: { expiresAt: { lt: now } } })).count;
