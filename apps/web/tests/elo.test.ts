import { describe, it, expect } from "vitest";
import { calculateEloChange, expectedScore } from "@/shared/lib/elo";

describe("elo", () => {
  it("equal ratings give ~0.5 expected", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 2);
  });

  it("winner gains elo from equal match", () => {
    const { newA, newB, deltaA, deltaB } = calculateEloChange(1000, 1000, 1);
    expect(deltaA).toBeGreaterThan(0);
    expect(deltaB).toBeLessThan(0);
    expect(newA + newB).toBe(2000);
  });
});
