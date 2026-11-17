// Erzeugt die Symbole je Praxis-Gruppe (Zahn, Arzt, Therapie) und das Symbol für „Meine Praxen auf diesem Gerät“
// unter public/brand: SVG und PNG (192, 512, 180 für das iPhone). Selbst gezeichnet, keine fremden Vorlagen.
// Farben wie lib/praxisGruppe.ts. Die Fläche füllt das ganze Quadrat, das Zeichen bleibt im inneren Kreis
// (Radius 40 %), damit Android die Symbole rund oder abgerundet zuschneiden darf („maskable“).
// Aufruf: node scripts/gruppenSymbole.mjs   (braucht sharp, das Next.js ohnehin mitbringt)
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ziel = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "brand");
const FARBE = { zahn: "#0F766E", arzt: "#1D4ED8", therapie: "#6D28D9" };

const rahmen = (farbe, inhalt) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" fill="${farbe}"/>${inhalt}</svg>`;

const ZEICHEN = {
  // Backenzahn mit zwei Wurzeln
  zahn: `<path fill="#fff" d="M256 168C232 146 196 136 172 146C140 160 136 204 148 240C158 270 166 300 170 336C174 370 184 390 200 390C218 390 224 366 230 340C236 314 242 298 256 298C270 298 276 314 282 340C288 366 294 390 312 390C328 390 338 370 342 336C346 300 354 270 364 240C376 204 372 160 340 146C316 136 280 146 256 168Z"/>`,
  // Kreuz mit runden Ecken
  arzt: `<rect x="216" y="136" width="80" height="240" rx="18" fill="#fff"/><rect x="136" y="216" width="240" height="80" rx="18" fill="#fff"/>`,
  // Blatt mit Mittelader (Heilen, Üben, Wachsen)
  therapie: `<path fill="#fff" d="M150 362C150 228 236 146 370 140C374 276 296 362 150 362Z"/><path d="M168 344C220 290 276 230 330 182" stroke="${FARBE.therapie}" stroke-width="14" stroke-linecap="round" fill="none"/>`,
};

const zeile = (y, farbe) =>
  `<rect x="120" y="${y}" width="272" height="64" rx="32" fill="#fff" stroke="#DCD2C6" stroke-width="4"/><circle cx="154" cy="${y + 32}" r="18" fill="${farbe}"/><rect x="188" y="${y + 26}" width="164" height="12" rx="6" fill="#C4B6A6"/>`;
const MEINE_PRAXEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" fill="#F5F2EE"/>${zeile(146, FARBE.zahn)}${zeile(224, FARBE.arzt)}${zeile(302, FARBE.therapie)}</svg>`;

async function ausgeben(name, svg) {
  writeFileSync(join(ziel, `${name}.svg`), svg + "\n");
  for (const groesse of [192, 512, 180]) {
    await sharp(Buffer.from(svg)).resize(groesse, groesse).png({ compressionLevel: 9 }).toFile(join(ziel, `${name}-${groesse}.png`));
  }
}

for (const [gruppe, farbe] of Object.entries(FARBE)) await ausgeben(`gruppe-${gruppe}`, rahmen(farbe, ZEICHEN[gruppe]));
await ausgeben("meine-praxen", MEINE_PRAXEN);
console.log("Symbole geschrieben nach", ziel);
