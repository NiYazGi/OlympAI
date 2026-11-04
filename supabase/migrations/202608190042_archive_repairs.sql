-- Statements whose formulas never rendered.
--
-- On the source site these 16 problems carry a KaTeX parse error: $…$ inside
-- maths, an unknown column spec, a formula that lost its opening. The import
-- copied the broken text, so the page showed raw LaTeX, dollar signs or half a
-- system of equations. Each is rewritten here from the source text, with the
-- missing opening restored where the problem is a well-known one. Two lost
-- too much to restore with confidence; they are hidden until an admin writes
-- them out from the original paper (Admin → Problems).

update public.tasks set problem = $p$В таблице \(A\) записаны числа \(10^k\) (для всех \(k > 0\)) в десятичной системе счисления, в таблице \(B\) они же записаны в двоичной, а в таблице \(C\) — в пятеричной:

\[\begin{array}{ccc} A & B & C\\ 10 & 1010 & 20\\ 100 & 1100100 & 400\\ 1000 & 1111101000 & 13300\\ \vdots & \vdots & \vdots \end{array}\]

Докажите, что каким бы ни было число \(n > 1\), найдётся ровно одно число или в таблице \(B\), или в таблице \(C\), в записи которого ровно \(n\) цифр.$p$
where id = 'apmo-1994-5';

update public.tasks set problem = $p$Определите все четвёрки действительных чисел \(a\), \(b\), \(c\), \(d\), для которых выполнена система равенств

\[\left\{\begin{array}{l} a + b + c + d = 20,\\ ab + ac + ad + bc + bd + cd = 150. \end{array}\right.\]$p$
where id = 'jbmo-2008-1';

update public.tasks set problem = $p$Последовательность \(\{a_n\}\) определена следующим образом:

\(a_1=1\) и для любого \(n\geq2\)

\[a_n = \left\{\begin{array}{ll} a_{n-1}-n, & \text{если } a_{n-1}>n,\\ a_{n-1}+n, & \text{если } a_{n-1}\leq n. \end{array}\right.\]

Найдите минимальное \(n\) такое, что \(a_n=1999\).$p$
where id = 'national-1999-10-3';

update public.tasks set problem = $p$Дан треугольник \(ABC\) и точка \(M\) внутри него. Доказать, что

\[\min\{MA, MB, MC\}+MA+MB+MC < AB+BC+AC.\]$p$
where id = 'national-2000-10-7';

update public.tasks set problem = $p$При каких нижеперечисленных значениях \(A\), \(B\), \(C\) система уравнений

\[\left\{\begin{array}{l} (x - y)(z - t)(z - x)(z - t)^2 = A,\\ (y - z)(t - x)(t - y)(x - z)^2 = B,\\ (x - z)(y - t)(z - t)(y - z)^2 = C \end{array}\right.\]

имеет решение в вещественных числах, и при каких нет?
а) \(A=2\), \(B=8\), \(C=6\); б) \(A=2\), \(B=6\), \(C=8\).$p$
where id in ('national-2005-10-1', 'national-2005-11-1');

update public.tasks set problem = $p$Найдите наибольшее возможное \(\alpha > 0\), такое, что для любых \(a, b, c\) с условием \(0 < a, b, c\leq 1\) выполняется неравенство

\[\frac{1}{a + b + c} \geq \frac{1}{3} + \alpha (1 - a)(1 - b)(1 - c).\]$p$
where id = 'national-2007-9-4';

update public.tasks set problem = $p$Обозначим через \(S_n\) количество упорядоченных наборов из \(n\) натуральных чисел \((a_1, a_2, \ldots, a_n)\), для которых

\[\frac{1}{a_1}+\frac{1}{a_2}+\ldots+\frac{1}{a_n}=1.\]

Определите чётность числа \(S_7\).$p$
where id = 'national-2009-9-3';

update public.tasks set problem = $p$Докажите равенство

\[\frac{\left(1^4 + \frac{1}{4}\right)\left(3^4 + \frac{1}{4}\right)\left(5^4 + \frac{1}{4}\right) \dots \left(11^4 + \frac{1}{4}\right)}{\left(2^4 + \frac{1}{4}\right)\left(4^4 + \frac{1}{4}\right)\left(6^4 + \frac{1}{4}\right) \dots \left(12^4 + \frac{1}{4}\right)} = \frac{1}{313}.\]$p$
where id = 'oblast-2000-9-4';

update public.tasks set problem = $p$Для произвольных положительных действительных чисел \(a\), \(b\), \(c\), удовлетворяющих равенству \(a+b+c=1\), докажите следующее неравенство:

\[\frac{a^3}{a^2 + b^2} + \frac{b^3}{b^2 + c^2} + \frac{c^3}{c^2 + a^2} \geq \frac{1}{2}.\]$p$
where id = 'oblast-2000-9-7';

update public.tasks set problem = $p$Решите следующую систему уравнений в вещественных положительных числах:

\[\left\{\begin{array}{l} x_1 + x_2 + \dots + x_n = 9,\\ \dfrac{1}{x_1} + \dfrac{1}{x_2} + \dots + \dfrac{1}{x_n} = 1. \end{array}\right.\]$p$
where id = 'oblast-2002-10-5';

update public.tasks set problem = $p$Сумма положительных действительных чисел \(x\), \(y\) и \(z\) равна 1. Докажите неравенство:

\[\sqrt{xy + z} + \sqrt{yz + x} + \sqrt{zx + y} \leq \frac{xy + z}{x + y} + \frac{yz + x}{y + z} + \frac{zx + y}{z + x}.\]$p$
where id = 'oblast-2004-11-5';

update public.tasks set problem = $p$Докажите справедливость тождества

\[\sin x + \sin 2x + \dots + \sin nx = \frac{\sin \frac{nx}{2} \cdot \sin \frac{(n + 1)x}{2}}{\sin \frac{x}{2}}, \quad x \ne 2 \pi k,\ k \in \mathbb{Z}.\]$p$
where id = 'oblast-2005-10-3';

update public.tasks set problem = $p$\(0 < a_1 < \dots < a_n\) — заданные числа. Решение неравенства

\[\frac{a_1}{x + a_1} + \frac{a_2}{x + a_2} + \dots + \frac{a_n}{x + a_n} \geq 1\]

составляет объединение нескольких непересекающихся промежутков. Найдите сумму их длин.$p$
where id = 'oblast-2007-10-8';

update public.tasks set problem = $p$Пусть \(a, b, c\) — положительные действительные числа. Докажите неравенство

\[\frac{a}{b} + \frac{b}{c} + \frac{c}{a} \geq 3\sqrt{\frac{a^2 + b^2 + c^2}{ab + bc + ca}}.\]$p$
where id = 'oblast-2008-10-5';

update public.tasks set problem = $p$Определите все пары натуральных чисел \((x, y)\) таких, что

\[\frac{1}{x} + \frac{1}{y} + \frac{1}{[x,y]} + \frac{1}{(x,y)} = \frac{1}{2},\]

где \((x, y)\) — наибольший общий делитель чисел \(x, y\), а \([x, y]\) — наименьшее общее кратное чисел \(x, y\).$p$
where id = 'oblast-2008-9-5';

update public.tasks set problem = $p$Пусть \(a\), \(b\), \(c\) — неотрицательные, а \(x\), \(y\), \(z\) — положительные действительные числа такие, что \(a+b+c=x+y+z\). Докажите неравенство:

\[\frac{a^3}{x^2} + \frac{b^3}{y^2} + \frac{c^3}{z^2} \geq a + b + c.\]$p$
where id = 'oblast-2010-9-3';

update public.tasks set problem = $p$Для каждого натурального \(n\geq 2\) найдите все вещественные решения системы:

\[\left\{\begin{array}{rcl} x_1|x_1| & = & x_2|x_2|+(x_1-1)|x_1-1|, \\ x_2|x_2| & = & x_3|x_3|+(x_2-1)|x_2-1|, \\ & \dots & \\ x_n|x_n| & = & x_1|x_1|+(x_n-1)|x_n-1|. \end{array}\right.\]$p$
where id = 'oblast-2011-10-5';

update public.tasks set problem = $p$Пусть дано целое число \(n \ge 2\). Группа людей называется \(n\)-компактной, если для любого человека из группы можно найти отличных от него \(n\) людей, знакомых друг с другом. Найдите максимально возможное значение \(N\) такое, что любая \(n\)-компактная группа из \(N\) людей содержит подгруппу из \(n + 1\) людей, знакомых друг с другом.$p$
where id = 'silk-road-2004-4';

update public.tasks set problem = $p$Пусть натуральное число \(n \ge 2\). Докажите, что число \((1^{n-1} + 2^{n-1} + \ldots + (n-1)^{n-1}) + 1\) делится на \(n\) тогда и только тогда, когда для каждого простого делителя \(p\) числа \(n\) число \(\dfrac{n}{p}-1\) делится на \(p\) и на \(p - 1\).$p$
where id = 'silk-road-2005-1';

update public.tasks set problem = $p$Определите наименьшее действительное число \(M\) такое, что неравенство

\[(a-bc)(b-ca)(c-ab) \le M \cdot abc\]

выполнено для всех положительных действительных чисел \(a, b, c\), удовлетворяющих равенству \(a+b+c = 1\).$p$
where id = 'silk-road-2011-3';

-- The left-hand side is missing on the source page itself.
update public.tasks set hidden = true where id in ('silk-road-2006-2', 'silk-road-2016-4');
