/**
 * Application types.
 *
 * Re-exports database types and adds app-specific type extensions.
 * Use these types throughout the application for consistency.
 */

// Re-export all database types as the source of truth
export type {
  Database,
  Json,
  Tables,
  InsertTables,
  UpdateTables,
  Story,
  StoryNode,
  StoryChoice,
  StoryReaction,
  UserProfile,
  UserQuest,
  UserStreak,
  UserProgress,
  UserFollow,
  UserBookmark,
  StoryWithCreator,
  StoryChoiceWithNode,
  QuestWithMeta,
} from './database.types';

/**
 * Extended Story type with creator info for UI display.
 * Used when fetching stories with their creators joined.
 */
export interface StoryWithCreatorInfo {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  age_range: string;
  estimated_duration: number;
  reading_time?: number | null;
  story_context?: string | null;
  likes_count?: number;
  dislikes_count?: number;
  completion_count?: number;
  created_by?: string | null;
  is_public?: boolean;
  is_user_generated?: boolean;
  image_prompt?: string | null;
  generation_status?: string | null;
  generation_progress?: number | null;
  nodes_generated?: number | null;
  total_nodes_planned?: number | null;
  language?: string | null;
  target_audience?: 'children' | 'young_adult' | 'adult';
  creator?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * API response types
 */
export interface GeneratedStoryContent {
  content: string;
  isEnding: boolean;
  endingType: string | null;
  choices?: Array<{
    text: string;
    hint: string | null;
  }>;
}

/**
 * Story generation status
 */
export interface StoryGenerationStatus {
  status: string;
  progress: number;
  nodesGenerated: number;
  totalNodesPlanned: number;
}
