// Einstieg für die öffentliche Website (public/landing.html): dieselbe
// Diktat-Logik wie in der App, als kleines Browser-Skript gebündelt.
// Erzeugen mit: npm run web:build
import { describeDiktat, parseBefundDiktat } from "@/lib/befundDiktat";

export function preview(text: string): string[] {
  return describeDiktat(parseBefundDiktat(text));
}
