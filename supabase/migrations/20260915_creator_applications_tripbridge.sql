alter table public.creator_applications
  add column if not exists residence text,
  add column if not exists visit_period text,
  add column if not exists follower_range text,
  add column if not exists categories text[],
  add column if not exists utm_source text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text;
