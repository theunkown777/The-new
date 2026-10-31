import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Sorrida-Bordeaux aus dem Logo (das kalligrafische S, #5a1d1d).
        brand: {
          50: "#f8f1f0",
          100: "#f0e2df",
          200: "#dfc2bc",
          300: "#c79a91",
          400: "#a8695e",
          500: "#86433a",
          600: "#6b2a24",
          700: "#5a1d1d",
          800: "#431515",
        },
        // Salbei: Sorridas Farbe für die Kassenleistung ("Kasse zuerst"), nie für Werbung.
        salbei: {
          50: "#f2f5f1",
          100: "#e3ebe0",
          200: "#c7d6c2",
          300: "#a2b99b",
          500: "#6c8c65",
          600: "#557350",
          700: "#435c40",
          800: "#344832",
        },
      },
      fontFamily: {
        sans: ["var(--font-open-sans)", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
