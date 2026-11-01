# Content sources

Where real olympiad problems can come from, and what each source allows. This
is the starting list for the import pipeline that does not exist yet.

Checked on 2026-09-19 against each source's own pages; the OpenStax row was
re-checked on 2026-09-25 against the books' own licence metadata and corrected
— it had been recorded as CC BY 4.0, and it is CC BY-NC-SA 4.0. This is a working list,
not legal advice: before the service is opened to students other than its
owner, confirm terms with the rights holder.

## Why the licence column matters more than the list

"Freely downloadable" is not a licence. Almost every authoritative olympiad
archive is published for free and still carries "all rights reserved". Three
cases, and they lead to different decisions:

| Class | What it allows |
| --- | --- |
| **Open** | Reuse and adaptation, including in the product, with attribution |
| **Non-commercial** | The same, but only while the service is free |
| **Share-alike** | The same, and anything adapted from it must be published on the same terms — the condition travels into our own content |
| **©, published free** | Study and personal preparation. Showing it to other students needs the organiser's permission |

The `resources` table enforces the first step: a row whose licence is `unknown`
is rejected by a trigger. Tasks should carry `source_url`, `licence` and
`attribution` the same way.

## Sources

| Subject | Source | What is there | Class |
| --- | --- | --- | --- |
| Physics | [Jaan Kalda's study guides](https://www.ioc.ee/~kalda/ipho/) | Mechanics, electricity, thermodynamics; organised around solving ideas | © (free from the author) |
| Physics | [IPhO archive](https://ipho.olimpicos.net/) | 1967–2026 with official solutions | © |
| Mathematics | OpenStax **first editions**: [Algebra and Trigonometry](https://openstax.org/books/algebra-and-trigonometry), [Precalculus](https://openstax.org/books/precalculus), College Algebra, Intermediate Algebra | Thousands of exercises; about a third carry a worked solution. Not olympiad level — textbook calibre, which is what the oblast rung needs | Open — CC BY 4.0 |
| Physics | OpenStax [College Physics](https://openstax.org/books/college-physics) (1e) | Thousands of problems, **no answer key in the machine-readable book** — the grader has nothing to score against | Open — CC BY 4.0 |
| Any | OpenStax **second editions** and University Physics 1–3 | Same books, later editions | Non-commercial, share-alike — CC BY-NC-SA 4.0 |
| Mathematics | [IMO Shortlists](https://www.imo-official.org/) | About 30 problems a year with full solutions; 2013–2025 confirmed | © |
| Mathematics | [Prasolov, «Задачи по планиметрии»](https://old.mccme.ru/free-books/prasolov/planim/) | About 1500 problems with solutions | © (published free by MCCME) |
| Mathematics | [MCCME free-books](https://mccme.ru/free-books/) | Many olympiad problem books in Russian | © (published free by MCCME) |
| Computer Science | [IOI](https://ioinformatics.org/) | Tasks, test data, solutions | © |
| Computer Science | [Competitive Programmer's Handbook](https://cses.fi/book/book.pdf) | Free from the author; the Springer edition is commercial | Free from the author |
| Computer Science | [cp-algorithms](https://github.com/cp-algorithms/cp-algorithms/blob/main/LICENSE) | Algorithms reference | Open — CC BY-SA 4.0; derivatives must share alike |
| Computer Science, Mathematics | [Project Euler](https://projecteuler.net/copyright) | Main problem content | Non-commercial — CC BY-NC-SA 4.0 |
| Biology | [IBO papers archive](https://www.ibo-info.org/en/info/papers.html) | Theory and practical exams with solutions. Most are password-protected (the national coordinator issues it); the last two years are withheld | Non-commercial — CC BY-NC-SA |
| Economics | [IEO](https://ieo-official.org/prepare) | 2018–2026: multiple choice and open problems, with and without solutions; business cases | © (no terms stated) |
| Geography | [iGeo document library](https://geoolympiad.org/document-library/) | Past written-response and multimedia tests | © |
| Linguistics | [IOL](https://ioling.org/problems/by_year/) | Every year since 2003, with solutions | © |
| Linguistics | [NACLO](https://naclo.org/past_competitions.php), [UKLO](https://archives.uklo.org/problems) | Past problems with solutions | © (no terms stated) |

Geography is the thinnest subject: there is almost nothing openly licensed at
olympiad level.

## Not to be used

- The commercial books usually called the reference texts — Irodov, Savchenko,
  Engel, *The IMO Compendium*, Campbell *Biology*. Useful to own; not material
  for the product.
- Mirrors that turn up in search results for those books (twirpx, dokumen.pub,
  pdfcoffee, uploads on scribd). They are unlicensed copies.

## What is in the catalogue now

| Subject | Source | Level | Problems | Terms |
| --- | --- | --- | --- | --- |
| Mathematics | [olympiads.bc-pf.org/math](https://olympiads.bc-pf.org/math) — Областная, Республиканская, ГЖО, Балканская, 1999–2022 | oblast, republican, international | 1463 | **Unknown.** "© ОФ Beyond Curriculum", no terms stated |
| Physics | [olympiads.bc-pf.org/physics](https://olympiads.bc-pf.org/physics) — РНПЦ «Дарын», oblast and republican, 2010–2025 | oblast, republican | 113 | **Unknown.** Same site, same silence |
| Mathematics | OpenStax first editions | oblast | 159 | Open — CC BY 4.0 |
| Physics | [daryn.kz](https://daryn.kz) — the state centre's own site, oblast and republican finals, 2021–2023, **with solutions** | oblast, republican | 26 | **Unknown.** No terms stated, but first-party |
| Physics | [daryn.kz/respa](https://daryn.kz/respa/) — oblast 2025–2026, round 1, **with solutions** | oblast | 12 | **Unknown.** No terms stated |
| Physics | [daryn.kz/respa](https://daryn.kz/respa/) — republican final, Astana, March 2026, **with solutions** | republican | 15 | **Unknown.** No terms stated |

The bc-pf rows carry `licence = 'unknown'` and the exact page each came from,
which is the honest label and is rendered in the product. They are olympiad
papers of the Kazakh state system, republished by a foundation that states no
terms — the "©, published free" class in the table above. Before anyone other
than the owner of this workspace uses the app, that needs settling with РНПЦ
«Дарын» or with Beyond Curriculum. `.tools/import-bcpf.mjs --remove`,
`.tools/import-bcpf-physics.mjs --remove` and `.tools/import-daryn.mjs --remove`
take them back out.

The daryn.kz rows are the same material one step closer to its source: РНПЦ
«Дарын» is the body that runs the olympiad, and these are its own PDFs on its
own domain rather than a foundation's mirror of them. The terms are no clearer
— the site states none — but the party to ask is now the party the file came
from.

**They are the only rows in the catalogue that arrive with their marking
schemes.** Each paper has a companion solutions PDF with the derivation and the
points per step, and all 26 went in with `official_solution` filled. That is
worth more per problem than a bigger statement-only import: the grader works
without a reference and says so, and works better with one.

Three of those solutions are prose with the equations missing, because the
solution PDF set them as pictures. What survives is the method — "write the
equation of rotational motion, then the relation between angular and linear
acceleration" — which is what the grader marks anyway. `.tools/import-daryn.mjs`
names them on every run.

Sixteen of the 26 carry a figure, extracted from the PDF by
`.tools/pdf-figures.mjs` and served from `public/figures/daryn/`. Half of
olympiad physics is a circuit or a ray diagram, and a statement that says "see
the figure" without one is not a problem anyone can solve. Which picture
belongs to which problem is a hand-written table in the importer: the drawings
float in the page, and each paper prints its problems twice — Kazakh, then
Russian — around the same picture.

The 2025–2026 papers (`.tools/import-zhmb.mjs`) are the same material again,
one year newer and in better shape: all twenty-seven carry a full official
solution with the equations intact, and seventeen carry a figure.

**Where 2025–2026 lives.** The centre stopped serving PDFs at
`daryn.kz/ro/<year>/` and now links Google Drive folders from
[daryn.kz/respa](https://daryn.kz/respa/) — Тапсырмалар (statements) and
Шешімдер (solutions), each split into ЖМБ (sciences) and ҚГБ (humanities),
then by subject and round. That page is what `source_url` records: a Drive
folder id is not a citation that will still resolve in two years, and the page
is the publisher's own.

**The republican final is the best material in the catalogue.** It is set in
LaTeX rather than Word, which shows: formulas survive extraction whole, and the
figures sit where they are written instead of floating, so which picture
belongs to which problem comes out of the page geometry rather than a table
written by hand. "Задача 1" there is an umbrella over three independent parts
with their own points and their own marking, so 1A, 1B and 1C enter as three
problems.

The bc-pf rows publish no solutions, so those 1576 are statements alone.

## The OpenStax edition trap

The first edition of an OpenStax book and its "2e" are not under the same
licence. `algebra-and-trigonometry` is CC BY 4.0; `algebra-and-trigonometry-2e`
is CC BY-NC-SA 4.0, and the same split holds for College Physics, Precalculus,
College Algebra, Biology and the rest. The site footer shows the
non-commercial notice on every page regardless, so the only reliable reading
is each book's own licence metadata — `openstax.org/apps/cms/api/v2/pages/?type=books.Book&fields=license_name`,
or the `license` field the archive returns with the book tree. `.tools/import-openstax.mjs`
checks it per book and refuses anything that is not CC BY unless told otherwise.

Taking the first edition costs nothing — the content differs in ordering and
examples, not in level — and it keeps share-alike out of the reference
solutions written against it.

## How to import

1. **Problems that come with official solutions first.** The grader scores a
   student against `official_solution`; a wrong reference solution produces
   wrong grades, which is worse than a missing problem. IMO, IPhO, IOI, IEO, IOL
   and IBO all publish solutions.
2. **Generate only what can be checked.** Model-written olympiad problems often
   arrive with a flawed reference solution. Generation is safe where the answer
   can be verified mechanically: numeric variants recomputed in code, and
   programming tasks that have test data.
3. **One problem per row, never a whole PDF.** Extract into the `tasks` shape
   with `source_url`, `licence` and `attribution` filled, and review every
   reference solution by hand before it goes in.

The first candidate is IEO 2018–2026. Economics has two tasks and a mock paper
needs three, so it also unblocks the mock for the owner's own goal.
