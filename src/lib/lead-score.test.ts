import { describe, it, expect } from "vitest";
import { calculateLeadScore } from "./lead-score";

describe("calculateLeadScore", () => {
  it("calculates high score for hot referral leads with high priority", () => {
    const score = calculateLeadScore({
      source: "REFERRAL",
      priority: "HIGH",
      activitiesCount: 5,
      recentActivityDaysAgo: 1,
    });

    // 30 (REFERRAL) + 35 (HIGH) + 25 (activities cap) + 10 (recent bonus) = 100
    expect(score).toBe(100);
  });

  it("calculates medium score for website leads with medium priority", () => {
    const score = calculateLeadScore({
      source: "WEBSITE",
      priority: "MEDIUM",
      activitiesCount: 2,
      recentActivityDaysAgo: 5,
    });

    // 25 (WEBSITE) + 20 (MEDIUM) + 10 (activities) + 5 (recent) = 60
    expect(score).toBe(60);
  });

  it("calculates lower score for other sources with low priority and no activity", () => {
    const score = calculateLeadScore({
      source: "OTHER",
      priority: "LOW",
      activitiesCount: 0,
    });

    // 10 (OTHER) + 10 (LOW) = 20
    expect(score).toBe(20);
  });
});
