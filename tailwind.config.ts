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
      },
      fontFamily: {
        sans: ["var(--font-open-sans)", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
