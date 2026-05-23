export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      aesthetics: {
        Row: {
          id: string;
          name: string;
          slug: string;
          decade: string | null;
          start_year: string | null;
          end_year: string | null;
          cover_image_url: string | null;
          is_preview: boolean;
          created_at: string;
          description: string | null;
          gallery_images: string[];
          arena_slug: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          decade?: string | null;
          start_year?: string | null;
          end_year?: string | null;
          cover_image_url?: string | null;
          is_preview?: boolean;
          created_at?: string;
          description?: string | null;
          gallery_images?: string[];
          arena_slug?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          decade?: string | null;
          start_year?: string | null;
          end_year?: string | null;
          cover_image_url?: string | null;
          is_preview?: boolean;
          created_at?: string;
          description?: string | null;
          gallery_images?: string[];
          arena_slug?: string | null;
        };
      };
      ranking_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          share_slug: string | null;
          is_public: boolean;
          display_name: string | null;
          top_k_ids: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          share_slug?: string | null;
          is_public?: boolean;
          display_name?: string | null;
          top_k_ids?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          share_slug?: string | null;
          is_public?: boolean;
          display_name?: string | null;
          top_k_ids?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      elo_ratings: {
        Row: {
          session_id: string;
          aesthetic_id: string;
          rating: number;
          wins: number;
          losses: number;
          updated_at: string;
        };
        Insert: {
          session_id: string;
          aesthetic_id: string;
          rating?: number;
          wins?: number;
          losses?: number;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          aesthetic_id?: string;
          rating?: number;
          wins?: number;
          losses?: number;
          updated_at?: string;
        };
      };
      comparisons: {
        Row: {
          id: string;
          session_id: string;
          winner_id: string;
          loser_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          winner_id: string;
          loser_id: string;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Aesthetic = Database["public"]["Tables"]["aesthetics"]["Row"];
export type RankingSession =
  Database["public"]["Tables"]["ranking_sessions"]["Row"];
export type EloRating = Database["public"]["Tables"]["elo_ratings"]["Row"];
export type Comparison = Database["public"]["Tables"]["comparisons"]["Row"];
