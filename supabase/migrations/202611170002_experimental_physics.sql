-- Experimental physics: measurements, uncertainties, linearised graphs and
-- the lab report, alongside the theory problems. A topic of its own with a
-- lesson, a quiz, cards and six problems built on data tables.
--
-- Written for OlympAI, licence 'original'. The data were generated from known
-- laws with realistic noise; the reference solutions were computed from the
-- same tables by least squares, so every number in them matches the data.

insert into public.topics (subject_id, name, slug)
select s.id, 'Experimental physics', 'experimental'
from public.subjects s where s.slug = 'physics'
on conflict (subject_id, slug) do nothing;

insert into public.tasks (id, subject_id, topic_id, title, problem, difficulty, estimated_minutes, official_solution, hints, source, licence, attribution, grade_min, grade_max)
select v.id, s.id, t.id, v.title, v.problem, v.difficulty, v.minutes, v.solution, v.hints, 'OlympAI — экспериментальный тур', 'original', 'Written for OlympAI', 9, 11
from (values
  ($x$exp-pendulum-g$x$, $x$Ускорение свободного падения по маятнику$x$, $x$Школьник измерял время \(t_{10}\) десяти полных колебаний нитяного маятника при разной длине нити \(L\). Секундомер запускался вручную.

```
L, м | t10, с
0.30 | 11.02
0.45 | 13.43
0.60 | 15.58
0.75 | 17.33
0.90 | 19.06
1.05 | 20.55
```

1. Какую зависимость нужно построить, чтобы точки легли на прямую? Обоснуйте.
2. Найдите по графику ускорение свободного падения \(g\) и оцените его погрешность.
3. Почему измеряли время десяти колебаний, а не одного? Назовите ещё один источник систематической погрешности и как его уменьшить.$x$, 3, 40, $x$Для математического маятника \(T = 2\pi\sqrt{L/g}\), значит \(T^2 = \frac{4\pi^2}{g} L\): график \(T^2(L)\) — прямая через начало координат, наклон \(k = 4\pi^2/g\).
\(T = t_{10}/10\); \(T^2\) (с²): 1.214, 1.804, 2.427, 3.003, 3.633, 4.223.
МНК: \(k = 4.020 \pm 0.020\) с²/м, свободный член \(0.004 \pm 0.014\) с² (совместим с нулём).
\(g = 4\pi^2/k = 9.82\) м/с², \(\Delta g = g\,\Delta k/k \approx 0.05\) м/с².
Десять колебаний: ошибка реакции (~0,2 с) делится на 10. Систематика: L надо мерить до центра груза, амплитуда должна быть малой (< 10°); ненулевой свободный член выдаёт ошибку в длине.$x$, array[$x$Из формулы периода выразите величину, линейную по L.$x$, $x$Наклон прямой T²(L) связан с g.$x$, $x$Сравните ошибку реакции с измеряемым временем.$x$]::text[]),
  ($x$exp-resistor-iv$x$, $x$Сопротивление по вольт-амперной характеристике$x$, $x$Для резистора сняли зависимость силы тока от напряжения. Вольтметр подключён параллельно резистору, амперметр — последовательно со всей этой парой.

```
U, В | I, мА
0.0 | 0.0
0.5 | 10.6
1.0 | 21.0
1.5 | 31.9
2.0 | 42.3
2.5 | 52.6
3.0 | 63.4
```

1. Найдите сопротивление \(R\) по графику \(I(U)\) и оцените погрешность.
2. Почему наклон графика лучше, чем среднее отношений \(U/I\)?
3. Какую систематическую погрешность даёт такая схема подключения? В какую сторону она смещает результат и когда ею можно пренебречь?$x$, 3, 35, $x$МНК для \(I = U/R + I_0\): наклон \(21.11 \pm 0.06\) мА/В, \(I_0 = 0.02 \pm 0.10\) мА ≈ 0.
\(R = 1/\text{наклон} = 47.4\) Ом, \(\Delta R \approx 0.1\) Ом.
Наклон использует все точки и не зависит от смещения нуля приборов; отношение U/I в каждой точке чувствительно к нему.
Амперметр меряет ток через резистор и вольтметр: получаем \(R R_V/(R+R_V) < R\), результат занижен; пренебрежимо при \(R_V \gg R\).$x$, array[$x$Постройте I от U и проведите прямую.$x$, $x$Какой ток на самом деле проходит через амперметр?$x$]::text[]),
  ($x$exp-cooling-law$x$, $x$Проверка закона охлаждения Ньютона$x$, $x$Стакан горячей воды остывает в комнате с температурой \(T_0 = 22.0\) °C. Температура воды:

```
t, мин | T, °C
0 | 80.0
2 | 70.9
4 | 63.2
6 | 56.6
8 | 51.1
10 | 46.4
12 | 42.5
```

По закону Ньютона скорость остывания пропорциональна разности температур: \(\frac{dT}{dt} = -k (T - T_0)\).
1. Какой график нужно построить, чтобы проверить этот закон? Что должно на нём получиться?
2. Найдите \(k\) и оцените погрешность.
3. За какое время разность температур уменьшается вдвое? Как изменится \(k\), если накрыть стакан крышкой, и почему?$x$, 4, 45, $x$Решение уравнения: \(T - T_0 = (T_{нач} - T_0) e^{-kt}\), значит \(\ln(T - T_0)\) линейно убывает со временем — закон подтверждается, если точки ложатся на прямую.
\(\ln(T-T_0)\): 4.060, 3.890, 3.718, 3.544, 3.371, 3.195, 3.020.
МНК: наклон \(-0.0868 \pm 0.0002\) мин⁻¹, т.е. \(k = 0.0868\) мин⁻¹.
Время уменьшения разности вдвое \(t_{1/2} = \ln 2 / k \approx 8.0\) мин.
С крышкой уменьшается испарение — главный канал отвода тепла сверху, поэтому \(k\) уменьшится.$x$, array[$x$Решите дифференциальное уравнение и возьмите логарифм.$x$, $x$Наклон прямой ln(T−T₀) от t равен −k.$x$]::text[]),
  ($x$exp-spring-mass$x$, $x$Жёсткость пружины и её «эффективная масса»$x$, $x$К пружине подвешивали грузы массой \(m\) и измеряли время \(t_{20}\) двадцати колебаний.

```
m, кг | t20, с
0.050 | 9.62
0.100 | 12.61
0.150 | 15.07
0.200 | 17.18
0.250 | 19.07
```

Пружина не невесома, поэтому период лучше описывается формулой \(T = 2\pi\sqrt{(m + m_{эф})/k}\).
1. Постройте линеаризованный график и найдите жёсткость \(k\).
2. Найдите \(m_{эф}\). Какую долю массы пружины она обычно составляет по теории?
3. Оцените погрешность \(k\).$x$, 4, 45, $x$\(T^2 = \frac{4\pi^2}{k} m + \frac{4\pi^2}{k} m_{эф}\): \(T^2(m)\) — прямая с наклоном \(4\pi^2/k\) и отрезком \(4\pi^2 m_{эф}/k\) на оси \(T^2\).
\(T^2\) (с²): 0.2314, 0.3975, 0.5678, 0.7379, 0.9092.
МНК: наклон \(3.392 \pm 0.011\) с²/кг, отрезок \(0.0600 \pm 0.0018\) с².
\(k = 4\pi^2/\text{наклон} \approx 11.6\) Н/м, \(\Delta k \approx 0.0\) Н/м.
\(m_{эф} = \text{отрезок}/\text{наклон} \approx 18\) г; по теории для однородной пружины \(m_{эф} \approx m_{пр}/3\).$x$, array[$x$Возведите формулу периода в квадрат.$x$, $x$Отрезок на оси T² — не ошибка, а информация о пружине.$x$]::text[]),
  ($x$exp-density-uncertainty$x$, $x$Плотность цилиндра и её погрешность$x$, $x$Цилиндр измерили штангенциркулем (цена деления 0,05 мм) и взвесили на весах (точность 0,1 г):
диаметр \(d = 20{,}00\) мм, высота \(h = 30{,}00\) мм, масса \(m = 25{,}4\) г.

1. Найдите плотность материала.
2. Оцените относительную и абсолютную погрешность плотности. Какое измерение вносит наибольший вклад?
3. Запишите результат по правилам: сколько значащих цифр оставить и почему.$x$, 2, 25, $x$\(V = \pi d^2 h/4 = 9.425\) см³, \(\rho = m/V \approx 2695\) кг/м³.
Относительная погрешность (оценка сверху): \(\varepsilon = 2\frac{\Delta d}{d} + \frac{\Delta h}{h} + \frac{\Delta m}{m} = 0.0050 + 0.0017 + 0.0039 \approx 1.06\%\).
\(\Delta\rho \approx 29\) кг/м³. Наибольший вклад — диаметр (входит в квадрате) и масса.
Ответ: \(\rho = (2.70 \pm 0.03)\cdot 10^3\) кг/м³ — погрешность округляют до одной-двух значащих цифр, результат — до того же разряда.$x$, array[$x$Для произведения степеней складываются относительные погрешности с коэффициентами-степенями.$x$, $x$Диаметр входит в объём в квадрате.$x$]::text[]),
  ($x$exp-friction-design$x$, $x$Спланируйте эксперимент: коэффициент трения$x$, $x$Оборудование: деревянный брусок, длинная доска, которую можно наклонять, линейка, секундомер, нить. Динамометра нет.

Предложите способ измерить коэффициент трения скольжения бруска по доске. Отчёт должен содержать:
1. идею метода и расчётную формулу (с выводом);
2. что и сколько раз измерять, какой график построить;
3. основные источники погрешности и как их уменьшить;
4. как проверить, что брусок действительно скользит равноускоренно.$x$, 3, 35, $x$Один из правильных способов: при угле \(\alpha\), большем угла трения, брусок соскальзывает с ускорением \(a = g(\sin\alpha - \mu\cos\alpha)\), отсюда \(\mu = \tan\alpha - \frac{a}{g\cos\alpha}\).
\(a = 2s/t^2\) по пути \(s\) и времени \(t\) из состояния покоя; \(\sin\alpha, \cos\alpha\) — из высоты и длины доски линейкой.
Многократные измерения времени (5–10 раз) для нескольких углов; линеаризация: \(\frac{a}{g\cos\alpha}\) от \(\tan\alpha\) — прямая с наклоном 1 и отрезком \(-\mu\).
Погрешности: реакция при пуске секундомера (увеличить путь, усреднять), неровность доски (одна и та же дорожка), разница трения покоя и скольжения (сообщать начальный толчок нельзя — нарушит \(v_0=0\)).
Равноускоренность: время на половине и на всём пути должно отличаться в \(\sqrt{2}\) раз.
Альтернатива, тоже верная: найти угол, при котором толкнутый брусок движется равномерно: \(\mu = \tan\alpha\).$x$, array[$x$Запишите второй закон Ньютона для бруска на наклонной плоскости.$x$, $x$Ускорение можно найти из пути и времени при старте из покоя.$x$]::text[])
) as v(id, title, problem, difficulty, minutes, solution, hints)
join public.subjects s on s.slug = 'physics'
join public.topics t on t.subject_id = s.id and t.slug = 'experimental'
on conflict (id) do nothing;

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution, i18n)
select 'experimental-measurement', t.id,
  $t$Measurement, uncertainty and the lab report$t$,
  $t$An experimental round is graded on method, data handling and the report as much as on the number: what to measure, how many times, how to straighten a graph, and how to state a result with its uncertainty.$t$,
  15, 0, 'original', $t$Written for OlympAI$t$,
  $j${"ru": {"title": "Измерения, погрешности и отчёт", "summary": "Экспериментальный тур оценивают за метод, обработку данных и отчёт не меньше, чем за число: что мерить, сколько раз, как выпрямить график и как записать результат с погрешностью."}}$j$::jsonb
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'physics' and t.slug = 'experimental'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position, i18n) values
('experimental-measurement', 'concept', $h$Every number comes with its uncertainty$h$,
 $b$A measured value without an uncertainty says nothing about whether two results agree. Random errors scatter repeated readings and shrink when you average; systematic errors shift every reading the same way and do not.$b$, '{}', 0,
 $j${"ru": {"heading": "У каждого числа есть погрешность", "body": "Измеренное значение без погрешности не позволяет сказать, согласуются ли два результата. Случайные погрешности разбрасывают повторные измерения и уменьшаются при усреднении; систематические сдвигают все измерения одинаково и усреднением не убираются."}}$j$::jsonb),
('experimental-measurement', 'explanation', $h$Propagating uncertainty$h$,
 $b$For a product or quotient of powers, relative uncertainties add with the powers as weights: for ρ = m / (π d² h / 4), ε(ρ) = ε(m) + 2ε(d) + ε(h). For a sum or difference, absolute uncertainties add. Round the uncertainty to one or two significant figures and the result to the same decimal place.$b$, '{}', 1,
 $j${"ru": {"heading": "Как переносится погрешность", "body": "Для произведения и частного степеней складываются относительные погрешности с весами-степенями: для ρ = m / (π d² h / 4) получаем ε(ρ) = ε(m) + 2ε(d) + ε(h). Для суммы и разности складываются абсолютные погрешности. Погрешность округляют до одной-двух значащих цифр, результат — до того же разряда."}}$j$::jsonb),
('experimental-measurement', 'explanation', $h$Straighten the graph$h$,
 $b$A law is checked and a constant extracted by choosing axes on which the law is a straight line: T² against L for a pendulum, ln(T − T₀) against t for cooling. The slope and the intercept then carry the physics, and least squares gives both with their uncertainties. An intercept that should be zero but is not points to a systematic error.$b$, '{}', 2,
 $j${"ru": {"heading": "Выпрямите график", "body": "Закон проверяют и константу находят, выбирая оси, в которых закон — прямая: T² от L для маятника, ln(T − T₀) от t для остывания. Тогда физику несут наклон и отрезок, а метод наименьших квадратов даёт оба с погрешностями. Отрезок, который должен быть нулём, но не равен ему, указывает на систематическую ошибку."}}$j$::jsonb),
('experimental-measurement', 'key_facts', $h$What the report must contain$h$,
 $b$Jurors look for the same parts every time.$b$,
 array[$i$Idea of the method and the working formula, derived$i$, $i$Table of raw data with units and instrument precision$i$, $i$The linearised graph with the fitted line$i$, $i$Result with uncertainty and the right number of digits$i$, $i$Main sources of error and how they were reduced$i$], 3,
 $j${"ru": {"heading": "Что должно быть в отчёте", "body": "Жюри каждый раз ищет одни и те же части.", "items": ["Идея метода и расчётная формула с выводом", "Таблица исходных данных с единицами и точностью приборов", "Линеаризованный график с проведённой прямой", "Результат с погрешностью и правильным числом знаков", "Основные источники погрешности и как их уменьшали"]}}$j$::jsonb);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution, i18n)
select v.id, t.id, 'experimental-measurement', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$, v.i18n
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('exp-q1', $p$Why time ten oscillations rather than one?$p$,
   array[$o$The reaction-time error is divided by ten$o$, $o$The period grows with the number of swings$o$, $o$One swing is not periodic$o$, $o$It removes systematic errors$o$], 0::smallint,
   $e$The stopwatch error of a few tenths of a second is made once for the whole series, so its share in one period becomes ten times smaller.$e$, 0::smallint,
   $j${"ru": {"prompt": "Зачем измерять время десяти колебаний, а не одного?", "options": ["Ошибка реакции делится на десять", "Период растёт с числом колебаний", "Одно колебание не периодично", "Это убирает систематические ошибки"], "explanation": "Ошибка секундомера в несколько десятых секунды делается один раз на всю серию, поэтому её доля в одном периоде становится в десять раз меньше."}}$j$::jsonb),
  ('exp-q2', $p$Which graph is a straight line for a pendulum, T = 2π√(L/g)?$p$,
   array[$o$T against L$o$, $o$T² against L$o$, $o$T against L²$o$, $o$√T against L$o$], 1::smallint,
   $e$Squaring gives T² = (4π²/g)·L: proportional to L, with slope 4π²/g.$e$, 1::smallint,
   $j${"ru": {"prompt": "Какой график будет прямой для маятника, T = 2π√(L/g)?", "options": ["T от L", "T² от L", "T от L²", "√T от L"], "explanation": "Возведя в квадрат, получаем T² = (4π²/g)·L — пропорционально L с наклоном 4π²/g."}}$j$::jsonb),
  ('exp-q3', $p$Diameter is measured to 1%, height to 1%. The relative uncertainty of the volume πd²h/4 is about$p$,
   array[$o$1%$o$, $o$2%$o$, $o$3%$o$, $o$4%$o$], 2::smallint,
   $e$The diameter enters squared: 2·1% + 1% = 3%.$e$, 2::smallint,
   $j${"ru": {"prompt": "Диаметр измерен с точностью 1%, высота — 1%. Относительная погрешность объёма πd²h/4 примерно", "options": ["1%", "2%", "3%", "4%"], "explanation": "Диаметр входит в квадрате: 2·1% + 1% = 3%."}}$j$::jsonb),
  ('exp-q4', $p$A straight-line fit that should pass through zero has a clear non-zero intercept. This most likely means$p$,
   array[$o$A systematic error in one of the measured quantities$o$, $o$Too few points$o$, $o$The random error is large$o$, $o$Nothing; intercepts are always ignored$o$], 0::smallint,
   $e$Random scatter moves the intercept within its uncertainty; a clear offset means every point is shifted the same way — a systematic error, like length measured to the wrong point.$e$, 3::smallint,
   $j${"ru": {"prompt": "Прямая, которая должна проходить через ноль, имеет заметный ненулевой отрезок. Скорее всего это значит", "options": ["Систематическая ошибка в одной из величин", "Слишком мало точек", "Большая случайная погрешность", "Ничего, отрезок всегда игнорируют"], "explanation": "Случайный разброс сдвигает отрезок в пределах его погрешности; явный сдвиг значит, что все точки смещены одинаково — систематическая ошибка, например длина измерена не до той точки."}}$j$::jsonb)
) as v(id, prompt, options, correct_index, explanation, position, i18n)
where s.slug = 'physics' and t.slug = 'experimental'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution, i18n)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$, v.i18n
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$Uncertainty of a product of powers$f$, $k$Relative uncertainties add, each multiplied by its power.$k$, 0::smallint,
   $j${"ru": {"front": "Погрешность произведения степеней", "back": "Складываются относительные погрешности, каждая умножена на свою степень."}}$j$::jsonb),
  ($f$How many digits in the uncertainty?$f$, $k$One or two significant figures; the result is rounded to the same decimal place.$k$, 1::smallint,
   $j${"ru": {"front": "Сколько знаков оставлять в погрешности?", "back": "Одну-две значащие цифры; результат округляют до того же разряда."}}$j$::jsonb),
  ($f$Linearising exponential decay$f$, $k$Plot ln of the decaying quantity against time: the slope is −k.$k$, 2::smallint,
   $j${"ru": {"front": "Как выпрямить экспоненциальный спад", "back": "Строить логарифм убывающей величины от времени: наклон равен −k."}}$j$::jsonb),
  ($f$Random vs systematic error$f$, $k$Random errors scatter readings and average out; systematic errors shift all readings and do not.$k$, 3::smallint,
   $j${"ru": {"front": "Случайная и систематическая погрешность", "back": "Случайные разбрасывают измерения и усредняются; систематические сдвигают все измерения и не усредняются."}}$j$::jsonb)
) as v(front, back, position, i18n)
where s.slug = 'physics' and t.slug = 'experimental';
