export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, unknown>;
        Insert?: Record<string, unknown>;
        Update?: Record<string, unknown>;
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          discord_id: string | null;
          discord_username: string | null;
          discord_access_token: string | null;
          discord_refresh_token: string | null;
          codex_accepted: boolean;
          codex_accepted_at: string | null;
          intro_video_watched: boolean;
          intro_video_watched_at: string | null;
          streak_current: number;
          streak_longest: number;
          streak_last_activity: string | null;
          total_learning_minutes: number;
          learning_minutes_by_day?: Json | null;
          is_admin: boolean;
          is_paid: boolean;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      courses: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          is_free: boolean;
          cover_image_storage_key: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          order_index: number;
          attachments: Json | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      subcategories: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          description: string | null;
          position: number;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      videos: {
        Row: {
          id: string;
          module_id: string | null;
          subcategory_id: string | null;
          title: string;
          description: string | null;
          position: number;
          storage_key: string;
          thumbnail_key: string | null;
          duration_seconds: number | null;
          is_published: boolean;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      user_progress: {
        Row: Record<string, unknown>;
      };
      quizzes: {
        Row: Record<string, unknown>;
      };
      events: {
        Row: Record<string, unknown>;
      };
      homework: {
        Row: Record<string, unknown>;
      };
      discord_invites: {
        Row: Record<string, unknown>;
      };
    };
  };
};
