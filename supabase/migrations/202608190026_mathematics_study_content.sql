-- Notes, quizzes and cards for the three mathematics topics.
--
-- Same rules as the subjects before it: original material, licence recorded,
-- and no worked example that solves a problem from the library. Algebra is
-- built on Vieta rather than on inequalities, because 'inequality-am-gm' asks
-- for the AM-GM proof; number theory works the Euclidean algorithm and orders
-- of a residue rather than the basic residue arithmetic 'number-theory-mod'
-- asks for; combinatorics counts committees rather than lattice paths.

-- ======================================================== combinatorics =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'combinatorics-counting', t.id,
  $t$Counting without listing$t$,
  $t$Four tools that between them settle most counting problems: multiply the independent choices, divide out the orders you do not care about, count the complement, and add back what you subtracted twice.$t$,
  13, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'mathematics' and t.slug = 'combinatorics'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('combinatorics-counting', 'concept', $h$Multiply, or add$h$,
 $b$Two rules underlie everything else.

If a choice is made in stages and the stages are independent, multiply: three shirts and four ties give twelve outfits. If the cases are alternatives that cannot both happen, add: a committee that is either all first-years or all second-years is counted as one total plus the other.

Most mistakes at this level are not arithmetic. They are multiplying where the stages interfere, or adding where the cases overlap.$b$, '{}', 0),

('combinatorics-counting', 'explanation', $h$Order, and dividing it out$h$,
 $b$Arranging k things out of n in a row is a product: n choices, then n-1, and so on for k factors. That is the permutation count P(n,k) = n! / (n-k)!.

If the order does not matter, every group has been counted once for each way of arranging it — k! times. Dividing by that gives the binomial coefficient:

    C(n,k) = n! / (k! (n-k)!)

That division is the whole difference between the two, and naming which one a problem wants is usually the entire difficulty. "How many ways to line up" is a permutation; "how many ways to choose" is a combination.

The symmetry C(n,k) = C(n,n-k) says the same thing twice: choosing which k to take is choosing which n-k to leave.$b$, '{}', 1),

('combinatorics-counting', 'example', $h$A committee, and a podium$h$,
 $b$Eight candidates.

Choose three for a committee, where nobody holds a title:
    C(8,3) = 8*7*6 / (3*2*1) = 56

Choose three for first, second and third place, where the titles differ:
    P(8,3) = 8*7*6 = 336

The second is exactly 3! = 6 times the first, because each committee of three can be arranged on the podium in six ways.$b$, '{}', 2),

('combinatorics-counting', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Independent stages multiply; exclusive cases add.$i$,
   $i$Order matters: P(n,k) = n!/(n-k)!. Order does not: C(n,k) = n!/(k!(n-k)!).$i$,
   $i$C(n,k) = C(n,n-k) — choosing what to take is choosing what to leave.$i$,
   $i$C(n,0) = C(n,n) = 1, and the row of C(n,k) sums to 2^n.$i$,
   $i$0! = 1, which is what makes the formulas work at the edges.$i$
 ], 3),

('combinatorics-counting', 'concept', $h$Count the opposite$h$,
 $b$"At least one" is almost always easier upside down. The arrangements with at least one repeated digit are all of them minus the ones with none; a hand with at least one ace is all hands minus the ace-free ones.

When the cases you are adding start to overlap, inclusion-exclusion keeps the books straight. For two sets:

    |A or B| = |A| + |B| - |A and B|

Subtracting the intersection once fixes the fact that adding the two totals counted it twice. For three sets the pattern continues: add the singles, subtract the pairs, add the triple back.$b$, '{}', 4),

('combinatorics-counting', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$"At least one" usually means: total minus none.$i$,
   $i$Two sets: |A or B| = |A| + |B| - |A and B|.$i$,
   $i$Three sets: singles minus pairs plus the triple.$i$,
   $i$Pigeonhole: n+1 objects in n boxes force a box with two. Trivial to state, hard to spot.$i$,
   $i$Stars and bars: k identical items into n labelled boxes is C(k+n-1, n-1).$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'combinatorics-counting', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('comb-q1', $p$How many ways can a committee of 3 be chosen from 8 people, with no titles?$p$,
   array[$o$56$o$, $o$336$o$, $o$24$o$, $o$512$o$], 0::smallint,
   $e$Order does not matter, so this is C(8,3) = 8*7*6/6 = 56. The 336 is P(8,3), which counts the same committees once for each of the 3! ways of arranging them.$e$, 0::smallint),
  ('comb-q2', $p$C(10,7) equals$p$,
   array[$o$C(10,3)$o$, $o$C(10,7) has no simpler form$o$, $o$C(7,3)$o$, $o$C(10,4)$o$], 0::smallint,
   $e$C(n,k) = C(n,n-k): choosing 7 to include is choosing 3 to leave out. Using it turns a heavy computation into 10*9*8/6 = 120.$e$, 1::smallint),
  ('comb-q3', $p$A fair coin is tossed 5 times. What is the chance of at least one head?$p$,
   array[$o$31/32$o$, $o$1/32$o$, $o$5/32$o$, $o$1/2$o$], 0::smallint,
   $e$Count the opposite. The only way to fail is all five tails, which is 1/32, so at least one head is 31/32. Adding the cases one head, two heads and so on gives the same answer with far more work.$e$, 2::smallint),
  ('comb-q4', $p$In a class of 30, 18 study French and 15 study German, and 8 study both. How many study at least one?$p$,
   array[$o$25$o$, $o$33$o$, $o$22$o$, $o$30$o$], 0::smallint,
   $e$18 + 15 = 33 counts the 8 who do both twice, so subtract them once: 25. The 33 is exactly the error inclusion-exclusion exists to fix.$e$, 3::smallint),
  ('comb-q5', $p$Thirteen people are in a room. What does the pigeonhole principle guarantee about their birth months?$p$,
   array[$o$At least two share a month$o$, $o$Every month has someone$o$, $o$At least two share a date$o$, $o$Nothing, without knowing the birthdays$o$], 0::smallint,
   $e$Thirteen objects, twelve boxes: some box holds two. The principle promises existence, never which box — and it says nothing about every month being filled.$e$, 4::smallint),
  ('comb-q6', $p$How many ways can 6 identical sweets be given to 3 named children, with some possibly getting none?$p$,
   array[$o$28$o$, $o$18$o$, $o$729$o$, $o$120$o$], 0::smallint,
   $e$Stars and bars: 6 identical items into 3 labelled boxes is C(6+3-1, 3-1) = C(8,2) = 28. The sweets being identical is what stops this being 3^6.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'mathematics' and t.slug = 'combinatorics'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$When do you multiply counts, and when do you add?$f$, $k$Multiply independent stages of one choice; add mutually exclusive cases.$k$, 0::smallint),
  ($f$Permutation against combination$f$, $k$P(n,k) = n!/(n-k)! counts arrangements; C(n,k) = n!/(k!(n-k)!) counts selections.$k$, 1::smallint),
  ($f$Why divide by k! to get C(n,k)?$f$, $k$Every selection was counted once for each of the k! orders it could be listed in.$k$, 2::smallint),
  ($f$C(n,k) = ?$f$, $k$C(n,n-k). Choosing what to take is choosing what to leave.$k$, 3::smallint),
  ($f$The sum of a row of binomial coefficients$f$, $k$C(n,0)+...+C(n,n) = 2^n — every subset, counted by size.$k$, 4::smallint),
  ($f$The quickest route to "at least one"$f$, $k$Total minus none.$k$, 5::smallint),
  ($f$Inclusion-exclusion for two sets$f$, $k$|A or B| = |A| + |B| - |A and B|.$k$, 6::smallint),
  ($f$Pigeonhole principle$f$, $k$n+1 objects in n boxes force some box to hold two. It promises existence, not which box.$k$, 7::smallint),
  ($f$Stars and bars$f$, $k$k identical items into n labelled boxes: C(k+n-1, n-1).$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'mathematics' and t.slug = 'combinatorics';

-- ============================================================== algebra =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'algebra-roots-and-coefficients', t.id,
  $t$Roots and coefficients$t$,
  $t$A polynomial and its roots are the same object written two ways. Vieta's formulas are the translation, and most olympiad algebra is knowing which direction to read them in.$t$,
  13, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'mathematics' and t.slug = 'algebra'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('algebra-roots-and-coefficients', 'concept', $h$A polynomial is its roots$h$,
 $b$Every polynomial of degree n factors over the complex numbers into n linear pieces:

    a x^2 + b x + c = a (x - r)(x - s)

Multiply the right side out and compare. The coefficients are not arbitrary numbers that happen to sit there — they are built from the roots:

    r + s = -b/a        r s = c/a

These are Vieta's formulas. For a cubic a x^3 + b x^2 + c x + d with roots r, s, t:

    r+s+t = -b/a        rs+rt+st = c/a        rst = -d/a

The pattern continues: the sums of products taken one at a time, two at a time, three at a time, alternating sign.$b$, '{}', 0),

('algebra-roots-and-coefficients', 'explanation', $h$Why this is worth having$h$,
 $b$Because a great many questions ask about the roots without wanting the roots.

"Find the sum of the squares of the roots" looks like it needs both of them. It does not:

    r^2 + s^2 = (r+s)^2 - 2rs

and both pieces are already visible in the coefficients. The same trick handles 1/r + 1/s = (r+s)/(rs), and r^3 + s^3 = (r+s)^3 - 3rs(r+s).

The move to learn is: rewrite whatever is asked in terms of the symmetric expressions r+s and rs, then read those off. Solving the quadratic is the slow route and often impossible in a competition.

It also runs backwards. Given the sum and product you want, you can write down a quadratic with those roots: x^2 - (sum)x + (product) = 0.$b$, '{}', 1),

('algebra-roots-and-coefficients', 'example', $h$Without ever finding a root$h$,
 $b$Let r and s be the roots of 2x^2 - 7x + 3 = 0. Find r^2 + s^2.

    r + s = 7/2        r s = 3/2
    r^2 + s^2 = (r+s)^2 - 2rs = 49/4 - 3 = 37/4

Check it if you like — the roots are 3 and 1/2, and 9 + 1/4 = 37/4. But nothing in the calculation needed them, and for a cubic with ugly roots there would have been no checking to do.$b$, '{}', 2),

('algebra-roots-and-coefficients', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Quadratic: r+s = -b/a and rs = c/a.$i$,
   $i$Cubic: sum = -b/a, sum of pairs = c/a, product = -d/a.$i$,
   $i$r^2+s^2 = (r+s)^2 - 2rs. Learn this rewrite; it appears constantly.$i$,
   $i$Given a sum S and product P, a quadratic with those roots is x^2 - Sx + P = 0.$i$,
   $i$Discriminant b^2-4ac: positive, two real roots; zero, a repeated root; negative, a conjugate pair.$i$,
   $i$Complex and irrational roots of a real polynomial come in conjugate pairs.$i$
 ], 3),

('algebra-roots-and-coefficients', 'concept', $h$Factors and remainders$h$,
 $b$Dividing a polynomial p(x) by (x - k) leaves a remainder of exactly p(k). That is the remainder theorem, and its useful half is the factor theorem: (x - k) divides p(x) precisely when p(k) = 0.

So testing a candidate root is a substitution, not a division. And if the coefficients are integers, the rational root theorem narrows the candidates to a short list: any rational root p/q in lowest terms has p dividing the constant term and q dividing the leading coefficient.

Between them these turn "factor this cubic" from a search into a handful of substitutions.$b$, '{}', 4),

('algebra-roots-and-coefficients', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Remainder on dividing p(x) by (x-k) is p(k).$i$,
   $i$(x-k) is a factor exactly when p(k) = 0.$i$,
   $i$Rational root p/q: p divides the constant term, q divides the leading coefficient.$i$,
   $i$Degree of a product is the sum of the degrees.$i$,
   $i$A polynomial of degree n has exactly n roots over the complex numbers, counted with multiplicity.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'algebra-roots-and-coefficients', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('alg-q1', $p$For 3x^2 - 12x + 5 = 0, the sum of the roots is$p$,
   array[$o$4$o$, $o$-4$o$, $o$12$o$, $o$5/3$o$], 0::smallint,
   $e$The sum is -b/a = -(-12)/3 = 4. The minus sign in the formula is what the second option forgets; 5/3 is the product.$e$, 0::smallint),
  ('alg-q2', $p$If r+s = 5 and rs = 6, then r^2 + s^2 equals$p$,
   array[$o$13$o$, $o$25$o$, $o$37$o$, $o$11$o$], 0::smallint,
   $e$(r+s)^2 - 2rs = 25 - 12 = 13. Squaring the sum alone gives 25 and double-counts the cross term, which is exactly what the subtraction removes.$e$, 1::smallint),
  ('alg-q3', $p$p(x) is divided by (x - 3) and leaves remainder 0. What follows?$p$,
   array[$o$p(3) = 0, so (x-3) is a factor$o$, $o$p(0) = 3$o$, $o$3 is the leading coefficient$o$, $o$p(x) has degree 3$o$], 0::smallint,
   $e$The remainder on dividing by (x-k) is p(k), so a zero remainder means p(3) = 0 and (x-3) divides p. That is the factor theorem, and it turns root-testing into substitution.$e$, 2::smallint),
  ('alg-q4', $p$A quadratic with roots summing to 7 and multiplying to 10 is$p$,
   array[$o$x^2 - 7x + 10 = 0$o$, $o$x^2 + 7x + 10 = 0$o$, $o$x^2 - 10x + 7 = 0$o$, $o$x^2 + 7x - 10 = 0$o$], 0::smallint,
   $e$x^2 - (sum)x + (product) = 0. The sign on the sum flips and the product does not, which is the second option's mistake; the third has the two swapped.$e$, 3::smallint),
  ('alg-q5', $p$2x^3 - 5x + 3 = 0 has integer coefficients. Which could be a rational root?$p$,
   array[$o$3/2$o$, $o$2/3$o$, $o$5/2$o$, $o$1/5$o$], 0::smallint,
   $e$A rational root p/q needs p dividing the constant 3 and q dividing the leading 2. That allows plus or minus 1, 3, 1/2 and 3/2 — and rules out the others. Whether 3/2 actually is a root is then one substitution away.$e$, 4::smallint),
  ('alg-q6', $p$A real quadratic has discriminant b^2 - 4ac < 0. Its roots are$p$,
   array[$o$a complex conjugate pair$o$, $o$two distinct real numbers$o$, $o$one repeated real number$o$, $o$undefined$o$], 0::smallint,
   $e$A negative discriminant puts a square root of a negative under the formula, giving a conjugate pair. Zero would give the repeated root and positive the two distinct reals. The roots exist either way — over the complex numbers a degree-n polynomial always has n of them.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'mathematics' and t.slug = 'algebra'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$Vieta for a quadratic ax^2+bx+c$f$, $k$Sum of roots = -b/a, product = c/a.$k$, 0::smallint),
  ($f$Vieta for a cubic ax^3+bx^2+cx+d$f$, $k$Sum = -b/a, sum of pairs = c/a, product = -d/a.$k$, 1::smallint),
  ($f$Rewrite r^2 + s^2 using Vieta$f$, $k$(r+s)^2 - 2rs.$k$, 2::smallint),
  ($f$Rewrite 1/r + 1/s$f$, $k$(r+s)/(rs).$k$, 3::smallint),
  ($f$Build a quadratic from a sum S and product P$f$, $k$x^2 - Sx + P = 0.$k$, 4::smallint),
  ($f$Remainder theorem$f$, $k$Dividing p(x) by (x-k) leaves p(k).$k$, 5::smallint),
  ($f$Factor theorem$f$, $k$(x-k) divides p(x) exactly when p(k) = 0.$k$, 6::smallint),
  ($f$Rational root theorem$f$, $k$For p/q in lowest terms: p divides the constant term, q divides the leading coefficient.$k$, 7::smallint),
  ($f$What the discriminant tells you$f$, $k$Positive: two distinct real roots. Zero: one repeated. Negative: a complex conjugate pair.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'mathematics' and t.slug = 'algebra';

-- ======================================================== number theory =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'number-theory-divisibility', t.id,
  $t$Divisibility, the Euclidean algorithm and orders$t$,
  $t$Why gcd is found by remainders rather than by factorising, and how working with the exponent instead of the number settles questions about enormous powers.$t$,
  14, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'mathematics' and t.slug = 'number-theory'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('number-theory-divisibility', 'concept', $h$Division with remainder$h$,
 $b$For any integers a and n > 0 there are unique q and r with

    a = q n + r,   0 <= r < n

That is the whole foundation. The remainder r is what "a mod n" means, and every statement about divisibility is a statement about r being zero.

The primes are the multiplicative atoms: every integer above 1 factors into primes in exactly one way, up to order. Uniqueness is doing real work there — it is why an argument about the factorisation of one side of an equation constrains the other.$b$, '{}', 0),

('number-theory-divisibility', 'explanation', $h$Finding a gcd without factorising$h$,
 $b$Factorising two large numbers to compare their primes is slow and, for genuinely large numbers, hopeless. The Euclidean algorithm avoids it entirely, on one observation:

    gcd(a, b) = gcd(b, a mod b)

Anything dividing both a and b divides the remainder too, so replacing the pair by the smaller pair loses nothing. Repeat until the remainder is zero; the last non-zero value is the gcd.

It also runs backwards. Unwinding the steps writes the gcd as a combination of the originals, gcd(a,b) = ax + by for some integers x and y — Bezout's identity. That is what makes modular inverses computable: a has an inverse mod n exactly when gcd(a,n) = 1, and the unwinding produces it.$b$, '{}', 1),

('number-theory-divisibility', 'example', $h$gcd(1071, 462)$h$,
 $b$    1071 = 2 * 462 + 147
     462 = 3 * 147 + 21
     147 = 7 * 21  + 0

The last non-zero remainder is 21, so gcd(1071, 462) = 21.

Three lines, no factorisation, and the same three lines would work if the numbers had forty digits. Unwinding them gives 21 = 462 - 3*147 = 462 - 3*(1071 - 2*462) = 7*462 - 3*1071, which is Bezout's identity for this pair.$b$, '{}', 2),

('number-theory-divisibility', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$a = qn + r with 0 <= r < n, uniquely. "a mod n" is that r.$i$,
   $i$Every integer above 1 has exactly one prime factorisation, up to order.$i$,
   $i$gcd(a,b) = gcd(b, a mod b). Repeat until the remainder is zero.$i$,
   $i$gcd(a,b) * lcm(a,b) = a*b.$i$,
   $i$Bezout: gcd(a,b) = ax + by for some integers x, y.$i$,
   $i$a is invertible mod n exactly when gcd(a,n) = 1.$i$
 ], 3),

('number-theory-divisibility', 'concept', $h$Working with the exponent$h$,
 $b$Congruences add, subtract and multiply exactly as equations do, which is why they are worth setting up. Division is the exception: cancelling a factor is only safe when it is invertible mod n.

For powers, the useful idea is the order — the smallest k with a^k congruent to 1 mod n. Once you have it, every exponent can be reduced mod k, and a question about a^1000 becomes a question about a small number.

Fermat's little theorem hands you one for free: if p is prime and p does not divide a, then a^(p-1) is congruent to 1 mod p. Euler's theorem generalises it to any modulus with phi(n) in place of p-1.$b$, '{}', 4),

('number-theory-divisibility', 'example', $h$The last digit of 7^100$h$,
 $b$The last digit is the value mod 10, so look for the order of 7.

    7^1 = 7,  7^2 = 49 -> 9,  7^3 -> 3,  7^4 -> 1  (mod 10)

The order is 4. Since 100 = 4 * 25, 7^100 is congruent to (7^4)^25 = 1^25 = 1 mod 10.

The last digit is 1 — established without computing a single one of the eighty-five digits of 7^100.$b$, '{}', 5),

('number-theory-divisibility', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Congruences add, subtract and multiply freely; cancelling needs an invertible factor.$i$,
   $i$The order of a mod n is the smallest k with a^k = 1. Exponents then reduce mod k.$i$,
   $i$Fermat: for prime p not dividing a, a^(p-1) = 1 mod p.$i$,
   $i$Euler: a^phi(n) = 1 mod n whenever gcd(a,n) = 1.$i$,
   $i$Chinese remainder theorem: coprime moduli can be solved separately and recombined.$i$,
   $i$Last digit is mod 10; last two digits is mod 100. Nothing more mysterious than that.$i$
 ], 6);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'number-theory-divisibility', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('nt-q1', $p$Which step is the Euclidean algorithm?$p$,
   array[$o$gcd(a,b) = gcd(b, a mod b)$o$, $o$gcd(a,b) = gcd(a-b, b-a)$o$, $o$gcd(a,b) = a*b / (a+b)$o$, $o$Factorise both and compare primes$o$], 0::smallint,
   $e$Replacing the larger number by the remainder preserves the gcd, because any common divisor of a and b also divides a mod b. Factorising works in principle but is far slower, and hopeless for large numbers.$e$, 0::smallint),
  ('nt-q2', $p$gcd(1071, 462) is$p$,
   array[$o$21$o$, $o$3$o$, $o$7$o$, $o$147$o$], 0::smallint,
   $e$1071 = 2*462 + 147; 462 = 3*147 + 21; 147 = 7*21 + 0. The last non-zero remainder, 21, is the answer. The 147 is an intermediate remainder, not the gcd.$e$, 1::smallint),
  ('nt-q3', $p$When does a have a multiplicative inverse modulo n?$p$,
   array[$o$Exactly when gcd(a,n) = 1$o$, $o$Whenever a is prime$o$, $o$Whenever a < n$o$, $o$Always$o$], 0::smallint,
   $e$Bezout gives ax + ny = 1 precisely when the gcd is 1, and reading that mod n makes x the inverse. A prime a can still share a factor with n — 3 has no inverse mod 6.$e$, 2::smallint),
  ('nt-q4', $p$What is the last digit of 7^100?$p$,
   array[$o$1$o$, $o$7$o$, $o$9$o$, $o$3$o$], 0::smallint,
   $e$Powers of 7 end in 7, 9, 3, 1 and then repeat, so the order mod 10 is 4. As 100 is a multiple of 4, the last digit is 1. The other options are the answers for exponents 1, 2 and 3 mod 4.$e$, 3::smallint),
  ('nt-q5', $p$For a prime p not dividing a, Fermat's little theorem says$p$,
   array[$o$a^(p-1) = 1 mod p$o$, $o$a^p = 1 mod p$o$, $o$a^(p-1) = 0 mod p$o$, $o$p^(a-1) = 1 mod a$o$], 0::smallint,
   $e$The exponent is p-1, not p — the second option is the related statement a^p = a mod p rearranged wrongly. It is the standard way to collapse a huge exponent modulo a prime.$e$, 4::smallint),
  ('nt-q6', $p$If gcd(a,b) = 6 and a*b = 216, what is lcm(a,b)?$p$,
   array[$o$36$o$, $o$6$o$, $o$216$o$, $o$1296$o$], 0::smallint,
   $e$gcd * lcm = a*b, so lcm = 216/6 = 36. The identity is worth remembering precisely because it turns one of the pair into the other without any factorising.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'mathematics' and t.slug = 'number-theory'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$Division with remainder$f$, $k$a = qn + r with 0 <= r < n, uniquely. That r is "a mod n".$k$, 0::smallint),
  ($f$The Euclidean algorithm step$f$, $k$gcd(a,b) = gcd(b, a mod b); stop when the remainder is zero.$k$, 1::smallint),
  ($f$gcd and lcm, related$f$, $k$gcd(a,b) * lcm(a,b) = a*b.$k$, 2::smallint),
  ($f$Bezout's identity$f$, $k$gcd(a,b) = ax + by for some integers x and y.$k$, 3::smallint),
  ($f$When is a invertible mod n?$f$, $k$Exactly when gcd(a,n) = 1.$k$, 4::smallint),
  ($f$The order of a modulo n$f$, $k$The smallest k with a^k = 1 mod n. Exponents can then be reduced mod k.$k$, 5::smallint),
  ($f$Fermat's little theorem$f$, $k$For prime p not dividing a: a^(p-1) = 1 mod p.$k$, 6::smallint),
  ($f$Euler's theorem$f$, $k$a^phi(n) = 1 mod n whenever gcd(a,n) = 1.$k$, 7::smallint),
  ($f$Which operation is unsafe in a congruence?$f$, $k$Cancelling. It needs the factor to be invertible modulo n.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'mathematics' and t.slug = 'number-theory';
