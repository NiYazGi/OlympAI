-- save_class_plan, with its first parameter renamed.
--
-- Migration 48 called it `target`, which is also a column of class_tracks, and
-- inside the function Postgres cannot tell the two apart: the first save failed
-- with 'column reference "target" is ambiguous'. A parameter's name cannot be
-- changed in place, so the function is dropped and made again; nothing calls it
-- yet but the app, which is changed with this migration.

drop function if exists public.save_class_plan(uuid, jsonb, jsonb);

create function public.save_class_plan(plan_class uuid, sections jsonb, chosen jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.owns_class(plan_class) then
    raise exception 'not your class' using errcode = '42501';
  end if;

  delete from public.class_track_tasks where class_id = plan_class;
  delete from public.class_tracks where class_id = plan_class;

  insert into public.class_tracks (class_id, topic_id, position, target, skipped, due_date, note)
  select plan_class, s.topic_id, s.position, s.target, coalesce(s.skipped, false), s.due_date, s.note
  from jsonb_to_recordset(coalesce(sections, '[]'::jsonb))
    as s(topic_id uuid, position smallint, target smallint, skipped boolean, due_date date, note text);

  insert into public.class_track_tasks (class_id, topic_id, task_id, position)
  select plan_class, c.topic_id, c.task_id, c.position
  from jsonb_to_recordset(coalesce(chosen, '[]'::jsonb))
    as c(topic_id uuid, task_id text, position smallint);
end;
$$;

revoke all on function public.save_class_plan(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_class_plan(uuid, jsonb, jsonb) to authenticated;
