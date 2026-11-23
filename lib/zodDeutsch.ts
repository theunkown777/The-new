import { z } from "zod";

// Fehlermeldungen von zod in einfachem Deutsch. Die API gibt issues[0].message an die Oberfläche weiter;
// ohne diese Einstellung stünde dort Englisch („Too small: expected number to be >0“).
// Eigene Meldungen an einem Schema gehen immer vor. Geladen über lib/prisma.ts, also in jeder API-Route.

type Problem = z.core.$ZodRawIssue;

const zahl = (n: unknown) => (typeof n === "number" || typeof n === "bigint" ? String(n).replace(".", ",") : String(n));

export function deutscheMeldung(iss: Problem): string {
  switch (iss.code) {
    case "invalid_type":
      if (iss.input === undefined || iss.input === null) return "Eine Angabe fehlt.";
      if (iss.expected === "number" || iss.expected === "int" || iss.expected === "bigint") return "Bitte eine Zahl eingeben.";
      if (iss.expected === "string") return "Bitte einen Text eingeben.";
      if (iss.expected === "date") return "Bitte ein gültiges Datum eingeben.";
      return "Diese Angabe ist ungültig.";
    case "too_small": {
      const min = zahl(iss.minimum);
      if (iss.origin === "string") return Number(iss.minimum) <= 1 ? "Bitte dieses Feld ausfüllen." : `Der Text ist zu kurz. Bitte mindestens ${min} Zeichen.`;
      if (iss.origin === "array" || iss.origin === "set") return `Bitte mindestens ${min} auswählen.`;
      if (iss.origin === "date") return "Das Datum ist zu früh.";
      return iss.inclusive ? `Der Wert ist zu klein. Bitte mindestens ${min}.` : `Der Wert muss größer als ${min} sein.`;
    }
    case "too_big": {
      const max = zahl(iss.maximum);
      if (iss.origin === "string") return `Der Text ist zu lang. Bitte höchstens ${max} Zeichen.`;
      if (iss.origin === "array" || iss.origin === "set") return `Zu viele Einträge. Höchstens ${max}.`;
      if (iss.origin === "date") return "Das Datum ist zu spät.";
      return iss.inclusive ? `Der Wert ist zu groß. Bitte höchstens ${max}.` : `Der Wert muss kleiner als ${max} sein.`;
    }
    case "invalid_format":
      if (iss.format === "email") return "Bitte eine gültige E-Mail-Adresse eingeben.";
      if (iss.format === "url") return "Bitte eine gültige Internetadresse eingeben.";
      if (iss.format === "date" || iss.format === "datetime") return "Bitte ein gültiges Datum eingeben.";
      return "Die Eingabe hat nicht das richtige Format.";
    case "not_multiple_of":
      return "Dieser Wert ist nicht erlaubt.";
    case "invalid_value":
    case "invalid_union":
      return "Bitte eine der vorgegebenen Möglichkeiten wählen.";
    case "unrecognized_keys":
      return "Die Anfrage enthält unbekannte Angaben.";
    default:
      return "Ungültige Eingabe.";
  }
}

z.config({ customError: deutscheMeldung });
