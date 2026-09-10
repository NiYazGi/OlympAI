-- Notes, quizzes and cards for the three geography topics.
--
-- Physical geography teaches the long profile and channel processes rather than
-- reading a hydrograph, and climatology teaches the circulation rather than the
-- solar-angle calculation: 'river-regime' and 'gnomon-latitude' are both graded
-- problems.

-- =================================================== physical geography =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'physical-geography-rivers', t.id,
  $t$How a river shapes its valley$t$,
  $t$One quantity — velocity — decides whether a river picks material up, carries it or drops it. Almost every landform in a valley follows from where that balance tips.$t$,
  13, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'geography' and t.slug = 'physical-geography'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('physical-geography-rivers', 'concept', $h$Erode, transport, deposit$h$,
 $b$A river does three things with material, and which one depends on how fast it is flowing.

Fast water lifts particles and carries them. As it slows, it can no longer hold the largest, and those drop first; slower still and the finer material settles too. Speed up again and it picks them back up.

So a single river erodes in one place and deposits in another at the same moment, and a change in velocity — a bend, a widening, a flood — rearranges the landscape without anything else changing at all.$b$, '{}', 0),

('physical-geography-rivers', 'explanation', $h$Four ways to erode, four ways to carry$h$,
 $b$Erosion works by four processes. **Hydraulic action** is the sheer force of water forcing air into cracks. **Abrasion** is the load being dragged against the bed and banks — the river's own sandpaper, and usually the biggest contributor. **Attrition** is the load knocking against itself, which does not erode the channel but rounds and shrinks the particles as they travel. **Solution** dissolves soluble rock chemically.

Transport is also four. **Traction** rolls the largest material along the bed; **saltation** bounces smaller particles; **suspension** carries fine material within the flow, which is what makes a flooded river brown; and **solution** carries dissolved minerals invisibly.

Attrition is the reason for a pattern you can see in any river: material downstream is smaller and rounder than material upstream, because it has spent longer being knocked about on the way.$b$, '{}', 1),

('physical-geography-rivers', 'example', $h$Why a meander migrates$h$,
 $b$Water moving round a bend travels fastest on the outside, where the channel is longer and the flow is thrown outwards.

On the outside, fast water erodes: the bank is undercut into a steep river cliff. On the inside, the flow is slower, cannot hold its load, and deposits: a shallow slip-off slope of sand and shingle builds up.

The bend therefore grows sideways, and the whole meander migrates across the floodplain over time. Push it far enough and the neck narrows until a flood cuts straight across, abandoning the loop as an oxbow lake.

Nothing here is a special mechanism. It is erosion where the water is fast and deposition where it is slow, applied to a curve.$b$, '{}', 2),

('physical-geography-rivers', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Velocity decides between erosion, transport and deposition.$i$,
   $i$Erosion: hydraulic action, abrasion, attrition, solution.$i$,
   $i$Transport: traction, saltation, suspension, solution.$i$,
   $i$Attrition rounds and shrinks the load rather than eroding the channel.$i$,
   $i$Outside of a meander: fast, eroding, a river cliff. Inside: slow, depositing, a slip-off slope.$i$,
   $i$An oxbow lake is a meander loop cut off when the neck is breached.$i$
 ], 3),

('physical-geography-rivers', 'concept', $h$The long profile$h$,
 $b$From source to mouth a river's gradient falls, steep in the uplands and nearly flat at the mouth. What happens along it changes with it.

Upper course: steep, narrow, and cutting downwards. The valley is V-shaped, with interlocking spurs and waterfalls where hard rock sits over soft.

Middle course: the gradient eases and the river turns to cutting sideways. Meanders develop and the valley widens.

Lower course: almost flat, wide, carrying a large volume of fine material. Floodplains, levees and deltas are all deposition landforms.

The counter-intuitive part is that velocity does not fall downstream. It usually rises, because although the gradient is gentler the channel is smoother and deeper and far less energy is lost to friction with the bed.$b$, '{}', 4),

('physical-geography-rivers', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Upper course: vertical erosion, V-shaped valley, interlocking spurs, waterfalls.$i$,
   $i$Middle course: lateral erosion, meanders, a widening valley.$i$,
   $i$Lower course: deposition — floodplain, levees, delta.$i$,
   $i$Velocity generally increases downstream despite the gentler gradient, because friction falls.$i$,
   $i$A waterfall retreats upstream and leaves a gorge behind it.$i$,
   $i$Discharge is cross-sectional area times velocity, in cubic metres per second.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'physical-geography-rivers', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('geo-phys-q1', $p$On the outside of a meander bend the river$p$,
   array[$o$flows faster and erodes, forming a river cliff$o$, $o$flows slower and deposits$o$, $o$flows at the same speed as the inside$o$, $o$deposits a slip-off slope$o$], 0::smallint,
   $e$The outside path is longer and the flow is thrown against it, so the water is faster and erodes the bank. The slip-off slope is what builds on the slow inside, which is why the bend migrates outwards over time.$e$, 0::smallint),
  ('geo-phys-q2', $p$Which erosion process rounds and shrinks the load rather than wearing the channel?$p$,
   array[$o$Attrition$o$, $o$Abrasion$o$, $o$Hydraulic action$o$, $o$Solution$o$], 0::smallint,
   $e$Attrition is particles striking each other. It is why material downstream is smaller and rounder — abrasion is the load wearing the bed, which is the reverse relationship.$e$, 1::smallint),
  ('geo-phys-q3', $p$Fine material carried within the body of the flow, making a flooded river brown, is being transported by$p$,
   array[$o$suspension$o$, $o$traction$o$, $o$saltation$o$, $o$solution$o$], 0::smallint,
   $e$Suspension carries fine particles within the water itself. Traction rolls the largest along the bed, saltation bounces the middling ones, and solution is dissolved and therefore invisible.$e$, 2::smallint),
  ('geo-phys-q4', $p$What happens to a river's velocity from source to mouth?$p$,
   array[$o$It generally increases, because friction falls$o$, $o$It decreases, because the gradient is gentler$o$, $o$It stays constant$o$, $o$It increases only during floods$o$], 0::smallint,
   $e$The gentler gradient suggests slower water, but a deeper, smoother channel loses far less energy to friction, and the net effect is faster flow. It is the standard counter-intuitive result in this topic.$e$, 3::smallint),
  ('geo-phys-q5', $p$An oxbow lake forms when$p$,
   array[$o$a meander neck is breached and the loop is cut off$o$, $o$a waterfall retreats and leaves a gorge$o$, $o$a delta blocks the channel$o$, $o$a levee bursts$o$], 0::smallint,
   $e$Erosion on the outside of two adjacent bends narrows the neck between them until a flood cuts straight across. The abandoned loop silts up at its ends and becomes a lake.$e$, 4::smallint),
  ('geo-phys-q6', $p$A V-shaped valley with interlocking spurs is characteristic of$p$,
   array[$o$the upper course, where erosion is vertical$o$, $o$the middle course, where erosion is lateral$o$, $o$the lower course, where deposition dominates$o$, $o$a glaciated valley$o$], 0::smallint,
   $e$Steep gradients drive the river downwards rather than sideways, cutting a narrow V and weaving around the harder spurs. A glacier would have truncated those spurs and left a U.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'geography' and t.slug = 'physical-geography'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$What decides erosion, transport or deposition?$f$, $k$Velocity. Faster water picks material up; slower water drops it, largest first.$k$, 0::smallint),
  ($f$The four erosion processes$f$, $k$Hydraulic action, abrasion, attrition, solution.$k$, 1::smallint),
  ($f$The four transport processes$f$, $k$Traction, saltation, suspension, solution.$k$, 2::smallint),
  ($f$What does attrition do?$f$, $k$Rounds and shrinks the load as particles strike each other — it does not erode the channel.$k$, 3::smallint),
  ($f$Outside and inside of a meander$f$, $k$Outside: fast, erosion, river cliff. Inside: slow, deposition, slip-off slope.$k$, 4::smallint),
  ($f$How does an oxbow lake form?$f$, $k$The meander neck narrows until a flood cuts across, abandoning the loop.$k$, 5::smallint),
  ($f$Upper, middle and lower course in one line each$f$, $k$Upper: vertical erosion, V-shaped valley. Middle: lateral erosion, meanders. Lower: deposition, floodplain and delta.$k$, 6::smallint),
  ($f$Does velocity rise or fall downstream?$f$, $k$It generally rises — the channel is smoother and deeper, so less energy is lost to friction.$k$, 7::smallint),
  ($f$Discharge$f$, $k$Cross-sectional area times velocity, in cubic metres per second.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'geography' and t.slug = 'physical-geography';

-- ========================================================== climatology =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'climatology-circulation', t.id,
  $t$Why the deserts are where they are$t$,
  $t$Sunlight arrives unevenly, air moves to even it out, and the pattern that motion settles into puts rainforest on the equator and desert at thirty degrees.$t$,
  14, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'geography' and t.slug = 'climatology'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position, visual_kind, visual) values
('climatology-circulation', 'concept', $h$The same beam, spread thinner$h$,
 $b$Near the equator the sun is close to overhead and a beam of sunlight lands on a small patch of ground. Near the poles the same beam strikes at a low angle and is smeared over a much larger area, so every square metre receives less.

The low angle costs twice over: the energy is spread out, and it also passes through more atmosphere on the way, so more is scattered and absorbed before it arrives.

That single geometric fact — energy per square metre falling with latitude — is what drives the entire circulation. Everything below is the atmosphere responding to a surplus at the equator and a deficit at the poles.$b$, '{}', 0,
 'plot', $j${
  "caption": "Energy per square metre falls away from the equator because the same beam is spread over more ground and crosses more atmosphere. The surplus and deficit this creates are what the winds exist to move.",
  "xLabel": "latitude (degrees)",
  "yLabel": "relative energy per m^2",
  "xRange": [0, 90],
  "yRange": [0, 1.1],
  "lines": [
    { "label": "insolation", "tone": "primary",
      "points": [{"x":0,"y":1},{"x":15,"y":0.97},{"x":30,"y":0.87},{"x":45,"y":0.71},{"x":60,"y":0.5},{"x":75,"y":0.26},{"x":90,"y":0.05}] }
  ],
  "areas": [],
  "marks": [
    { "x": 0, "y": 1, "label": "surplus", "tone": "warn" },
    { "x": 90, "y": 0.05, "label": "deficit", "tone": "accent" }
  ],
  "notes": []
}$j$::jsonb),

('climatology-circulation', 'explanation', $h$Three cells, and what each does to the ground below$h$,
 $b$Air heated at the equator rises. Rising air expands and cools, and cool air holds less water vapour, so it rains — heavily and almost daily. That is the ITCZ, and the rainforest belt sits under it.

The risen air spreads polewards at height, cools further, and by about 30 degrees it is dense enough to sink. Sinking air compresses and warms, and warm air holds more vapour, so it takes moisture up rather than releasing it. No rain. The great deserts — Sahara, Arabian, Kalahari, Australian — sit in that band, and they are there because of where the air descends, not because of anything about the land.

That loop is the Hadley cell. Two more, the Ferrel and Polar cells, complete the pattern to the poles, giving alternating belts of rising and sinking air, and with them alternating wet and dry.

The rule underneath all of it: rising air brings rain, sinking air brings drought.$b$, '{}', 1, null, null),

('climatology-circulation', 'example', $h$Two places, one mechanism$h$,
 $b$**The Congo basin, near 0 degrees.** Air converges and rises, cooling as it goes; water vapour condenses and falls. Rain most days, humid all year, and the temperature barely varies between months because the sun is always high.

**The Sahara, near 25 to 30 degrees north.** The same air, having crossed the tropics at altitude, is now sinking. It compresses and warms on the way down and its capacity for vapour rises, so nothing condenses. Under 25 mm of rain a year, and enormous swings between day and night because there is no cloud to hold heat in.

Two of the most different places on Earth, at the two ends of one convection loop.$b$, '{}', 2, null, null),

('climatology-circulation', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Energy per square metre falls with latitude because the beam is spread and crosses more atmosphere.$i$,
   $i$Rising air cools, condenses and rains. Sinking air warms, dries and does not.$i$,
   $i$Hadley cell: rise at the equator, sink at about 30 degrees. Hence rainforest and desert.$i$,
   $i$Three cells per hemisphere: Hadley, Ferrel, Polar.$i$,
   $i$The ITCZ moves with the overhead sun through the year, which is what gives the tropics a wet and a dry season.$i$,
   $i$The Coriolis effect deflects winds — right in the northern hemisphere, left in the southern — which is why they are trade winds rather than straight northerlies.$i$
 ], 3, null, null),

('climatology-circulation', 'concept', $h$What else moves the isotherms$h$,
 $b$Latitude sets the pattern; four things distort it.

**Altitude.** Temperature falls roughly 6.5 degrees per kilometre of height, which is why there is snow on equatorial mountains.

**Distance from the sea.** Water heats and cools far more slowly than land, so coasts have mild winters and cool summers while continental interiors swing hard between them.

**Ocean currents.** Warm currents carry tropical heat polewards — north-west Europe is far milder than its latitude implies for exactly this reason — and cold currents do the reverse.

**Prevailing winds**, which decide whether air arriving at a place came off warm ocean or cold land.

Weather is the state of the atmosphere now; climate is the pattern over thirty years or so. Conflating them is the most common error in the topic.$b$, '{}', 4, null, null),

('climatology-circulation', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Weather is now; climate is the long-run pattern, conventionally thirty years.$i$,
   $i$Temperature falls about 6.5 degrees per kilometre of altitude.$i$,
   $i$Maritime climates are mild and even; continental ones swing between extremes.$i$,
   $i$Warm ocean currents make coasts warmer than their latitude alone would suggest.$i$,
   $i$Relief rainfall on the windward side leaves a rain shadow behind the range.$i$,
   $i$Albedo matters: ice reflects most of what arrives, dark ocean absorbs most of it.$i$
 ], 5, null, null);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'climatology-circulation', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('geo-clim-q1', $p$Why does a square metre near the poles receive less solar energy than one at the equator?$p$,
   array[$o$The beam strikes at a low angle, so it is spread over more ground and crosses more atmosphere$o$, $o$The poles are further from the sun$o$, $o$Ice reflects the sunlight before it arrives$o$, $o$The atmosphere is thinner there$o$], 0::smallint,
   $e$It is geometry: the same beam covers a larger patch and takes a longer slanted path through the air. The distance to the sun differs negligibly across the Earth, and reflection happens after arrival, not before.$e$, 0::smallint),
  ('geo-clim-q2', $p$Why do the great deserts sit near 30 degrees latitude?$p$,
   array[$o$Air descends there, warming and drying as it compresses$o$, $o$It is the hottest latitude$o$, $o$Those regions have no rivers$o$, $o$Prevailing winds blow away the clouds$o$], 0::smallint,
   $e$It is the descending limb of the Hadley cell. Sinking air warms, its capacity for vapour rises, and nothing condenses. The pattern is set by the circulation, not by the land beneath it.$e$, 1::smallint),
  ('geo-clim-q3', $p$Rising air produces rain because$p$,
   array[$o$it expands and cools, and cool air holds less vapour$o$, $o$it collects moisture as it rises$o$, $o$it is pushed against mountains$o$, $o$it is warmer than the air around it$o$], 0::smallint,
   $e$Expansion cools the parcel; cooler air has less capacity for water vapour, so the excess condenses. Sinking air does the reverse, which is the whole basis of the wet and dry belts.$e$, 2::smallint),
  ('geo-clim-q4', $p$North-west Europe is milder than its latitude suggests, mainly because of$p$,
   array[$o$a warm ocean current carrying tropical heat polewards$o$, $o$its altitude$o$, $o$the Coriolis effect$o$, $o$a higher solar angle than nearby regions$o$], 0::smallint,
   $e$Warm water moved north gives up heat to the air above it, and the prevailing westerlies carry that air onshore. Latitude alone would predict a much colder climate.$e$, 3::smallint),
  ('geo-clim-q5', $p$Weather and climate differ in that$p$,
   array[$o$climate is the pattern over decades; weather is the state now$o$, $o$climate applies to large areas and weather to small ones$o$, $o$climate is measured and weather is forecast$o$, $o$there is no real distinction$o$], 0::smallint,
   $e$The difference is the timescale — conventionally about thirty years for climate. A single cold winter says something about weather and almost nothing about climate.$e$, 4::smallint),
  ('geo-clim-q6', $p$A mountain range lies across a prevailing wind. The land behind it is dry because$p$,
   array[$o$the air lost its moisture rising over the range and warms as it descends$o$, $o$the mountains block the wind entirely$o$, $o$it sits at 30 degrees latitude$o$, $o$the range reflects sunlight onto it$o$], 0::smallint,
   $e$Forced ascent cools the air and wrings out its moisture on the windward side; descending on the far side it warms and dries. That is a rain shadow, and it is the same rising-and-sinking rule at a local scale.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'geography' and t.slug = 'climatology'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$Why does insolation fall with latitude?$f$, $k$The beam strikes at a lower angle, spreading over more ground and crossing more atmosphere.$k$, 0::smallint),
  ($f$The one-line rule for rain$f$, $k$Rising air cools and rains; sinking air warms and dries.$k$, 1::smallint),
  ($f$The Hadley cell$f$, $k$Air rises at the equator and sinks at about 30 degrees — rainforest below the rise, desert below the sink.$k$, 2::smallint),
  ($f$The three cells per hemisphere$f$, $k$Hadley, Ferrel, Polar.$k$, 3::smallint),
  ($f$What is the ITCZ, and why does it move?$f$, $k$The belt where trade winds converge and air rises. It follows the overhead sun, giving the tropics wet and dry seasons.$k$, 4::smallint),
  ($f$The Coriolis effect$f$, $k$Deflects moving air right in the northern hemisphere and left in the southern.$k$, 5::smallint),
  ($f$Lapse rate$f$, $k$Temperature falls roughly 6.5 degrees per kilometre of altitude.$k$, 6::smallint),
  ($f$Maritime against continental climate$f$, $k$Maritime: mild and even, water changes temperature slowly. Continental: large seasonal swings.$k$, 7::smallint),
  ($f$Weather against climate$f$, $k$Weather is the state now; climate is the pattern over about thirty years.$k$, 8::smallint),
  ($f$Rain shadow$f$, $k$Air loses moisture rising over a range and warms descending, leaving the lee side dry.$k$, 9::smallint)
) as v(front, back, position)
where s.slug = 'geography' and t.slug = 'climatology';

-- ====================================================== human geography =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'human-geography-population', t.id,
  $t$Where people live, and why the numbers change$t$,
  $t$Distribution against density, the model that explains why birth and death rates fall at different times, and what a population pyramid tells you before you read a single figure.$t$,
  13, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'geography' and t.slug = 'human-geography'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position, visual_kind, visual) values
('human-geography-population', 'concept', $h$Distribution is not density$h$,
 $b$**Distribution** is where people are — the pattern on the map. **Density** is how many per square kilometre — a single number for an area.

The distinction matters because averages hide patterns. Egypt's national density looks moderate; almost the entire population lives on a narrow strip along the Nile, and the rest is nearly empty. The average describes nobody.

What draws people to a place is fairly consistent: flat land, reliable water, fertile soil, a temperate climate, resources, and a coast or river to trade along. What repels them is the reverse — mountains, deserts, dense forest, extreme cold.$b$, '{}', 0, null, null),

('human-geography-population', 'explanation', $h$Why the two rates fall at different times$h$,
 $b$Population change is births minus deaths, plus migration. The demographic transition model describes what happens to the first two as a country develops, and the whole insight is that they do not fall together.

**Stage 1.** Both rates high, both fluctuating with harvests and disease. Population roughly flat.

**Stage 2.** Death rates fall sharply — clean water, sanitation, vaccination, better food. Birth rates stay high, because having many children is still a rational response to the conditions people grew up in. The gap between the curves is population growth, and it is at its fastest here.

**Stage 3.** Birth rates fall too: contraception, education for girls, urban life where children cost more than they contribute, and lower infant mortality meaning fewer births are needed for the same surviving family. Growth slows.

**Stage 4.** Both low. Population high and stable.

**Stage 5**, in a number of countries now: births below deaths, and the population shrinks and ages.

The lag between the death rate falling and the birth rate following is the entire explanation for the twentieth century's population growth. Nothing about fertility rose.$b$, '{}', 1,
 'plot', $j${
  "caption": "Deaths fall first, births follow a generation later, and the gap between the two curves is the population growth. Nothing about fertility had to rise for the population to.",
  "xLabel": "stage of development",
  "yLabel": "rate per 1000 per year",
  "xRange": [1, 5],
  "yRange": [0, 40],
  "lines": [
    { "label": "births", "tone": "primary",
      "points": [{"x":1,"y":35},{"x":2,"y":34},{"x":3,"y":20},{"x":4,"y":13},{"x":5,"y":9}] },
    { "label": "deaths", "tone": "accent",
      "points": [{"x":1,"y":34},{"x":2,"y":18},{"x":3,"y":11},{"x":4,"y":10},{"x":5,"y":11}] }
  ],
  "areas": [
    { "label": "growth", "tone": "warn",
      "points": [{"x":1,"y":35},{"x":2,"y":34},{"x":3,"y":20},{"x":4,"y":13},{"x":4,"y":10},{"x":3,"y":11},{"x":2,"y":18},{"x":1,"y":34}] }
  ],
  "marks": [],
  "notes": []
}$j$::jsonb),

('human-geography-population', 'example', $h$Reading a pyramid before reading the numbers$h$,
 $b$A population pyramid stacks age groups, youngest at the bottom, males and females on either side. Its shape says more than its figures.

**Wide base, steep sides.** Many children, few old people: high birth rate and high death rate, early in the transition. The country's problem is schools.

**Straight sides, narrow base.** Births have fallen and people live long: late in the transition. The country's problem is pensions and care.

**A base narrower than the middle.** Births have fallen below replacement and the population is set to shrink whatever happens next, because the people who would have had the next generation of children were never born.

A notch partway up is history written into the graph — a war, a famine, an emigration wave — and it will travel upward through the chart for the rest of that cohort's life.$b$, '{}', 2, null, null),

('human-geography-population', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Distribution is the pattern; density is the average. Averages hide the pattern.$i$,
   $i$Natural change is births minus deaths; total change adds migration.$i$,
   $i$In the DTM, death rates fall before birth rates — that lag is the growth.$i$,
   $i$Fastest growth is in stage 2, not because births rose but because deaths fell.$i$,
   $i$Replacement fertility is about 2.1 births per woman, not 2 — some children do not survive to have their own.$i$,
   $i$A wide-based pyramid means a young population; straight sides mean an ageing one.$i$
 ], 3, null, null),

('human-geography-population', 'concept', $h$Push, pull, and what migration leaves behind$h$,
 $b$Migration is usually explained by push factors at the origin — unemployment, conflict, drought, poor services — and pull factors at the destination — work, safety, schools, family already there.

The pattern is uneven in a way worth naming. Migrants are disproportionately young adults, since moving is easier and pays off over a longer horizon. So the source region loses exactly the age group that pays taxes and has children, while the destination gains it.

That produces a distorted pyramid at both ends: a hollow in the working ages where people left, and a bulge where they arrived. Remittances flow the other way and can be a large share of the origin's economy.

Urbanisation is the same mechanism at national scale, and it is why most of the world now lives in cities.$b$, '{}', 4, null, null),

('human-geography-population', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Push factors act at the origin; pull factors at the destination.$i$,
   $i$Migrants are disproportionately young adults, which distorts both pyramids.$i$,
   $i$Remittances can be a major part of the origin country's economy.$i$,
   $i$Dependency ratio: the non-working young and old against the working-age population.$i$,
   $i$An ageing population raises the dependency ratio without anybody moving anywhere.$i$,
   $i$Over half the world's population now lives in urban areas, and the share is still rising.$i$
 ], 5, null, null);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'human-geography-population', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('geo-hum-q1', $p$In the demographic transition model, why is growth fastest in stage 2?$p$,
   array[$o$Death rates have fallen while birth rates are still high$o$, $o$Birth rates rise sharply$o$, $o$Migration increases$o$, $o$Both rates rise together$o$], 0::smallint,
   $e$Sanitation, clean water and vaccination cut deaths quickly; birth rates respond to social change and take a generation. The gap between the two curves is the growth — fertility never had to increase.$e$, 0::smallint),
  ('geo-hum-q2', $p$Population distribution and population density differ in that$p$,
   array[$o$distribution is the pattern across an area; density is people per unit area$o$, $o$distribution counts only cities$o$, $o$density applies to countries and distribution to regions$o$, $o$they are the same measured differently$o$], 0::smallint,
   $e$Density is an average and averages conceal patterns. Egypt's looks unremarkable while nearly everyone lives along the Nile — the number describes nobody who actually lives there.$e$, 1::smallint),
  ('geo-hum-q3', $p$A population pyramid with a very wide base and steeply narrowing sides indicates$p$,
   array[$o$high birth rates and high death rates$o$, $o$an ageing population$o$, $o$heavy immigration of working adults$o$, $o$a shrinking population$o$], 0::smallint,
   $e$Many children and few old people. The steep narrowing means each cohort is much smaller than the one below, which is what a high death rate looks like drawn on a chart.$e$, 2::smallint),
  ('geo-hum-q4', $p$Replacement fertility is about$p$,
   array[$o$2.1 births per woman$o$, $o$2.0 births per woman$o$, $o$1.5 births per woman$o$, $o$3.0 births per woman$o$], 0::smallint,
   $e$Slightly above two, because not every child survives to have children of their own. Where child mortality is higher, replacement is higher still.$e$, 3::smallint),
  ('geo-hum-q5', $p$Migrants are disproportionately young adults. The effect on the origin region is$p$,
   array[$o$a hollow in the working ages, and a higher dependency ratio$o$, $o$a younger population overall$o$, $o$no change to the age structure$o$, $o$a wider base to its pyramid$o$], 0::smallint,
   $e$The group that leaves is the one that works and has children, so those who remain are disproportionately young or old. Remittances flow back, but the age structure does not repair itself.$e$, 4::smallint),
  ('geo-hum-q6', $p$Which best explains why people settle densely in one area and not another?$p$,
   array[$o$Flat land, water, fertile soil and access to trade$o$, $o$Government planning$o$, $o$Proximity to the equator$o$, $o$Historical accident with no pattern$o$], 0::smallint,
   $e$The physical factors are remarkably consistent across cultures and centuries. Latitude is not one of them: dense settlement occurs from the tropics to the near-Arctic wherever those conditions hold.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'geography' and t.slug = 'human-geography'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$Distribution against density$f$, $k$Distribution is the pattern across an area; density is the average per unit area.$k$, 0::smallint),
  ($f$Natural change against total change$f$, $k$Natural change is births minus deaths; total change adds migration.$k$, 1::smallint),
  ($f$The five stages of the DTM$f$, $k$Both high; deaths fall; births fall; both low; births below deaths.$k$, 2::smallint),
  ($f$Why is growth fastest in stage 2?$f$, $k$Deaths have fallen and births have not yet followed. Fertility never rose.$k$, 3::smallint),
  ($f$Replacement fertility$f$, $k$About 2.1 births per woman — above two, because not every child survives to reproduce.$k$, 4::smallint),
  ($f$Wide-based pyramid against straight-sided$f$, $k$Wide base: young, high birth and death rates. Straight sides: ageing, low rates.$k$, 5::smallint),
  ($f$Push against pull factors$f$, $k$Push acts at the origin — conflict, unemployment. Pull at the destination — work, safety, family.$k$, 6::smallint),
  ($f$Who migrates, and what does it do to the age structure?$f$, $k$Mostly young adults, hollowing the origin's working ages and bulging the destination's.$k$, 7::smallint),
  ($f$Dependency ratio$f$, $k$The non-working young and old set against the working-age population.$k$, 8::smallint),
  ($f$What draws dense settlement?$f$, $k$Flat land, reliable water, fertile soil, temperate climate, resources, access to trade.$k$, 9::smallint)
) as v(front, back, position)
where s.slug = 'geography' and t.slug = 'human-geography';
