interface EntryForSummary {
  performed: boolean;
  toothNumbers: string | null;
  quantity: number;
  note: string | null;
  catalogItem: {
    system: string;
    code: string;
    title: string;
  };
}

export function buildServiceSummary(entries: EntryForSummary[]): string {
  const performed = entries.filter((e) => e.performed);

  if (performed.length === 0) {
    return "Keine Leistungen als erbracht markiert.";
  }

  return performed
    .map((e) => {
      const ref = e.catalogItem.code !== "–" ? `${e.catalogItem.system} ${e.catalogItem.code}` : e.catalogItem.system;
      const parts = [`- ${e.catalogItem.title} (${ref})`];
      if (e.toothNumbers) parts.push(`Region: ${e.toothNumbers}`);
      if (e.quantity && e.quantity !== 1) parts.push(`Anzahl: ${e.quantity}`);
      if (e.note) parts.push(`Hinweis: ${e.note}`);
      return parts.join(" – ");
    })
    .join("\n");
}
