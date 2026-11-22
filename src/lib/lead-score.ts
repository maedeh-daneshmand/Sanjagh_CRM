import { Source, Priority } from "@prisma/client";

interface LeadScoreInput {
  source: Source;
  priority: Priority;
  activitiesCount: number;
  recentActivityDaysAgo?: number;
}

export function calculateLeadScore(input: LeadScoreInput): number {
  let score = 0;

  // Source weight
  switch (input.source) {
    case "WEBSITE":
      score += 25;
      break;
    case "INSTAGRAM":
      score += 20;
      break;
    case "REFERRAL":
      score += 30;
      break;
    case "PHONE":
      score += 25;
      break;
    case "EVENT":
      score += 20;
      break;
    case "TELEGRAM":
      score += 15;
      break;
    case "OTHER":
    default:
      score += 10;
      break;
  }

  // Priority weight
  switch (input.priority) {
    case "HIGH":
      score += 35;
      break;
    case "MEDIUM":
      score += 20;
      break;
    case "LOW":
      score += 10;
      break;
  }

  // Engagement / Activity count
  const activityScore = Math.min(input.activitiesCount * 5, 25);
  score += activityScore;

  // Recency bonus
  if (input.recentActivityDaysAgo !== undefined) {
    if (input.recentActivityDaysAgo <= 2) {
      score += 10;
    } else if (input.recentActivityDaysAgo <= 7) {
      score += 5;
    }
  }

  return Math.min(Math.max(score, 0), 100);
}
