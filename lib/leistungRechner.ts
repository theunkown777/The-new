// Block „Selbst nachrechnen“ am Ende der öffentlichen Leistungsseiten (app/leistungen/[id]): Links zu den Rechnern,
// die zum Thema der Leistung passen, und zum Ratgeber. Passt keiner, steht nur die Übersicht der Rechner.
// Es werden nur Rechner verlinkt, keine Preise oder Preisspannen genannt.

export type RechnerLink = { href: string; titel: string; text: string };

const UEBERSICHT: RechnerLink = { href: "/rechner", titel: "Alle Rechner", text: "Zuzahlung, Zahnersatz und GOÄ-Rechnung selbst nachrechnen." };
const ZAHNERSATZ: RechnerLink = { href: "/rechner/eigenanteil-zahnersatz", titel: "Eigenanteil bei Zahnersatz", text: "Festzuschuss der Kasse mit Bonusheft, bei Bewilligung bis 2026 und ab 2027." };
const ZUZAHLUNG: RechnerLink = { href: "/rechner/zuzahlung-2027", titel: "Zuzahlung 2027", text: "Gesetzliche Zuzahlung für Heilmittel, Hilfsmittel und Arzneimittel, bisher und ab 2027." };
const GOAE: RechnerLink = { href: "/rechner/goae-rechnung", titel: "GOÄ-Rechnung nachrechnen", text: "Punktzahl mal Faktor: so entsteht der Betrag einer Position auf der Rechnung." };
export const RATGEBER_LINK: RechnerLink = { href: "/ratgeber", titel: "Ratgeber", text: "Kosten und Regeln in einfachen Worten erklärt." };

const ZAHNERSATZ_KATEGORIEN = new Set(["Zahnersatz (Prothetik)", "Implantologie"]);
const ZUZAHLUNG_BEREICHE = new Set(["Therapieberufe (Heilmittel)", "Hilfsmittel & Gesundheitshandwerk", "Digitale Gesundheit & Apotheke"]);

/** Rechner, die zum Thema der Leistung passen (höchstens einer je Thema), danach immer die Übersicht. */
export function rechnerFuer(l: { bereich: string; kategorie: string; kostentraeger_code: string; gebuehrenordnung: string }): RechnerLink[] {
  const out: RechnerLink[] = [];
  if (l.bereich === "Zahnmedizin" && ZAHNERSATZ_KATEGORIEN.has(l.kategorie)) out.push(ZAHNERSATZ);
  if (ZUZAHLUNG_BEREICHE.has(l.bereich) || /Heilmittel|Hilfsmittel|Arzneimittel/.test(l.gebuehrenordnung)) out.push(ZUZAHLUNG);
  // GOÄ-Rechnung: wo die Leistung nach der GOÄ berechnet wird und der Patient selbst eine Rechnung bekommt.
  if (/GOÄ/.test(l.gebuehrenordnung) && ["SZ", "PKV", "IND"].includes(l.kostentraeger_code)) out.push(GOAE);
  return [...out, UEBERSICHT];
}
