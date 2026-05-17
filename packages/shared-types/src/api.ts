/** Elo change for one player after a rated match. */
export interface EloSideResult {
  userId: string;
  before: number;
  after: number;
  delta: number;
}

/** Response from finish rated match API. */
export interface FinishMatchResponse {
  already_finished?: boolean;
  white?: EloSideResult;
  black?: EloSideResult;
  error?: string;
}

/** AI Coach critical moment. */
export interface CoachMoment {
  ply: number;
  type: "missed_capture" | "blunder" | "good";
  playedMove: string;
  bestEval: number;
  playedEval: number;
  text: string;
}

/** AI Coach API response. */
export interface CoachReportResponse {
  headline: string;
  summary: string;
  moments: CoachMoment[];
  error?: string;
}

/** Stripe checkout request body. */
export interface CheckoutRequest {
  type: "pro" | "skin";
}

/** Stripe checkout response. */
export interface CheckoutResponse {
  url?: string;
  message?: string;
  error?: string;
}
