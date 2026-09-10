-- A figure on a lesson block, stored as parameters rather than as a drawing.
--
-- The alternative was asking a model for a picture when the page opens: a call
-- per view for ever, a slightly different drawing each time, and no moment at
-- which a human could notice that the axis is labelled wrongly. Here the model
-- is used once, at authoring time, to produce the dozen numbers below; the
-- drawing is done by fixed components, so serving a lesson costs nothing and a
-- figure can be reviewed the way a sentence can.
--
-- It is also why this is jsonb of parameters and not a column of SVG. Markup
-- from the database would have to be sanitised on every render, and a licence
-- trigger cannot tell you whether a path element contains a script. A spec that
-- only ever reaches a renderer as typed values has nowhere to put one.
--
-- The kinds are deliberately few. Adding a shape is a code change, reviewed
-- like any other; loosening this into "any SVG" is not.
alter table public.lesson_blocks
  add column if not exists visual_kind text
    check (visual_kind is null or visual_kind in ('plot', 'forces', 'matrix')),
  add column if not exists visual jsonb;

-- Both or neither. A kind with no parameters draws nothing, and parameters
-- with no kind are unreachable.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lesson_blocks_visual_paired') then
    alter table public.lesson_blocks
      add constraint lesson_blocks_visual_paired
      check ((visual_kind is null) = (visual is null));
  end if;
end
$$;
