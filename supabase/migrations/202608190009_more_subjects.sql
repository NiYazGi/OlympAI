-- Four more subjects.
--
-- Each ships with topics and worked tasks. A subject with no content is a dead
-- end: it would appear in onboarding and in the filters, and then hand the
-- student an empty catalogue.

insert into public.subjects (name, slug) values
  ('Geography', 'geography'),
  ('Biology', 'biology'),
  ('Economics', 'economics'),
  ('Linguistics', 'linguistics')
on conflict (slug) do nothing;

insert into public.topics (subject_id, name, slug)
select s.id, v.name, v.slug
from (values
  ('geography',   'Physical Geography',    'physical-geography'),
  ('geography',   'Climatology',           'climatology'),
  ('geography',   'Human Geography',       'human-geography'),
  ('biology',     'Genetics',              'genetics'),
  ('biology',     'Ecology',               'ecology'),
  ('biology',     'Cell Biology',          'cell-biology'),
  ('economics',   'Microeconomics',        'microeconomics'),
  ('economics',   'Macroeconomics',        'macroeconomics'),
  ('economics',   'Game Theory',           'game-theory'),
  ('linguistics', 'Morphology',            'morphology'),
  ('linguistics', 'Phonology',             'phonology'),
  ('linguistics', 'Historical Linguistics','historical-linguistics')
) as v(subject_slug, name, slug)
join public.subjects s on s.slug = v.subject_slug
on conflict (subject_id, slug) do nothing;

insert into public.tasks (
  id, subject_id, topic_id, title, problem, difficulty,
  official_solution, hints, source, estimated_minutes, given, find_prompt
)
select
  v.id, s.id, t.id, v.title, v.problem, v.difficulty,
  v.official_solution, v.hints, 'Development practice', v.minutes, v.given, v.find_prompt
from (values
  (
    'gnomon-latitude', 'geography', 'physical-geography',
    'Latitude from a shadow',
    'A vertical pole is set up on level ground. At local solar noon on the March equinox the pole casts a shadow pointing due north. The pole stands 2.00 m tall and the shadow measures 1.50 m.',
    3,
    'tan(z) = 1.50 / 2.00 = 0.75, so the zenith angle z = 36.87 degrees. On an equinox the solar declination is 0, therefore latitude = z = 36.87 degrees. The shadow points north, so the Sun is to the south at noon and the site lies in the southern hemisphere: 36.9 degrees S.',
    array[
      'At local solar noon the Sun is at its highest, so the shadow is at its shortest.',
      'The pole, its shadow and the ray form a right triangle: the zenith angle satisfies tan(z) = shadow / height.',
      'What is the solar declination on an equinox?',
      'The direction the shadow points tells you which side of the equator you are on.'
    ],
    18,
    array['Pole height 2.00 m, vertical', 'Shadow length 1.50 m at local solar noon', 'Date: March equinox', 'Shadow points due north'],
    'The latitude of the site, and the hemisphere, with justification for both.'
  ),
  (
    'river-regime', 'geography', 'climatology',
    'Reading a river regime',
    'A river in a mountainous catchment shows its lowest discharge in February, a sharp maximum in May, a secondary rise through July and August, and a steady decline from September. Mean catchment altitude is about 2800 m; the lower valley receives most of its rainfall in autumn.',
    3,
    'February minimum: precipitation is locked up as snow and ice, and evaporation and runoff are both low. May maximum: seasonal snowmelt across the catchment. July-August secondary rise: glacial melt, which peaks later than snowmelt because ice melts only once the seasonal snow cover has gone and air temperatures are highest. September decline: melt ceases; autumn rain in the lower valley is too small a share of the catchment to reverse it. The regime is therefore nival-glacial.',
    array[
      'Ask what form precipitation takes at 2800 m in February.',
      'Two separate melt sources operate on different schedules — name them.',
      'Why would ice melt peak later in the year than snowmelt?',
      'Weigh the autumn rainfall against the area it falls on before letting it into your answer.'
    ],
    20,
    array['Discharge minimum in February', 'Sharp maximum in May', 'Secondary rise in July-August', 'Mean catchment altitude ~2800 m', 'Autumn rainfall maximum in the lower valley'],
    'The feeding source behind each feature of the regime, and the name of the regime type.'
  ),
  (
    'dihybrid-linkage', 'biology', 'genetics',
    'Independent assortment or linkage?',
    'Two heterozygous plants are crossed: AaBb x AaBb. Among 244 offspring the four phenotype classes are observed in the counts 152 : 39 : 41 : 12, in the order A_B_ : A_bb : aaB_ : aabb.',
    2,
    'Independent assortment predicts 9:3:3:1, i.e. 137.25 : 45.75 : 45.75 : 15.25. Chi-square = (14.75^2/137.25) + (6.75^2/45.75) + (4.75^2/45.75) + (3.25^2/15.25) = 1.585 + 0.996 + 0.493 + 0.693 = 3.77 with 3 degrees of freedom. The critical value at p = 0.05 is 7.81, so the deviation is not significant and independent assortment is not rejected.',
    array[
      'Write down the ratio independent assortment predicts, then convert it to expected counts out of 244.',
      'Compare observed with expected using a chi-square statistic.',
      'How many degrees of freedom does a four-class test have?',
      'Compare your statistic against the critical value before drawing any conclusion.'
    ],
    20,
    array['Cross: AaBb x AaBb', 'Total offspring: 244', 'Observed A_B_ : A_bb : aaB_ : aabb = 152 : 39 : 41 : 12', 'Chi-square critical value at p = 0.05, 3 d.f., is 7.81'],
    'Whether the data are consistent with independent assortment, with the statistical test written out.'
  ),
  (
    'logistic-growth-peak', 'biology', 'ecology',
    'Fastest growth in a logistic population',
    'A population grows according to the logistic model dN/dt = r*N*(1 - N/K), with intrinsic rate r = 0.40 per year and carrying capacity K = 5000 individuals.',
    3,
    'dN/dt = rN - rN^2/K is a downward parabola in N; its derivative r - 2rN/K vanishes at N = K/2 = 2500. The maximum absolute growth rate is r*K/4 = 0.40 * 5000 / 4 = 500 individuals per year. Per-capita growth, by contrast, is largest as N approaches 0 and falls linearly to zero at K.',
    array[
      'Treat dN/dt as a function of N and ask where that function peaks.',
      'The expression is quadratic in N — differentiate it with respect to N.',
      'Substitute the N you found back to get the rate itself.',
      'Keep absolute growth and per-capita growth apart: they peak at different population sizes.'
    ],
    15,
    array['dN/dt = r*N*(1 - N/K)', 'r = 0.40 per year', 'K = 5000 individuals'],
    'The population size at which absolute growth is fastest, that maximum rate, and where per-capita growth is instead greatest.'
  ),
  (
    'monopoly-deadweight', 'economics', 'microeconomics',
    'The cost of a monopoly',
    'A single firm faces the market demand curve P = 100 - 2Q and produces at a constant marginal cost of 20 per unit. There are no fixed costs.',
    3,
    'Total revenue = (100 - 2Q)Q, so MR = 100 - 4Q. Setting MR = MC: 100 - 4Q = 20, giving Q = 20 and P = 60. Under perfect competition P = MC = 20, giving Q = 40. The deadweight loss is the triangle between demand and marginal cost over the forgone output: 0.5 * (40 - 20) * (60 - 20) = 400.',
    array[
      'Marginal revenue is not the demand curve — derive it from total revenue.',
      'For a linear demand curve, MR has the same intercept and twice the slope.',
      'A competitive market would price at marginal cost; find the quantity that implies.',
      'The loss is the triangle between the two curves over the output that never gets produced.'
    ],
    22,
    array['Demand: P = 100 - 2Q', 'Marginal cost: MC = 20, constant', 'No fixed costs', 'Single seller'],
    'The monopoly price and quantity, the competitive quantity, and the deadweight loss.'
  ),
  (
    'repeated-cooperation', 'economics', 'game-theory',
    'When does cooperation survive?',
    'Two firms play the following stage game infinitely often. If both cooperate each earns 3. If both defect each earns 1. If one defects while the other cooperates, the defector earns 5 and the cooperator earns 0. Future payoffs are discounted by a factor d in (0, 1). Both players use a grim-trigger strategy: cooperate until someone defects, then defect for ever.',
    4,
    'Cooperating for ever yields 3/(1 - d). Defecting once yields 5 now and 1 for ever after: 5 + d/(1 - d). Cooperation is sustainable when 3/(1 - d) >= 5 + d/(1 - d), i.e. 3 >= 5(1 - d) + d, i.e. 3 >= 5 - 4d, giving d >= 1/2. So patience of at least one half sustains cooperation under grim trigger.',
    array[
      'Write the total discounted payoff of cooperating for ever as a geometric series.',
      'Now write the payoff of deviating once, given the punishment that follows.',
      'Cooperation holds when the first is at least as large as the second.',
      'Multiply through by (1 - d) and solve the linear inequality in d.'
    ],
    28,
    array['Both cooperate: 3 each', 'Both defect: 1 each', 'Unilateral defection: 5 to the defector, 0 to the other', 'Discount factor d in (0, 1)', 'Grim-trigger punishment'],
    'The range of discount factors for which cooperation is sustainable, derived in full.'
  ),
  (
    'agglutinative-order', 'linguistics', 'morphology',
    'Order of the suffixes',
    'Below are forms from a language with no vowel harmony, given with their translations. tan = star. tanir = stars. tanum = my star. tanirum = my stars. tanumka = to my star. mek = road. mekun = your road.',
    3,
    'Suffixes: plural -ir, first person singular possessive -um, second person singular possessive -un, dative -ka. Their order is ROOT - PLURAL - POSSESSIVE - CASE, as tanirum and tanumka jointly show. Therefore "my roads" = mekirum, and "to your roads" = mekirunka.',
    array[
      'Line up the pairs that differ by exactly one element and label what that element means.',
      'tanir versus tanirum tells you where the plural sits relative to the possessive.',
      'tanumka tells you where case sits relative to the possessive.',
      'Now build the two new forms slot by slot, in the order you established.'
    ],
    25,
    array['tan = star; tanir = stars; tanum = my star; tanirum = my stars; tanumka = to my star', 'mek = road; mekun = your road', 'The language has no vowel harmony'],
    'The meaning of each suffix, the order they appear in, and the forms for "my roads" and "to your roads".'
  ),
  (
    'sound-correspondences', 'linguistics', 'historical-linguistics',
    'Reconstructing a sound change',
    'Three related languages A, B and C show the following cognate sets, in the same order in each row: (feth, pet, het) meaning "foot"; (fis, pis, his) meaning "fish"; (thanu, tanu, tanu) meaning "day". Assume every change applies in all positions.',
    4,
    'Language B is the most conservative. Proto-forms: *pet, *pis, *tanu. Changes: in A, *p > f and *t > th; in C, *p > h while *t is unchanged. Predicting for B "pot": A gives "foth" if a final *t is present, otherwise "fo-" plus the reflex of whatever follows; for the given shape "pot" the A form is "foth" and the C form is "hot".',
    array[
      'Compare the three columns sound by sound and note which language keeps the widest range of distinctions.',
      'Which language never innovates? That one is closest to the proto-language.',
      'State each change as "X becomes Y in language Z", not as a list of words.',
      'Apply your rules mechanically to the new form and do not let the meaning influence you.'
    ],
    30,
    array['A: feth, fis, thanu', 'B: pet, pis, tanu', 'C: het, his, tanu', 'Glosses: foot, fish, day', 'Every change applies in all positions'],
    'The proto-forms, the sound changes in each language, and the A and C reflexes of a hypothetical B form "pot".'
  )
) as v(id, subject_slug, topic_slug, title, problem, difficulty, official_solution, hints, minutes, given, find_prompt)
join public.subjects s on s.slug = v.subject_slug
join public.topics t on t.subject_id = s.id and t.slug = v.topic_slug
on conflict (id) do update set
  title = excluded.title, problem = excluded.problem, difficulty = excluded.difficulty,
  official_solution = excluded.official_solution, hints = excluded.hints,
  estimated_minutes = excluded.estimated_minutes, given = excluded.given,
  find_prompt = excluded.find_prompt;
