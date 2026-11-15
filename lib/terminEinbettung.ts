// Einbettungs-Code der Buchungsseite für neue Patienten (/t/<kennung>) für die Website der Praxis.
// Eigene Datei ohne Server-Module, damit auch die Einstellungsseite im Browser sie nutzen kann.

export function einbettung(url: string): { knopf: string; rahmen: string } {
  return {
    knopf: `<a href="${url}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#6b2a24;color:#ffffff;font-family:Arial,sans-serif;font-size:16px;text-decoration:none">Termin online anfragen</a>`,
    rahmen: `<iframe src="${url}" title="Termin online anfragen" loading="lazy" style="width:100%;max-width:640px;height:900px;border:0"></iframe>`,
  };
}
