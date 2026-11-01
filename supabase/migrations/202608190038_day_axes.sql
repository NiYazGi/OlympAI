-- The five axes, restated.
--
-- The first set — sleep, hours, graded work, focus, people — came from one
-- coach's account and measured the day mostly by its inputs. This set measures
-- what the day was actually made of, and splits the one axis that was doing
-- two jobs: "hours" counted reading and solving together, which are different
-- kinds of work and go wrong in different ways. A week of theory with no
-- problems and a week of problems with no theory both scored well and both are
-- failures.
--
--   theory_minutes   reading, lectures, notes
--   solving_minutes  problems attempted, wherever they were attempted
--   mental           how the head was, 1–5, self-rated
--   sleep_hours      unchanged, with lights_out
--   load_minutes     what school and everything else took — scored in reverse
--
-- load_minutes is the one that counts downwards. It replaces "focus", which
-- asked whether the day was split; this asks how much was taken, which is a
-- question with an answer rather than a judgement. An olympiad needs the whole
-- of someone's attention, so the hours that went elsewhere are the measurement.
--
-- The table is empty, so nothing is migrated. If that ever stops being true,
-- this file is the wrong shape and the old columns need reading across first.
alter table public.day_states
  add column if not exists theory_minutes integer not null default 0
    check (theory_minutes >= 0 and theory_minutes <= 1080),
  add column if not exists solving_minutes integer not null default 0
    check (solving_minutes >= 0 and solving_minutes <= 1080),
  -- 0 means "not answered", which is different from 1, "bad". A day nobody
  -- reported is not a day that went badly.
  add column if not exists mental smallint not null default 0
    check (mental >= 0 and mental <= 5),
  add column if not exists load_minutes integer not null default 0
    check (load_minutes >= 0 and load_minutes <= 1080);

alter table public.day_states
  drop column if exists study_minutes,
  drop column if exists sole_focus,
  drop column if exists with_people;
