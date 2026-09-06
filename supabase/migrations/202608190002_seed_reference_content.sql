-- Reference content uses the same stable task IDs as the frontend catalogue.
-- It is public to authenticated users through the RLS policies in the initial migration.

insert into public.topics (subject_id, name, slug)
select id, 'Mechanics', 'mechanics' from public.subjects where slug = 'physics'
on conflict (subject_id, slug) do nothing;

insert into public.topics (subject_id, name, slug)
select id, 'Electrodynamics', 'electrodynamics' from public.subjects where slug = 'physics'
on conflict (subject_id, slug) do nothing;

insert into public.topics (subject_id, name, slug)
select id, 'Thermodynamics', 'thermodynamics' from public.subjects where slug = 'physics'
on conflict (subject_id, slug) do nothing;

insert into public.topics (subject_id, name, slug)
select id, 'Combinatorics', 'combinatorics' from public.subjects where slug = 'mathematics'
on conflict (subject_id, slug) do nothing;

insert into public.topics (subject_id, name, slug)
select id, 'Algebra', 'algebra' from public.subjects where slug = 'mathematics'
on conflict (subject_id, slug) do nothing;

insert into public.topics (subject_id, name, slug)
select id, 'Number Theory', 'number-theory' from public.subjects where slug = 'mathematics'
on conflict (subject_id, slug) do nothing;

insert into public.tasks (id, subject_id, topic_id, title, problem, difficulty, official_solution, hints, source)
select
  'two-masses-pulley', s.id, t.id, 'Two masses and a pulley',
  'Two masses m1 and m2 (with m1 > m2) are connected by a light, inextensible string over a frictionless pulley. Determine the acceleration and tension.',
  5, '(m1 - m2)g / (m1 + m2)',
  array['Draw a free-body diagram for each mass.', 'Both masses share the same acceleration magnitude.', 'Add the equations to eliminate tension.'],
  'Development practice'
from public.subjects s join public.topics t on t.subject_id = s.id and t.slug = 'mechanics'
where s.slug = 'physics'
on conflict (id) do update set title = excluded.title, problem = excluded.problem, difficulty = excluded.difficulty, official_solution = excluded.official_solution, hints = excluded.hints, source = excluded.source;

insert into public.tasks (id, subject_id, topic_id, title, problem, difficulty, hints, source)
select v.id, s.id, t.id, v.title, v.problem, v.difficulty, v.hints, v.source
from (
  values
    ('charged-ring-field', 'physics', 'electrodynamics', 'Field of a charged ring', 'Find the electric field on the axis of a uniformly charged ring.', 4, array['Use symmetry to eliminate transverse components.', 'Integrate the axial component of each charge element.'], 'Development practice'),
    ('rolling-cylinder', 'physics', 'mechanics', 'Rolling cylinder on an incline', 'Determine the acceleration of a solid cylinder rolling without slipping down an incline.', 3, array['Relate translational and angular acceleration.', 'Include rotational kinetic energy.'], 'National practice'),
    ('ideal-gas-cycle', 'physics', 'thermodynamics', 'Efficiency of a thermodynamic cycle', 'Calculate the efficiency of the ideal-gas cycle shown by its pressure-volume process.', 3, array['Find work from the area under the curve.', 'Separate heat absorbed from heat released.'], 'National practice'),
    ('pendulum-small-osc', 'physics', 'mechanics', 'Coupled pendulum oscillations', 'Analyze the normal modes of two weakly coupled pendulums.', 4, array['Start with the small-angle approximation.', 'Look for in-phase and out-of-phase modes.'], 'Development practice'),
    ('combinatorial-paths', 'mathematics', 'combinatorics', 'Counting lattice paths', 'Count the lattice paths that satisfy the stated boundary conditions.', 4, array['Try a simpler unrestricted path count.', 'Use a reflection argument for the boundary.'], 'Development practice'),
    ('inequality-am-gm', 'mathematics', 'algebra', 'Prove the AM–GM inequality bound', 'Prove the stated inequality and identify equality conditions.', 5, array['Check equality first.', 'Consider a standard AM–GM substitution.'], 'Development practice'),
    ('capacitor-network', 'physics', 'electrodynamics', 'Infinite capacitor network', 'Find the equivalent capacitance of the infinite repeating network.', 5, array['Name the equivalent capacitance C.', 'Remove one repeating unit and write a self-similar equation.'], 'Development practice'),
    ('number-theory-mod', 'mathematics', 'number-theory', 'Modular arithmetic residues', 'Determine the admissible residues for the given modular condition.', 2, array['List residues for a small modulus first.', 'Look for periodicity.'], 'National practice')
) as v(id, subject_slug, topic_slug, title, problem, difficulty, hints, source)
join public.subjects s on s.slug = v.subject_slug
join public.topics t on t.subject_id = s.id and t.slug = v.topic_slug
on conflict (id) do update set title = excluded.title, problem = excluded.problem, difficulty = excluded.difficulty, hints = excluded.hints, source = excluded.source;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_user_progress_updated on public.user_progress;
create trigger on_user_progress_updated
before update on public.user_progress
for each row execute procedure public.set_updated_at();

create or replace function public.record_task_attempt_progress()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  task_subject_id uuid;
  task_topic_id uuid;
begin
  select subject_id, topic_id into task_subject_id, task_topic_id
  from public.tasks
  where id = new.task_id;

  insert into public.user_progress (
    user_id, subject_id, topic_id, solved_count, correct_count, mastery_score
  ) values (
    new.user_id,
    task_subject_id,
    task_topic_id,
    1,
    case when new.is_correct then 1 else 0 end,
    case when new.is_correct then 100 else 0 end
  )
  on conflict (user_id, subject_id, topic_id) do update set
    solved_count = public.user_progress.solved_count + 1,
    correct_count = public.user_progress.correct_count + excluded.correct_count,
    mastery_score = round(
      ((public.user_progress.correct_count + excluded.correct_count)::numeric /
        (public.user_progress.solved_count + 1)::numeric) * 100,
      2
    );
  return new;
end;
$$;

drop trigger if exists on_task_attempt_created on public.task_attempts;
create trigger on_task_attempt_created
after insert on public.task_attempts
for each row execute procedure public.record_task_attempt_progress();
