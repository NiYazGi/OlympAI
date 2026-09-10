-- Notes, quizzes and cards for the three biology topics.
--
-- Genetics stops at the monohybrid cross, because 'dihybrid-linkage' is a
-- graded problem about what happens when two genes travel together. Ecology
-- teaches energy flow and describes logistic growth qualitatively without
-- deriving where growth is fastest, which is what 'logistic-growth-peak' asks.

-- ============================================================= genetics =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'genetics-inheritance', t.id,
  $t$From alleles to ratios$t$,
  $t$Why a cross between two carriers gives three to one, what a phenotype does and does not tell you about a genotype, and how to find out.$t$,
  13, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'biology' and t.slug = 'genetics'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('genetics-inheritance', 'concept', $h$Two copies, one from each parent$h$,
 $b$A gene sits at a locus on a chromosome, and a diploid organism carries two copies of each chromosome — so two copies of each gene. The variants are alleles.

The pair is the genotype: AA, Aa or aa. What you can observe is the phenotype. A dominant allele masks a recessive one, so AA and Aa look identical and only aa shows the recessive trait.

That masking is the source of nearly every question in the topic: the phenotype of a dominant-looking organism does not determine its genotype.$b$, '{}', 0),

('genetics-inheritance', 'explanation', $h$Where the three to one comes from$h$,
 $b$During meiosis the two copies of each chromosome separate, so a gamete carries one allele of the pair, chosen at random. That is Mendel's law of segregation, and it is a statement about chromosomes rather than about peas.

Cross two heterozygotes, Aa with Aa. Each parent supplies A or a with probability 1/2, independently:

    AA  1/4      Aa  1/4      aA  1/4      aa  1/4

Genotypes come out 1 : 2 : 1. Since AA and Aa look the same, phenotypes come out 3 : 1.

Two things worth being precise about. The ratio is a probability, not a promise — four offspring will very often not be three and one. And it is the genotype ratio that is fundamental; the 3:1 is what dominance does to it.$b$, '{}', 1),

('genetics-inheritance', 'example', $h$A cross, and a way to check a genotype$h$,
 $b$In pea plants purple flowers (P) are dominant over white (p).

Aa-style cross, Pp x Pp:
    offspring  1 PP : 2 Pp : 1 pp  ->  3 purple : 1 white

Now the practical problem: a purple plant is either PP or Pp and looks the same either way. Cross it with a white one, pp — a test cross.

    If it is PP:  all offspring Pp, all purple.
    If it is Pp:  half Pp, half pp — about half white.

One white offspring settles it immediately. All-purple offspring only make PP likely, and more so the more offspring there are: with ten purple offspring, a Pp parent would have had to avoid a 1/2 chance ten times over.$b$, '{}', 2),

('genetics-inheritance', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Genotype is the allele pair; phenotype is what shows. Dominance breaks the link between them.$i$,
   $i$Segregation: the two alleles separate in meiosis, one per gamete.$i$,
   $i$Aa x Aa gives genotypes 1:2:1 and phenotypes 3:1.$i$,
   $i$Aa x aa gives 1:1 — a test cross, and the way to expose a hidden recessive.$i$,
   $i$Ratios are expectations. Small families deviate from them constantly.$i$,
   $i$A single white offspring proves a purple parent is heterozygous; no number of purple ones proves the opposite.$i$
 ], 3),

('genetics-inheritance', 'concept', $h$When dominance is not complete$h$,
 $b$Complete dominance is the simple case, not the only one.

In incomplete dominance the heterozygote is intermediate — a red and a white parent giving pink — and the phenotype ratio then matches the genotype ratio, 1:2:1, because every genotype looks different.

In codominance both alleles show fully and separately, as in the AB blood group, where an AB individual is not intermediate but both at once.

And most traits are not one gene at all. Height and skin colour are polygenic, which is why they vary continuously rather than falling into categories.$b$, '{}', 4),

('genetics-inheritance', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Incomplete dominance: heterozygote is intermediate, so phenotypes come out 1:2:1.$i$,
   $i$Codominance: both alleles show fully and separately, as in blood group AB.$i$,
   $i$Sex-linked genes sit on the X, so males show recessive X traits with only one copy.$i$,
   $i$Polygenic traits vary continuously; a Punnett square is the wrong tool for them.$i$,
   $i$A carrier is heterozygous for a recessive condition and shows nothing.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'genetics-inheritance', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('bio-gen-q1', $p$Two heterozygotes are crossed, Aa x Aa. The expected phenotype ratio is$p$,
   array[$o$3 dominant : 1 recessive$o$, $o$1 : 2 : 1$o$, $o$1 : 1$o$, $o$All dominant$o$], 0::smallint,
   $e$The genotypes come out 1 AA : 2 Aa : 1 aa, and since AA and Aa look identical the visible ratio is 3:1. The 1:2:1 is the genotype ratio, which is what you would see under incomplete dominance.$e$, 0::smallint),
  ('bio-gen-q2', $p$A plant shows the dominant phenotype. To find out whether it is homozygous, cross it with$p$,
   array[$o$a homozygous recessive$o$, $o$another dominant-looking plant$o$, $o$a heterozygote$o$, $o$itself$o$], 0::smallint,
   $e$A test cross with aa makes the two possibilities look different: PP gives all dominant offspring, Pp gives about half recessive. Crossing with a dominant-looking plant leaves both parents ambiguous.$e$, 1::smallint),
  ('bio-gen-q3', $p$Mendel's law of segregation says that$p$,
   array[$o$the two alleles of a gene separate in meiosis, one to each gamete$o$, $o$dominant alleles are more common$o$, $o$genes on different chromosomes assort independently$o$, $o$offspring resemble the dominant parent$o$], 0::smallint,
   $e$It is a statement about what happens to chromosomes when gametes form. The independent assortment of different genes is Mendel's second law, and it is the one that linkage complicates.$e$, 2::smallint),
  ('bio-gen-q4', $p$Two carriers of a recessive condition have four children, none affected. What does that show?$p$,
   array[$o$Nothing conclusive — 3/4 per child means all four unaffected is likely enough$o$, $o$One parent must not be a carrier$o$, $o$The condition is not recessive$o$, $o$The next child must be affected$o$], 0::smallint,
   $e$Each child independently has a 3/4 chance of being unaffected, so all four is about a 32% outcome — unremarkable. The last option is the gambler's fallacy: the ratio is an expectation, and previous children do not constrain the next.$e$, 3::smallint),
  ('bio-gen-q5', $p$A red and a white flower cross to give all pink offspring. This is$p$,
   array[$o$incomplete dominance$o$, $o$codominance$o$, $o$complete dominance$o$, $o$a sex-linked trait$o$], 0::smallint,
   $e$The heterozygote is intermediate, which is incomplete dominance. Codominance would show both colours fully and separately — patches of red and white, not a blend.$e$, 4::smallint),
  ('bio-gen-q6', $p$Why do males show recessive X-linked conditions more often than females?$p$,
   array[$o$They carry only one X, so there is no second copy to mask it$o$, $o$The Y carries a dominant version$o$, $o$The alleles are more common in males$o$, $o$Males inherit only from their mothers$o$], 0::smallint,
   $e$With one X, a single recessive allele is expressed — there is no partner allele to be dominant over it. A female needs the allele on both X chromosomes to show the same condition.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'biology' and t.slug = 'genetics'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$Genotype against phenotype$f$, $k$Genotype is the allele pair; phenotype is what shows. Dominance breaks the link between them.$k$, 0::smallint),
  ($f$Mendel's law of segregation$f$, $k$The two alleles of a gene separate in meiosis, one to each gamete.$k$, 1::smallint),
  ($f$Aa x Aa — genotype and phenotype ratios$f$, $k$1 AA : 2 Aa : 1 aa, showing as 3 dominant : 1 recessive.$k$, 2::smallint),
  ($f$What is a test cross, and what does it reveal?$f$, $k$Crossing a dominant-looking individual with a homozygous recessive. One recessive offspring proves heterozygosity.$k$, 3::smallint),
  ($f$Incomplete dominance$f$, $k$The heterozygote is intermediate, so phenotypes come out 1:2:1.$k$, 4::smallint),
  ($f$Codominance$f$, $k$Both alleles show fully and separately — blood group AB, not a blend.$k$, 5::smallint),
  ($f$Why are males more affected by X-linked recessives?$f$, $k$One X, so a single recessive allele has nothing to mask it.$k$, 6::smallint),
  ($f$What is a carrier?$f$, $k$Someone heterozygous for a recessive condition, showing no sign of it.$k$, 7::smallint),
  ($f$Why do Punnett ratios fail in small families?$f$, $k$They are expectations. Each birth is independent and small samples deviate constantly.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'biology' and t.slug = 'genetics';

-- ============================================================== ecology =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'ecology-energy-and-populations', t.id,
  $t$Energy through an ecosystem, and what limits a population$t$,
  $t$Why food chains are short, why the pyramid narrows so fast, and what stops a population growing for ever.$t$,
  13, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'biology' and t.slug = 'ecology'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('ecology-energy-and-populations', 'concept', $h$Energy passes through; matter cycles$h$,
 $b$The distinction is the foundation of the topic.

Energy enters as sunlight, is fixed by producers, passes up the trophic levels and leaves as heat. It is a one-way flow, and the ecosystem needs a continuous supply.

Matter does not leave. Carbon, nitrogen and water cycle round — taken up, passed on, returned by decomposers. The same atoms are used indefinitely.

So an ecosystem can recycle its nutrients but cannot recycle its energy, and that is why every food web ultimately depends on today's sunlight.$b$, '{}', 0),

('ecology-energy-and-populations', 'explanation', $h$Why only about a tenth gets through$h$,
 $b$Of the energy in one trophic level, roughly 10% ends up in the next. The rest goes three ways: respiration, which is most of it, since staying alive costs energy that is then lost as heat; material never eaten, such as bone and wood; and material eaten but not absorbed, which leaves as waste.

The consequence is the pyramid. Take 10,000 units fixed by plants:

    producers      10,000
    herbivores      1,000
    carnivores        100
    top carnivores     10

By the fourth level there is very little left, which is why food chains are rarely longer than four or five links — not because nothing could eat a top carnivore, but because there is not enough energy left to support one.

It is also why the same land feeds far more people growing crops than raising animals: every level added costs an order of magnitude.$b$, '{}', 1),

('ecology-energy-and-populations', 'example', $h$Following the energy$h$,
 $b$A field fixes 20,000 kJ per square metre per year.

    producers         20,000 kJ
    herbivores         2,000 kJ    (10%)
    small carnivores     200 kJ
    top predators         20 kJ

If a top predator needs 2,000 kJ a year, this square metre supports one hundredth of one. A population of them needs hundreds of square metres each — which is the ecological reason large predators have huge territories, and the conservation reason they are the first to disappear when habitat is fragmented.$b$, '{}', 2),

('ecology-energy-and-populations', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Energy flows one way and is lost as heat; matter cycles and is reused.$i$,
   $i$About 10% of the energy at one trophic level reaches the next.$i$,
   $i$Losses are respiration, uneaten material, and material eaten but not absorbed.$i$,
   $i$Food chains are short because there is nothing left to support a sixth level.$i$,
   $i$Decomposers return nutrients from every level, not just from the top.$i$,
   $i$Producers, primary consumers, secondary consumers — count levels, not species.$i$
 ], 3),

('ecology-energy-and-populations', 'concept', $h$What stops growth$h$,
 $b$With unlimited resources a population grows exponentially: each individual contributes, so the more there are the faster it rises. Nothing sustains that for long.

Real populations meet limits — food, space, predators, disease — and the growth curve bends over towards a ceiling, the carrying capacity K, that the environment can support. The result is the S-shaped logistic curve: slow at first because there are few individuals, fast in the middle, then flattening as the limits bite.

The limits divide usefully. Density-dependent factors — competition, predation, disease — press harder as the population grows, and they are what produces the flattening. Density-independent ones — a flood, a hard frost — hit regardless of numbers, and they explain crashes that arrive with nothing to do with crowding.$b$, '{}', 4),

('ecology-energy-and-populations', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Exponential growth is unlimited; logistic growth bends towards a carrying capacity K.$i$,
   $i$Density-dependent factors — competition, predation, disease — scale with crowding.$i$,
   $i$Density-independent factors — weather, fire — do not care how many there are.$i$,
   $i$Interactions: competition harms both, predation and parasitism help one, mutualism helps both.$i$,
   $i$A niche is what a species does, not where it lives. Two species cannot occupy the same one indefinitely.$i$,
   $i$Keystone species have an effect out of all proportion to their abundance.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'ecology-energy-and-populations', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('bio-eco-q1', $p$Roughly what fraction of the energy at one trophic level reaches the next?$p$,
   array[$o$About 10%$o$, $o$About 50%$o$, $o$About 90%$o$, $o$All of it — energy is conserved$o$], 0::smallint,
   $e$Most is spent on respiration and lost as heat, and more is never eaten or never absorbed. Energy is conserved, but conservation is not the same as staying inside the food chain.$e$, 0::smallint),
  ('bio-eco-q2', $p$Why are food chains rarely longer than four or five links?$p$,
   array[$o$Too little energy remains to support another level$o$, $o$Top predators are territorial$o$, $o$Longer chains are unstable in the mathematical sense$o$, $o$Nothing is willing to eat a top predator$o$], 0::smallint,
   $e$Each level keeps about a tenth, so by the fifth there is roughly a ten-thousandth of the original. The limit is arithmetic, not behaviour.$e$, 1::smallint),
  ('bio-eco-q3', $p$Which statement about energy and matter in an ecosystem is right?$p$,
   array[$o$Energy flows through and is lost; matter cycles and is reused$o$, $o$Both cycle$o$, $o$Both flow through and are lost$o$, $o$Matter flows through; energy cycles$o$], 0::smallint,
   $e$Carbon atoms are used indefinitely, passing through organisms and back via decomposers. Energy degrades to heat at every step and has to be replaced by sunlight, which is why the two are not symmetric.$e$, 2::smallint),
  ('bio-eco-q4', $p$A drought halves a population regardless of its size. This factor is$p$,
   array[$o$density-independent$o$, $o$density-dependent$o$, $o$a carrying capacity$o$, $o$a keystone effect$o$], 0::smallint,
   $e$It acts with the same force whether the population is large or small. Competition and disease are the density-dependent counterparts — they intensify as crowding increases, which is what flattens the logistic curve.$e$, 3::smallint),
  ('bio-eco-q5', $p$Carrying capacity is$p$,
   array[$o$the population size the environment can sustain$o$, $o$the maximum a population has ever reached$o$, $o$the rate at which a population grows$o$, $o$fixed for a species everywhere$o$], 0::smallint,
   $e$It is a property of the environment and its resources, so it changes when they do. A population can temporarily overshoot it, and the crash that follows is one of the more reliable patterns in ecology.$e$, 4::smallint),
  ('bio-eco-q6', $p$An interaction that benefits one species and harms the other is$p$,
   array[$o$predation or parasitism$o$, $o$mutualism$o$, $o$competition$o$, $o$commensalism$o$], 0::smallint,
   $e$One gains, one loses. Mutualism benefits both, competition harms both, and commensalism benefits one while leaving the other unaffected.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'biology' and t.slug = 'ecology'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$Energy and matter in an ecosystem$f$, $k$Energy flows through once and leaves as heat; matter cycles and is reused.$k$, 0::smallint),
  ($f$The ten per cent rule$f$, $k$About a tenth of the energy at one trophic level reaches the next.$k$, 1::smallint),
  ($f$Where does the other ninety per cent go?$f$, $k$Respiration mostly, plus material never eaten and material eaten but not absorbed.$k$, 2::smallint),
  ($f$Why are food chains short?$f$, $k$Too little energy is left after four or five levels to support another.$k$, 3::smallint),
  ($f$Exponential against logistic growth$f$, $k$Exponential is unlimited; logistic bends towards a carrying capacity K.$k$, 4::smallint),
  ($f$Density-dependent factors$f$, $k$Competition, predation, disease — they press harder as the population grows.$k$, 5::smallint),
  ($f$Density-independent factors$f$, $k$Weather, fire, flood — they act regardless of population size.$k$, 6::smallint),
  ($f$Name the interactions by who gains$f$, $k$Mutualism: both. Competition: neither. Predation and parasitism: one at the other's cost.$k$, 7::smallint),
  ($f$What is a niche?$f$, $k$What a species does, not where it lives. Two species cannot share one indefinitely.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'biology' and t.slug = 'ecology';

-- ========================================================= cell biology =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'cell-biology-membrane-transport', t.id,
  $t$The membrane, and how things cross it$t$,
  $t$Which movements are free and which cost energy, why a cell in pure water swells, and what the whole arrangement is spending ATP on.$t$,
  13, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'biology' and t.slug = 'cell-biology'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('cell-biology-membrane-transport', 'concept', $h$A barrier that chooses$h$,
 $b$The membrane is a phospholipid bilayer: heads that like water facing out, tails that do not facing in. Proteins float in it, some spanning it completely — the fluid mosaic.

What that arrangement produces is selectivity. Small non-polar molecules such as oxygen and carbon dioxide dissolve through the tails and cross freely. Ions and polar molecules such as glucose cannot, and need a protein to let them through.

So the membrane does not simply keep things out. It decides, molecule by molecule, and that decision is what makes a cell an inside rather than a region.$b$, '{}', 0),

('cell-biology-membrane-transport', 'explanation', $h$Downhill is free; uphill is not$h$,
 $b$Everything dissolved is in constant random motion, so any concentration difference evens out over time. Movement down a gradient is spontaneous — no energy required.

**Diffusion** is that, directly through the bilayer: oxygen in, carbon dioxide out.

**Facilitated diffusion** is the same downhill movement through a channel or carrier protein, for things that cannot cross the lipid themselves. Still passive, still no ATP; the protein only provides a route.

**Osmosis** is diffusion of water across a partially permeable membrane, from where solutes are dilute to where they are concentrated. Water moves; the solute is what it is moving in response to.

**Active transport** is the exception that costs. It moves substances against the gradient, from low concentration to high, using a carrier protein and ATP. Nothing spontaneous is happening — it is a pump, and turning it off means the gradient decays.

The distinction to hold on to: passive processes need a gradient and spend nothing; active transport spends ATP precisely in order to build a gradient that would not exist otherwise.$b$, '{}', 1),

('cell-biology-membrane-transport', 'example', $h$A red blood cell in three solutions$h$,
 $b$Put a cell in water with different solute concentrations and watch which way the water goes.

**Hypotonic** (solution more dilute than the cell): water moves in. An animal cell swells and can burst. A plant cell does not, because the cell wall resists — it becomes turgid, which is what holds a non-woody plant up.

**Isotonic** (equal): water moves both ways at the same rate, and there is no net change. This is why a drip is saline rather than water.

**Hypertonic** (solution more concentrated): water leaves. An animal cell shrivels; a plant cell plasmolyses as its membrane pulls away from the wall, and the plant wilts.

In every case the water moves towards the higher solute concentration. Nothing is pumping it — this is osmosis, and it costs the cell nothing.$b$, '{}', 2),

('cell-biology-membrane-transport', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Fluid mosaic: a phospholipid bilayer with proteins embedded in it.$i$,
   $i$Small non-polar molecules cross freely; ions and polar molecules need a protein.$i$,
   $i$Diffusion and facilitated diffusion are passive: down the gradient, no ATP.$i$,
   $i$Osmosis is water crossing a partially permeable membrane towards the higher solute concentration.$i$,
   $i$Active transport goes against the gradient and requires ATP and a carrier protein.$i$,
   $i$Hypotonic surroundings swell an animal cell and make a plant cell turgid; hypertonic ones shrivel and plasmolyse.$i$
 ], 3),

('cell-biology-membrane-transport', 'concept', $h$Where the ATP comes from$h$,
 $b$Active transport needs a currency, and the cell's is ATP: adenosine triphosphate, which releases usable energy when its third phosphate is removed.

Respiration is what makes it. Glycolysis splits glucose in the cytoplasm for a small yield; the rest is produced in the mitochondria, which is why cells doing a lot of pumping — in the gut lining, in a kidney tubule — are packed with them.

With oxygen, one glucose yields on the order of thirty ATP. Without it, fermentation yields two, which is why anaerobic effort cannot be sustained.

That is the loop worth carrying away: respiration makes ATP, ATP drives the pumps, and the pumps maintain the gradients that everything else in the cell relies on.$b$, '{}', 4),

('cell-biology-membrane-transport', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$ATP is the cell's energy currency; energy is released when a phosphate is removed.$i$,
   $i$Aerobic respiration yields roughly thirty ATP per glucose; anaerobic yields two.$i$,
   $i$Cells that transport heavily are rich in mitochondria — an observable clue to function.$i$,
   $i$Surface area to volume ratio limits exchange, which is why gut lining is folded into villi.$i$,
   $i$Rate of diffusion rises with surface area, gradient steepness and temperature, and falls with distance.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'cell-biology-membrane-transport', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('bio-cell-q1', $p$What is active transport?$p$,
   array[$o$Movement against a concentration gradient, using a carrier protein and ATP$o$, $o$Movement down a gradient through a channel protein$o$, $o$Movement of water across a partially permeable membrane$o$, $o$Any movement involving a protein$o$], 0::smallint,
   $e$The defining feature is direction plus cost: low concentration to high, which is not spontaneous, so ATP pays for it. The second option describes facilitated diffusion, which uses a protein but no energy.$e$, 0::smallint),
  ('bio-cell-q2', $p$An animal cell is placed in pure water. What happens, and why?$p$,
   array[$o$It swells and may burst, because water enters by osmosis$o$, $o$It shrivels, because water leaves$o$, $o$Nothing, because water cannot cross the membrane$o$, $o$It swells, because the cell pumps water in$o$], 0::smallint,
   $e$Water moves towards the higher solute concentration, which is inside. Nothing is pumping — osmosis is passive. A plant cell in the same water becomes turgid instead of bursting, because the wall resists.$e$, 1::smallint),
  ('bio-cell-q3', $p$Which of these crosses the membrane without any protein?$p$,
   array[$o$Oxygen$o$, $o$Sodium ions$o$, $o$Glucose$o$, $o$Amino acids$o$], 0::smallint,
   $e$Oxygen is small and non-polar, so it dissolves through the lipid tails. Ions and polar molecules such as glucose are repelled by that interior and need a channel or carrier.$e$, 2::smallint),
  ('bio-cell-q4', $p$Facilitated diffusion differs from active transport in that it$p$,
   array[$o$requires no ATP and only goes down the gradient$o$, $o$uses no protein$o$, $o$moves only water$o$, $o$is faster in every case$o$], 0::smallint,
   $e$Both use proteins; only active transport spends energy and only active transport can go uphill. Facilitated diffusion is diffusion with a doorway, nothing more.$e$, 3::smallint),
  ('bio-cell-q5', $p$A cell lining the gut is packed with mitochondria. The best inference is that it$p$,
   array[$o$does a lot of active transport$o$, $o$divides frequently$o$, $o$stores a lot of glucose$o$, $o$has a large surface area$o$], 0::smallint,
   $e$Mitochondria make ATP and active transport spends it, so a high count points to heavy pumping — absorbing nutrients against their gradients. It is one of the more reliable structure-to-function inferences in the subject.$e$, 4::smallint),
  ('bio-cell-q6', $p$Roughly how much more ATP does aerobic respiration yield per glucose than anaerobic?$p$,
   array[$o$About fifteen times$o$, $o$About twice$o$, $o$About the same$o$, $o$About a hundred times$o$], 0::smallint,
   $e$Around thirty against two. That gap is why anaerobic effort cannot be sustained for long, and why organisms go to such trouble to keep oxygen supplied.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'biology' and t.slug = 'cell-biology'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$What is active transport?$f$, $k$Movement of substances against a concentration gradient using a carrier protein and ATP.$k$, 0::smallint),
  ($f$What is osmosis?$f$, $k$Diffusion of water across a partially permeable membrane towards the higher solute concentration.$k$, 1::smallint),
  ($f$Diffusion against facilitated diffusion$f$, $k$Both passive and downhill; facilitated diffusion uses a channel or carrier for what cannot cross the lipid.$k$, 2::smallint),
  ($f$What crosses the bilayer unaided?$f$, $k$Small non-polar molecules — oxygen, carbon dioxide. Not ions, not glucose.$k$, 3::smallint),
  ($f$Fluid mosaic model$f$, $k$A phospholipid bilayer with proteins embedded and free to move within it.$k$, 4::smallint),
  ($f$Animal cell in a hypotonic solution$f$, $k$Water enters, it swells, it may burst. A plant cell becomes turgid instead — the wall resists.$k$, 5::smallint),
  ($f$Animal cell in a hypertonic solution$f$, $k$Water leaves and it shrivels; a plant cell plasmolyses as the membrane pulls off the wall.$k$, 6::smallint),
  ($f$Why is a drip isotonic rather than water?$f$, $k$Equal concentrations mean no net water movement, so red blood cells neither burst nor shrivel.$k$, 7::smallint),
  ($f$ATP yield, aerobic against anaerobic$f$, $k$Roughly thirty per glucose against two.$k$, 8::smallint),
  ($f$What does a mitochondria-rich cell probably do?$f$, $k$A lot of active transport — the pumps need the ATP.$k$, 9::smallint)
) as v(front, back, position)
where s.slug = 'biology' and t.slug = 'cell-biology';
