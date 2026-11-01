-- The catalogue, narrowed to Kazakhstan.
--
-- Fifty-two olympiads, one of them Kazakh. For a student in Almaty preparing
-- for the republican rounds, a list led by the Iberoamerican and the Benelux
-- is a list about somebody else: it is not wrong, it is not theirs.
--
-- Nothing is deleted. A flag hides the rest, the same way migration 42 hid the
-- five subjects, and flipping it back restores the catalogue whole.

alter table public.competitions
  add column if not exists active boolean not null default true;

update public.competitions
set active = false
where region is not null and region <> 'Kazakhstan';

-- ------------------------------------------------------- the Kazakh ladder ---
-- The four stages of the republican olympiad, which until now sat in the
-- catalogue as "School round", "Regional round" and so on: generic names from
-- a time when the app did not know which country it was in. They are the same
-- rows renamed, so a student whose target points at one keeps their target.
--
-- Facts here come from the papers themselves (РНПЦ «Дарын» prints the stage
-- and the year in the first three lines of every one) and from daryn.kz.
update public.competitions set
  name = 'Школьный этап республиканской олимпиады',
  level = 'School',
  region = 'Kazakhstan',
  official_url = 'https://daryn.kz/respa/',
  registration_url = null
where slug = 'school-round';

update public.competitions set
  name = 'Районный (городской) этап республиканской олимпиады',
  level = 'Regional',
  region = 'Kazakhstan',
  official_url = 'https://daryn.kz/respa/',
  papers_url = 'https://daryn.kz/respa/',
  registration_url = null
where slug = 'city-round';

update public.competitions set
  name = 'Областной этап республиканской олимпиады',
  level = 'Regional',
  region = 'Kazakhstan',
  official_url = 'https://daryn.kz/respa/',
  papers_url = 'https://daryn.kz/respa/',
  registration_url = null
where slug = 'regional-round';

update public.competitions set
  name = 'Республиканский (заключительный) этап олимпиады',
  level = 'National',
  region = 'Kazakhstan',
  official_url = 'https://daryn.kz/respa/',
  papers_url = 'https://daryn.kz/respa/',
  registration_url = null
where slug = 'national-round';

update public.competitions set
  name = 'Отбор в сборную Казахстана',
  level = 'National',
  region = 'Kazakhstan',
  official_url = 'https://daryn.kz/',
  registration_url = null
where slug = 'national-team';

-- Already said the same thing as the republican stage, under a second name.
update public.competitions set active = false where slug = 'rok-kz';

-- ------------------------------------------------------------------ IZhO ---
-- The one international olympiad held in Kazakhstan, and the one a student
-- here can reach without leaving the country. Checked against izho.kz on
-- 4 October 2026: the 22nd edition runs 10–14 January 2026 in Almaty at the
-- National School of Physics and Mathematics, in mathematics, physics and
-- computer science, with past papers and solutions published in Kazakh,
-- Russian and English.
--
-- The 22nd edition in 2026 puts the first in 2005.
insert into public.competitions (slug, name, subject_id, level, region, founded, official_url, papers_url)
select v.slug, v.name, s.id, 'International', 'Kazakhstan', 2005, 'https://izho.kz/', 'https://izho.kz/contest/problems/'
from (values
  ('izho-math', 'Международная Жаутыковская олимпиада (математика)', 'mathematics'),
  ('izho-phys', 'Международная Жаутыковская олимпиада (физика)', 'physics')
) as v(slug, name, subject_slug)
join public.subjects s on s.slug = v.subject_slug
on conflict (slug) do update set
  name = excluded.name, level = excluded.level, region = excluded.region,
  founded = excluded.founded, official_url = excluded.official_url,
  papers_url = excluded.papers_url, active = true;

-- --------------------------------------------------------------- the prose ---
-- What each one is, for the page that opens when a student taps it. Written
-- from the sources above; where a thing was not checked it is not stated.
delete from public.competition_details
where competition_id in (
  select id from public.competitions
  where slug in ('school-round','city-round','regional-round','national-round','national-team','izho-math','izho-phys')
);

insert into public.competition_details (competition_id, locale, summary, format, route, eligibility)
select c.id, v.locale, v.summary, v.format, v.route, v.eligibility
from (values
  ('school-round', 'ru',
   'Первая ступень республиканской олимпиады: её проводит сама школа, и с неё начинается путь любого олимпиадника в Казахстане.',
   'Письменная работа по предмету. Задания готовит школа или район, поэтому формат и сложность заметно разнятся.',
   'Победители идут на районный (городской) этап.',
   'Учащиеся 9–11 классов.'),
  ('school-round', 'en',
   'The first rung of the republican olympiad, run by the school itself. Every olympiad career in Kazakhstan starts here.',
   'A written paper. The questions are set by the school or the district, so format and difficulty vary.',
   'Winners go on to the district round.',
   'Grades 9 to 11.'),
  ('city-round', 'ru',
   'Районный (городской) этап республиканской олимпиады — второй из четырёх.',
   'Письменная работа, задания общие для района.',
   'Прошедшие отбираются на областной этап.',
   'Учащиеся 9–11 классов, прошедшие школьный этап.'),
  ('city-round', 'en',
   'The district round of the republican olympiad, second of four.',
   'A written paper, the same across the district.',
   'Those who qualify go to the oblast round.',
   'Grades 9 to 11 who came through the school round.'),
  ('regional-round', 'ru',
   'Областной этап — третий этап республиканской олимпиады. С него начинаются задания, которые пишет РНПЦ «Дарын», и с него же начинается каталог задач в этом приложении.',
   'Два тура. Первый теоретический: четыре задачи, четыре часа. Второй — экспериментальный, два часа.',
   'Лучшие по области едут на республиканский этап.',
   'Учащиеся 9–11 классов, прошедшие районный этап.'),
  ('regional-round', 'en',
   'The oblast round, third of four. From here the papers are set by the state centre «Daryn» — and from here the problem library in this app begins.',
   'Two rounds. The first is theory: four problems, four hours. The second is experimental, two hours.',
   'The best in each oblast go to the republican round.',
   'Grades 9 to 11 who came through the district round.'),
  ('national-round', 'ru',
   'Заключительный этап республиканской олимпиады. Отсюда собирают кандидатов в сборную страны.',
   'Теоретический тур и экспериментальный, по дням. Задачи и решения «Дарын» публикует после олимпиады.',
   'Призёры попадают в отбор в национальную сборную.',
   'Победители областного этапа, 9–11 классы.'),
  ('national-round', 'en',
   'The final round of the republican olympiad, and where candidates for the national team are picked out.',
   'A theory day and an experimental day. «Daryn» publishes the papers and the marking schemes afterwards.',
   'Medallists enter national team selection.',
   'Winners of the oblast round, grades 9 to 11.'),
  ('national-team', 'ru',
   'Отбор в национальную сборную Казахстана — то, что стоит между республиканским этапом и международной олимпиадой.',
   'Сборы и отборочные туры; состав и формат определяет сборная по предмету.',
   'Отобранные представляют Казахстан на международных олимпиадах.',
   'Призёры республиканского этапа.'),
  ('national-team', 'en',
   'Selection for the Kazakhstan national team: what stands between the republican round and an international olympiad.',
   'Training camps and selection papers; the shape of it is set by each subject''s team.',
   'Those chosen represent Kazakhstan internationally.',
   'Medallists of the republican round.'),
  ('izho-math', 'ru',
   'Международная Жаутыковская олимпиада — крупнейшая международная олимпиада, которая проходит в Казахстане. С 2005 года её принимает РФМШ в Алматы; в 2026 году она прошла в 22-й раз.',
   'Два дня по три задачи. Условия и решения публикуются на казахском, русском и английском.',
   'Командное приглашение от организаторов; школы-участники приезжают командами.',
   'Школьники; состав команды определяет приглашённая школа или страна.'),
  ('izho-math', 'en',
   'The International Zhautykov Olympiad, the largest international olympiad held in Kazakhstan. Hosted since 2005 by the National School of Physics and Mathematics in Almaty; the 2026 edition was the 22nd.',
   'Two days, three problems each. Papers and solutions are published in Kazakh, Russian and English.',
   'By invitation; participating schools come as teams.',
   'School students; the team is chosen by the invited school or country.'),
  ('izho-phys', 'ru',
   'Физическая половина Жаутыковской олимпиады: теоретический день и экспериментальный.',
   'Два дня — теория и эксперимент. Условия и решения публикуются на трёх языках.',
   'Командное приглашение от организаторов.',
   'Школьники; состав команды определяет приглашённая школа или страна.'),
  ('izho-phys', 'en',
   'The physics half of the Zhautykov Olympiad: a theory day and an experimental day.',
   'Two days, theory and experiment. Papers and solutions are published in three languages.',
   'By invitation; participating schools come as teams.',
   'School students; the team is chosen by the invited school or country.')
) as v(slug, locale, summary, format, route, eligibility)
join public.competitions c on c.slug = v.slug;
