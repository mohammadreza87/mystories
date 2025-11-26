-- Add video fields to story_nodes so we can persist generated video URLs and status,
-- preventing repeated Leonardo calls and credit drain.
alter table public.story_nodes
  add column if not exists video_url text,
  add column if not exists video_status text,
  add column if not exists video_error text,
  add column if not exists video_generation_id text;

comment on column public.story_nodes.video_url is 'Stored video URL for this node (Max plan)';
comment on column public.story_nodes.video_status is 'Video generation status: pending|complete|failed';
comment on column public.story_nodes.video_error is 'Last video generation error message';
comment on column public.story_nodes.video_generation_id is 'Leonardo generation id for audit/debug';
