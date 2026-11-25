import type { Config } from "tailwindcss";

// Farben als Variablen: Jede Farbstufe gibt es in drei Rollen, damit die App für die Praxis auf warmem Papier
// (und in der dunklen Ansicht) andere Werte bekommen kann als Website und Patientenseiten, ohne dass eine
// einzige Seite angefasst wird. Die Werte stehen in app/globals.css:
//   --slate-500      Schrift, Symbole           (text-, fill-, stroke-, placeholder-)
//   --slate-fl-500   Flächen                    (bg-, from-/to-)
//   --slate-li-500   Linien                     (border-, divide-, ring-, outline-)
// Außerhalb der App (:root) gelten die gewohnten Werte; Regeln dazu in docs/GESTALTUNG.md.
const STUFEN = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const MARKE_STUFEN = [50, 100, 200, 300, 400, 500, 600, 700, 800] as const;
const SALBEI_STUFEN = [50, 100, 200, 300, 500, 600, 700, 800] as const;
const skala = (name: string, rolle: "" | "fl" | "li", stufen: readonly number[] = STUFEN) =>
  Object.fromEntries(stufen.map((s) => [s, `rgb(var(--${name}${rolle ? `-${rolle}` : ""}-${s}) / <alpha-value>)`]));
const PALETTEN: [string, readonly number[]][] = [
  ["slate", STUFEN],
  // Sorrida-Bordeaux aus dem Logo (das kalligrafische S, #5a1d1d).
  ["brand", MARKE_STUFEN],
  // Salbei: Sorridas Farbe für die Kassenleistung ("Kasse zuerst"), nie für Werbung.
  ["salbei", SALBEI_STUFEN],
  ["emerald", STUFEN],
  ["green", STUFEN],
  ["red", STUFEN],
  ["amber", STUFEN],
  ["orange", STUFEN],
  ["sky", STUFEN],
  ["blue", STUFEN],
];
const rolle = (r: "" | "fl" | "li") => Object.fromEntries(PALETTEN.map(([name, stufen]) => [name, skala(name, r, stufen)]));

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  // Hover (hover:, group-hover:, peer-hover:) gilt nur bei echter Maus. Am Handy bliebe sonst nach einem Tipp
  // die Hover-Farbe stehen. Der Tastatur-Fokus ist davon nicht berührt.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: rolle(""),
      fontFamily: {
        sans: ["var(--font-open-sans)", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        serif: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
      },
      // Website (Fachjournal auf warmem Papier): Papier, dunklere Papierfläche, Tinte, Haarlinie
      textColor: { tinte: "#24201F", "tinte-2": "#5E5650" },
      backgroundColor: { papier: "#F5F2EE", "papier-2": "#ECE5DC", tinte: "#24201F", white: "rgb(var(--weiss-fl) / <alpha-value>)", ...rolle("fl") },
      gradientColorStops: rolle("fl"),
      // tinte: die kräftige Linie über Listen (border-t border-tinte)
      borderColor: { linie: "#DCD2C6", "linie-stark": "#C4B6A6", tinte: "#24201F", ...rolle("li") },
      ringColor: rolle("li"),
      outlineColor: rolle("li"),
      // Rundungen: außerhalb der App die gewohnten Werte, in der App eine einheitliche Form (6 px Felder und Knöpfe, 10 px Karten).
      borderRadius: { lg: "var(--rund-lg)", xl: "var(--rund-xl)", "2xl": "var(--rund-2xl)", "3xl": "var(--rund-3xl)" },
    },
  },
  plugins: [],
};

export default config;
