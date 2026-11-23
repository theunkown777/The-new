// Texte und Logik für das Lächeln-Zitat der Startseite (components/start/LaechelnZitat.tsx).
// Praxis und Patient zeichnen je eine Hälfte des Bogens aus dem Logo; erst zusammen wird daraus ein Lächeln.
//
// Pflegehinweis: Die Seitentexte wiederholen nur Aussagen, die schon auf der Startseite stehen
// (components/Entlastung.tsx, components/ZweiAnsichten.tsx, SCHRITTE in app/page.tsx). Ändert sich dort eine
// Produktaussage, etwa zu Rückrufwünschen, diese Texte mitpflegen. Keine Zahlen, keine neuen Versprechen.

export type LaechelnSeite = "praxis" | "patient";
export type LaechelnStand = "beide" | "praxis" | "patient" | "keine";
export const LAECHELN_STAENDE: LaechelnStand[] = ["beide", "praxis", "patient", "keine"];

export function laechelnStand(praxis: boolean, patient: boolean): LaechelnStand {
  return praxis && patient ? "beide" : praxis ? "praxis" : patient ? "patient" : "keine";
}

export const LAECHELN_SEITEN: Record<LaechelnSeite, { name: string; text: string }> = {
  praxis: {
    name: "Praxis",
    text: "Ein Klick nach dem Gespräch erzeugt die Information zum Mitnehmen, den Hinweis zur Vereinbarung und die To-dos. Rückrufwünsche kommen gesammelt an.",
  },
  patient: {
    name: "Patient",
    text: "Der Patient liest zu Hause auf dem Handy, was die Kasse zahlt und was er selbst zahlt. Ohne App und ohne Konto.",
  },
};

export const LAECHELN_STATUS: Record<LaechelnStand, { titel: string; text: string; link?: { href: string; text: string } }> = {
  beide: { titel: "Jetzt lächeln beide.", text: "Erst mit Praxis und Patient wird aus dem Bogen ein Lächeln.", link: { href: "#ablauf", text: "So läuft es in jeder Praxis" } },
  praxis: { titel: "Die Praxis lächelt.", text: "Der Patient fehlt noch. Das ist erst ein halbes Lächeln.", link: { href: "#zeitrechner", text: "Wie viel Zeit Ihr Team zurückbekommt" } },
  patient: { titel: "Der Patient lächelt.", text: "Die Praxis fehlt noch. Das ist erst ein halbes Lächeln.", link: { href: "#fuer-patienten", text: "Was Ihre Patienten davon haben" } },
  keine: { titel: "Noch lächelt niemand.", text: "Schalten Sie eine Seite ein." },
};

export const LAECHELN_HINWEIS = "Jede Seite lässt sich einzeln aus- und wieder einschalten.";
