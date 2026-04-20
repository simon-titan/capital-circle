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
          usage_agreement_accepted: boolean;
          usage_agreement_accepted_at: string | null;
          streak_current: number;
          streak_longest: number;
          streak_last_activity: string | null;
          total_learning_minutes: number;
          /** Kumulierte Lernzeit in Sekunden (Quelle); total_learning_minutes = floor(seconds/60) */
          total_learning_seconds?: number;
          learning_minutes_by_day?: Json | null;
          /** YYYY-MM-DD → Sekunden (Europe/Berlin); bei fehlender Migration Fallback auf learning_minutes_by_day */
          learning_seconds_by_day?: Json | null;
          streak_activity_by_day?: Json | null;
          is_admin: boolean;
          is_paid: boolean;
          created_at: string;
          // 042_phase1_funnel_review
          application_status?: "pending" | "approved" | "rejected" | null;
          last_login_at?: string | null;
          unsubscribed_at?: string | null;
          // 043_phase2_stripe
          stripe_customer_id?: string | null;
          membership_tier?: "free" | "monthly" | "lifetime" | "ht_1on1";
          access_until?: string | null;
          lifetime_purchased_at?: string | null;
          // 044_phase3_churn (Tracking-Timestamps für Churn- und Dunning-Mails)
          churn_email_1_sent_at?: string | null;
          churn_email_2_sent_at?: string | null;
          payment_failed_email_1_sent_at?: string | null;
          payment_failed_email_2_sent_at?: string | null;
          payment_failed_email_3_sent_at?: string | null;
          ht_upsell_email_sent_at?: string | null;
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
          sort_order: number;
          is_sequential_exempt: boolean;
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
          is_locked: boolean;
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
          storage_folder_key: string | null;
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
      discord_connections: {
        Row: {
          id: string;
          user_id: string;
          discord_user_id: string;
          discord_username: string | null;
          discord_access_token: string | null;
          discord_refresh_token: string | null;
          connected_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      trading_journals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      // 042_phase1_funnel_review
      applications: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          name: string | null;
          experience: string;
          biggest_problem: string;
          goal_6_months: string;
          status: "pending" | "approved" | "rejected";
          reviewed_at: string | null;
          reviewed_by: string | null;
          rejection_reason: string | null;
          welcome_sequence_started_at: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      email_sequence_log: {
        Row: {
          id: string;
          user_id: string | null;
          application_id: string | null;
          recipient_email: string;
          sequence: string;
          step: number;
          sent_at: string;
          resend_message_id: string | null;
          opened_at: string | null;
          clicked_at: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      // 043_phase2_stripe
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_customer_id: string;
          stripe_price_id: string;
          status:
            | "active"
            | "trialing"
            | "past_due"
            | "canceled"
            | "incomplete"
            | "incomplete_expired"
            | "unpaid"
            | "paused";
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      payments: {
        Row: {
          id: string;
          user_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_invoice_id: string | null;
          stripe_charge_id: string | null;
          amount_cents: number;
          currency: string;
          status: string;
          failure_reason: string | null;
          attempt_count: number | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      stripe_webhook_events: {
        Row: {
          id: string;
          type: string;
          payload: Json;
          processed_at: string | null;
          error: string | null;
          received_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      // 044_phase3_churn
      cancellations: {
        Row: {
          id: string;
          user_id: string | null;
          subscription_id: string | null;
          reason: string | null;
          structured_reason:
            | "too_expensive"
            | "not_enough_value"
            | "tech_issues"
            | "other"
            | null;
          feedback: string | null;
          canceled_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      // 045_phase4_ht
      high_ticket_applications: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          name: string | null;
          whatsapp_number: string | null;
          answers: Json;
          budget_tier: "under_2000" | "over_2000";
          contacted_at: string | null;
          call_scheduled_at: string | null;
          outcome: "closed_won" | "closed_lost" | "no_show" | "pending" | null;
          internal_notes: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      // 046_phase5_audit
      user_audit_log: {
        Row: {
          id: string;
          target_user_id: string | null;
          admin_user_id: string | null;
          action: string;
          field: string | null;
          old_value: string | null;
          new_value: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      trading_journal_trades: {
        Row: {
          id: string;
          journal_id: string;
          user_id: string;
          trade_date: string;
          trade_time: string | null;
          weekday: string | null;
          strategy: string;
          asset: string;
          session: string | null;
          direction: string;
          contracts: number;
          entry_price: number | null;
          sl_ticks: number;
          tp_ticks: number;
          result_ticks: number;
          result_dollar: number;
          rr: string | null;
          order_type: string | null;
          open_position: string | null;
          news_events: Json;
          news_result: string | null;
          news_timing: string | null;
          emotion_before: string | null;
          emotion_after: string | null;
          notes: string | null;
          screenshot_storage_key: string | null;
          scalp_zones: Json;
          scalp_pa: Json;
          ocrr_bias: Json;
          ocrr_conf: Json;
          ocrr_vol: Json;
          naked_zones: Json;
          naked_bonus: Json;
          naked_vp: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
  };
};
