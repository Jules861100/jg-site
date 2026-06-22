// Rule-based "AI" verification: deterministic checks on a project before
// it can go to production. No model involved — just domain rules.

export type ProjectCheckInput = {
  launchDate: Date | null;
  components: { name: string; pantone: string | null }[];
  documents: { kind: string; status: "current" | "archived"; createdAt: Date }[];
};

export type VerificationIssue = {
  code: "STALE_BAT" | "MISSING_PANTONE" | "DEADLINE_AT_RISK" | "MISSING_BAT";
  severity: "error" | "warning";
  message: string;
};

const BAT_MAX_AGE_DAYS = 180;
const DEADLINE_WARNING_DAYS = 30;

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function verifyProject(input: ProjectCheckInput, now = new Date()): VerificationIssue[] {
  const issues: VerificationIssue[] = [];

  const currentBat = input.documents.find((d) => d.kind === "bat" && d.status === "current");

  if (!currentBat) {
    issues.push({
      code: "MISSING_BAT",
      severity: "error",
      message: "Aucun BAT courant pour ce projet.",
    });
  } else if (daysBetween(now, currentBat.createdAt) > BAT_MAX_AGE_DAYS) {
    issues.push({
      code: "STALE_BAT",
      severity: "warning",
      message: `Le BAT courant a plus de ${BAT_MAX_AGE_DAYS} jours, vérifier qu'il est toujours valide.`,
    });
  }

  for (const component of input.components) {
    if (!component.pantone) {
      issues.push({
        code: "MISSING_PANTONE",
        severity: "error",
        message: `Pantone manquant pour le composant "${component.name}".`,
      });
    }
  }

  if (input.launchDate) {
    const daysToLaunch = daysBetween(input.launchDate, now);
    if (daysToLaunch >= 0 && daysToLaunch <= DEADLINE_WARNING_DAYS && (!currentBat || issues.some((i) => i.severity === "error"))) {
      issues.push({
        code: "DEADLINE_AT_RISK",
        severity: "error",
        message: `Lancement dans ${daysToLaunch} jours avec des éléments bloquants non résolus.`,
      });
    }
  }

  return issues;
}
