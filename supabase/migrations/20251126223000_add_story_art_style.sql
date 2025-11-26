-- Add art_style to stories for consistent image generation
alter table public.stories
  add column if not exists art_style text default 'comic' check (art_style in ('cartoon','comic','realistic'));

comment on column public.stories.art_style is 'Selected visual art style for all generated images';
