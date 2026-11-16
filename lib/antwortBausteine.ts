// Antwortentwurf im Eingang: ein Text aus festen Bausteinen für Rückmeldungen der Patienten zu
// einem Vorschlag. Ohne KI. Der Text enthält nie einen Befund, eine Leistung oder einen Betrag und
// macht keinen Zeitdruck. Die Praxis liest ihn, ändert ihn und schickt ihn selbst ab; Sorrida
// verschickt nichts.

/** Einträge im Eingang, zu denen es einen Antwortentwurf gibt. */
export const ANTWORT_EINGANG_ARTEN = ["VORSCHLAG_INTERESSE", "VORSCHLAG_RUECKRUF", "VEREINBARUNG", "ZWEITMEINUNG", "ERINNERUNG_GEWUENSCHT"] as const;
export const hatAntwortEntwurf = (eingangArt: string): boolean => (ANTWORT_EINGANG_ARTEN as readonly string[]).includes(eingangArt);

export type RueckmeldungArt = "rueckruf" | "frage" | "wahl" | "interesse" | "unterschrift" | "zweitmeinung" | "erinnerung";

/**
 * Worauf sich die Antwort bezieht. Bei „Interesse am Vorschlag“ entscheidet, was der Patient
 * mitgeschickt hat: eine Nachricht (Frage) oder eine Auswahl.
 */
export function rueckmeldungArt(eingangArt: string, d: { nachricht?: boolean; wahl?: boolean } = {}): RueckmeldungArt | null {
  switch (eingangArt) {
    case "VORSCHLAG_RUECKRUF": return "rueckruf";
    case "VORSCHLAG_INTERESSE": return d.nachricht ? "frage" : d.wahl ? "wahl" : "interesse";
    case "VEREINBARUNG": return "unterschrift";
    case "ZWEITMEINUNG": return "zweitmeinung";
    case "ERINNERUNG_GEWUENSCHT": return "erinnerung";
    default: return null;
  }
}

/** „Guten Tag Frau Muster“; ohne bekannten Namen (Schnellvorschlag ohne Akte) nur „Guten Tag“. */
export function antwortAnrede(p: { firstName?: string | null; lastName?: string | null; geschlecht?: string | null; ohneAkte?: boolean | null }): string {
  const nach = p.lastName?.trim();
  if (p.ohneAkte || !nach) return "Guten Tag";
  if (p.geschlecht === "W") return `Guten Tag Frau ${nach}`;
  if (p.geschlecht === "M") return `Guten Tag Herr ${nach}`;
  const vor = p.firstName?.trim();
  return vor ? `Guten Tag ${vor} ${nach}` : "Guten Tag";
}

const BEZUG: Record<RueckmeldungArt, string> = {
  rueckruf: "Sie haben um einen Rückruf gebeten. Wir rufen Sie gern an.",
  frage: "Sie haben uns eine Frage geschrieben. Wir beantworten sie gern persönlich.",
  wahl: "Ihre Auswahl ist bei uns angekommen.",
  interesse: "Ihre Nachricht ist bei uns angekommen.",
  unterschrift: "Ihre unterschriebene Vereinbarung ist bei uns angekommen.",
  zweitmeinung: "Danke, dass Sie die zweite Meinung mit uns teilen. Wir gehen im Gespräch gern darauf ein.",
  erinnerung: "Sie hatten uns gebeten, Sie an Ihre Unterlagen zu erinnern. Das tun wir hiermit gern.",
};

/** Bausteine in der Reihenfolge des Texts. Einzeln abrufbar, damit die Tests jeden prüfen können. */
export function antwortBausteine(a: { art: RueckmeldungArt; anrede: string; praxis: string; telefon?: string | null }): { gruss: string; dank: string; bezug: string; angebot: string; ruhe: string | null; schluss: string } {
  const praxis = a.praxis.trim() || "Ihre Praxis";
  const tel = a.telefon?.trim();
  const erreichbar = tel ? `Sie erreichen uns unter ${tel}.` : "Melden Sie sich dazu gern bei uns.";
  const angebot =
    a.art === "rueckruf"
      ? `Wann passt Ihnen unser Anruf? ${tel ? `Sie können uns auch selbst anrufen: ${tel}.` : "Sie können uns auch selbst anrufen."}`
      : a.art === "unterschrift"
        ? `Für den nächsten Schritt vereinbaren wir gern einen Termin mit Ihnen. ${erreichbar}`
        : `Wenn Sie möchten, vereinbaren wir einen Termin oder rufen Sie an. ${erreichbar}`;
  return {
    gruss: `${a.anrede.trim() || "Guten Tag"},`,
    dank: "vielen Dank für Ihre Rückmeldung.",
    bezug: BEZUG[a.art],
    angebot,
    // Kein Zeitdruck: ausdrücklich sagen, dass nichts eilt. Nach einer Unterschrift passt der Satz nicht.
    ruhe: a.art === "unterschrift" || a.art === "rueckruf" ? null : "Lassen Sie sich so viel Zeit, wie Sie brauchen.",
    schluss: `Freundliche Grüße\n${praxis}`,
  };
}

/** Der fertige Entwurf als Text. */
export function antwortEntwurf(a: { art: RueckmeldungArt; anrede: string; praxis: string; telefon?: string | null }): string {
  const b = antwortBausteine(a);
  return [b.gruss, "", [b.dank, b.bezug].join(" "), [b.angebot, b.ruhe].filter(Boolean).join(" "), "", b.schluss].join("\n");
}

/** Betreff für das E-Mail-Programm: neutral, ohne Anlass. */
export const antwortBetreff = (praxis: string) => `Ihre Rückmeldung an ${praxis.trim() || "Ihre Praxis"}`;
