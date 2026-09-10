-- Notes, quizzes and cards for the three economics topics.
--
-- Written for this project, licence 'original', on the same rule as the physics
-- content: a worked example never solves a task from the library. Deadweight
-- loss is taught through a per-unit tax rather than a monopoly, because
-- 'monopoly-deadweight' is a graded problem; the game theory lesson stops at
-- one-shot play, because 'repeated-cooperation' is about what repetition adds.

-- ====================================================== microeconomics ======

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select
  'microeconomics-margins-and-surplus',
  t.id,
  $t$Thinking at the margin, and measuring what a market is worth$t$,
  $t$Why every optimisation in microeconomics is the same comparison, and how surplus turns "this market works well" into a number you can defend.$t$,
  14, 0, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
where s.slug = 'economics' and t.slug = 'microeconomics'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('microeconomics-margins-and-surplus', 'concept', $h$One more, or not?$h$,
 $b$Almost every question in microeconomics is the same question asked about a different thing: is one more unit worth it?

Compare the benefit of that one extra unit with what it costs. While marginal benefit exceeds marginal cost, do more. When it falls below, do less. The optimum sits where they meet.

Averages do not enter into it, and neither does anything already spent. A cost you cannot recover changes nothing about whether the next unit is worth producing.$b$, '{}', 0),

('microeconomics-margins-and-surplus', 'explanation', $h$Why the rule finds the maximum$h$,
 $b$Suppose you are producing where marginal benefit is above marginal cost. The next unit adds more than it takes away, so total surplus rises if you make it — you were not at the top. The same argument runs backwards where marginal cost is above marginal benefit: the last unit destroyed value, so stop making it.

The only place neither argument applies is where the two are equal, which is why that is the answer to so many problems: a competitive firm producing until price equals marginal cost, a consumer buying until the value of another unit equals its price, a government weighing another pound of spending.

What changes between problems is what goes into the two curves — never the comparison itself.$b$, '{}', 1),

('microeconomics-margins-and-surplus', 'example', $h$A firm reading its own cost table$h$,
 $b$A price-taking firm sells at 12 per unit. Its marginal cost rises with output:

    unit      1     2     3     4     5     6
    MC        4     6     9    12    16    21

Produce while MC is at or below the price. Units 1-4 each add 12 and cost 4, 6, 9, 12 — all worth making, the fourth exactly breaking even at the margin. Unit 5 would add 12 and cost 16, so it destroys 4 of value.

Output is 4. Note what did not appear anywhere in that reasoning: fixed costs, average cost, or what the firm spent on the factory. None of them change which unit is the last one worth making.$b$, '{}', 2),

('microeconomics-margins-and-surplus', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Optimise where marginal benefit equals marginal cost. Everything else is finding those two curves.$i$,
   $i$Sunk costs are irrelevant to any forward-looking decision, however large they are.$i$,
   $i$A competitive firm produces where P = MC; any firm with market power produces where MR = MC.$i$,
   $i$Average cost tells you whether to be in the industry at all; marginal cost tells you how much to make.$i$,
   $i$For a straight-line demand curve, marginal revenue has the same intercept and twice the slope.$i$
 ], 3),

('microeconomics-margins-and-surplus', 'concept', $h$Surplus: what the trade was worth$h$,
 $b$A buyer who would have paid 30 and pays 20 gains 10. A seller who would have accepted 12 and receives 20 gains 8. Those gains are consumer and producer surplus, and on a supply-and-demand diagram they are the areas between the price and the two curves.

Total surplus is the value the market created. It is maximised in competitive equilibrium, and that is not a moral claim — it is arithmetic. At that quantity, every trade whose value to a buyer exceeded its cost to a seller has happened, and no trade has happened where it did not.$b$, '{}', 4),

('microeconomics-margins-and-surplus', 'explanation', $h$Where the lost value goes$h$,
 $b$Drive a wedge between what buyers pay and what sellers receive — a tax, a quota, a price floor — and some trades stop happening. Not the worthless ones: the ones whose value to the buyer still exceeded their cost to the seller, but no longer by enough to survive the wedge.

That lost value is deadweight loss. It is not transferred to anyone. The government's revenue is a transfer and shows up as a rectangle; the deadweight loss is the triangle beside it, and it goes nowhere at all.

Its size depends on how many trades the wedge kills, which is why elasticity governs it. Where either side is inelastic the quantity barely moves and the triangle is thin; where both are elastic the same wedge destroys far more.$b$, '{}', 5),

('microeconomics-margins-and-surplus', 'example', $h$A tax of 3 per unit$h$,
 $b$A market clears at a price of 20 and a quantity of 100. A tax of 3 per unit is imposed, and the quantity traded falls to 88.

    Revenue  = tax * quantity still traded  = 3 * 88   = 264   (a transfer)
    DWL      = (1/2) * tax * fall in quantity = 0.5 * 3 * 12 = 18   (destroyed)

The 264 changes hands. The 18 does not: it is the value of twelve trades that were worth making and no longer happen. Who writes the cheque — buyer or seller — changes neither figure. Incidence is decided by the relative elasticities, not by the wording of the law.$b$, '{}', 6),

('microeconomics-margins-and-surplus', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Consumer surplus is the area below demand and above the price; producer surplus the area above supply and below it.$i$,
   $i$Competitive equilibrium maximises total surplus — every worthwhile trade happens, and no others.$i$,
   $i$A wedge between the two prices creates a deadweight loss triangle: (1/2) * wedge * change in quantity.$i$,
   $i$Tax revenue is a transfer, not a loss. The deadweight loss is what nobody receives.$i$,
   $i$The more elastic either side, the larger the deadweight loss from the same tax.$i$,
   $i$Statutory incidence — who legally pays — does not determine economic incidence.$i$
 ], 7);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'microeconomics-margins-and-surplus', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ('micro-q1',
   $p$A firm has already spent 500,000 on machinery that cannot be resold. How should that figure affect its decision about how much to produce this month?$p$,
   array[$o$Not at all$o$, $o$It should produce more, to recover the outlay$o$, $o$It should produce less, since costs are already high$o$, $o$It should shut down if output cannot cover it$o$],
   0::smallint,
   $e$The money is gone whatever happens next, so it cannot change which unit is the last one worth making. Only costs that respond to the decision belong in it. "Producing more to recover it" is the sunk cost fallacy in its usual disguise.$e$,
   0::smallint),
  ('micro-q2',
   $p$A price-taking firm sells at 12. Marginal cost for successive units is 4, 6, 9, 12, 16, 21. How many units should it make?$p$,
   array[$o$4$o$, $o$3$o$, $o$5$o$, $o$6$o$],
   0::smallint,
   $e$Produce while marginal cost is at or below the price. The fourth unit costs exactly 12 and breaks even at the margin; the fifth costs 16 to produce something worth 12 and destroys value. Fixed costs do not enter the calculation.$e$,
   1::smallint),
  ('micro-q3',
   $p$Total surplus in a market is$p$,
   array[$o$maximised at the competitive equilibrium quantity$o$, $o$maximised when quantity is as large as possible$o$, $o$maximised when the price is as low as possible$o$, $o$the same at every quantity, since it only moves between buyers and sellers$o$],
   0::smallint,
   $e$At the equilibrium quantity every trade worth more to a buyer than it costs a seller has happened, and none beyond it. Pushing quantity higher forces trades that cost more than they are worth; a lower price does not create value, it moves it.$e$,
   2::smallint),
  ('micro-q4',
   $p$A tax of 3 per unit cuts the quantity traded from 100 to 88. The deadweight loss is$p$,
   array[$o$18$o$, $o$36$o$, $o$264$o$, $o$300$o$],
   0::smallint,
   $e$The triangle is (1/2) * 3 * 12 = 18. The 264 is tax revenue — a transfer to the government, not a loss to anyone. Forgetting the half, or mistaking revenue for deadweight loss, produces the other options.$e$,
   3::smallint),
  ('micro-q5',
   $p$Demand for a good is very inelastic. Compared with an elastic market, the same per-unit tax will produce$p$,
   array[$o$a smaller deadweight loss$o$, $o$a larger deadweight loss$o$, $o$the same deadweight loss$o$, $o$no deadweight loss at all$o$],
   0::smallint,
   $e$Deadweight loss is the value of trades the tax prevents. Inelastic demand means quantity barely moves, so few trades are lost and the triangle is thin. It is not zero unless the quantity does not move at all.$e$,
   4::smallint),
  ('micro-q6',
   $p$A tax is legally levied on sellers rather than buyers. What does that change?$p$,
   array[$o$Nothing about who really bears it — that depends on the elasticities$o$, $o$Sellers bear the whole burden$o$, $o$Buyers bear the whole burden$o$, $o$The deadweight loss doubles$o$],
   0::smallint,
   $e$The wedge between what buyers pay and sellers receive is the same either way, so the equilibrium quantity, the revenue and the deadweight loss are all unchanged. The burden splits according to which side can more easily walk away — the less elastic side bears more.$e$,
   5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'economics' and t.slug = 'microeconomics'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$The rule behind almost every microeconomics optimisation$f$, $k$Do more while marginal benefit exceeds marginal cost; the optimum is where they are equal.$k$, 0::smallint),
  ($f$How much should a sunk cost affect a decision?$f$, $k$Not at all. It cannot be recovered, so it is the same whichever choice is made.$k$, 1::smallint),
  ($f$Output rule: competitive firm against a firm with market power$f$, $k$Competitive: P = MC. With market power: MR = MC, and MR is below price.$k$, 2::smallint),
  ($f$Marginal revenue for a straight-line demand curve$f$, $k$Same intercept, twice the slope.$k$, 3::smallint),
  ($f$Consumer and producer surplus, as areas$f$, $k$Consumer: below demand, above price. Producer: above supply, below price.$k$, 4::smallint),
  ($f$What does a competitive equilibrium maximise?$f$, $k$Total surplus — every trade worth more to a buyer than it costs a seller happens, and no others.$k$, 5::smallint),
  ($f$Deadweight loss from a per-unit tax$f$, $k$(1/2) * tax * the fall in quantity. It is destroyed, not transferred.$k$, 6::smallint),
  ($f$Tax revenue against deadweight loss$f$, $k$Revenue is a transfer and someone receives it. Deadweight loss is value nobody receives.$k$, 7::smallint),
  ($f$What decides who really bears a tax?$f$, $k$Relative elasticity. The less elastic side bears more, whoever the law names.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'economics' and t.slug = 'microeconomics';

-- ======================================================= macroeconomics =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select
  'macroeconomics-income-and-multiplier',
  t.id,
  $t$National income, and why one pound of spending moves more than one pound$t$,
  $t$What the expenditure identity does and does not claim, where the multiplier comes from, and the nominal-real distinction that decides whether a comparison means anything.$t$,
  13, 0, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
where s.slug = 'economics' and t.slug = 'macroeconomics'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('macroeconomics-income-and-multiplier', 'concept', $h$Four ways to spend, one total$h$,
 $b$Everything produced in an economy is bought by somebody, so output can be counted by adding up who bought it:

    Y = C + I + G + (X - M)

Consumption, investment, government purchases, and net exports. Imports are subtracted not because they are bad but because they were already counted inside C, I and G, and they were not produced here.

This is an identity. It is true by construction and forecasts nothing. Treating it as a theory — "raise G and Y rises by the same amount" — is the most common way it is misused.$b$, '{}', 0),

('macroeconomics-income-and-multiplier', 'explanation', $h$Where the multiplier comes from$h$,
 $b$What makes spending move more than itself is that one person's spending is another's income, and that person spends part of it again.

Let the marginal propensity to consume be c: of each extra pound of income, c is spent and the rest saved. An initial pound of spending becomes c of income for someone else, then c^2, and so on. The chain is a geometric series:

    1 + c + c^2 + ... = 1 / (1 - c)

which is the multiplier. The saving fraction is what stops it running away — and so does anything else that leaks out of the circular flow, which is why taxes and imports both shrink it.

Two things this argument assumes, and both matter. There has to be slack: idle capacity that responds to demand rather than prices. And nothing must offset it — if interest rates rise in response and investment falls, part of the increase is cancelled before it circulates.$b$, '{}', 1),

('macroeconomics-income-and-multiplier', 'example', $h$Working one through$h$,
 $b$Government purchases rise by 10 billion. Households spend 0.8 of each extra pound of income.

    multiplier = 1 / (1 - 0.8) = 5
    change in Y = 5 * 10 = 50 billion

Now suppose a fifth of extra income goes on imports as well. The leakage per round is 0.2 saved plus 0.2 imported:

    multiplier = 1 / (0.2 + 0.2) = 2.5
    change in Y = 25 billion

Same policy, half the effect, because half of each round leaves the domestic circular flow. An open economy has a smaller multiplier for exactly this reason.$b$, '{}', 2),

('macroeconomics-income-and-multiplier', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Y = C + I + G + (X - M) is an identity, true by construction, not a prediction.$i$,
   $i$Imports are subtracted because they are already inside C, I and G but were not produced here.$i$,
   $i$Simple multiplier: 1 / (1 - MPC), equivalently 1 / MPS.$i$,
   $i$Every leakage — saving, tax, imports — makes the multiplier smaller.$i$,
   $i$The multiplier argument assumes spare capacity and no offsetting reaction.$i$,
   $i$Investment here means new capital goods and stocks, not buying shares.$i$
 ], 3),

('macroeconomics-income-and-multiplier', 'concept', $h$Nominal and real$h$,
 $b$A number in pounds mixes two things: how much was produced, and what prices were. Comparing two years without separating them is comparing nothing.

Real GDP values every year's output at one base year's prices, so the only thing that can move it is quantity. The ratio of the two is the deflator:

    deflator = 100 * nominal GDP / real GDP

Every "in real terms" statement is this same adjustment: an interest rate, a wage, a benefit. Sixty per cent nominal growth over a decade means nothing until the price level is out of it.$b$, '{}', 4),

('macroeconomics-income-and-multiplier', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Real GDP holds prices fixed at a base year; nominal GDP does not.$i$,
   $i$GDP deflator = 100 * nominal / real. It covers everything produced.$i$,
   $i$CPI covers a fixed basket a household buys, so it and the deflator can disagree.$i$,
   $i$Real interest rate is roughly the nominal rate minus inflation.$i$,
   $i$GDP counts production, not wellbeing: it omits unpaid work and treats repairing damage as output.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'macroeconomics-income-and-multiplier', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ('macro-q1',
   $p$Why are imports subtracted in Y = C + I + G + (X - M)?$p$,
   array[$o$Because they were already counted in C, I and G but were not produced domestically$o$, $o$Because imports reduce a country's welfare$o$, $o$Because they are paid for in foreign currency$o$, $o$Because they are counted again in the exports term$o$],
   0::smallint,
   $e$A household buying a foreign-made phone has raised C, but nothing was produced here. Subtracting M removes what was added in error. The identity carries no judgement about whether importing is good.$e$,
   0::smallint),
  ('macro-q2',
   $p$The marginal propensity to consume is 0.75. The simple multiplier is$p$,
   array[$o$4$o$, $o$1.33$o$, $o$3$o$, $o$0.25$o$],
   0::smallint,
   $e$1 / (1 - 0.75) = 4. The 1.33 comes from dividing by the MPC instead of the saving fraction; 0.25 is the marginal propensity to save itself, which is the denominator rather than the answer.$e$,
   1::smallint),
  ('macro-q3',
   $p$Households begin spending more of each extra pound on imports. The multiplier$p$,
   array[$o$falls, because more of each round leaves the domestic circular flow$o$, $o$rises, because total spending is higher$o$, $o$is unchanged, since imports are part of consumption$o$, $o$falls to zero$o$],
   0::smallint,
   $e$Only spending that becomes domestic income keeps the chain going. Imports are a leakage exactly as saving and taxes are, so each round passes on less and the series converges sooner. An open economy has a smaller multiplier for this reason.$e$,
   2::smallint),
  ('macro-q4',
   $p$Nominal GDP rose 6% while the GDP deflator rose 6%. Real GDP$p$,
   array[$o$was roughly unchanged$o$, $o$rose about 6%$o$, $o$rose about 12%$o$, $o$fell about 6%$o$],
   0::smallint,
   $e$All of the nominal increase is accounted for by prices, so quantities are flat. This is the whole point of deflating: a bigger number in pounds is not more output until the price level has been taken out of it.$e$,
   3::smallint),
  ('macro-q5',
   $p$In national accounts, "investment" means$p$,
   array[$o$new capital goods and additions to stocks$o$, $o$households buying shares and bonds$o$, $o$any saving by firms$o$, $o$government spending on infrastructure only$o$],
   0::smallint,
   $e$Investment is production of things that produce: machinery, buildings, inventory. Buying a share transfers ownership of something that already exists and produces nothing new, so it is not investment in this sense — a routine trap in multiple choice.$e$,
   4::smallint),
  ('macro-q6',
   $p$The multiplier argument relies on which assumption?$p$,
   array[$o$That there is spare capacity, so output responds to demand rather than prices$o$, $o$That the economy is at full employment$o$, $o$That the marginal propensity to consume exceeds 1$o$, $o$That the government budget is balanced$o$],
   0::smallint,
   $e$Each round of spending has to call forth real output. At full employment there is nothing idle to activate and the extra demand shows up in prices instead. An MPC above 1 would mean households spending more than they receive, and the series would not converge.$e$,
   5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'economics' and t.slug = 'macroeconomics'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$The expenditure identity$f$, $k$Y = C + I + G + (X - M). True by construction — it predicts nothing on its own.$k$, 0::smallint),
  ($f$Why subtract imports?$f$, $k$They are already inside C, I and G, but were not produced here.$k$, 1::smallint),
  ($f$The simple multiplier$f$, $k$1 / (1 - MPC), which is 1 / MPS.$k$, 2::smallint),
  ($f$What makes a multiplier smaller?$f$, $k$Leakages: saving, taxation and imports. Each round passes on less.$k$, 3::smallint),
  ($f$Two assumptions behind the multiplier$f$, $k$Spare capacity, and no offsetting reaction such as higher interest rates.$k$, 4::smallint),
  ($f$"Investment" in the national accounts$f$, $k$New capital goods and additions to stocks. Not buying shares.$k$, 5::smallint),
  ($f$GDP deflator$f$, $k$100 * nominal GDP / real GDP — the price level implied by the accounts.$k$, 6::smallint),
  ($f$Deflator against CPI$f$, $k$The deflator covers everything produced; CPI a fixed household basket. They can disagree.$k$, 7::smallint),
  ($f$Real interest rate, roughly$f$, $k$The nominal rate minus inflation.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'economics' and t.slug = 'macroeconomics';

-- ========================================================== game theory =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select
  'game-theory-dominance-and-equilibrium',
  t.id,
  $t$Dominance, best responses and Nash equilibrium$t$,
  $t$How to solve a game you can write in a box: what a strategy has to survive, why individually sensible choices can leave everybody worse off, and what to do when no pure equilibrium exists.$t$,
  14, 0, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
where s.slug = 'economics' and t.slug = 'game-theory'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('game-theory-dominance-and-equilibrium', 'concept', $h$A strategy nobody wants to abandon$h$,
 $b$A combination of strategies — one for each player — is a Nash equilibrium when no player can do better by changing their own choice alone, taking everybody else's as given.

The phrase doing the work is alone. It is not the best outcome available, nor what the players would agree to if they could commit. It is only a resting point: nobody has a reason to move unilaterally.

Its use is that it tells you where a game stops. Anywhere else, somebody has an improvement available and will take it.$b$, '{}', 0),

('game-theory-dominance-and-equilibrium', 'explanation', $h$Finding one by best responses$h$,
 $b$For a game small enough to write in a matrix, the mechanical method never fails.

Take each of the opponent's strategies in turn and mark your own best reply to it. Do the same for the other player. Any cell marked by both players is a Nash equilibrium: each is playing a best response to what the other is actually doing.

Sometimes the work is shorter. A strategy is dominant when it is the best reply to everything the opponent might do; if a player has one, they will play it whatever they believe, and the game collapses. A strictly dominated strategy can be crossed out entirely, which sometimes uncovers a dominance in the reduced game — this is iterated elimination.

Care with strictness: strict dominance can be eliminated safely. Weak dominance — no worse, and better against something — cannot be eliminated so freely, because doing so can throw away equilibria.$b$, '{}', 1),

('game-theory-dominance-and-equilibrium', 'example', $h$Two firms deciding whether to advertise$h$,
 $b$Payoffs in millions, (Firm A, Firm B):

                      B advertises    B does not
    A advertises        (10, 10)       (18, 4)
    A does not          (4, 18)        (14, 14)

Firm A's best replies: against B advertising, 10 beats 4, so advertise. Against B not advertising, 18 beats 14, so advertise. Advertising is dominant for A, and by symmetry for B.

The equilibrium is (advertise, advertise), paying 10 each — while (don't, don't) would have paid 14 each. Both players acted correctly and both ended up worse off, because the option they would have preferred requires the other to keep a promise no equilibrium enforces.

That is the shape of every prisoner's dilemma. Note what is missing: nothing here says the players meet again.$b$, '{}', 2),

('game-theory-dominance-and-equilibrium', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Nash equilibrium: no player gains by deviating alone. It need not be efficient.$i$,
   $i$Find them by marking best responses; a cell marked by every player is one.$i$,
   $i$A dominant strategy beats everything the opponent might do — play it and stop thinking.$i$,
   $i$Strictly dominated strategies can be eliminated; weakly dominated ones cannot, safely.$i$,
   $i$In the prisoner's dilemma the dominant strategies give an outcome both players dislike.$i$,
   $i$Efficient is not the same as equilibrium, and equilibrium is not the same as fair.$i$
 ], 3),

('game-theory-dominance-and-equilibrium', 'concept', $h$When there is no pure equilibrium$h$,
 $b$Some games have no cell where both players are content. Matching pennies is the standard case: one player wants to match, the other wants to differ, so whatever cell you name, somebody wants out.

The resolution is to allow randomising. A mixed strategy is a probability over your own options, and every finite game has at least one equilibrium once mixtures are allowed — Nash's theorem.

The condition that pins the probabilities down is the useful part: you choose your mix so that your opponent is indifferent between their options. If they were not indifferent they would pick their better reply and stop mixing, and your mix would no longer be safe.$b$, '{}', 4),

('game-theory-dominance-and-equilibrium', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Every finite game has at least one Nash equilibrium once mixed strategies are allowed.$i$,
   $i$In a mixed equilibrium each player mixes so the other is indifferent between their options.$i$,
   $i$A player who is indifferent is the point, not a coincidence to explain away.$i$,
   $i$Zero-sum two-player games: the equilibrium value is the minimax value.$i$,
   $i$Check for pure equilibria before reaching for mixtures — most exam games have one.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'game-theory-dominance-and-equilibrium', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ('game-q1',
   $p$A set of strategies is a Nash equilibrium when$p$,
   array[$o$no player can do better by changing their own strategy alone$o$, $o$the players' combined payoff is as large as possible$o$, $o$every player is playing a dominant strategy$o$, $o$no player would change even if they could agree jointly$o$],
   0::smallint,
   $e$The test is unilateral deviation, holding everyone else fixed. It says nothing about the total being maximised — the prisoner's dilemma is the standing counterexample — and dominant strategies are a special case, not a requirement.$e$,
   0::smallint),
  ('game-q2',
   $p$Two firms choose whether to advertise. Payoffs (A, B): both advertise (10, 10); A only (18, 4); B only (4, 18); neither (14, 14). What is the equilibrium?$p$,
   array[$o$Both advertise$o$, $o$Neither advertises$o$, $o$One advertises and the other does not$o$, $o$There is no equilibrium in pure strategies$o$],
   0::smallint,
   $e$Advertising is a best reply to both of the opponent's options — 10 beats 4, and 18 beats 14 — so it is dominant for each firm. They land on (10, 10) even though (14, 14) is available to both, which is what makes this a prisoner's dilemma.$e$,
   1::smallint),
  ('game-q3',
   $p$Which strategies can be eliminated safely without losing an equilibrium?$p$,
   array[$o$Strictly dominated ones$o$, $o$Weakly dominated ones$o$, $o$Any strategy that is not a best response to something$o$, $o$Any strategy with a low average payoff$o$],
   0::smallint,
   $e$A strictly dominated strategy is worse against everything, so it can never be played in equilibrium. Weak dominance only requires "no worse", so eliminating it can discard genuine equilibria — the distinction is examined precisely because it is easy to blur.$e$,
   2::smallint),
  ('game-q4',
   $p$In a mixed-strategy equilibrium, a player chooses probabilities so that$p$,
   array[$o$the opponent is indifferent between their own options$o$, $o$their own payoff is maximised against a fixed opponent$o$, $o$every option is played equally often$o$, $o$the opponent has a strictly better option$o$],
   0::smallint,
   $e$If the opponent were not indifferent they would abandon mixing and play their better reply, which would break the equilibrium. That is why the indifference condition is what determines the probabilities. Equal probabilities happen only when the payoffs are symmetric.$e$,
   3::smallint),
  ('game-q5',
   $p$What does Nash's theorem guarantee for a finite game?$p$,
   array[$o$At least one equilibrium exists once mixed strategies are allowed$o$, $o$Exactly one equilibrium exists$o$, $o$At least one equilibrium exists in pure strategies$o$, $o$The equilibrium is efficient$o$],
   0::smallint,
   $e$Existence, not uniqueness, and only with mixtures allowed. Matching pennies has no pure equilibrium; coordination games have several. Nothing in the theorem promises the outcome is good for anybody.$e$,
   4::smallint),
  ('game-q6',
   $p$Both players in a game have a dominant strategy. What follows?$p$,
   array[$o$The combination of those strategies is the unique Nash equilibrium in pure strategies$o$, $o$The outcome is efficient$o$, $o$The game has no equilibrium$o$, $o$Beliefs about the opponent still decide the outcome$o$],
   0::smallint,
   $e$A dominant strategy is a best reply to everything, so the pair is an equilibrium and nothing else can be. Efficiency is a separate question entirely — the advertising game has exactly this structure and lands both firms on a worse outcome than they could have had.$e$,
   5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'economics' and t.slug = 'game-theory'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$Define a Nash equilibrium$f$, $k$A strategy for each player such that nobody gains by changing theirs alone.$k$, 0::smallint),
  ($f$How do you find equilibria in a payoff matrix?$f$, $k$Mark each player's best reply to each opponent strategy. A cell marked by everyone is an equilibrium.$k$, 1::smallint),
  ($f$What is a dominant strategy?$f$, $k$One that is the best reply to everything the opponent might do — beliefs stop mattering.$k$, 2::smallint),
  ($f$Which dominated strategies can be eliminated safely?$f$, $k$Strictly dominated ones. Eliminating weakly dominated strategies can destroy equilibria.$k$, 3::smallint),
  ($f$What makes the prisoner's dilemma a dilemma?$f$, $k$Both players' dominant strategies lead to an outcome both would trade away.$k$, 4::smallint),
  ($f$Is a Nash equilibrium efficient?$f$, $k$Not necessarily. It is a resting point, not a recommendation.$k$, 5::smallint),
  ($f$What does Nash's theorem guarantee?$f$, $k$At least one equilibrium in any finite game, once mixed strategies are allowed. Not uniqueness.$k$, 6::smallint),
  ($f$What pins down the probabilities in a mixed equilibrium?$f$, $k$Each player mixes so that the opponent is indifferent between their own options.$k$, 7::smallint),
  ($f$A game with no pure equilibrium — the standard example$f$, $k$Matching pennies: one player wants to match, the other to differ.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'economics' and t.slug = 'game-theory';
