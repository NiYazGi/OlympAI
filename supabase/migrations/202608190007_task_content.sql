-- Give every task a complete statement.
--
-- The frontend previously kept its own copy of the catalogue in lib/data.ts and
-- had a full "given / find" breakdown for exactly one task; the other eight fell
-- back to generic filler text that read like a problem but contained none. The
-- catalogue now lives here only, and every row carries real content.

alter table public.tasks
  add column if not exists estimated_minutes smallint
    check (estimated_minutes is null or estimated_minutes between 1 and 600),
  add column if not exists given text[] not null default '{}',
  add column if not exists find_prompt text,
  add column if not exists diagram_url text;

update public.tasks set
  problem = 'Two masses m1 and m2 (with m1 > m2) hang from the ends of a light, inextensible string that passes over a frictionless, massless pulley. The system is released from rest.',
  given = array[
    'm1 = 3.0 kg, m2 = 2.0 kg',
    'The string is massless and inextensible',
    'The pulley is frictionless and massless',
    'g = 9.8 m/s^2'
  ],
  find_prompt = 'The acceleration a of the system and the tension T in the string.',
  official_solution = 'a = (m1 - m2)g / (m1 + m2) = 1.96 m/s^2;  T = 2*m1*m2*g / (m1 + m2) = 23.5 N',
  hints = array[
    'Draw a separate free-body diagram for each mass.',
    'The string is inextensible, so both masses share one acceleration magnitude.',
    'Write Newton''s second law along the direction of motion for each mass.',
    'Add the two equations to eliminate T, then back-substitute for the tension.'
  ],
  estimated_minutes = 20,
  diagram_url = '/pulley-diagram.png'
where id = 'two-masses-pulley';

update public.tasks set
  problem = 'A thin ring of radius R carries a total charge Q spread uniformly along its circumference. Consider a point P on the axis of the ring, a distance z from its centre.',
  given = array[
    'Ring radius R, total charge Q, uniform linear density',
    'P lies on the axis at distance z from the centre',
    'k = 1 / (4*pi*epsilon_0)'
  ],
  find_prompt = 'The electric field at P as a function of z, and the value of z at which its magnitude is largest.',
  official_solution = 'E(z) = k*Q*z / (z^2 + R^2)^(3/2), directed along the axis; the magnitude peaks at z = R/sqrt(2).',
  hints = array[
    'Split the ring into charge elements dq and write the field of one element.',
    'Use the symmetry of the ring to argue that the transverse components cancel.',
    'Only the axial component survives: integrate dE * cos(theta) over the ring.',
    'To find the maximum, differentiate E(z) with respect to z and set it to zero.'
  ],
  estimated_minutes = 25
where id = 'charged-ring-field';

update public.tasks set
  problem = 'A solid cylinder of mass m and radius R is released from rest on an incline of angle theta and rolls down without slipping.',
  given = array[
    'Solid cylinder, mass m, radius R',
    'Moment of inertia about the axis I = m*R^2 / 2',
    'Incline angle theta, rolling without slipping'
  ],
  find_prompt = 'The acceleration of the centre of mass, and the smallest coefficient of static friction that keeps the cylinder rolling.',
  official_solution = 'a = (2/3)*g*sin(theta);  mu_min = tan(theta) / 3',
  hints = array[
    'Rolling without slipping ties the linear and angular accelerations: a = alpha * R.',
    'Write Newton''s second law along the incline and the torque equation about the centre.',
    'Friction supplies the torque, so it cannot be ignored even though no energy is lost.',
    'Solve for the friction force, then impose f <= mu * N.'
  ],
  estimated_minutes = 15
where id = 'rolling-cylinder';

update public.tasks set
  problem = 'n moles of a monatomic ideal gas are taken around the closed rectangular cycle 1-2-3-4-1 in the pressure-volume plane: 1->2 isobaric expansion at p0 from V0 to 2*V0; 2->3 isochoric cooling at 2*V0 from p0 to p0/2; 3->4 isobaric compression at p0/2 from 2*V0 back to V0; 4->1 isochoric heating at V0 from p0/2 back to p0.',
  given = array[
    'Monatomic ideal gas, n moles, C_V = (3/2)*R',
    'Cycle corners: (p0, V0), (p0, 2*V0), (p0/2, 2*V0), (p0/2, V0)',
    'All four processes are quasi-static'
  ],
  find_prompt = 'The net work per cycle, the heat absorbed, and the efficiency of the cycle.',
  official_solution = 'W_net = p0*V0/2;  Q_in = 4*p0*V0 (leg 4->1 plus leg 1->2);  eta = 1/8 = 12.5%',
  hints = array[
    'Net work is the area enclosed by the rectangle in the p-V plane.',
    'Work is zero on the two isochoric legs.',
    'Use Q = n*C_p*dT on the isobaric legs and Q = n*C_V*dT on the isochoric ones.',
    'Efficiency counts only the heat absorbed, so separate the positive Q legs from the negative ones.'
  ],
  estimated_minutes = 18
where id = 'ideal-gas-cycle';

update public.tasks set
  problem = 'Two identical simple pendulums, each of mass m and length L, hang side by side. Their bobs are joined by a light spring of stiffness k that is unstretched when both pendulums hang vertically. Consider small oscillations in the plane of the two pendulums.',
  given = array[
    'Two identical pendulums: mass m, length L',
    'Coupling spring of stiffness k between the bobs, unstretched at equilibrium',
    'Small-angle approximation: sin(theta) ~ theta'
  ],
  find_prompt = 'The two normal-mode frequencies and a description of the motion in each mode.',
  official_solution = 'omega_1 = sqrt(g/L) (bobs in phase, spring never stretches); omega_2 = sqrt(g/L + 2*k/m) (bobs exactly out of phase).',
  hints = array[
    'Write the equation of motion for each bob, keeping the spring force proportional to the difference of the displacements.',
    'Add the two equations, then subtract them.',
    'The sum and the difference of the displacements each obey a simple harmonic equation.',
    'Interpret each combination physically: one mode leaves the spring at its natural length.'
  ],
  estimated_minutes = 22
where id = 'pendulum-small-osc';

update public.tasks set
  problem = 'Count the lattice paths from (0, 0) to (n, n) that use only unit steps to the right and unit steps up and never rise above the diagonal line y = x.',
  given = array[
    'Steps are (1, 0) and (0, 1) only',
    'The path runs from (0, 0) to (n, n)',
    'Every point of the path satisfies y <= x'
  ],
  find_prompt = 'A closed-form expression for the number of such paths.',
  official_solution = 'C(n) = binomial(2n, n) / (n + 1), the n-th Catalan number.',
  hints = array[
    'First count all paths from (0, 0) to (n, n) ignoring the constraint.',
    'Check small cases by hand: n = 1, 2, 3.',
    'Reflect a bad path across the line y = x + 1 and see where it ends up.',
    'The reflection is a bijection between bad paths and paths to a shifted endpoint, so subtract that count.'
  ],
  estimated_minutes = 30
where id = 'combinatorial-paths';

update public.tasks set
  problem = 'Let a, b and c be positive real numbers. Prove that (a + b + c) / 3 >= (a*b*c)^(1/3), and determine exactly when equality holds.',
  given = array[
    'a, b, c > 0',
    'No further constraints are imposed'
  ],
  find_prompt = 'A complete proof of the inequality together with the equality condition.',
  official_solution = 'The inequality holds for all positive a, b, c, with equality if and only if a = b = c. One route: the identity a^3 + b^3 + c^3 - 3*a*b*c = (a + b + c)*(a^2 + b^2 + c^2 - a*b - b*c - c*a), whose second factor equals half the sum of squared differences and is therefore non-negative.',
  hints = array[
    'Test the equality case first: guess when the two sides can coincide.',
    'Substituting a = x^3, b = y^3, c = z^3 turns the statement into a polynomial inequality.',
    'The identity x^3 + y^3 + z^3 - 3*x*y*z factors; find the factorisation.',
    'Write the second factor as a sum of squares to prove it is non-negative, and read off the equality condition.'
  ],
  estimated_minutes = 35
where id = 'inequality-am-gm';

update public.tasks set
  problem = 'An infinite ladder network is built from identical capacitors of capacitance C. Each rung contributes one capacitor in series along the top rail and one capacitor connecting that node down to the bottom rail. The ladder repeats without end to the right.',
  given = array[
    'Every capacitor in the network has the same capacitance C',
    'Each repeating cell: one series capacitor, one shunt capacitor',
    'The ladder is infinite to the right'
  ],
  find_prompt = 'The equivalent capacitance measured across the input terminals.',
  official_solution = 'C_eq = C*(sqrt(5) - 1)/2, i.e. C divided by the golden ratio.',
  hints = array[
    'Call the answer C_eq and treat it as an unknown.',
    'Removing the first cell leaves a network identical to the original one.',
    'That self-similarity gives one equation relating C_eq to itself through one series and one parallel combination.',
    'Solve the resulting quadratic and discard the negative root.'
  ],
  estimated_minutes = 28
where id = 'capacitor-network';

update public.tasks set
  problem = 'Let n range over all integers. Determine which residues modulo 7 can occur for n^2, and use the result to decide whether the equation x^2 + y^2 = 7*z^2 has a solution in integers other than x = y = z = 0.',
  given = array[
    'n is an arbitrary integer',
    'All congruences are taken modulo 7'
  ],
  find_prompt = 'The set of quadratic residues modulo 7, and a justified answer for the equation.',
  official_solution = 'n^2 mod 7 is one of {0, 1, 2, 4}. Since 1, 2 and 4 are the non-zero squares, x^2 + y^2 = 0 (mod 7) forces both x and y to be divisible by 7; infinite descent then rules out any non-trivial solution.',
  hints = array[
    'There are only seven residue classes: square each one and list the results.',
    'Note which non-zero values appear, and which pairs of them can sum to 0 modulo 7.',
    'Conclude that 7 must divide both x and y.',
    'Divide through by 49 and repeat the argument to get an infinite descent.'
  ],
  estimated_minutes = 12
where id = 'number-theory-mod';

-- Anything seeded later without content should fail loudly rather than silently
-- rendering an empty statement. (add constraint has no IF NOT EXISTS form.)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_problem_not_blank'
  ) then
    alter table public.tasks
      add constraint tasks_problem_not_blank check (length(btrim(problem)) > 0);
  end if;
end
$$;
