// Protokoll sicherheitsrelevanter Vorgänge. Ein Fehler beim Schreiben darf
// die eigentliche Aktion nicht abbrechen, wird aber im Server-Log sichtbar.
// In den Text gehören keine Gesundheitsdaten und keine Patientennamen,
// nur Art des Vorgangs und Kennungen.

export const AUDIT_ACTIONS = {
  "login": "Anmeldung",
  "login.fehlgeschlagen": "Anmeldung fehlgeschlagen",
  "patient.export": "Patientendaten exportiert",
  "patient.geloescht": "Patient gelöscht",
  "bericht.freigegeben": "Bericht freigegeben",
  "bericht.zurueckgezogen": "Freigabe zurückgenommen",
  "bericht.ki": "Bericht mit KI erstellt",
  "rechnung.status": "Rechnungsstatus geändert",
  "team.rolle": "Rolle oder Rechte geändert",
  "team.entfernt": "Konto entfernt",
  "team.einladung": "Mitarbeiter eingeladen",
  "2fa.an": "Zwei-Faktor-Anmeldung eingeschaltet",
  "2fa.aus": "Zwei-Faktor-Anmeldung ausgeschaltet",
  "schnittstelle.schluessel": "Schnittstellen-Schlüssel geändert",
  "akte.eintrag": "Akteneintrag geändert",
  "akte.dokument": "Dokument hochgeladen oder gelöscht",
  "akte.dokument.abruf": "Dokument geöffnet",
  "ueberblick.ki": "Terminüberblick mit KI formuliert",
  "standort": "Standort geändert",
  "nachricht": "Nachricht per E-Mail verschickt",
  "schnittstelle.export": "An die Praxissoftware übergeben",
  "bereich.passwort": "Passwort für Mein Bereich gesetzt oder geändert",
  "bereich.gesperrt": "Mein Bereich nach Fehlversuchen gesperrt",
  "datev.export": "DATEV-Buchungsstapel exportiert",
  "kalender": "Kalender oder Online-Termine geändert",
  "termin.online": "Termin vom Patienten online gebucht oder abgesagt",
  "nachricht.whatsapp": "Nachricht per WhatsApp",
  "katalog.eigen": "Eigene Leistung angelegt",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export interface AuditEntry {
  practiceId: string;
  userId?: string | null;
  userName?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  summary?: string;
}

/** Entfernt Zeilenumbrüche und kürzt, damit das Protokoll eine Zeile pro Vorgang bleibt. */
export const auditSummary = (action: AuditAction, extra?: string) =>
  [AUDIT_ACTIONS[action], extra?.replace(/\s+/g, " ").trim()].filter(Boolean).join(" · ").slice(0, 300);

export async function audit(e: AuditEntry): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.auditLog.create({
      data: {
        practiceId: e.practiceId,
        userId: e.userId ?? null,
        userName: e.userName ?? null,
        action: e.action,
        entityType: e.entityType ?? null,
        entityId: e.entityId ?? null,
        summary: auditSummary(e.action, e.summary),
      },
    });
  } catch (err) {
    console.error("Protokolleintrag fehlgeschlagen", e.action, err);
  }
}

/** Kurzform für API-Routen mit Sitzung. */
export const auditFromSession = (
  session: { user: { id: string; name?: string | null; practiceId: string } },
  action: AuditAction,
  rest: Omit<AuditEntry, "practiceId" | "userId" | "userName" | "action"> = {}
) => audit({ practiceId: session.user.practiceId, userId: session.user.id, userName: session.user.name ?? null, action, ...rest });
