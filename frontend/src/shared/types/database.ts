/**
 * Supabase database schema types.
 * Regenerate: supabase gen types typescript --local > src/shared/types/database.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MatchStatus = "waiting" | "active" | "finished";
export type MatchMode = "blitz" | "local" | "ai" | "friend";

type ProfileRow = {
  id: string;
  username: string | null;
  city: string | null;
  avatar_url: string | null;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  is_pro: boolean;
  coach_uses_today: number;
  coach_reset_date: string | null;
  stripe_customer_id: string | null;
  owned_skins: string[] | null;
  created_at: string;
};

type ProfileInsert = {
  id: string;
  username?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  elo?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  is_pro?: boolean;
  coach_uses_today?: number;
  coach_reset_date?: string | null;
  stripe_customer_id?: string | null;
  owned_skins?: string[] | null;
  created_at?: string;
};

type MatchRow = {
  id: string;
  room_id: string | null;
  white_id: string | null;
  black_id: string | null;
  rated: boolean;
  mode: MatchMode;
  status: MatchStatus;
  winner_id: string | null;
  ended_reason: string | null;
  white_elo_before: number | null;
  black_elo_before: number | null;
  white_elo_delta: number | null;
  black_elo_delta: number | null;
  board_json: Json | null;
  created_at: string;
  finished_at: string | null;
};

type MatchInsert = {
  id?: string;
  room_id?: string | null;
  white_id?: string | null;
  black_id?: string | null;
  rated?: boolean;
  mode?: MatchMode;
  status?: MatchStatus;
  winner_id?: string | null;
  ended_reason?: string | null;
  white_elo_before?: number | null;
  black_elo_before?: number | null;
  white_elo_delta?: number | null;
  black_elo_delta?: number | null;
  board_json?: Json | null;
  created_at?: string;
  finished_at?: string | null;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
      matches: {
        Row: MatchRow;
        Insert: MatchInsert;
        Update: Partial<MatchInsert>;
        Relationships: [];
      };
      moves: {
        Row: {
          id: string;
          match_id: string;
          ply: number;
          notation: string;
          board_snapshot_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          ply: number;
          notation: string;
          board_snapshot_json?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          ply?: number;
          notation?: string;
          board_snapshot_json?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rating_history: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          elo_before: number;
          elo_after: number;
          delta: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          elo_before: number;
          elo_after: number;
          delta: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string;
          elo_before?: number;
          elo_after?: number;
          delta?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      coach_reports: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          summary_ru: string;
          headline: string | null;
          moments_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          summary_ru: string;
          headline?: string | null;
          moments_json?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string;
          summary_ru?: string;
          headline?: string | null;
          moments_json?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      leaderboard_global: {
        Row: {
          id: string;
          username: string | null;
          city: string | null;
          elo: number;
          wins: number;
          losses: number;
          draws: number;
          rank: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      finish_rated_match: {
        Args: {
          p_match_id: string;
          p_winner_id: string | null;
          p_ended_reason: string;
        };
        Returns: Json;
      };
    };
  };
}

export type Profile = ProfileRow;
export type Match = MatchRow;
export type { MatchInsert };
