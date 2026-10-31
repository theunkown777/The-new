// Gemessene Wirkung statt Werbeversprechen: Annahmequote der Praxis, getrennt
// nach Vorschlägen mit und ohne Patienten-Link. Ein Vergleich wird erst
// gezeigt, wenn beide Gruppen genug entschiedene Vorschläge haben.

export const MIN_DECIDED_FOR_COMPARISON = 5;

export interface StatInput {
  status: string;
  shareCreatedAt: Date | null;
  patientViewedAt: Date | null;
  patientRespondedAt: Date | null;
  baseTotalCent: number;
  planTotalCent: number;
}

export interface GroupStats {
  total: number;
  decided: number;
  accepted: number;
  /** Annahmequote in Prozent, null wenn noch nichts entschieden ist. */
  rate: number | null;
}

export interface ProposalStats {
  all: GroupStats;
  withLink: GroupStats;
  withoutLink: GroupStats;
  funnel: { sent: number; viewed: number; responded: number; accepted: number };
  acceptedDeltaCent: number;
  /** Differenz der Annahmequote in Prozentpunkten (mit minus ohne Link), wenn aussagekräftig. */
  linkEffectPoints: number | null;
}

const isDecided = (s: string) => s === "ANGENOMMEN" || s === "ABGELEHNT";

function group(list: StatInput[]): GroupStats {
  const decided = list.filter((p) => isDecided(p.status)).length;
  const accepted = list.filter((p) => p.status === "ANGENOMMEN").length;
  return { total: list.length, decided, accepted, rate: decided ? Math.round((accepted / decided) * 100) : null };
}

export function proposalStats(list: StatInput[]): ProposalStats {
  const linked = list.filter((p) => p.shareCreatedAt);
  const withLink = group(linked);
  const withoutLink = group(list.filter((p) => !p.shareCreatedAt));
  const comparable =
    withLink.decided >= MIN_DECIDED_FOR_COMPARISON && withoutLink.decided >= MIN_DECIDED_FOR_COMPARISON;
  return {
    all: group(list),
    withLink,
    withoutLink,
    funnel: {
      sent: linked.length,
      viewed: linked.filter((p) => p.patientViewedAt).length,
      responded: linked.filter((p) => p.patientRespondedAt).length,
      accepted: withLink.accepted,
    },
    acceptedDeltaCent: list
      .filter((p) => p.status === "ANGENOMMEN")
      .reduce((sum, p) => sum + p.planTotalCent - p.baseTotalCent, 0),
    linkEffectPoints: comparable ? withLink.rate! - withoutLink.rate! : null,
  };
}
