/** Standard Elo expected score for player A. */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/** Computes new ratings after a rated game. */
export function calculateEloChange(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  k = 32
): { newA: number; newB: number; deltaA: number; deltaB: number } {
  const ea = expectedScore(ratingA, ratingB);
  const eb = 1 - ea;
  const scoreB = 1 - scoreA;
  const newA = Math.round(ratingA + k * (scoreA - ea));
  const newB = Math.round(ratingB + k * (scoreB - eb));
  return {
    newA,
    newB,
    deltaA: newA - ratingA,
    deltaB: newB - ratingB,
  };
}
