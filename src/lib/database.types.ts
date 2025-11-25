/**
 * Database types for Supabase.
 *
 * These types match the database schema defined in migrations.
 * Run `npx supabase gen types typescript` to regenerate from live schema.
 */

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
      stories: {
        Row: {
          id: string;
          title: string;
          description: string;
          cover_image_url: string | null;
          age_range: string;
          estimated_duration: number;
          reading_time: number | null;
          story_context: string | null;
          image_prompt: string | null;
          likes_count: number;
          dislikes_count: number;
          completion_count: number;
          created_by: string | null;
          is_public: boolean;
          is_user_generated: boolean;
          generation_status: string | null;
          generation_progress: number | null;
          nodes_generated: number | null;
          total_nodes_planned: number | null;
          language: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          cover_image_url?: string | null;
          age_range?: string;
          estimated_duration?: number;
          reading_time?: number | null;
          story_context?: string | null;
          image_prompt?: string | null;
          likes_count?: number;
          dislikes_count?: number;
          completion_count?: number;
          created_by?: string | null;
          is_public?: boolean;
          is_user_generated?: boolean;
          generation_status?: string | null;
          generation_progress?: number | null;
          nodes_generated?: number | null;
          total_nodes_planned?: number | null;
          language?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stories']['Insert']>;
      };
      story_nodes: {
        Row: {
          id: string;
          story_id: string;
          node_key: string;
          content: string;
          is_ending: boolean;
          ending_type: string | null;
          order_index: number;
          sequence_order: number | null;
          parent_choice_id: string | null;
          image_url: string | null;
          image_prompt: string | null;
          audio_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          node_key: string;
          content: string;
          is_ending?: boolean;
          ending_type?: string | null;
          order_index?: number;
          sequence_order?: number | null;
          parent_choice_id?: string | null;
          image_url?: string | null;
          image_prompt?: string | null;
          audio_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['story_nodes']['Insert']>;
      };
      story_choices: {
        Row: {
          id: string;
          from_node_id: string;
          to_node_id: string;
          choice_text: string;
          consequence_hint: string | null;
          choice_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_node_id: string;
          to_node_id: string;
          choice_text: string;
          consequence_hint?: string | null;
          choice_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['story_choices']['Insert']>;
      };
      story_reactions: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          reaction_type: 'like' | 'dislike';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          story_id: string;
          reaction_type: 'like' | 'dislike';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['story_reactions']['Insert']>;
      };
      user_story_progress: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          current_node_id: string | null;
          path_taken: Json;
          completed: boolean;
          started_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          story_id: string;
          current_node_id?: string | null;
          path_taken?: Json;
          completed?: boolean;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_story_progress']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          is_profile_public: boolean;
          subscription_tier: 'free' | 'pro';
          subscription_status: string;
          subscription_period_end: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          is_grandfathered: boolean;
          stories_generated_today: number;
          last_generation_date: string | null;
          total_stories_generated: number;
          total_points: number;
          reading_points: number;
          creating_points: number;
          points: number;
          last_login_at: string | null;
          last_active_at: string | null;
          followers_count: number;
          following_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          is_profile_public?: boolean;
          subscription_tier?: 'free' | 'pro';
          subscription_status?: string;
          subscription_period_end?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          is_grandfathered?: boolean;
          stories_generated_today?: number;
          last_generation_date?: string | null;
          total_stories_generated?: number;
          total_points?: number;
          reading_points?: number;
          creating_points?: number;
          points?: number;
          last_login_at?: string | null;
          last_active_at?: string | null;
          followers_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      user_quests: {
        Row: {
          id: string;
          user_id: string;
          task: string;
          quest_type: 'daily' | 'weekly';
          period_start: string;
          period_end: string;
          progress: number;
          target: number;
          status: 'pending' | 'completed';
          reward_points: number;
          rewarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task: string;
          quest_type: 'daily' | 'weekly';
          period_start: string;
          period_end: string;
          progress?: number;
          target?: number;
          status?: 'pending' | 'completed';
          reward_points?: number;
          rewarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_quests']['Insert']>;
      };
      user_streaks: {
        Row: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_action_date: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_action_date?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_streaks']['Insert']>;
      };
      user_follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_follows']['Insert']>;
      };
      stripe_customers: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_id: string;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stripe_customers']['Insert']>;
      };
      stripe_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string;
          status: string;
          price_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id: string;
          status: string;
          price_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['stripe_subscriptions']['Insert']>;
      };
      generation_queue: {
        Row: {
          id: string;
          story_id: string;
          user_id: string;
          status: string;
          priority: number;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          user_id: string;
          status?: string;
          priority?: number;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['generation_queue']['Insert']>;
      };
      user_bookmarks: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          story_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_bookmarks']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_points: {
        Args: { p_user_id: string; p_amount: number };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience type aliases
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Commonly used types
export type Story = Tables<'stories'>;
export type StoryNode = Tables<'story_nodes'>;
export type StoryChoice = Tables<'story_choices'>;
export type StoryReaction = Tables<'story_reactions'>;
export type UserProfile = Tables<'profiles'>;
export type UserQuest = Tables<'user_quests'>;
export type UserStreak = Tables<'user_streaks'>;
export type UserProgress = Tables<'user_story_progress'>;
export type UserFollow = Tables<'user_follows'>;
export type UserBookmark = Tables<'user_bookmarks'>;

// Extended types with relations
export interface StoryWithCreator extends Story {
  creator?: Pick<UserProfile, 'display_name' | 'avatar_url'> | null;
}

export interface StoryChoiceWithNode extends StoryChoice {
  to_node: StoryNode;
}

export interface QuestWithMeta extends UserQuest {
  title: string;
  description: string;
}
