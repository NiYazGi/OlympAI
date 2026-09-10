-- Notes, quizzes and cards for the three physics topics.
--
-- Written for this project, so every row is licence 'original'. It is the
-- first subject to have all four rungs of the ladder in place, and it was
-- chosen because it is also the subject with the most problems to end on.
--
-- One rule held throughout: a worked example never solves a task from the
-- library. The lesson on connected bodies pulls two blocks across a table
-- rather than working the Atwood machine, because 'two-masses-pulley' is a
-- graded five-star problem and a lesson that hands over its answer would make
-- the grader a formality. The methods are taught; the problems stay problems.

-- =========================================================== mechanics ======

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select
  'mechanics-connected-bodies',
  t.id,
  $t$Connected bodies and rolling$t$,
  $t$Two ideas that carry most of olympiad mechanics: bodies joined by a string share one acceleration, and a body that rolls without slipping has its spin locked to its motion.$t$,
  12, 0, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
where s.slug = 'physics' and t.slug = 'mechanics'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('mechanics-connected-bodies', 'concept', $h$One acceleration, two bodies$h$,
 $b$A string that does not stretch forces everything it connects to move together. If one end advances a centimetre, so does the other — so the two bodies share one speed and one acceleration magnitude.

That single sentence is what makes these problems finite. Two bodies would otherwise carry two unknown accelerations; the string leaves one.$b$, '{}', 0),

('mechanics-connected-bodies', 'explanation', $h$Why adding the equations kills the tension$h$,
 $b$Write Newton's second law once per body, along the direction that body actually moves. The string appears in both equations — pulling one body forward and the other backward — and by the third law those two forces have the same magnitude and opposite signs.

Add the equations and the tension cancels, leaving one equation in the shared acceleration. Solve it, then substitute back into either original equation to recover the tension you just eliminated.

The order matters: the sum gives you the motion of the system, and only a single-body equation can give you a force internal to it.$b$, '{}', 1),

('mechanics-connected-bodies', 'example', $h$Two blocks pulled across a table$h$,
 $b$A 4.0 kg block and a 2.0 kg block are joined by a light string on a frictionless table. A horizontal force of 12 N pulls the 4.0 kg block, dragging the 2.0 kg one behind it.

System:      F = (m1 + m2) a        ->   a = 12 / 6.0 = 2.0 m/s^2
Rear block:  T = m2 * a             ->   T = 2.0 * 2.0 = 4.0 N
Check front: F - T = 12 - 4.0 = 8.0 N,  and m1 * a = 4.0 * 2.0 = 8.0 N.  Consistent.

Notice the tension is not 12 N and not 6 N. It is exactly the force needed to accelerate what is behind it.$b$, '{}', 2),

('mechanics-connected-bodies', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$An inextensible string imposes one acceleration magnitude on everything it connects.$i$,
   $i$One free-body diagram per body. A diagram drawn around both hides the force between them.$i$,
   $i$Take positive along each body's own direction of motion; the signs then look after themselves.$i$,
   $i$Add the equations to find the motion, substitute back into one of them to find the internal force.$i$,
   $i$A massless string over a massless frictionless pulley has the same tension throughout.$i$
 ], 3),

('mechanics-connected-bodies', 'concept', $h$Rolling without slipping$h$,
 $b$A wheel that rolls without slipping touches the ground at a point that is, for that instant, not moving at all. The contact point is the pivot; the centre moves forward at v while the body turns at omega.

That gives two links between the motion and the spin: v = omega * R and a = alpha * R. They are what let one unknown do the work of two.$b$, '{}', 4),

('mechanics-connected-bodies', 'explanation', $h$What the friction is for$h$,
 $b$Something has to make the body spin, and gravity acting at the centre exerts no torque about the centre. Static friction at the contact does: it is the only force with a lever arm, so it sets the angular acceleration.

Because the contact point is instantaneously at rest, that friction force acts through no displacement and therefore does no work. Energy is conserved, but it is shared: part goes into the centre's motion, part into the spin, and the split is decided by the moment of inertia.

So there are two routes. Forces and torques: F = ma about the centre together with torque = I * alpha, closed by a = alpha * R. Or energy: m g h = (1/2) m v^2 + (1/2) I omega^2, which is faster when the question asks only for a speed.$b$, '{}', 5),

('mechanics-connected-bodies', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Rolling without slipping: v = omega R and a = alpha R.$i$,
   $i$Static friction at the contact point does no work — the point it acts on is not moving.$i$,
   $i$Torque about the centre comes from the friction alone; gravity acts through the centre.$i$,
   $i$Kinetic energy of a rolling body: (1/2) m v^2 + (1/2) I omega^2.$i$,
   $i$Solid cylinder about its axis: I = (1/2) m R^2. Solid sphere: (2/5) m R^2. Hoop: m R^2.$i$,
   $i$The larger I / (m R^2), the more energy goes into spinning and the slower it descends.$i$
 ], 6);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'mechanics-connected-bodies', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ('mech-q1',
   $p$Two blocks of different mass are joined by a light inextensible string and pulled along a frictionless table. What is true of their accelerations?$p$,
   array[$o$Equal in magnitude$o$, $o$The heavier block accelerates less$o$, $o$Each is inversely proportional to its own mass$o$, $o$They are unrelated until the tension is known$o$],
   0::smallint,
   $e$The string cannot stretch, so if one end moves a certain distance in a certain time, so does the other. Equal displacement at every instant means equal velocity and equal acceleration — whatever the masses are.$e$,
   0::smallint),
  ('mech-q2',
   $p$Why does adding the two Newton equations of a connected pair remove the tension?$p$,
   array[$o$Because it is an internal force and appears in the two equations with opposite signs$o$, $o$Because tension is always small enough to neglect$o$, $o$Because the string is massless, so the tension is zero$o$, $o$Because the two accelerations are equal$o$],
   0::smallint,
   $e$The string pulls one body forward and the other backward with forces that are a third-law pair: same magnitude, opposite direction. In the sum they cancel. A massless string does not have zero tension — it has the same tension at both ends.$e$,
   1::smallint),
  ('mech-q3',
   $p$A 4.0 kg block is joined to a 2.0 kg block by a light string on a frictionless table, and a horizontal force of 12 N pulls the 4.0 kg block. What is the tension?$p$,
   array[$o$4.0 N$o$, $o$6.0 N$o$, $o$8.0 N$o$, $o$12 N$o$],
   0::smallint,
   $e$The system accelerates at a = 12 / 6.0 = 2.0 m/s^2. The string has to accelerate only the rear block, so T = 2.0 kg * 2.0 m/s^2 = 4.0 N. The 8.0 N is what is left over to accelerate the front block.$e$,
   2::smallint),
  ('mech-q4',
   $p$A cylinder rolls down an incline without slipping. What does the static friction at the contact point do?$p$,
   array[$o$Supplies the torque that spins it up, and does no work$o$, $o$Does negative work, heating the surface$o$, $o$Cancels part of gravity, and does no work$o$, $o$Nothing — rolling needs no friction$o$],
   0::smallint,
   $e$It is the only force with a lever arm about the centre, so it is what makes the cylinder turn. Because the contact point is instantaneously at rest, that force acts through no displacement: no work, no heating. Without it the cylinder would slide, not roll.$e$,
   3::smallint),
  ('mech-q5',
   $p$For a wheel of radius R rolling without slipping, which pair of relations holds?$p$,
   array[$o$v = omega R and a = alpha R$o$, $o$v = omega / R and a = alpha / R$o$, $o$v = omega R and a = omega^2 R$o$, $o$v = alpha R and a = omega R$o$],
   0::smallint,
   $e$Rolling locks the translation to the rotation: one turn advances the centre by one circumference. Differentiating v = omega R once gives a = alpha R. The combination omega^2 R is the centripetal acceleration of a point on the rim, which is a different quantity.$e$,
   4::smallint),
  ('mech-q6',
   $p$A hoop and a solid cylinder of the same mass and radius are released together from the same height on the same incline, both rolling without slipping. Which reaches the bottom first?$p$,
   array[$o$The cylinder$o$, $o$The hoop$o$, $o$They arrive together$o$, $o$It depends on the mass$o$],
   0::smallint,
   $e$Both convert the same potential energy, but the hoop has all its mass at radius R, so I / (m R^2) = 1 against the cylinder's 1/2. More of the hoop's energy goes into spinning and less into moving, so it is slower. Neither the mass nor the radius appears in the answer.$e$,
   5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'physics' and t.slug = 'mechanics'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$What does an inextensible string force on the bodies it connects?$f$, $k$One shared speed and one shared acceleration magnitude, whatever their masses.$k$, 0::smallint),
  ($f$How do you eliminate the tension in a connected-body problem?$f$, $k$Add the per-body equations. The tension is internal, so it appears once with each sign and cancels.$k$, 1::smallint),
  ($f$Having found the shared acceleration, how do you get the tension?$f$, $k$Substitute it back into the equation for one body on its own. The system equation cannot give an internal force.$k$, 2::smallint),
  ($f$Rolling without slipping — the two kinematic links$f$, $k$v = omega R and a = alpha R.$k$, 3::smallint),
  ($f$Does static friction do work on a body that rolls without slipping?$f$, $k$No. The contact point is instantaneously at rest, so the force acts through no displacement.$k$, 4::smallint),
  ($f$Kinetic energy of a rolling body$f$, $k$(1/2) m v^2 + (1/2) I omega^2, with omega = v / R.$k$, 5::smallint),
  ($f$Moment of inertia about the axis: solid cylinder, solid sphere, hoop$f$, $k$(1/2) m R^2, (2/5) m R^2, m R^2.$k$, 6::smallint),
  ($f$Why does a hoop roll down an incline more slowly than a cylinder?$f$, $k$Its mass sits at the rim, so a larger share of the same energy goes into rotation instead of translation.$k$, 7::smallint)
) as v(front, back, position)
where s.slug = 'physics' and t.slug = 'mechanics';

-- ====================================================== electrodynamics =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select
  'electrodynamics-resistance',
  t.id,
  $t$Resistance and what actually changes it$t$,
  $t$Where R = rho L / A comes from, why stretching a wire raises its resistance faster than you expect, and how resistors combine.$t$,
  10, 0, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
where s.slug = 'physics' and t.slug = 'electrodynamics'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('electrodynamics-resistance', 'concept', $h$Resistance is shape times material$h$,
 $b$Resistance is defined by R = V / I: how much potential difference it costs to push a given current through.

For a uniform conductor it separates cleanly into a property of the substance and a property of the shape:

    R = rho * L / A

rho is the resistivity — a fact about the material and its temperature. L and A are the length and the cross-sectional area. Nothing else about the geometry matters for a uniform wire.$b$, '{}', 0),

('electrodynamics-resistance', 'explanation', $h$Why length and area enter the way they do$h$,
 $b$Think of the carriers drifting through the lattice, scattering as they go. Double the length and, at the same driving field, a carrier has twice as far to travel and twice as many collisions to survive: the same current costs twice the voltage, so R doubles. Resistance is proportional to L.

Now double the cross-section. Nothing about the journey changes, but there are twice as many carriers making it in parallel, so the same voltage drives twice the current. Resistance is inversely proportional to A.

This is why the area, not the diameter, is the quantity in the formula. Doubling the diameter multiplies the area by four and cuts the resistance to a quarter — the single most common slip in this topic.$b$, '{}', 1),

('electrodynamics-resistance', 'example', $h$A wire stretched to twice its length$h$,
 $b$A wire is drawn out until it is twice as long. The material is unchanged and no metal is lost, so the volume L * A is the same as before.

    L -> 2L,  and since L*A is fixed,  A -> A/2
    R = rho L / A  ->  rho (2L) / (A/2) = 4 * rho L / A

The resistance is four times what it was. Both factors push the same way, which is why the answer is 4 and not 2 — stretching makes the wire longer and thinner at once.$b$, '{}', 2),

('electrodynamics-resistance', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$R = rho L / A for a uniform conductor.$i$,
   $i$rho is a property of the material and its temperature, not of the shape.$i$,
   $i$Double the length: R doubles. Double the diameter: R falls to a quarter.$i$,
   $i$Stretching at constant volume to n times the length multiplies R by n^2.$i$,
   $i$In a metal rho rises with temperature; in a semiconductor it falls.$i$
 ], 3),

('electrodynamics-resistance', 'concept', $h$Series and parallel$h$,
 $b$In series the same current passes through each resistor and the voltages add, so the resistances add: R = R1 + R2 + ...

In parallel each resistor sees the same voltage and the currents add, so the conductances add: 1/R = 1/R1 + 1/R2 + ...

Two consequences worth holding on to: adding anything in series always raises the total, and adding anything in parallel always lowers it — below even the smallest resistor in the group.$b$, '{}', 4),

('electrodynamics-resistance', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Series: resistances add. Parallel: reciprocals add.$i$,
   $i$Two equal resistors in parallel give half of one; n equal ones give R/n.$i$,
   $i$A parallel combination is always smaller than its smallest member.$i$,
   $i$Two resistors in parallel: R = R1 R2 / (R1 + R2). Only for two.$i$,
   $i$Power: P = V I = I^2 R = V^2 / R. Pick the form whose two quantities you actually know.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'electrodynamics-resistance', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ('elec-q1',
   $p$What happens to the resistance of a wire when its length increases, with the material and cross-section unchanged?$p$,
   array[$o$It rises in proportion to the length$o$, $o$It falls in proportion to the length$o$, $o$It rises as the square of the length$o$, $o$It does not change — resistance is a property of the material$o$],
   0::smallint,
   $e$R = rho L / A, so R is proportional to L. The carriers have further to go and more collisions to survive for the same driving voltage. The square law appears only when the area changes at the same time, as it does when a wire is stretched.$e$,
   0::smallint),
  ('elec-q2',
   $p$A wire is stretched until it is twice as long, its volume unchanged. Its resistance becomes$p$,
   array[$o$4 times the original$o$, $o$twice the original$o$, $o$half the original$o$, $o$unchanged, since it is the same piece of metal$o$],
   0::smallint,
   $e$Constant volume means L * A stays fixed, so doubling L halves A. R = rho L / A picks up a factor 2 from the length and another factor 2 from the area: four times in total.$e$,
   1::smallint),
  ('elec-q3',
   $p$Two wires of the same material and length differ only in diameter, one being twice the other. How do their resistances compare?$p$,
   array[$o$The thicker one has a quarter of the resistance$o$, $o$The thicker one has half the resistance$o$, $o$The thicker one has twice the resistance$o$, $o$They are the same — diameter does not appear in R = rho L / A$o$],
   0::smallint,
   $e$The formula contains the area, and area goes as the square of the diameter. Twice the diameter is four times the area, so a quarter of the resistance. Mistaking diameter for area is the usual error here.$e$,
   2::smallint),
  ('elec-q4',
   $p$Resistivity rho depends on$p$,
   array[$o$the material and its temperature$o$, $o$the length of the sample$o$, $o$the cross-sectional area$o$, $o$the current flowing through it$o$],
   0::smallint,
   $e$rho is what is left after the geometry has been divided out — it says what the substance does, not what shape it was cut into. Temperature changes it: upward for a metal, downward for a semiconductor.$e$,
   3::smallint),
  ('elec-q5',
   $p$A 6 ohm and a 3 ohm resistor are connected in parallel. The combination is$p$,
   array[$o$2 ohm$o$, $o$4.5 ohm$o$, $o$9 ohm$o$, $o$18 ohm$o$],
   0::smallint,
   $e$R = R1 R2 / (R1 + R2) = 18 / 9 = 2 ohm. Worth a sanity check: a parallel combination must come out below its smallest member, and 2 is below 3.$e$,
   4::smallint),
  ('elec-q6',
   $p$A resistor is added in parallel to an existing network. The total resistance$p$,
   array[$o$always falls$o$, $o$always rises$o$, $o$rises or falls depending on the value added$o$, $o$is unchanged$o$],
   0::smallint,
   $e$Another parallel branch is another path for the current, so the conductance goes up and the resistance goes down — however large the added resistor is. Series is the mirror image: adding anything always raises the total.$e$,
   5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'physics' and t.slug = 'electrodynamics'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$Resistance of a uniform conductor$f$, $k$R = rho L / A — resistivity times length over cross-sectional area.$k$, 0::smallint),
  ($f$What does resistivity depend on?$f$, $k$The material and its temperature. Not the shape, not the current.$k$, 1::smallint),
  ($f$Double the diameter of a wire. What happens to R?$f$, $k$It falls to a quarter: area goes as the square of the diameter.$k$, 2::smallint),
  ($f$Stretch a wire to n times its length at constant volume. What happens to R?$f$, $k$It is multiplied by n^2 — longer and thinner at the same time.$k$, 3::smallint),
  ($f$Series and parallel, in one line each$f$, $k$Series: resistances add. Parallel: reciprocals add.$k$, 4::smallint),
  ($f$Two resistors in parallel$f$, $k$R = R1 R2 / (R1 + R2). The result is always below the smaller of the two.$k$, 5::smallint),
  ($f$Three forms of electrical power$f$, $k$P = V I = I^2 R = V^2 / R.$k$, 6::smallint),
  ($f$Metal against semiconductor, as temperature rises$f$, $k$A metal's resistivity rises; a semiconductor's falls.$k$, 7::smallint)
) as v(front, back, position)
where s.slug = 'physics' and t.slug = 'electrodynamics';

-- ======================================================= thermodynamics =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select
  'thermodynamics-first-law',
  t.id,
  $t$The first law and the area under a pV curve$t$,
  $t$Bookkeeping for heat and work: what the signs mean, how to read work off a pV diagram, and what efficiency is actually a ratio of.$t$,
  12, 0, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
where s.slug = 'physics' and t.slug = 'thermodynamics'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('thermodynamics-first-law', 'concept', $h$Energy in, energy out$h$,
 $b$The first law is conservation of energy with the two ways of moving it named separately:

    delta U = Q - W

Q is the heat added to the gas. W is the work done by the gas on its surroundings. What is left over changes U, the internal energy.

The minus sign is the whole content of the convention: a gas that expands pushes on the world, spends energy doing it, and cools unless heat replaces what it spent. Some books write delta U = Q + W with W the work done on the gas. Both are correct; mixing them is not.$b$, '{}', 0),

('thermodynamics-first-law', 'explanation', $h$Work is an area, not a formula$h$,
 $b$When a gas expands by dV against pressure p it does p dV of work, so over a whole process

    W = integral of p dV

which is exactly the area under the path on a pV diagram. That is why the diagram is worth drawing: the work is visible.

Three consequences follow immediately. A vertical line on the diagram encloses no area, so a constant-volume step does no work at all. A horizontal line gives a rectangle, so a constant-pressure step does p * delta V. And a closed loop returns the gas to the state it started in, so delta U = 0 around it and the net work equals the area the loop encloses — heat in, work out, nothing accumulated.

The direction round the loop decides the sign. Clockwise means expanding at the higher pressure and compressing at the lower one, so more work comes out than goes in: an engine. Anticlockwise is the same machine run backwards, taking work in to move heat — a fridge.$b$, '{}', 1),

('thermodynamics-first-law', 'example', $h$One isobaric step, start to finish$h$,
 $b$A gas expands at a constant 2.0 * 10^5 Pa from 1.0 L to 3.0 L, absorbing 900 J of heat.

    delta V = 3.0 - 1.0 = 2.0 L = 2.0 * 10^-3 m^3
    W = p * delta V = 2.0*10^5 * 2.0*10^-3 = 400 J   (done by the gas)
    delta U = Q - W = 900 - 400 = 500 J

So of the 900 J that went in, 400 J left again as work on the surroundings and 500 J stayed as internal energy — which, for an ideal gas, means the temperature rose.

Had the same gas been heated in a sealed rigid container, W would be zero and all 900 J would have gone into U.$b$, '{}', 2),

('thermodynamics-first-law', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$delta U = Q - W, with W the work done by the gas. State your convention before you start.$i$,
   $i$W is the area under the process on a pV diagram; the net work per cycle is the area enclosed.$i$,
   $i$Isochoric: W = 0. Isobaric: W = p delta V. Isothermal ideal gas: delta U = 0, so Q = W.$i$,
   $i$Adiabatic: Q = 0, so delta U = -W — the gas cools as it expands.$i$,
   $i$For an ideal gas U depends on temperature alone: delta U = n Cv delta T in every process, not just at constant volume.$i$,
   $i$Clockwise loop: net work out, an engine. Anticlockwise: net work in, a refrigerator.$i$
 ], 3),

('thermodynamics-first-law', 'concept', $h$What efficiency is a ratio of$h$,
 $b$For a cycle, efficiency is what you wanted over what you paid for:

    eta = W_net / Q_in

W_net is the area enclosed by the loop. Q_in is the heat absorbed — added over the legs where heat flows into the gas, and only those. Heat rejected elsewhere in the cycle does not reduce Q_in; it is the reason eta is below 1 in the first place.

Working out which legs absorb heat is most of the work in these problems. Do it leg by leg with the first law, and keep the positive ones.$b$, '{}', 4),

('thermodynamics-first-law', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$eta = W_net / Q_in, where Q_in counts only the legs on which heat enters.$i$,
   $i$Find Q leg by leg from delta U = Q - W; do not use the net heat as the denominator.$i$,
   $i$No cycle between two temperatures can beat the Carnot value 1 - Tc / Th, with T in kelvin.$i$,
   $i$A real cycle quoted as more efficient than its Carnot bound is an arithmetic error, not a discovery.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'thermodynamics-first-law', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ('thermo-q1',
   $p$In the form delta U = Q - W, what does W stand for?$p$,
   array[$o$The work done by the gas on its surroundings$o$, $o$The work done on the gas by its surroundings$o$, $o$The total energy of the gas$o$, $o$The heat rejected to the cold reservoir$o$],
   0::smallint,
   $e$With the minus sign, W is the work the gas does. Expanding costs it energy, so U falls unless heat makes up the difference. The other convention, delta U = Q + W, defines W the opposite way — either is fine as long as you do not switch mid-problem.$e$,
   0::smallint),
  ('thermo-q2',
   $p$A gas is heated in a sealed rigid container. How much work does it do?$p$,
   array[$o$None$o$, $o$p delta V$o$, $o$The area enclosed by the process$o$, $o$Equal to the heat added$o$],
   0::smallint,
   $e$Work needs a change in volume — W = integral p dV, and dV is zero throughout. On a pV diagram the process is a vertical line, which encloses no area. Every joule of heat goes into internal energy.$e$,
   1::smallint),
  ('thermo-q3',
   $p$On a pV diagram, the net work done by a gas over one complete cycle equals$p$,
   array[$o$the area enclosed by the loop$o$, $o$the area under the upper branch only$o$, $o$zero, because the gas returns to its initial state$o$, $o$the total heat absorbed$o$],
   0::smallint,
   $e$The gas returns to the same state, so delta U = 0 over the cycle — but that makes the net heat equal to the net work, not zero. Work out along the top and work in along the bottom differ by exactly the enclosed area.$e$,
   2::smallint),
  ('thermo-q4',
   $p$An ideal gas expands isothermally. Which statement is right?$p$,
   array[$o$delta U = 0, so the heat absorbed equals the work done$o$, $o$Q = 0, so the gas cools$o$, $o$W = 0, since the temperature does not change$o$, $o$delta U equals the work done by the gas$o$],
   0::smallint,
   $e$For an ideal gas the internal energy depends only on temperature, so an isothermal process has delta U = 0 and the first law reduces to Q = W. Heat flows in at exactly the rate the gas spends it pushing outwards. Q = 0 would be adiabatic, a different process.$e$,
   3::smallint),
  ('thermo-q5',
   $p$The efficiency of a cycle is defined as$p$,
   array[$o$net work out divided by the heat absorbed$o$, $o$net work out divided by the net heat$o$, $o$heat absorbed divided by heat rejected$o$, $o$net work out divided by the internal energy$o$],
   0::smallint,
   $e$Efficiency is what you get over what you pay for, and you pay for the heat that goes in. Using the net heat in the denominator makes it identical to the numerator and gives 100% for every cycle — a good sign the definition has slipped.$e$,
   4::smallint),
  ('thermo-q6',
   $p$A cycle runs anticlockwise on a pV diagram. What is it?$p$,
   array[$o$A refrigerator: work goes in, heat is moved$o$, $o$An engine with unusually high efficiency$o$, $o$An impossible cycle$o$, $o$An engine running in reverse gear, but still producing work$o$],
   0::smallint,
   $e$Anticlockwise means the compression happens at the higher pressure, so more work goes in than comes out. The net work is negative and the machine spends it moving heat from cold to hot — a fridge or a heat pump.$e$,
   5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'physics' and t.slug = 'thermodynamics'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t
join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$State the first law, and say what each symbol means$f$, $k$delta U = Q - W. Q is heat added to the gas, W is work done by the gas, delta U is the change in internal energy.$k$, 0::smallint),
  ($f$How do you read the work off a pV diagram?$f$, $k$It is the area under the path. For a closed cycle, the net work is the area the loop encloses.$k$, 1::smallint),
  ($f$Work done in an isochoric process$f$, $k$Zero — no change in volume, no area under the line.$k$, 2::smallint),
  ($f$Isothermal expansion of an ideal gas$f$, $k$delta U = 0, so Q = W: every joule of heat goes straight out as work.$k$, 3::smallint),
  ($f$Adiabatic process$f$, $k$Q = 0, so delta U = -W. An expanding gas cools because it is spending its own internal energy.$k$, 4::smallint),
  ($f$Internal energy of an ideal gas$f$, $k$A function of temperature alone: delta U = n Cv delta T in any process, not only at constant volume.$k$, 5::smallint),
  ($f$Efficiency of a cycle$f$, $k$eta = W_net / Q_in, where Q_in adds up only the legs on which heat enters the gas.$k$, 6::smallint),
  ($f$Clockwise against anticlockwise on a pV diagram$f$, $k$Clockwise: net work out, an engine. Anticlockwise: net work in, a refrigerator.$k$, 7::smallint),
  ($f$The ceiling on efficiency between two temperatures$f$, $k$The Carnot value 1 - Tc/Th, with both temperatures in kelvin.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'physics' and t.slug = 'thermodynamics';
