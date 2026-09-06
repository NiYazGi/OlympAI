alter table public.profiles
  add column if not exists target_competition_type text,
  add column if not exists training_intensity text;
