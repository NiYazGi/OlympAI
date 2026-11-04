-- Which sitting each archive problem came from, so a whole real paper can be
-- sat on /mock (lib/mock.ts, realPapers).
--
-- The archive's ids already name the sitting: everything before the final
-- number — `gzho-2010-7-3` is problem 3 of the 2010 GZhO, grade 7, and
-- `phys-national-2016-9-t1-2` problem 2 of the first theory round of the 2016
-- national physics olympiad, grade 9. A column says it as a field rather than
-- leaving every reader to parse a name.
update public.tasks
set paper = regexp_replace(id, '-[0-9]+$', '')
where paper is null
  and class_id is null
  and id ~ '-[0-9]+$';
