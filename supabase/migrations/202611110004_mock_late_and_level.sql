-- A paper handed in after its clock ran out is kept and graded, as practice,
-- but it is not a timed result: it changes neither the paper's level nor the
-- profile. And a paper only sets the profile level when it was sat in the
-- profile's own subject.
alter table public.mock_tests add column if not exists submitted_late boolean not null default false;
alter table public.mock_tests add column if not exists level_applied boolean not null default false;

-- Papers submitted before this change set the profile level whenever they
-- carried one; mark them so their result page says so.
update public.mock_tests set level_applied = true
 where submitted_at is not null and level is not null and preparation_key is null;
