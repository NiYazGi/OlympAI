-- Mathematics and physics are the only supported subjects. The previous
-- active flag hid the other subjects from the catalogue, but left their
-- competitions, profile choices and study content accessible elsewhere.

-- Ask affected students to choose again instead of silently assigning them
-- a different subject. Keep their other onboarding answers in the profile.
update public.profiles
   set primary_subject = null, onboarding_completed_at = null
 where primary_subject is not null
   and primary_subject not in ('Mathematics', 'Physics');

-- Clear a deadline only when its subject or competition is being removed.
-- The foreign keys clear the corresponding target ids on deletion below.
update public.profiles
   set target_date = null
 where target_subject_id in (
   select id from public.subjects where slug not in ('mathematics', 'physics')
 ) or target_competition_id in (
   select c.id from public.competitions c
   join public.subjects s on s.id = c.subject_id
   where s.slug not in ('mathematics', 'physics')
 );

-- Delete competitions explicitly; their subject FK would otherwise turn
-- them into general competitions. Registrations and details cascade.
delete from public.competitions
 where subject_id in (
   select id from public.subjects where slug not in ('mathematics', 'physics')
 );

-- Tasks restrict deletion of their subject/topic, so remove them first.
-- Their attempts and reports cascade, and chat/task links are set to null.
delete from public.tasks
 where subject_id in (
   select id from public.subjects where slug not in ('mathematics', 'physics')
 ) or topic_id in (
   select t.id from public.topics t
   join public.subjects s on s.id = t.subject_id
   where s.slug not in ('mathematics', 'physics')
 );

-- Topics, lessons, quizzes, cards, resources, progress and mock tests cascade.
-- Classes and conversations keep their members/messages with a null subject.
delete from public.subjects where slug not in ('mathematics', 'physics');

alter table public.subjects
  add constraint subjects_supported_slug check (slug in ('mathematics', 'physics'));
alter table public.profiles
  add constraint profiles_supported_primary_subject
  check (primary_subject is null or primary_subject in ('Mathematics', 'Physics'));
