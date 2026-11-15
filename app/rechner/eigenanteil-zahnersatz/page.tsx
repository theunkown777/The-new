import type { Metadata } from "next";
import { RECHNER, RechnerSeite } from "@/components/rechner/RechnerSeite";
import { ZahnersatzRechner } from "@/components/rechner/Rechner";

const r = RECHNER.find((x) => x.slug === "eigenanteil-zahnersatz")!;
export const metadata: Metadata = { title: `${r.titel} – Rechner von Sorrida`, description: r.kurz, alternates: { canonical: "/rechner/eigenanteil-zahnersatz" } };

export default function Seite() {
  return (
    <RechnerSeite slug="eigenanteil-zahnersatz" quellen={[["§ 55 SGB V (Festzuschüsse bei Zahnersatz)", "https://www.gesetze-im-internet.de/sgb_5/__55.html"], ["§ 56 SGB V (Festsetzung der Regelversorgungen)", "https://www.gesetze-im-internet.de/sgb_5/__56.html"]]}>
      <ZahnersatzRechner />
    </RechnerSeite>
  );
}
