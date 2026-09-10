-- Notes, quizzes and cards for the three computer science topics.
--
-- The worked examples stay clear of the library: binary search is taught on a
-- plain sorted array rather than a rotated one, the data structures lesson uses
-- a hash map rather than the auxiliary-stack trick, and dynamic programming is
-- shown on non-adjacent sums rather than on coin change or longest increasing
-- subsequence. All six of those are graded problems.

-- =========================================================== algorithms =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'algorithms-complexity-and-search', t.id,
  $t$Complexity, and why halving beats scanning$t$,
  $t$What big-O actually measures, why an O(log n) step is worth restructuring a problem to reach, and the invariant that makes binary search correct rather than merely fast.$t$,
  14, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'computer-science' and t.slug = 'algorithms'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position, visual_kind, visual) values
('algorithms-complexity-and-search', 'concept', $h$Counting operations, not seconds$h$,
 $b$Big-O describes how the work grows with the input, not how long it takes on your machine. O(n) means doubling the input roughly doubles the work; O(n^2) means it quadruples.

Constants and lower-order terms are dropped on purpose. 3n + 50 is O(n), because for large enough n the shape is what decides the outcome and the constants are a fixed handicap.

This is why the notation is useful and also where it misleads: for small inputs an O(n^2) algorithm with a tiny constant can beat an O(n log n) one, and for a fixed input size big-O says nothing at all.$b$, '{}', 0, null, null),

('algorithms-complexity-and-search', 'explanation', $h$The distance between the curves$h$,
 $b$The gaps are much larger than they look written down. At n = 1,000,000:

    O(log n)    about 20 steps
    O(n)        1,000,000
    O(n log n)  about 20,000,000
    O(n^2)      1,000,000,000,000

The last one is not slow, it is impossible. This is the reason so much algorithmic work is spent moving between rows rather than optimising within one: a constant-factor improvement to an O(n^2) solution changes nothing at competition input sizes, while finding an O(n log n) one changes everything.

Where does a log come from? Almost always from halving something repeatedly. You can halve a million about twenty times before reaching one, and that count is the log.$b$, '{}', 1,
 'plot', $j${
  "caption": "The gap is not a matter of tuning. Between n and n^2 there is a constant factor no machine will make up at competition sizes.",
  "xLabel": "input size",
  "yLabel": "work",
  "xRange": [0, 10],
  "yRange": [0, 100],
  "lines": [
    { "label": "log n", "tone": "muted", "points": [{"x":1,"y":0},{"x":4,"y":2},{"x":7,"y":2.8},{"x":10,"y":3.3}] },
    { "label": "n", "tone": "accent", "points": [{"x":0,"y":0},{"x":10,"y":10}] },
    { "label": "n log n", "tone": "primary", "points": [{"x":1,"y":0},{"x":4,"y":8},{"x":7,"y":19.6},{"x":10,"y":33}] },
    { "label": "n^2", "tone": "warn", "points": [{"x":0,"y":0},{"x":4,"y":16},{"x":7,"y":49},{"x":10,"y":100}] }
  ],
  "areas": [], "marks": [], "notes": []
}$j$::jsonb),

('algorithms-complexity-and-search', 'example', $h$Binary search, and the invariant that makes it right$h$,
 $b$Searching a sorted array for a value. Keep two bounds, lo and hi, and hold one promise: if the value is anywhere, it is between them.

    lo = 0, hi = n - 1
    while lo <= hi:
        mid = lo + (hi - lo) / 2
        if a[mid] == target: found
        if a[mid] <  target: lo = mid + 1
        else:                hi = mid - 1

Each comparison discards half the remaining range, so the number of steps is log2(n): twenty for a million.

Two details that are not decoration. Writing mid as lo + (hi-lo)/2 rather than (lo+hi)/2 avoids an overflow that is a genuine bug in real libraries. And moving to mid+1 or mid-1 rather than mid is what guarantees the range shrinks every iteration, without which the loop can spin forever.$b$, '{}', 2, null, null),

('algorithms-complexity-and-search', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Big-O is growth, not time. Constants and lower terms are dropped.$i$,
   $i$A log almost always comes from repeatedly halving something.$i$,
   $i$Binary search needs a sorted array — or, more precisely, a predicate that flips once.$i$,
   $i$Use lo + (hi-lo)/2, and always move past mid, or the loop may not terminate.$i$,
   $i$Comparison sorting cannot beat O(n log n); counting sort can, by not comparing.$i$,
   $i$Sorting first is often the cheapest way to make an O(n^2) problem O(n log n).$i$
 ], 3, null, null),

('algorithms-complexity-and-search', 'concept', $h$Sorting as a tool, not a task$h$,
 $b$Any algorithm that only compares elements needs at least about n log n comparisons in the worst case — there are n! possible orders and each comparison distinguishes two cases, so log2(n!) comparisons are unavoidable, and that is about n log n.

Counting sort escapes the bound by not comparing at all: with values in a small known range you can tally them and read the tally back in order, in O(n + range).

In practice sorting is rarely the question. It is the move that makes the real question easy — duplicates become adjacent, closest pairs become neighbours, and a two-pointer sweep replaces a double loop.$b$, '{}', 4, null, null),

('algorithms-complexity-and-search', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Merge sort and heap sort are O(n log n) in the worst case; quicksort is O(n^2) in the worst case but usually faster in practice.$i$,
   $i$After sorting, duplicates are adjacent and near-equal values are neighbours.$i$,
   $i$Two pointers on a sorted array often replace a nested loop.$i$,
   $i$Recursion depth counts: an O(log n) algorithm can still blow a stack if written badly.$i$,
   $i$Space complexity is a separate question from time, and it is often the binding one.$i$
 ], 5, null, null);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'algorithms-complexity-and-search', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('cs-alg-q1', $p$An algorithm runs in 3n + 50 steps. Its complexity is$p$,
   array[$o$O(n)$o$, $o$O(3n)$o$, $o$O(n + 50)$o$, $o$O(1)$o$], 0::smallint,
   $e$Constants and lower-order terms are dropped: what matters is that doubling the input roughly doubles the work. O(3n) and O(n+50) are not wrong so much as not written in the notation's normal form.$e$, 0::smallint),
  ('cs-alg-q2', $p$Roughly how many steps does binary search take on a sorted array of a million elements?$p$,
   array[$o$About 20$o$, $o$About 1,000$o$, $o$About 500,000$o$, $o$A million$o$], 0::smallint,
   $e$Each comparison halves the range, and a million can be halved about twenty times before reaching one. That is log2(1,000,000), and it is why the log row is worth restructuring a problem to reach.$e$, 1::smallint),
  ('cs-alg-q3', $p$Why compute mid as lo + (hi - lo)/2 instead of (lo + hi)/2?$p$,
   array[$o$The sum can overflow for large indices$o$, $o$It is faster$o$, $o$It rounds the other way$o$, $o$It is only a style preference$o$], 0::smallint,
   $e$For indices near the top of the integer range, lo + hi can overflow while hi - lo cannot. This was a real, long-lived bug in widely used library implementations, not a theoretical worry.$e$, 2::smallint),
  ('cs-alg-q4', $p$What is the lower bound for sorting by comparisons alone?$p$,
   array[$o$O(n log n)$o$, $o$O(n)$o$, $o$O(log n)$o$, $o$O(n^2)$o$], 0::smallint,
   $e$There are n! possible orderings and each comparison splits the possibilities in two, so at least log2(n!) comparisons are needed, which is about n log n. Counting sort beats it only by not comparing.$e$, 3::smallint),
  ('cs-alg-q5', $p$Binary search requires$p$,
   array[$o$a sorted array, or any predicate that flips exactly once$o$, $o$distinct elements$o$, $o$a power-of-two length$o$, $o$random access and nothing else$o$], 0::smallint,
   $e$What it really needs is monotonicity: some test that is false up to a point and true after it. Sortedness is the usual way to get that, which is why binary search generalises to "find the smallest x where a condition first holds".$e$, 4::smallint),
  ('cs-alg-q6', $p$An O(n^2) algorithm is given a million elements. The realistic assessment is$p$,
   array[$o$It will not finish; the shape has to change$o$, $o$It needs a faster machine$o$, $o$It needs the constant factor reduced$o$, $o$It will be about twice as slow as O(n log n)$o$], 0::smallint,
   $e$A million squared is a trillion operations. No constant factor or hardware closes that gap — the fix is a different algorithm, which is exactly why complexity classes are worth thinking in.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'computer-science' and t.slug = 'algorithms'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$What does big-O measure?$f$, $k$How the work grows with the input. Constants and lower-order terms are dropped.$k$, 0::smallint),
  ($f$Where does a log factor usually come from?$f$, $k$Repeatedly halving something.$k$, 1::smallint),
  ($f$What does binary search really require?$f$, $k$A predicate that flips exactly once — sortedness is the usual way to get it.$k$, 2::smallint),
  ($f$Why write mid = lo + (hi-lo)/2?$f$, $k$lo + hi can overflow for large indices; hi - lo cannot.$k$, 3::smallint),
  ($f$What guarantees a binary search terminates?$f$, $k$Moving to mid+1 or mid-1, so the range strictly shrinks each round.$k$, 4::smallint),
  ($f$Lower bound for comparison sorting$f$, $k$O(n log n) — there are n! orders and each comparison halves the possibilities.$k$, 5::smallint),
  ($f$How does counting sort beat that bound?$f$, $k$By not comparing: it tallies values in a known range and reads the tally back.$k$, 6::smallint),
  ($f$What does sorting buy you beyond order?$f$, $k$Duplicates become adjacent, near values become neighbours, and two pointers replace a nested loop.$k$, 7::smallint),
  ($f$Steps of binary search on a million elements$f$, $k$About 20.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'computer-science' and t.slug = 'algorithms';

-- ======================================================= data structures ====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'data-structures-choosing', t.id,
  $t$What each structure makes cheap$t$,
  $t$A data structure is a set of promises about which operations are fast. Choosing one is choosing which question you intend to ask often.$t$,
  13, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'computer-science' and t.slug = 'data-structures'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('data-structures-choosing', 'concept', $h$Nothing is fast at everything$h$,
 $b$Each structure buys speed on some operations by giving it up on others.

An array gives O(1) access by index and O(n) insertion in the middle. A linked list reverses that. A hash map gives O(1) average lookup by key but no order at all. A balanced tree gives O(log n) lookup and keeps everything sorted.

So the question is never "which structure is best". It is: which operation will this program do a million times? That one has to be cheap; the rest can be whatever falls out.$b$, '{}', 0),

('data-structures-choosing', 'explanation', $h$Amortised cost, and why a growing array is still O(1)$h$,
 $b$Appending to a dynamic array is usually O(1), except when it is full — then a larger block is allocated and everything is copied, which is O(n).

Averaged over many appends it is still O(1). Doubling the capacity means the copies happen at sizes 1, 2, 4, 8 and so on, and those add up to less than 2n across n appends. Each append pays a constant amount on average even though individual ones are expensive.

That is amortised analysis, and it matters because the naive alternative — growing by a fixed amount each time — gives O(n) per append and an O(n^2) loop that looks identical in the source.

The hash map's O(1) is a different kind of promise: it is an average over well-behaved keys, not a worst case. Adversarial keys that all collide degrade it to O(n).$b$, '{}', 1),

('data-structures-choosing', 'example', $h$Two sums, two structures$h$,
 $b$Given a list of numbers, is there a pair adding to a target?

The direct method tries every pair: two nested loops, O(n^2). At n = 100,000 that is ten billion checks.

With a hash map, one pass:

    seen = empty map
    for x in list:
        if (target - x) in seen: found
        add x to seen

Each element asks one question and answers one, so O(n). The structure did not make the loop faster — it replaced the inner loop with a lookup, which is the usual shape of these improvements.$b$, '{}', 2),

('data-structures-choosing', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Array: O(1) by index, O(n) to insert in the middle.$i$,
   $i$Hash map: O(1) average lookup, no ordering, O(n) worst case under collisions.$i$,
   $i$Balanced tree: O(log n) lookup and ordered traversal.$i$,
   $i$A dynamic array's append is O(1) amortised because the capacity doubles.$i$,
   $i$Replacing an inner loop with a lookup is the standard way to drop a factor of n.$i$,
   $i$Stacks are last-in-first-out; queues are first-in-first-out. Depth-first and breadth-first search are the same algorithm with one swapped for the other.$i$
 ], 3),

('data-structures-choosing', 'concept', $h$Heaps, when only the extreme matters$h$,
 $b$A heap keeps the smallest (or largest) element at the top and nothing else in order. Insertion and removal of the top are both O(log n), and reading the top is O(1).

That partial order is exactly enough for a priority queue, for merging sorted streams, and for keeping the k largest items seen so far — push everything, pop whenever the heap exceeds k, and the k survivors are the answer in O(n log k).

Sorting the whole list to answer the same question is O(n log n). The heap wins by never establishing an order it was not asked for.$b$, '{}', 4),

('data-structures-choosing', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Heap: O(1) to read the top, O(log n) to insert or remove it.$i$,
   $i$A heap is partially ordered — never ask it for the second smallest directly.$i$,
   $i$k largest of n: keep a heap of size k, O(n log k).$i$,
   $i$A set is a map without values; reach for it whenever the question is "have I seen this".$i$,
   $i$Space matters: an O(n) map alongside an O(n) array is still O(n), but a map per element is not.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'data-structures-choosing', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('cs-ds-q1', $p$Appending to a dynamic array is described as O(1) amortised. What does that mean?$p$,
   array[$o$Most appends are cheap, and the occasional expensive resize averages out to a constant$o$, $o$Every append is O(1)$o$, $o$It is O(1) only when the array is empty$o$, $o$It is really O(n) and the term is marketing$o$], 0::smallint,
   $e$Doubling the capacity means the copies happen at sizes 1, 2, 4, 8..., which sum to under 2n over n appends. Growing by a fixed amount instead would give O(n) per append and an O(n^2) loop that looks identical in the source.$e$, 0::smallint),
  ('cs-ds-q2', $p$You need to answer "have I seen this value before" a million times. Reach for$p$,
   array[$o$A hash set$o$, $o$A sorted array with binary search$o$, $o$A linked list$o$, $o$A heap$o$], 0::smallint,
   $e$Membership is exactly what a hash set makes O(1). The sorted array works at O(log n) but costs a sort and complicates insertion; a heap cannot answer membership at all without scanning.$e$, 1::smallint),
  ('cs-ds-q3', $p$A hash map's O(1) lookup is$p$,
   array[$o$an average, which collisions can degrade to O(n)$o$, $o$a worst-case guarantee$o$, $o$true only for integer keys$o$, $o$the same as a balanced tree's guarantee$o$], 0::smallint,
   $e$It is an average over well-behaved keys. Keys that all collide turn every lookup into a scan of one bucket. A balanced tree gives a genuine O(log n) worst case instead, which is why it is sometimes preferred despite being slower on average.$e$, 2::smallint),
  ('cs-ds-q4', $p$Which operation is a heap NOT good at?$p$,
   array[$o$Finding the second smallest without removing the first$o$, $o$Reading the smallest$o$, $o$Inserting a value$o$, $o$Removing the smallest$o$], 0::smallint,
   $e$A heap is only partially ordered: the top is the extreme and everything below it is loosely arranged. The second smallest is one of the top's children, but the structure gives no direct answer beyond the root.$e$, 3::smallint),
  ('cs-ds-q5', $p$Keeping the k largest of n values is best done in$p$,
   array[$o$O(n log k) with a heap of size k$o$, $o$O(n log n) by sorting$o$, $o$O(n^2) by repeated scanning$o$, $o$O(n) with a hash map$o$], 0::smallint,
   $e$Push each value and pop whenever the heap exceeds k: n operations on a structure of size k. Sorting also works but establishes a full order the question never asked for.$e$, 4::smallint),
  ('cs-ds-q6', $p$Depth-first and breadth-first search differ in$p$,
   array[$o$whether the frontier is a stack or a queue$o$, $o$the graph they can handle$o$, $o$their complexity class$o$, $o$whether they visit every node$o$], 0::smallint,
   $e$The traversal is the same algorithm; swapping the stack for a queue changes the order nodes come out. Both are O(V + E) and both reach every node reachable from the start.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'computer-science' and t.slug = 'data-structures'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$Array against linked list$f$, $k$Array: O(1) by index, O(n) to insert in the middle. Linked list: the reverse.$k$, 0::smallint),
  ($f$What does a hash map give up for its O(1)?$f$, $k$Ordering, and the worst-case guarantee — collisions degrade it to O(n).$k$, 1::smallint),
  ($f$Why is a dynamic array's append O(1) amortised?$f$, $k$Capacity doubles, so the copies sum to under 2n across n appends.$k$, 2::smallint),
  ($f$Heap costs$f$, $k$O(1) to read the top, O(log n) to insert or to remove it.$k$, 3::smallint),
  ($f$What is a heap bad at?$f$, $k$Anything but the extreme. It is partially ordered, not sorted.$k$, 4::smallint),
  ($f$k largest of n values$f$, $k$A heap of size k, O(n log k).$k$, 5::smallint),
  ($f$The standard way to drop a factor of n$f$, $k$Replace the inner loop with a lookup in a map or set.$k$, 6::smallint),
  ($f$DFS against BFS$f$, $k$Same algorithm; a stack gives depth-first, a queue gives breadth-first. Both O(V+E).$k$, 7::smallint),
  ($f$Balanced tree against hash map$f$, $k$Tree: O(log n) worst case and stays sorted. Map: O(1) average and no order.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'computer-science' and t.slug = 'data-structures';

-- =================================================== dynamic programming ====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'dynamic-programming-states', t.id,
  $t$Overlapping subproblems, and the state that names them$t$,
  $t$Dynamic programming is recursion that refuses to answer the same question twice. The hard part is never the code — it is choosing what a state is.$t$,
  14, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'computer-science' and t.slug = 'dynamic-programming'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('dynamic-programming-states', 'concept', $h$Two conditions, both required$h$,
 $b$A problem yields to dynamic programming when it has both:

**Optimal substructure** — the best answer is built from best answers to smaller versions of the same problem.

**Overlapping subproblems** — those smaller versions repeat, so the same question is asked many times.

Without the first, the pieces cannot be combined and you need a different method. Without the second, plain recursion is already fine — there is nothing to remember. Divide and conquer, like merge sort, has the first and not the second.$b$, '{}', 0),

('dynamic-programming-states', 'explanation', $h$Remembering, from the top or from the bottom$h$,
 $b$Naive Fibonacci recomputes fib(30) many thousands of times and runs in exponential time. Two fixes, and they are the same fix.

**Memoisation** keeps the recursion and adds a cache: before computing, look it up; after computing, store it. Top-down, and it only ever computes the states it actually needs.

**Tabulation** turns the recursion inside out and fills a table in dependency order, smallest first. Bottom-up, no recursion, no stack depth to worry about — and often a smaller memory footprint, because once you see which entries the next row depends on you can keep only those.

The cost is the same either way, and it is worth saying out loud:

    time = number of states * work per transition

That formula is how you know in advance whether an approach will fit. A million states with constant transitions is fine; a million states each scanning a million options is not.$b$, '{}', 1),

('dynamic-programming-states', 'example', $h$Largest sum with no two adjacent$h$,
 $b$Given [3, 2, 7, 10, 12, 7, 9, 1], pick numbers summing to as much as possible, never taking two that sit next to each other.

The state: best[i] is the best total considering the first i numbers. At each number there are exactly two choices — take it, which forbids the one before, or skip it:

    best[i] = max(best[i-1], best[i-2] + a[i])

Filling left to right:

    3, 3, 10, 13, 22, 22, 31, 31

The answer is 31, from 3 + 10 + 9 + ... — and reading the choices back reconstructs which numbers were taken.

Eight states, constant work each. Note what the state does not record: which numbers were picked. It records only what the next decision needs, which is the whole art.$b$, '{}', 2),

('dynamic-programming-states', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Needs both optimal substructure and overlapping subproblems.$i$,
   $i$Memoisation is top-down and lazy; tabulation is bottom-up and complete.$i$,
   $i$Cost = states * transitions. Work this out before writing code.$i$,
   $i$A state must carry everything the next decision needs — and nothing else.$i$,
   $i$If only the last row or two are ever read, keep only those: O(n) memory becomes O(1).$i$,
   $i$To recover the choices and not just the value, store the decision alongside the value.$i$
 ], 3),

('dynamic-programming-states', 'concept', $h$Choosing the state$h$,
 $b$Everything else follows from the state, so it is where the thinking goes.

Too little and the recurrence is wrong, because a decision depends on something the state forgot. Too much and the table explodes — adding a dimension with a thousand values multiplies the work by a thousand.

Useful questions: what is the smallest description of a partial solution that still determines the future? Which quantities does the next decision actually consult? Is there a dimension that can be dropped because it is implied by the others?

And the honest check: write the recurrence in words before writing code. If it cannot be said in a sentence, the state is wrong.$b$, '{}', 4),

('dynamic-programming-states', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Greedy takes the locally best step; DP considers all of them and remembers. Greedy is only correct when a proof says it is.$i$,
   $i$Divide and conquer splits into non-overlapping pieces; DP exists because the pieces overlap.$i$,
   $i$Base cases are part of the recurrence, not an afterthought — most wrong answers are wrong there.$i$,
   $i$Iterating in dependency order is what makes tabulation valid.$i$,
   $i$If the state space is exponential, DP is not the answer either.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'dynamic-programming-states', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('cs-dp-q1', $p$Which pair of properties does a problem need for dynamic programming?$p$,
   array[$o$Optimal substructure and overlapping subproblems$o$, $o$Optimal substructure alone$o$, $o$Sorted input and a greedy choice$o$, $o$A recursive definition of any kind$o$], 0::smallint,
   $e$Without optimal substructure the pieces cannot be combined; without overlap there is nothing to cache and plain recursion is already fine. Merge sort has the first without the second, which is why it is divide and conquer rather than DP.$e$, 0::smallint),
  ('cs-dp-q2', $p$Memoisation and tabulation differ in$p$,
   array[$o$direction: top-down and lazy against bottom-up and complete$o$, $o$their asymptotic cost$o$, $o$whether they give the right answer$o$, $o$the problems they can be applied to$o$], 0::smallint,
   $e$They are the same computation organised two ways. Memoisation computes only the states it needs and uses the call stack; tabulation fills every state in dependency order and avoids recursion depth entirely.$e$, 1::smallint),
  ('cs-dp-q3', $p$The running time of a DP is$p$,
   array[$o$number of states times the work per transition$o$, $o$the number of states$o$, $o$exponential in the input$o$, $o$always O(n^2)$o$], 0::smallint,
   $e$Each state is computed once and its cost is whatever the transition does. Working this product out first tells you whether an approach fits the limits before any code is written.$e$, 2::smallint),
  ('cs-dp-q4', $p$For "largest sum with no two adjacent", the recurrence is$p$,
   array[$o$best[i] = max(best[i-1], best[i-2] + a[i])$o$, $o$best[i] = best[i-1] + a[i]$o$, $o$best[i] = max(a[i], best[i-1])$o$, $o$best[i] = best[i-1] + best[i-2]$o$], 0::smallint,
   $e$At each number there are two choices: skip it and keep the previous best, or take it and add the best from two positions back. The last option is the Fibonacci recurrence, which counts something else entirely.$e$, 3::smallint),
  ('cs-dp-q5', $p$A DP fills a table but only ever reads the previous row. What follows?$p$,
   array[$o$Memory can drop from O(n * m) to O(m)$o$, $o$The time complexity drops too$o$, $o$Tabulation cannot be used$o$, $o$The recurrence is wrong$o$], 0::smallint,
   $e$Keep the previous row and the current one and discard the rest. Time is unchanged — every state is still computed — but memory often falls by a whole factor, which is frequently the binding constraint.$e$, 4::smallint),
  ('cs-dp-q6', $p$What distinguishes a greedy algorithm from dynamic programming?$p$,
   array[$o$Greedy commits to the locally best step and never reconsiders$o$, $o$Greedy is always faster and always correct$o$, $o$Greedy uses more memory$o$, $o$There is no real difference$o$], 0::smallint,
   $e$DP considers the alternatives and remembers their results; greedy takes one and moves on. That makes greedy faster and simpler when it works — but it is only correct when a proof says the local choice is safe, and assuming so is a common way to lose marks.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'computer-science' and t.slug = 'dynamic-programming'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$The two conditions for dynamic programming$f$, $k$Optimal substructure, and overlapping subproblems.$k$, 0::smallint),
  ($f$Memoisation against tabulation$f$, $k$Top-down with a cache against bottom-up in dependency order. Same cost, same answer.$k$, 1::smallint),
  ($f$The running time of a DP$f$, $k$Number of states times work per transition.$k$, 2::smallint),
  ($f$What must a state carry?$f$, $k$Everything the next decision needs, and nothing else.$k$, 3::smallint),
  ($f$Recurrence for largest sum with no two adjacent$f$, $k$best[i] = max(best[i-1], best[i-2] + a[i]).$k$, 4::smallint),
  ($f$When can DP memory be reduced?$f$, $k$When only the last row or two are ever read — keep those and drop the rest.$k$, 5::smallint),
  ($f$How do you recover the choices, not just the value?$f$, $k$Store the decision alongside each value and walk back through them.$k$, 6::smallint),
  ($f$Greedy against DP$f$, $k$Greedy commits to the local best and never reconsiders; it is correct only when a proof says so.$k$, 7::smallint),
  ($f$Divide and conquer against DP$f$, $k$Divide and conquer splits into non-overlapping pieces. DP exists because the pieces overlap.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'computer-science' and t.slug = 'dynamic-programming';
