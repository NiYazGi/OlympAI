# Design

Direction A, «Учебная таблица»: the app reads like a physics wall chart in a
classroom. Chosen 1 November 2026 from three directions (see the decision
document linked from PRODUCT.md's history); the contract lives in
`.impeccable/surfaces/app-app-tasks-slug-page-tsx.md`.

## Colour

Tokens are in `app/globals.css` (OKLCH). `node .tools/contrast.mjs` checks every
text pair against 4.5:1 in both themes.

| Role | Light | Job |
| --- | --- | --- |
| Board | `--sidebar` #1F3B33 | The rail and the phone's tab bar. Nothing else. |
| Plane | `--background`, `--card` white | Where the work sits. |
| Wall | `--muted` #E8EEEA | Material that is given: a statement, a reference panel. |
| Ink | `--foreground` #161A18 | Text, rules, and the main action (button fill). |
| Graphite | `--muted-foreground` #56605B | Secondary text. |
| Rule | `--border` #CBD3CE | Hairlines between regions; inputs use the darker `--input`. |
| Cinnabar | `--destructive` #C7351C | A mistake. |
| Chrome | `--chrome` #F2B705, text `--warning` #7A5300 | A gap in the reasoning; the rail's current-section marker; the streak. |
| Cobalt | `--primary` #2346C4 | A strong idea, links, focus, selection, data. |

Each ink has one meaning on every screen. The main button is ink, never a
colour, so a colour on screen is always a meaning. No gradients, no orange.

Inside the rail, `.rail-scope` re-points the page tokens at the board so the
toggles and the account row read on green without their own styles.

Dark theme: the same roles, board darker than the plane, inks raised; the main
button turns to paper. Light is the default (`theme-script`, `lib/theme.ts`).

## Type

One family in three widths, all with native Cyrillic (`app/layout.tsx`):

- Sofia Sans — every word (`font-sans`, `font-reading`), body weight 450.
- Sofia Sans Semi Condensed — headings (`font-display`).
- Sofia Sans Condensed — large figures (`font-figure`): points, counts.

No monospace: `--font-mono` resolves to Sofia Sans and figures are tabular
everywhere. `font-language-override: 'RUS'` on `body` pins Russian letterforms;
without it Sofia Sans draws Bulgarian д, в, л when the interface is in English.

Roles: `text-page` 32/36, `text-block` 20/28, `text-reading` 17/28 (statements
and solutions), `text-ui` 15/22, `text-caption` 13/18. No uppercase labels, no
eyebrows above headings.

## Shape

- `--radius` 0.25rem: controls 4px, regions about 2px. Circles only on callouts
  and avatars.
- Regions, not cards: `cardClass` is white with a 1px rule. No soft shadows;
  popovers alone carry one.
- Buttons 40px high (44px on touch), ink fill; outline buttons have an ink rule.
- No arrows inside buttons, no icon tiles on empty states.

## Shell

- Laptop: the board-green rail on the left, 240px, with the name, labelled
  sections in two groups, Settings, then the account row and the four controls
  (streak, tour, language, theme). The page starts at the top edge.
- Phone: a white bar with the name and the controls; the sections in a
  board-green tab bar at the bottom with a chrome marker on the current one.

## Signature: the callout

`components/problems/attempt-protocol.tsx`. A graded attempt shows the points
large, then the student's numbered lines. Every run the jury marked (except
accepted lines, which stay quiet) gets a bracket in the right margin with a
numbered circle in its ink; a cinnabar rule is drawn above the first line that
fails. Under the lines, the legend repeats each number with its lines, kind and
note, and always shows the full key of three kinds. Then the criteria with a
total row, the feedback and the next step.

Use the same callout grammar wherever something on screen needs pointing at.

## Motion

Callouts arrive in line order once, within 400ms, when a submission is graded.
Nothing else moves on its own.
