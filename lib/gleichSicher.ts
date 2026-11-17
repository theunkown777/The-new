import crypto from "crypto";

/**
 * Zwei Texte in gleichbleibender Zeit vergleichen (Signaturen, Kennwörter).
 * crypto.timingSafeEqual wirft, wenn die beiden Puffer verschieden viele BYTES haben. Die Zahl der Zeichen
 * sagt darüber nichts: „ä“ ist ein Zeichen, aber zwei Bytes. Deshalb wird hier die Länge der Puffer verglichen.
 * Ein Wert von außen mit Umlauten oder anderen Mehrbyte-Zeichen ergibt so „ungleich“ statt eines Absturzes.
 */
export function gleichSicher(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
