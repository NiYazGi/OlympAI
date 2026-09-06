-- Keep already-seeded development records neutral: these are original practice prompts,
-- not tasks sourced from named competitions.
update public.tasks
set source = 'Development practice'
where source in ('IPhO-style practice', 'IMO-style practice');
