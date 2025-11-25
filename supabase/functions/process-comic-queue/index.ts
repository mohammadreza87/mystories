/**
 * Process Comic Queue Edge Function
 *
 * Background generation for adult comic book stories.
 * Generates pending chapters using the story bible for consistency.
 * Prioritizes based on choice popularity and generation priority.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  handleCors,
  success,
  errors,
  createServiceClient,
} from '../_shared/index.ts';

interface StoryBible {
  id: string;
  story_id: string;
  characters: any[];
  setting: any;
  art_style: any;
  narrative: any;
  style_prompt_prefix: string;
  character_prompt_map: Record<string, string>;
}

interface PendingNode {
  id: string;
  story_id: string;
  node_key: string;
  context_chain: any[];
  parent_choice_id: string | null;
}

interface ChapterGenerationResult {
  title: string;
  content: string;
  panelDescription: string;
  chapterSummary: string;
  charactersPresent: string[];
  isEnding: boolean;
  endingType?: string;
  choices: {
    text: string;
    consequenceHint: string;
    emotionalWeight: string;
    generationPriority: number;
  }[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      return errors.internal('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { storyId, maxNodes } = await req.json();

    if (!storyId) {
      return errors.badRequest('Story ID is required');
    }

    const nodesToProcess = maxNodes || 5;

    // Get story and bible
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('*, story_bibles(*)')
      .eq('id', storyId)
      .single();

    if (storyError || !story) {
      return errors.notFound('Story');
    }

    const bible = story.story_bibles;
    if (!bible) {
      return errors.badRequest('Story does not have a bible. Cannot generate chapters.');
    }

    // Get pending nodes ordered by priority
    const { data: pendingNodes, error: nodesError } = await supabase
      .from('story_nodes')
      .select(`
        id,
        story_id,
        node_key,
        context_chain,
        parent_choice_id,
        story_choices!parent_choice_id (
          choice_text,
          generation_priority
        )
      `)
      .eq('story_id', storyId)
      .eq('generation_status', 'pending')
      .order('order_index')
      .limit(nodesToProcess);

    if (nodesError) {
      console.error('Error fetching pending nodes:', nodesError);
      return errors.internal('Failed to fetch pending nodes');
    }

    if (!pendingNodes || pendingNodes.length === 0) {
      // No pending nodes - update story status
      await supabase
        .from('stories')
        .update({
          generation_status: 'fully_generated',
          generation_progress: 100,
        })
        .eq('id', storyId);

      return success({
        message: 'All chapters generated',
        generated: 0
      });
    }

    // Sort by generation priority
    const sortedNodes = pendingNodes.sort((a, b) => {
      const priorityA = (a.story_choices as any)?.generation_priority || 3;
      const priorityB = (b.story_choices as any)?.generation_priority || 3;
      return priorityA - priorityB;
    });

    let generatedCount = 0;
    const results: { nodeId: string; success: boolean; error?: string }[] = [];

    // Process each pending node
    for (const node of sortedNodes) {
      try {
        // Mark as generating
        await supabase
          .from('story_nodes')
          .update({ generation_status: 'generating' })
          .eq('id', node.id);

        // Get the choice text if this node came from a choice
        const choiceText = (node.story_choices as any)?.choice_text;

        // Generate chapter
        const chapterResponse = await fetch(
          `${supabaseUrl}/functions/v1/generate-comic-chapter`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              bible: {
                characters: bible.characters,
                setting: bible.setting,
                artStyle: bible.art_style,
                narrative: bible.narrative,
                stylePromptPrefix: bible.style_prompt_prefix,
                characterPromptMap: bible.character_prompt_map,
              },
              contextChain: node.context_chain || [],
              selectedChoice: choiceText,
              isFirstChapter: false,
            }),
          }
        );

        if (!chapterResponse.ok) {
          const errorData = await chapterResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error?.message || 'Failed to generate chapter');
        }

        const chapter: ChapterGenerationResult = await chapterResponse.json();

        // Generate image for the chapter
        let imageUrl: string | null = null;
        try {
          const imageResponse = await fetch(
            `${supabaseUrl}/functions/v1/generate-image`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                prompt: buildImagePrompt(bible, chapter.panelDescription, chapter.charactersPresent),
                styleReference: bible.style_prompt_prefix,
              }),
            }
          );

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            imageUrl = imageData.imageUrl;
          }
        } catch (imgError) {
          console.error('Image generation failed:', imgError);
        }

        // Generate audio narration
        let audioUrl: string | null = null;
        try {
          const voiceSettings = getVoiceSettings(story.comic_style);
          const audioResponse = await fetch(
            `${supabaseUrl}/functions/v1/text-to-speech`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                text: chapter.content,
                voice: voiceSettings.voice,
                speed: voiceSettings.speed,
              }),
            }
          );

          if (audioResponse.ok) {
            const audioData = await audioResponse.json();
            audioUrl = audioData.audio;
          }
        } catch (audioError) {
          console.error('Audio generation failed:', audioError);
        }

        // Update the node with generated content
        await supabase
          .from('story_nodes')
          .update({
            content: chapter.content,
            chapter_summary: chapter.chapterSummary,
            characters_present: chapter.charactersPresent,
            panel_description: chapter.panelDescription,
            is_ending: chapter.isEnding,
            ending_type: chapter.endingType,
            image_url: imageUrl,
            audio_url: audioUrl,
            generation_status: 'ready',
          })
          .eq('id', node.id);

        // Create choice nodes if not an ending
        if (!chapter.isEnding && chapter.choices.length > 0) {
          // Build context for child nodes
          const newContext = [
            ...(node.context_chain || []),
            {
              nodeKey: node.node_key,
              title: chapter.title,
              summary: chapter.chapterSummary,
              charactersPresent: chapter.charactersPresent,
              keyEvents: [],
            },
          ];

          for (let i = 0; i < chapter.choices.length; i++) {
            const choice = chapter.choices[i];

            // Create placeholder node
            const { data: placeholderNode } = await supabase
              .from('story_nodes')
              .insert({
                story_id: storyId,
                node_key: `${node.node_key}_choice_${i}`,
                content: '',
                is_ending: false,
                order_index: (node.context_chain?.length || 0) + 2,
                generation_status: 'pending',
                context_chain: newContext,
              })
              .select()
              .single();

            if (placeholderNode) {
              // Create choice linking nodes
              await supabase
                .from('story_choices')
                .insert({
                  from_node_id: node.id,
                  to_node_id: placeholderNode.id,
                  choice_text: choice.text,
                  consequence_hint: choice.consequenceHint,
                  choice_order: i,
                  generation_priority: choice.generationPriority,
                  emotional_weight: choice.emotionalWeight,
                });
            }
          }
        }

        generatedCount++;
        results.push({ nodeId: node.id, success: true });

        // Update story progress
        const { count: totalNodes } = await supabase
          .from('story_nodes')
          .select('*', { count: 'exact', head: true })
          .eq('story_id', storyId);

        const { count: readyNodes } = await supabase
          .from('story_nodes')
          .select('*', { count: 'exact', head: true })
          .eq('story_id', storyId)
          .eq('generation_status', 'ready');

        const progress = Math.min(
          99,
          Math.floor(((readyNodes || 0) / (totalNodes || 1)) * 100)
        );

        await supabase
          .from('stories')
          .update({
            generation_progress: progress,
            nodes_generated: readyNodes,
            total_nodes_planned: totalNodes,
          })
          .eq('id', storyId);

      } catch (error) {
        console.error(`Error generating node ${node.id}:`, error);

        // Mark as failed
        await supabase
          .from('story_nodes')
          .update({ generation_status: 'failed' })
          .eq('id', node.id);

        results.push({
          nodeId: node.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Check if all nodes are done
    const { count: pendingCount } = await supabase
      .from('story_nodes')
      .select('*', { count: 'exact', head: true })
      .eq('story_id', storyId)
      .eq('generation_status', 'pending');

    if (pendingCount === 0) {
      await supabase
        .from('stories')
        .update({
          generation_status: 'fully_generated',
          generation_progress: 100,
        })
        .eq('id', storyId);
    }

    return success({
      message: `Generated ${generatedCount} chapters`,
      generated: generatedCount,
      results,
      remainingPending: pendingCount,
    });

  } catch (error) {
    console.error('Error processing comic queue:', error);
    return errors.internal(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// Helper: Build image prompt with character consistency
function buildImagePrompt(
  bible: StoryBible,
  panelDescription: string,
  charactersInScene: string[]
): string {
  let prompt = bible.style_prompt_prefix;

  for (const charName of charactersInScene) {
    const charPrompt = bible.character_prompt_map?.[charName];
    if (charPrompt) {
      prompt += ` Character ${charName}: ${charPrompt}.`;
    }
  }

  prompt += ` SCENE: ${panelDescription}`;
  prompt += ` Highly detailed, professional comic book art, cinematic composition, dramatic angles.`;

  if (prompt.length > 3800) {
    prompt = prompt.substring(0, 3800) + '...';
  }

  return prompt;
}

// Helper: Get voice settings based on comic style
function getVoiceSettings(comicStyle: string): { voice: string; speed: number } {
  const settings: Record<string, { voice: string; speed: number }> = {
    noir: { voice: 'onyx', speed: 0.85 },
    manga: { voice: 'nova', speed: 0.95 },
    western: { voice: 'echo', speed: 0.9 },
    cyberpunk: { voice: 'fable', speed: 0.95 },
    horror: { voice: 'onyx', speed: 0.8 },
    fantasy: { voice: 'shimmer', speed: 0.9 },
  };

  return settings[comicStyle] || settings.noir;
}
