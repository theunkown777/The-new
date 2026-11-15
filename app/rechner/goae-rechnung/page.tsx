import type { Metadata } from "next";
import { RECHNER, RechnerSeite } from "@/components/rechner/RechnerSeite";
import { GebuehrRechner } from "@/components/rechner/Rechner";

const r = RECHNER.find((x) => x.slug === "goae-rechnung")!;
export const metadata: Metadata = { title: `${r.titel} – Rechner von Sorrida`, description: r.kurz, alternates: { canonical: "/rechner/goae-rechnung" } };

export default function Seite() {
  return (
    <RechnerSeite slug="goae-rechnung" quellen={[["§ 5 GOÄ (Bemessung der Gebühren)", "https://www.gesetze-im-internet.de/go__1982/__5.html"], ["§ 12 GOÄ (Rechnung)", "https://www.gesetze-im-internet.de/go__1982/__12.html"], ["§ 5 GOZ (Bemessung der Gebühren)", "https://www.gesetze-im-internet.de/goz_1987/__5.html"]]}>
      <GebuehrRechner />
    </RechnerSeite>
  );
}
