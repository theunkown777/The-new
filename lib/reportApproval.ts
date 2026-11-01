import type { AuditAction } from "@/lib/audit";

// Regeln für die Freigabe eines Berichts. Rein, damit sie testbar sind.
export function approvalUpdate(a: {
  previousStatus: string;
  requestedStatus?: "ENTWURF" | "FINAL";
  textChanging: boolean;
  user: { id: string; name: string };
  now?: Date;
}): { data: Record<string, unknown>; event: AuditAction | null } {
  // Freigeben nur auf ausdrücklichen Wunsch, nie als Nebenwirkung einer Textänderung.
  if (a.requestedStatus === "FINAL" && (a.previousStatus !== "FINAL" || a.textChanging)) {
    return {
      data: { status: "FINAL", approvedById: a.user.id, approvedByName: a.user.name, approvedAt: a.now ?? new Date() },
      event: "bericht.freigegeben",
    };
  }
  if (a.previousStatus === "FINAL" && (a.requestedStatus === "ENTWURF" || (a.textChanging && a.requestedStatus !== "FINAL"))) {
    return { data: { status: "ENTWURF", approvedById: null, approvedByName: null, approvedAt: null }, event: "bericht.zurueckgezogen" };
  }
  return { data: {}, event: null };
}
