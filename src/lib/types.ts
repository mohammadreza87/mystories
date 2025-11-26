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
          story_context: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stories']['Row'], 'id' | 'created_at'>;
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
          image_url: string | null;
          image_prompt: string | null;
          audio_url: string | null;
          parent_choice_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['story_nodes']['Row'], 'id' | 'created_at'>;
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
        Insert: Omit<Database['public']['Tables']['story_choices']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['story_choices']['Insert']>;
      };
      user_story_progress: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          current_node_id: string | null;
          path_taken: string[];
          completed: boolean;
          started_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_story_progress']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_story_progress']['Insert']>;
      };
    };
  };
}

export interface StoryNode {
  id: string;
  story_id: string;
  node_key: string;
  content: string;
  is_ending: boolean;
  ending_type: string | null;
  order_index: number;
  image_url?: string | null;
  image_prompt?: string | null;
  audio_url?: string | null;
  video_url?: string | null;
  video_status?: string | null;
  video_error?: string | null;
  video_generation_id?: string | null;
}

export interface StoryChoice {
  id: string;
  from_node_id: string;
  to_node_id: string;
  choice_text: string;
  consequence_hint: string | null;
  choice_order: number;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  age_range: string;
  estimated_duration: number;
  reading_time?: number; // New field: estimated reading time in minutes
  story_context?: string | null;
  likes_count?: number;
  dislikes_count?: number;
  completion_count?: number;
  created_by?: string | null;
  is_public?: boolean;
  is_user_generated?: boolean;
  image_prompt?: string | null;
  generation_status?: string;
  generation_progress?: number;
  nodes_generated?: number;
  total_nodes_planned?: number;
  language?: string | null;
  target_audience?: 'children' | 'young_adult' | 'adult';
  art_style?: 'cartoon' | 'comic' | 'realistic';
  creator?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface StoryReaction {
  id: string;
  user_id: string;
  story_id: string;
  reaction_type: 'like' | 'dislike';
  created_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  username?: string;
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
  created_at: string;
  updated_at: string;
}
