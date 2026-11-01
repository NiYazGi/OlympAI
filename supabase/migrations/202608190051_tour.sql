-- When an account finished — or closed — the guided tour of the app.
--
-- On the profile rather than in the browser: a student who signs up on a phone
-- and opens the laptop that evening has already been shown round, and a tour
-- that starts again on every device is one people learn to dismiss unread.
-- Null means never shown; the tour starts by itself only then. It can always
-- be started again by hand.
alter table public.profiles
  add column if not exists tour_completed_at timestamptz;
