# Content sources

Where real olympiad problems can come from, and what each source allows. This
is the starting list for the import pipeline that does not exist yet.

Checked on 2026-09-19 against each source's own pages. This is a working list,
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
| **©, published free** | Study and personal preparation. Showing it to other students needs the organiser's permission |

The `resources` table enforces the first step: a row whose licence is `unknown`
is rejected by a trigger. Tasks should carry `source_url`, `licence` and
`attribution` the same way.

## Sources

| Subject | Source | What is there | Class |
| --- | --- | --- | --- |
| Physics | [Jaan Kalda's study guides](https://www.ioc.ee/~kalda/ipho/) | Mechanics, electricity, thermodynamics; organised around solving ideas | © (free from the author) |
| Physics | [IPhO archive](https://ipho.olimpicos.net/) | 1967–2026 with official solutions | © |
| Physics, Biology, Economics | OpenStax (University Physics, Biology 2e, Principles of Economics) | Textbooks with end-of-chapter problems; not olympiad level | Open — CC BY 4.0 |
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
