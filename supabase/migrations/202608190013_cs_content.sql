-- Computer Science had a subject row from the very first migration and nothing
-- else: no topics, no tasks. It appeared in onboarding, in the competition
-- picker as a locked IOI target, and handed anyone who chose it an empty
-- catalogue. Three topics and six worked tasks close that gap.

insert into public.topics (subject_id, name, slug)
select s.id, v.name, v.slug
from (values
  ('Algorithms',          'algorithms'),
  ('Data Structures',     'data-structures'),
  ('Dynamic Programming', 'dynamic-programming')
) as v(name, slug)
join public.subjects s on s.slug = 'computer-science'
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
    'rotated-array-search', 'algorithms',
    'Search a rotated sorted array',
    'An array of n distinct integers was sorted in ascending order and then rotated left by some unknown amount k, with 0 <= k < n. You are given the rotated array and a target value x. Decide whether x is present and, if so, at which index.',
    3,
    'At any midpoint the array splits into one half that is still sorted and one that contains the rotation point; comparing a[lo] with a[mid] tells you which. If x lies inside the sorted half''s range, recurse there, otherwise recurse into the other half. Each step halves the search space, so the running time is O(log n) and the extra space is O(1).',
    array[
      'Take the midpoint and compare it with the first element. What does that comparison tell you about which half is undisturbed?',
      'Exactly one of the two halves is a plain sorted array. Identify it at every step.',
      'Once you know the sorted half, a range check decides whether the target can be inside it.',
      'Write the loop invariant you are preserving, then argue the running time from how much the range shrinks.'
    ],
    20,
    array['n distinct integers', 'Originally ascending, then rotated left by unknown k', 'Target value x', 'Required: O(log n) time'],
    'An algorithm returning the index of x or -1, with its running time justified.'
  ),
  (
    'majority-vote', 'algorithms',
    'The element that appears more than half the time',
    'An array of n values is known to contain one value that occurs strictly more than n/2 times. Find it using O(n) time and O(1) extra space. Sorting the array or counting with a hash map is not allowed.',
    4,
    'Boyer-Moore majority vote: keep a candidate and a counter, both initially unset. For each element, if the counter is zero adopt the element as candidate; then increment the counter when the element equals the candidate and decrement otherwise. Correctness: each decrement pairs off one occurrence of the candidate with one of a different value, and since the majority element occurs more than n/2 times it cannot be fully cancelled, so it survives as the final candidate.',
    array[
      'Imagine pairing each occurrence of the majority value with one occurrence of something else. What is left over?',
      'Carry a single candidate and a counter. What should happen when the counter reaches zero?',
      'Show that every decrement removes one majority occurrence at most.',
      'Conclude from the strict inequality n/2 why the candidate cannot be wrong.'
    ],
    25,
    array['Array of n values', 'One value occurs strictly more than n/2 times', 'O(n) time, O(1) extra space', 'No sorting, no hash map'],
    'The algorithm and a proof that the value it returns is the majority element.'
  ),
  (
    'min-stack', 'data-structures',
    'A stack that knows its minimum',
    'Design a stack supporting push, pop and min, where min returns the smallest value currently in the stack. Every operation must run in O(1) worst case, not amortised.',
    2,
    'Store pairs. On push, record the value together with min(value, current top''s recorded minimum), or the value itself when the stack is empty; pop removes the pair; min reads the second field of the top. Every operation touches a constant number of fields. The equivalent formulation keeps a second stack of running minima pushed in lockstep.',
    array[
      'min cannot scan the stack, so the answer has to be stored rather than computed.',
      'What is the minimum of a stack after you push one more element onto it?',
      'That relation is recursive: each entry can carry the answer for the stack up to and including itself.',
      'Check pop as carefully as push — the stored minimum must not outlive the element it belongs to.'
    ],
    15,
    array['Operations: push, pop, min', 'min returns the smallest value currently stored', 'O(1) worst case per operation'],
    'The data structure, and the cost of each operation with a short justification.'
  ),
  (
    'range-sum-updates', 'data-structures',
    'Prefix sums under point updates',
    'An array holds n integers. You must process q operations of two kinds, interleaved in any order: add a value to a single position, and report the sum of the first m elements. Both n and q may be up to 10^5.',
    4,
    'A precomputed prefix-sum array answers queries in O(1) but costs O(n) per update; recomputing nothing and summing directly costs O(n) per query. A Fenwick (binary indexed) tree stores partial sums over ranges whose lengths are powers of two, so both operations walk O(log n) nodes, giving O((n + q) log n) overall. A segment tree gives the same bound with more memory.',
    array[
      'Work out the cost of the two obvious approaches first, and say which operation each one makes expensive.',
      'The two costs pull in opposite directions — look for a structure that splits the difference.',
      'Consider storing sums over ranges whose lengths are powers of two.',
      'Count how many such ranges an update touches, and how many a prefix query needs.'
    ],
    28,
    array['n integers, n up to 10^5', 'q operations, q up to 10^5', 'Point update: add v at position i', 'Prefix query: sum of the first m elements'],
    'A structure handling both operations, its complexity, and why the two naive approaches are not enough.'
  ),
  (
    'lis-nlogn', 'dynamic-programming',
    'Longest increasing subsequence in n log n',
    'Given a sequence of n integers, find the length of its longest strictly increasing subsequence. The elements need not be contiguous. Aim for O(n log n).',
    5,
    'Maintain an array tails where tails[i] is the smallest possible final element of an increasing subsequence of length i+1. For each element, binary search for the first entry that is greater than or equal to it and overwrite that entry, appending instead when the element exceeds every tail. The answer is the final length of tails. Note that tails is not itself a longest increasing subsequence: it only records the best achievable endpoints. Each element costs one binary search, hence O(n log n).',
    array[
      'The quadratic solution asks, for each element, which earlier element it extends. What is the minimum you actually need to remember?',
      'For each achievable length, only the smallest possible ending value matters — a smaller tail is never worse.',
      'Show that the array of those smallest tails is strictly increasing, which is what makes a binary search legal.',
      'Be careful when stating what the array contains: it is not the subsequence itself.'
    ],
    35,
    array['Sequence of n integers', 'Subsequence need not be contiguous', 'Strictly increasing', 'Target complexity O(n log n)'],
    'The algorithm, the meaning of every auxiliary array, and the complexity argument.'
  ),
  (
    'coin-change-ways', 'dynamic-programming',
    'Counting ways to make change',
    'You are given coin denominations c1..ck, each available without limit, and a target amount S. Count the number of distinct combinations of coins summing to S. Two combinations differing only in the order the coins are used count as one.',
    3,
    'Let ways[0] = 1 and ways[s] = 0 for s > 0. Loop over the coins in the outer loop, and for each coin loop s from that coin''s value up to S, adding ways[s - coin] to ways[s]. The answer is ways[S]. Putting the amount loop outside instead counts ordered sequences, because it lets the same multiset be built in several coin orders — that variant answers a different question.',
    array[
      'Start with the base case: how many ways are there to make zero?',
      'Fix the set of coins you are allowed to use, then extend it one denomination at a time.',
      'Write both loop orders and trace a tiny example such as S = 3 with coins {1, 2}.',
      'The two orders give different answers — say precisely which question each one answers.'
    ],
    22,
    array['Denominations c1..ck, unlimited supply of each', 'Target amount S', 'Order of coins does not distinguish combinations'],
    'A recurrence, the loop order it requires, and why the other order counts something else.'
  )
) as v(id, topic_slug, title, problem, difficulty, official_solution, hints, minutes, given, find_prompt)
join public.subjects s on s.slug = 'computer-science'
join public.topics t on t.subject_id = s.id and t.slug = v.topic_slug
on conflict (id) do update set
  title = excluded.title, problem = excluded.problem, difficulty = excluded.difficulty,
  official_solution = excluded.official_solution, hints = excluded.hints,
  estimated_minutes = excluded.estimated_minutes, given = excluded.given,
  find_prompt = excluded.find_prompt;
