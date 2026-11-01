-- The age rule, in both languages.
--
-- It went into competitions.age_rule in the migration before this one, which
-- was a mistake: "under 20 on the day of the second paper" is a sentence, not
-- a figure, and a sentence belongs with the other sentences where it can be
-- translated. This moves it into competition_details and drops the column, so
-- there is one place a write-up lives rather than two.
--
-- The English text is carried across from the column rather than retyped, so
-- nothing can drift in the move.

alter table public.competition_details add column if not exists eligibility text;

update public.competition_details d
set eligibility = c.age_rule
from public.competitions c
where c.id = d.competition_id and d.locale = 'en' and c.age_rule is not null;

update public.competition_details d
set eligibility = v.eligibility
from (values
  ('aime', 'По проходному баллу AMC 10 или AMC 12'),
  ('amc', 'AMC 10 — до 10 класса включительно, AMC 12 — до 12 класса'),
  ('apho', 'Школьники, возрастные правила IPhO'),
  ('apio', 'Школьники стран-участниц'),
  ('apmo', 'Школьники, моложе 20 лет'),
  ('bbo', 'Ученики двух последних классов школы Великобритании'),
  ('bmo', 'Школьники стран-участниц'),
  ('bmo-uk', 'По баллу Senior Mathematical Challenge или по прямой заявке'),
  ('boi', 'Школьники балканских стран'),
  ('bpho', 'Школьники Великобритании'),
  ('ceoi', 'Школьники стран-участниц'),
  ('cono-sur', 'Моложе 16 лет'),
  ('egmo', 'Девушки школьного возраста, верхняя граница та же, что у IMO'),
  ('egoi', 'Девушки школьного возраста'),
  ('eupho', 'Школьники, возрастные правила IPhO'),
  ('euso', 'Моложе 17 лет на 31 декабря предыдущего года'),
  ('ibero-math', 'Моложе 18 лет, из страны Ибероамерики'),
  ('ibo', 'Школьники, ещё не начавшие учёбу в вузе'),
  ('icpc', 'Студенты вузов, с ограничением по числу лет обучения'),
  ('ieo', 'Школьники, обычно от 14 до 19 лет'),
  ('igeo', 'От 16 до 19 лет на 30 июня года проведения'),
  ('ijso', 'Моложе 16 лет на 31 декабря предыдущего года'),
  ('imc', 'Студенты первых четырёх курсов'),
  ('imo', 'Моложе 20 лет на день второго тура и не зачислен в вуз'),
  ('ioaa', 'Школьники, моложе 20 лет'),
  ('ioi', 'Школьники, моложе 20 лет'),
  ('iol', 'Школьники'),
  ('ipho', 'Школьники, моложе 20 лет'),
  ('iypt', 'Школьники, командами по пять человек'),
  ('jbmo', 'Моложе 15,5 лет на момент проведения'),
  ('naclo', 'Школьники, предварительная подготовка по лингвистике не нужна'),
  ('nbpho', 'Школьники стран-участниц'),
  ('nec', 'Школьники США, в двух дивизионах'),
  ('nordic-mo', 'Школьники пяти стран Северной Европы'),
  ('ozclo', 'Школьники, командами'),
  ('pamo', 'Школьники стран-участниц'),
  ('plo', 'Школьники'),
  ('putnam', 'Студенты, ещё не получившие диплом'),
  ('rmm', 'Приглашённые сборные, возрастные правила IMO'),
  ('rok-kz', 'Школьники Казахстана, по возрастным параллелям'),
  ('tot', 'Две возрастные группы — старшая и младшая'),
  ('uklo', 'Школьники, несколько уровней по возрасту'),
  ('usabo', 'Школьники США'),
  ('usaco', 'Открыт для всех; на сборы проходят только школьники США'),
  ('usamo', 'По суммарному индексу AMC и AIME'),
  ('usapho', 'Школьники США'),
  ('vsosh', 'Школьники России, по возрастным параллелям')
) as v(slug, eligibility)
join public.competitions c on c.slug = v.slug
where d.competition_id = c.id and d.locale = 'ru';

alter table public.competitions drop column if exists age_rule;
