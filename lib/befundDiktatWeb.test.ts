import fs from "fs";
import path from "path";
import { buildSync } from "esbuild";
import { describe, expect, it } from "vitest";

// Die Website nutzt eine gebündelte Kopie der Diktat-Logik. Dieser Test
// schlägt fehl, wenn lib/befundDiktat.ts geändert, aber "npm run web:build"
// vergessen wurde.
describe("public/js/befund-diktat.js", () => {
  it("ist aktuell", () => {
    const out = buildSync({
      entryPoints: [path.join(__dirname, "befundDiktatWeb.ts")],
      bundle: true,
      format: "iife",
      globalName: "SorridaDiktat",
      minify: true,
      target: "es2019",
      legalComments: "none",
      write: false,
      alias: { "@": path.join(__dirname, "..") },
    });
    const committed = fs.readFileSync(path.join(__dirname, "../public/js/befund-diktat.js"), "utf8");
    expect(out.outputFiles[0].text).toBe(committed);
  });
});
