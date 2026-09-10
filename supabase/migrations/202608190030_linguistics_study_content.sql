-- Notes, quizzes and cards for the three linguistics topics.
--
-- Morphology segments English words rather than ordering agglutinative
-- suffixes, and historical linguistics uses Grimm's law as a stated historical
-- result rather than reconstructing a change from a correspondence set:
-- 'agglutinative-order' and 'sound-correspondences' are graded problems.

-- =========================================================== morphology =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'morphology-word-structure', t.id,
  $t$Words have parts$t$,
  $t$How to cut a word into pieces that carry meaning, why two of those pieces behave completely differently, and what languages do differently from one another.$t$,
  13, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'linguistics' and t.slug = 'morphology'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('morphology-word-structure', 'concept', $h$The smallest piece that means something$h$,
 $b$A morpheme is the smallest unit of a language that carries meaning or grammatical function. It is not a syllable and not a sound: "cats" has one syllable but two morphemes, cat and -s, while "banana" has three syllables and one morpheme.

Morphemes come in two kinds. **Free** morphemes stand alone as words: cat, run, blue. **Bound** morphemes cannot, and must attach to something: -s, -ing, un-, -ness.

The test is mechanical. Ask whether a piece contributes a consistent meaning across other words, and whether it could stand alone. That is the whole of segmentation.$b$, '{}', 0),

('morphology-word-structure', 'explanation', $h$Two jobs an affix can do$h$,
 $b$**Inflection** adjusts a word for grammar without changing what it is. Cat to cats, walk to walked, big to bigger — still a noun, still a verb, still an adjective. English has very few of these, about eight.

**Derivation** builds a new word, usually of a different class. Happy to happiness turns an adjective into a noun; nation to national does the reverse. The result is a separate dictionary entry.

Three practical differences. Derivation comes first and inflection last, so "nationalises" is nation + al + ise + s and never any other order. Derivation is unpredictable — we say arrival but not arrivement — while inflection applies across the board. And derivation changes meaning; inflection only changes fit.

One more wrinkle: the same morpheme can have different shapes. The English plural is written -s but pronounced three ways, in cats, dogs and horses; the negative prefix in- surfaces as im- before p. These are allomorphs — one morpheme, several forms conditioned by their surroundings.$b$, '{}', 1),

('morphology-word-structure', 'example', $h$Cutting up "unbelievably"$h$,
 $b$    un + believ(e) + able + ly

    believe    free root, a verb
    -able      derivational: verb to adjective, "believable"
    un-        derivational: negation, "unbelievable"
    -ly        derivational: adjective to adverb, "unbelievably"

Four morphemes, one free and three bound, and every affix here derives rather than inflects — the word class changes at three of the four steps.

The order is not free. -able must attach to a verb, so it goes on first; un- attaches to the adjective that produces; -ly attaches to that adjective in turn. Reshuffling them produces nothing English allows, and that constraint is exactly what a morphology problem usually tests.$b$, '{}', 2),

('morphology-word-structure', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$A morpheme is the smallest meaningful unit — not a syllable and not a sound.$i$,
   $i$Free morphemes stand alone; bound ones must attach.$i$,
   $i$Inflection adjusts for grammar; derivation makes a new word, often of a new class.$i$,
   $i$Derivation applies before inflection, and the inflection goes last.$i$,
   $i$Allomorphs are different shapes of one morpheme, conditioned by surroundings.$i$,
   $i$English has only about eight inflectional affixes; many languages have hundreds.$i$
 ], 3),

('morphology-word-structure', 'concept', $h$Three ways to build a word$h$,
 $b$Languages differ in how much they pack into a single word, and the classification is worth having because it tells you what to expect from unfamiliar data.

**Isolating.** Roughly one morpheme per word, with grammar carried by word order and separate particles. Mandarin is the standard example.

**Agglutinative.** Many morphemes per word, each with one clear job, strung together in a fixed order with clean boundaries. Turkish, Finnish, Swahili. A long word segments neatly into labelled pieces.

**Fusional.** Many morphemes per word too, but a single affix carries several pieces of information at once and the boundaries blur. In Spanish "hablo", the -o carries first person, singular, present and indicative together, and there is no way to cut it into four.

The types are tendencies rather than boxes. English is mostly isolating with fusional remnants — the -s of "walks" fuses third person, singular and present in exactly the fusional way.$b$, '{}', 4),

('morphology-word-structure', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Isolating: about one morpheme per word, grammar in word order.$i$,
   $i$Agglutinative: many morphemes, one job each, clean boundaries and fixed order.$i$,
   $i$Fusional: one affix carrying several grammatical categories at once.$i$,
   $i$The types are tendencies; most languages mix them.$i$,
   $i$Compounding joins two free morphemes: blackbird, notebook.$i$,
   $i$A root carries the core meaning; a stem is what an affix actually attaches to.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'morphology-word-structure', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('lin-mor-q1', $p$How many morphemes are in "banana"?$p$,
   array[$o$One$o$, $o$Two$o$, $o$Three$o$, $o$Six$o$], 0::smallint,
   $e$Three syllables, but no piece of it carries meaning on its own — "ba" and "na" mean nothing. Morphemes are units of meaning, not of sound, and this is the standard trap.$e$, 0::smallint),
  ('lin-mor-q2', $p$Which affix is inflectional rather than derivational?$p$,
   array[$o$-ed in "walked"$o$, $o$-ness in "happiness"$o$, $o$un- in "unhappy"$o$, $o$-able in "readable"$o$], 0::smallint,
   $e$-ed marks tense and leaves a verb a verb. The other three build new words, and two of them change the word class outright — which is the clearest sign of derivation.$e$, 1::smallint),
  ('lin-mor-q3', $p$The English plural is pronounced differently in "cats", "dogs" and "horses". These forms are$p$,
   array[$o$allomorphs of one morpheme$o$, $o$three separate morphemes$o$, $o$evidence of a fusional language$o$, $o$free morphemes$o$], 0::smallint,
   $e$One morpheme with several shapes, selected by the sound before it. Allomorphy is about form varying while function stays fixed.$e$, 2::smallint),
  ('lin-mor-q4', $p$In "nationalises", what is the correct order of processes?$p$,
   array[$o$Derivation first, inflection last$o$, $o$Inflection first, derivation last$o$, $o$They may occur in any order$o$, $o$It contains no inflection$o$], 0::smallint,
   $e$nation + al + ise are derivational and build the verb; the -s is inflectional and attaches at the very end. Inflection closes the word off, which is why nothing can follow it.$e$, 3::smallint),
  ('lin-mor-q5', $p$A language where one affix carries person, number and tense together is$p$,
   array[$o$fusional$o$, $o$agglutinative$o$, $o$isolating$o$, $o$compounding$o$], 0::smallint,
   $e$Fusional, because the categories are fused into an unsegmentable piece. An agglutinative language would use three separate affixes in a fixed order, each cleanly cuttable.$e$, 4::smallint),
  ('lin-mor-q6', $p$"Blackbird" is formed by$p$,
   array[$o$compounding two free morphemes$o$, $o$derivation$o$, $o$inflection$o$, $o$allomorphy$o$], 0::smallint,
   $e$Two words that each stand alone are joined into one. Notice the meaning is not simply the sum — a blackbird is a species, not any bird that is black, which is typical of compounds.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'linguistics' and t.slug = 'morphology'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$What is a morpheme?$f$, $k$The smallest unit carrying meaning or grammatical function. Not a syllable, not a sound.$k$, 0::smallint),
  ($f$Free against bound morphemes$f$, $k$Free morphemes stand alone as words; bound ones must attach to something.$k$, 1::smallint),
  ($f$Inflection against derivation$f$, $k$Inflection adjusts for grammar and keeps the word class; derivation builds a new word, often of a new class.$k$, 2::smallint),
  ($f$In what order do they apply?$f$, $k$Derivation first, inflection last — inflection closes the word off.$k$, 3::smallint),
  ($f$What is an allomorph?$f$, $k$One morpheme with several shapes, chosen by its surroundings — the plural in cats, dogs, horses.$k$, 4::smallint),
  ($f$Isolating languages$f$, $k$About one morpheme per word; grammar carried by word order and particles. Mandarin.$k$, 5::smallint),
  ($f$Agglutinative languages$f$, $k$Many morphemes per word, one job each, fixed order, clean boundaries. Turkish, Finnish, Swahili.$k$, 6::smallint),
  ($f$Fusional languages$f$, $k$One affix carrying several categories at once, unsegmentable. Spanish hablo.$k$, 7::smallint),
  ($f$Root against stem$f$, $k$The root carries the core meaning; the stem is whatever an affix actually attaches to.$k$, 8::smallint)
) as v(front, back, position)
where s.slug = 'linguistics' and t.slug = 'morphology';

-- ============================================================ phonology =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'phonology-sounds-that-matter', t.id,
  $t$Sounds that matter, and sounds that only vary$t$,
  $t$Why two sounds a speaker cannot tell apart are the same sound to the language, and how to prove which is which from data alone.$t$,
  13, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'linguistics' and t.slug = 'phonology'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('phonology-sounds-that-matter', 'concept', $h$Phoneme and allophone$h$,
 $b$A **phoneme** is a sound that can change a word's meaning. An **allophone** is one of the physical realisations of a phoneme, chosen by context, that never changes meaning.

The distinction is about the language, not about acoustics. English speakers hear the p of "pin" and the p of "spin" as the same sound, though the first is aspirated with a puff of air and the second is not. A recording shows they are plainly different; English treats them as one.

In Hindi that same difference is a phoneme distinction, and swapping one for the other changes the word. So whether two sounds are "the same" is a fact about a particular language, and there is no way to answer it by listening harder.$b$, '{}', 0),

('phonology-sounds-that-matter', 'explanation', $h$Two tests, and they are opposites$h$,
 $b$**Minimal pairs** prove two sounds are separate phonemes. Find two words that differ in exactly one sound and mean different things: pin and bin, cat and cut, ship and sheep. Since nothing else differs, the meaning change must be carried by that one sound.

**Complementary distribution** proves the opposite. If two sounds never appear in the same environment — one shows up only in one position and the other only where the first cannot — they are allophones of one phoneme. Aspirated p appears at the start of a stressed syllable; unaspirated p appears after s. Neither can be swapped in, because neither environment overlaps.

The procedure for unfamiliar data is therefore fixed: list where each sound occurs, look for a minimal pair, and if there is none look for a pattern in the environments. Finding a minimal pair settles it in one line. Finding complementary distribution takes the whole list, and the rule you state is the answer.

Free variation is the third possibility: two sounds in the same environment with no meaning change, as in the several ways English speakers may release a final t.$b$, '{}', 1),

('phonology-sounds-that-matter', 'example', $h$Reading a distribution$h$,
 $b$Suppose a language has two sounds, [k] and [c], and the data shows:

    [c] before i and e
    [k] before a, o and u

No word contains [c] before a back vowel or [k] before a front one. There can therefore be no minimal pair, because the two never compete for the same slot.

The conclusion: one phoneme, two allophones, with the front-vowel environment selecting [c]. The rule is stated as a conditioning environment, not as a list.

Now suppose instead you find "kila" and "cila" meaning different things. One minimal pair overturns the whole analysis: the two sounds are separate phonemes and the distribution was a coincidence of the data you had seen so far.$b$, '{}', 2),

('phonology-sounds-that-matter', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$A phoneme distinguishes meaning; an allophone is a context-selected realisation that does not.$i$,
   $i$A minimal pair — two words differing in one sound with different meanings — proves two phonemes.$i$,
   $i$Complementary distribution — never in the same environment — indicates allophones of one phoneme.$i$,
   $i$Free variation: same environment, no meaning change, speaker's choice.$i$,
   $i$Which sounds are phonemes is a fact about a language, not about acoustics.$i$,
   $i$Slashes for phonemes, /p/; square brackets for phonetic realisations, [p].$i$
 ], 3),

('phonology-sounds-that-matter', 'concept', $h$Describing a consonant in three words$h$,
 $b$Every consonant can be named by three properties, and problems expect the vocabulary.

**Place** — where the airflow is obstructed: bilabial (both lips, p b m), alveolar (ridge behind the teeth, t d n s), velar (soft palate, k g), and others between.

**Manner** — how it is obstructed: plosive, stopped completely and released (p t k); fricative, forced through a narrow gap (f s sh); nasal, redirected through the nose (m n); approximant, barely obstructed (l r w).

**Voicing** — whether the vocal folds vibrate. That is the only difference between p and b, or s and z: put a hand on your throat and say them.

Vowels are described differently, by tongue height, frontness and lip rounding. The natural classes those features define are what phonological rules refer to: a rule almost never mentions one sound, it mentions all the voiceless plosives, or all the front vowels.$b$, '{}', 4),

('phonology-sounds-that-matter', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Consonants: place, manner, voicing. Vowels: height, frontness, rounding.$i$,
   $i$p and b differ only in voicing; so do t/d, k/g, f/v and s/z.$i$,
   $i$Rules refer to natural classes — "voiceless plosives", not individual sounds.$i$,
   $i$Assimilation makes a sound more like its neighbour; the in- of impossible is assimilation.$i$,
   $i$Phonotactics are the rules about which sequences a language permits at all.$i$,
   $i$Two languages can share sounds and still divide them into phonemes differently.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'phonology-sounds-that-matter', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('lin-pho-q1', $p$What does a minimal pair prove?$p$,
   array[$o$The two sounds are separate phonemes$o$, $o$The two sounds are allophones$o$, $o$The words are related$o$, $o$The language is tonal$o$], 0::smallint,
   $e$Two words differing in exactly one sound with different meanings show that the sound carries the difference. It is the fastest proof in the topic: one pair settles the question.$e$, 0::smallint),
  ('lin-pho-q2', $p$Two sounds never occur in the same environment. The conclusion is$p$,
   array[$o$they are probably allophones of one phoneme$o$, $o$they are separate phonemes$o$, $o$one is borrowed$o$, $o$nothing can be concluded$o$], 0::smallint,
   $e$Complementary distribution means they never compete, so no minimal pair can exist and neither can carry a contrast. The environments then state the rule that selects between them.$e$, 1::smallint),
  ('lin-pho-q3', $p$English speakers hear the p of "pin" and of "spin" as the same sound, although they differ acoustically. This shows that$p$,
   array[$o$whether two sounds contrast is a fact about a particular language$o$, $o$the difference is too small to hear$o$, $o$English has no aspiration$o$, $o$the two are separate phonemes in English$o$], 0::smallint,
   $e$The difference is real and measurable; English simply does not use it to distinguish words. Hindi does, and its speakers hear the contrast as obvious.$e$, 2::smallint),
  ('lin-pho-q4', $p$p and b differ in$p$,
   array[$o$voicing only$o$, $o$place only$o$, $o$manner only$o$, $o$place and manner$o$], 0::smallint,
   $e$Both are bilabial plosives; only the vocal folds differ. The same single-feature relationship holds for t/d, k/g and s/z, which is why they pattern together in rules.$e$, 3::smallint),
  ('lin-pho-q5', $p$Two sounds appear in the same environment with no change in meaning. This is$p$,
   array[$o$free variation$o$, $o$a minimal pair$o$, $o$complementary distribution$o$, $o$assimilation$o$], 0::smallint,
   $e$Same slot, no contrast, speaker's choice. It is the third possibility alongside contrast and complementary distribution, and it is why a single pair of differing pronunciations is not automatically evidence of anything.$e$, 4::smallint),
  ('lin-pho-q6', $p$The prefix in- becomes im- before "possible". This is$p$,
   array[$o$assimilation to the place of the following sound$o$, $o$free variation$o$, $o$a separate morpheme$o$, $o$a minimal pair$o$], 0::smallint,
   $e$The nasal takes on the bilabial place of the p that follows, which is easier to articulate. One morpheme, two shapes — assimilation on the phonological side, allomorphy on the morphological one.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'linguistics' and t.slug = 'phonology'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$Phoneme against allophone$f$, $k$A phoneme distinguishes meaning; an allophone is a context-selected form that does not.$k$, 0::smallint),
  ($f$What does a minimal pair prove?$f$, $k$That the two sounds are separate phonemes in that language.$k$, 1::smallint),
  ($f$What does complementary distribution indicate?$f$, $k$Allophones of one phoneme — the two never occur in the same environment.$k$, 2::smallint),
  ($f$Free variation$f$, $k$Two sounds in the same environment with no meaning change.$k$, 3::smallint),
  ($f$How do you describe a consonant?$f$, $k$Place, manner, voicing.$k$, 4::smallint),
  ($f$How do you describe a vowel?$f$, $k$Tongue height, frontness, lip rounding.$k$, 5::smallint),
  ($f$What separates p from b?$f$, $k$Voicing alone — both are bilabial plosives.$k$, 6::smallint),
  ($f$What is assimilation?$f$, $k$A sound becoming more like its neighbour, as in- to im- before possible.$k$, 7::smallint),
  ($f$Slashes against square brackets$f$, $k$/p/ is the phoneme; [p] is a phonetic realisation.$k$, 8::smallint),
  ($f$Why do rules mention natural classes?$f$, $k$Because changes apply to groups sharing a feature — all voiceless plosives, all front vowels.$k$, 9::smallint)
) as v(front, back, position)
where s.slug = 'linguistics' and t.slug = 'phonology';

-- ============================================== historical linguistics =====

insert into public.lessons (id, topic_id, title, summary, estimated_minutes, position, licence, attribution)
select 'historical-linguistics-change', t.id,
  $t$How languages change, and how we know$t$,
  $t$Sound change is regular, and that regularity is the only reason the deep past of languages can be recovered at all.$t$,
  14, 0, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
where s.slug = 'linguistics' and t.slug = 'historical-linguistics'
on conflict (id) do nothing;

insert into public.lesson_blocks (lesson_id, kind, heading, body, items, position) values
('historical-linguistics-change', 'concept', $h$Change is regular, not word by word$h$,
 $b$The central finding of nineteenth-century linguistics is that sound change is regular: when a sound changes, it changes in every word where it occurs in the same environment, not in a scattering of words.

That is a strong claim, and it is what makes the field a science rather than a collection of resemblances. If a change were sporadic, no comparison could be trusted; because it is regular, an exception demands an explanation — a borrowing, an analogy, a different environment — and looking for that explanation is usually where the real discovery is.

Languages that descend from a common ancestor are related, and the ancestor is a **proto-language**. Words descended from a single ancestral word are **cognates**.$b$, '{}', 0),

('historical-linguistics-change', 'explanation', $h$Cognates, and the trap of resemblance$h$,
 $b$Similar words in two languages have four possible explanations, and only one of them is evidence of relatedness.

**Cognates** descend from a shared ancestor and show regular correspondences. **Borrowings** were taken from one language into another and often look too similar, since they have not had time to diverge. **Chance** produces occasional matches in any two languages. And **onomatopoeia** produces similarity because both languages are imitating the same noise.

Two clues separate borrowings from cognates. Core vocabulary — body parts, kinship, low numerals, basic verbs — is rarely borrowed, so agreement there is stronger evidence than agreement about technology or trade goods. And a borrowing usually breaks the sound correspondences that the rest of the vocabulary obeys: it entered too late to undergo the change.

Which is why a single resemblance proves nothing at all, and a set of systematic correspondences across ordinary words proves a great deal.$b$, '{}', 1),

('historical-linguistics-change', 'example', $h$What regularity looks like once it is established$h$,
 $b$Grimm's Law, described in the 1820s, states a set of changes that happened in the ancestor of the Germanic languages and nowhere else in Indo-European. One part of it: Proto-Indo-European p became f.

    Latin pater      English father
    Latin piscis     English fish
    Latin pes/pedis  English foot

Latin kept the p; Germanic changed it. The correspondence is not a coincidence repeated three times — it holds across the vocabulary, which is what makes it a law rather than a list.

Now the useful part. English "paternal" also comes from the same root and keeps its p. It is not a counterexample: it is a borrowing from Latin, taken into English long after the Germanic change had finished. The exception, examined, confirms the rule and dates the word.$b$, '{}', 2),

('historical-linguistics-change', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Sound change is regular: it applies to every word with that sound in that environment.$i$,
   $i$Cognates descend from a common ancestor; borrowings were transferred later.$i$,
   $i$Core vocabulary is rarely borrowed, so it is the better evidence of relatedness.$i$,
   $i$A borrowing typically breaks the correspondences the native vocabulary obeys.$i$,
   $i$A single resemblance is worth nothing; a systematic set of correspondences is worth a great deal.$i$,
   $i$An asterisk marks a reconstructed form that is not attested: *pater.$i$
 ], 3),

('historical-linguistics-change', 'concept', $h$Change beyond sound$h$,
 $b$Sounds are the best-behaved part of language change, but not the only part.

**Analogy** works against regularity by remaking irregular forms on a regular pattern — English "holp" became "helped" because most verbs form their past that way. Where sound change is blind and mechanical, analogy is a tidying-up, and the two pull in opposite directions.

**Semantic change** shifts meaning: broadening (dog, once one breed, now all of them), narrowing (meat, once any food), and drift towards better or worse senses.

**Grammaticalisation** turns full words into grammar — English "going to" as a future marker no longer has much to do with going anywhere.

And languages split when their speakers stop talking to one another. Separation plus regular change plus enough time gives dialects, then separate languages, then a family tree whose shape the comparative method reconstructs.$b$, '{}', 4),

('historical-linguistics-change', 'key_facts', $h$Worth remembering$h$, null,
 array[
   $i$Analogy remakes irregular forms on a regular pattern, working against sound change.$i$,
   $i$Semantic change: broadening, narrowing, and shifts in evaluation.$i$,
   $i$Grammaticalisation turns lexical words into grammatical markers.$i$,
   $i$Languages diverge when contact stops; the family tree is the record of those splits.$i$,
   $i$Indo-European includes Germanic, Romance, Slavic, Indo-Iranian, Greek and more.$i$,
   $i$Finnish, Hungarian and Turkish are not Indo-European — geography is not ancestry.$i$
 ], 5);

insert into public.quiz_questions (id, topic_id, lesson_id, prompt, options, correct_index, explanation, position, licence, attribution)
select v.id, t.id, 'historical-linguistics-change', v.prompt, v.options, v.correct_index, v.explanation, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ('lin-his-q1', $p$"Sound change is regular" means that$p$,
   array[$o$a change applies to every word with that sound in that environment$o$, $o$changes happen at regular intervals in time$o$, $o$every language changes at the same rate$o$, $o$common words change first$o$], 0::smallint,
   $e$Regularity is about scope, not timing. It is the assumption that makes comparison reliable: an apparent exception then demands an explanation, and finding it is usually where the discovery lies.$e$, 0::smallint),
  ('lin-his-q2', $p$Two languages share a similar word. What is the weakest evidence that they are related?$p$,
   array[$o$The similarity itself, taken alone$o$, $o$A systematic correspondence across many words$o$, $o$Agreement in core vocabulary$o$, $o$Shared irregular forms$o$], 0::smallint,
   $e$Chance, borrowing and onomatopoeia all produce isolated resemblances. Only a pattern that holds across the vocabulary — especially in words nobody borrows — rules those out.$e$, 1::smallint),
  ('lin-his-q3', $p$Which vocabulary is the strongest evidence of a genetic relationship?$p$,
   array[$o$Body parts, kinship and low numerals$o$, $o$Words for technology$o$, $o$Words for trade goods$o$, $o$Religious terms$o$], 0::smallint,
   $e$Core vocabulary is rarely borrowed, so agreement there is unlikely to be contact. Technology, trade and religion travel between languages exactly as the objects and ideas do.$e$, 2::smallint),
  ('lin-his-q4', $p$English "father" against Latin "pater" reflects$p$,
   array[$o$a regular change of p to f in the ancestor of Germanic$o$, $o$English borrowing the word from Latin$o$, $o$coincidence$o$, $o$onomatopoeia$o$], 0::smallint,
   $e$It is one instance of Grimm's Law, and it holds across the vocabulary — fish and piscis, foot and pedis. English "paternal" keeps the p because it was borrowed from Latin long after the change had finished.$e$, 3::smallint),
  ('lin-his-q5', $p$Old English "holp" was replaced by "helped". This is$p$,
   array[$o$analogy — the irregular form remade on the regular pattern$o$, $o$a regular sound change$o$, $o$a borrowing$o$, $o$semantic change$o$], 0::smallint,
   $e$Speakers levelled an exception towards the majority pattern. Analogy and sound change pull in opposite directions: one is mechanical and blind, the other tidies up after it.$e$, 4::smallint),
  ('lin-his-q6', $p$Which of these is NOT an Indo-European language?$p$,
   array[$o$Finnish$o$, $o$Greek$o$, $o$Russian$o$, $o$Hindi$o$], 0::smallint,
   $e$Finnish is Uralic, alongside Estonian and Hungarian. Being surrounded by Indo-European neighbours is contact, not descent — geography is not ancestry.$e$, 5::smallint)
) as v(id, prompt, options, correct_index, explanation, position)
where s.slug = 'linguistics' and t.slug = 'historical-linguistics'
on conflict (id) do nothing;

insert into public.flashcards (topic_id, front, back, position, licence, attribution)
select t.id, v.front, v.back, v.position, 'original', $t$Written for OlympAI$t$
from public.topics t join public.subjects s on s.id = t.subject_id
cross join (values
  ($f$What does "sound change is regular" mean?$f$, $k$A change applies to every word containing that sound in that environment, not to scattered words.$k$, 0::smallint),
  ($f$What is a cognate?$f$, $k$A word descended from the same ancestral word as one in a related language.$k$, 1::smallint),
  ($f$How do you tell a borrowing from a cognate?$f$, $k$A borrowing usually breaks the regular correspondences and sits outside core vocabulary.$k$, 2::smallint),
  ($f$Why is core vocabulary the better evidence?$f$, $k$Body parts, kinship and low numerals are rarely borrowed, so agreement there points to descent.$k$, 3::smallint),
  ($f$Four reasons two words may resemble each other$f$, $k$Common descent, borrowing, chance, and onomatopoeia. Only the first shows relatedness.$k$, 4::smallint),
  ($f$Grimm's Law, in one example$f$, $k$Proto-Indo-European p became f in Germanic: Latin pater against English father.$k$, 5::smallint),
  ($f$What is analogy?$f$, $k$Remaking an irregular form on the regular pattern — holp becoming helped.$k$, 6::smallint),
  ($f$Broadening and narrowing$f$, $k$Broadening: dog, once one breed, now all. Narrowing: meat, once any food.$k$, 7::smallint),
  ($f$What does an asterisk mark?$f$, $k$A reconstructed form that is not attested in any record.$k$, 8::smallint),
  ($f$Name three non-Indo-European languages of Europe$f$, $k$Finnish, Estonian and Hungarian — all Uralic.$k$, 9::smallint)
) as v(front, back, position)
where s.slug = 'linguistics' and t.slug = 'historical-linguistics';
