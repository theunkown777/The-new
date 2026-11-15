import type { Metadata } from "next";
import { RECHNER, RechnerSeite } from "@/components/rechner/RechnerSeite";
import { ZuzahlungRechner } from "@/components/rechner/Rechner";

const r = RECHNER.find((x) => x.slug === "zuzahlung-2027")!;
export const metadata: Metadata = { title: `${r.titel} – Rechner von Sorrida`, description: r.kurz, alternates: { canonical: "/rechner/zuzahlung-2027" } };

export default function Seite() {
  return (
    <RechnerSeite slug="zuzahlung-2027" quellen={[["§ 61 SGB V (Zuzahlungen)", "https://www.gesetze-im-internet.de/sgb_5/__61.html"], ["§ 62 SGB V (Belastungsgrenze)", "https://www.gesetze-im-internet.de/sgb_5/__62.html"], ["§ 32 SGB V (Heilmittel)", "https://www.gesetze-im-internet.de/sgb_5/__32.html"]]}>
      <ZuzahlungRechner />
    </RechnerSeite>
  );
}
