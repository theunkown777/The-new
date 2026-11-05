// Pflicht zur Zwei-Faktor-Anmeldung (Art. 32 DSGVO, Gesundheitsdaten):
// Admins immer, Mitarbeitende, wenn die Praxis es verlangt. Gastzugänge
// (Demo) sind ausgenommen, weil dort nur erfundene Daten liegen.
export function zweiFaktorPflicht(a: { role: string; require2faAll: boolean; isDemo: boolean }): boolean {
  if (a.isDemo) return false;
  return a.role === "admin" || a.require2faAll;
}
