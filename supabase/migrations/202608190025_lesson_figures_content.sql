-- A figure for each of the six lessons, on the block where it does the work.
--
-- Every one of these is parameters only: the drawing is done by
-- components/learn/figure.tsx. Written once, reviewed like the prose around
-- them, and served for nothing.

-- Rolling on an incline: which forces act, and which of them has a lever arm.
update public.lesson_blocks set visual_kind = 'forces', visual = $j${
  "caption": "Only the friction has a lever arm about the centre, so it is what makes the disc turn. Gravity acts through the centre and cannot.",
  "body": "disc",
  "incline": 25,
  "arrows": [
    { "label": "mg", "angle": 270, "length": 1.15, "tone": "muted" },
    { "label": "N", "angle": 115, "length": 0.95, "tone": "accent" },
    { "label": "f_s", "angle": 25, "length": 0.7, "tone": "primary" }
  ]
}$j$::jsonb
where lesson_id = 'mechanics-connected-bodies' and position = 5;

-- Resistance against length, with and without the area changing too.
update public.lesson_blocks set visual_kind = 'plot', visual = $j${
  "caption": "Lengthening a wire at fixed cross-section doubles the resistance. Stretching it at constant volume thins it at the same time, so the same doubling costs four times.",
  "xLabel": "length, as a multiple of the original",
  "yLabel": "resistance, as a multiple",
  "xRange": [1, 3],
  "yRange": [0, 9],
  "lines": [
    { "label": "area fixed", "tone": "accent",
      "points": [{ "x": 1, "y": 1 }, { "x": 3, "y": 3 }] },
    { "label": "stretched", "tone": "primary",
      "points": [{ "x": 1, "y": 1 }, { "x": 1.5, "y": 2.25 }, { "x": 2, "y": 4 }, { "x": 2.5, "y": 6.25 }, { "x": 3, "y": 9 }] }
  ],
  "areas": [],
  "marks": [
    { "x": 2, "y": 2, "label": "2x", "tone": "accent" },
    { "x": 2, "y": 4, "label": "4x", "tone": "primary" }
  ],
  "notes": []
}$j$::jsonb
where lesson_id = 'electrodynamics-resistance' and position = 2;

-- The work in a cycle is the area the loop encloses.
update public.lesson_blocks set visual_kind = 'plot', visual = $j${
  "caption": "Work out along the top, work in along the bottom. The difference is the shaded area, and going round clockwise makes it work out — an engine.",
  "xLabel": "V",
  "yLabel": "p",
  "xRange": [0, 4],
  "yRange": [0, 4],
  "lines": [
    { "tone": "primary",
      "points": [{ "x": 1, "y": 3 }, { "x": 3, "y": 3 }, { "x": 3, "y": 1 }, { "x": 1, "y": 1 }, { "x": 1, "y": 3 }] }
  ],
  "areas": [
    { "label": "W_net", "tone": "primary",
      "points": [{ "x": 1, "y": 3 }, { "x": 3, "y": 3 }, { "x": 3, "y": 1 }, { "x": 1, "y": 1 }] }
  ],
  "marks": [],
  "notes": [
    { "x": 2, "y": 3.45, "text": "expanding at high pressure" },
    { "x": 2, "y": 0.6, "text": "compressed at low pressure" }
  ]
}$j$::jsonb
where lesson_id = 'thermodynamics-first-law' and position = 1;

-- The wedge, the transfer and the triangle that is nobody's.
update public.lesson_blocks set visual_kind = 'plot', visual = $j${
  "caption": "A tax of 3 opens a gap between what buyers pay and what sellers receive. Trades between the new quantity and the old were worth making; the shaded triangle is their value, and it goes to nobody.",
  "xLabel": "quantity",
  "yLabel": "price",
  "xRange": [0, 10],
  "yRange": [0, 10],
  "lines": [
    { "label": "demand", "tone": "primary",
      "points": [{ "x": 0, "y": 10 }, { "x": 10, "y": 0 }] },
    { "label": "supply", "tone": "accent",
      "points": [{ "x": 0, "y": 0 }, { "x": 10, "y": 10 }] },
    { "dashed": true, "tone": "muted",
      "points": [{ "x": 0, "y": 6.5 }, { "x": 3.5, "y": 6.5 }] },
    { "dashed": true, "tone": "muted",
      "points": [{ "x": 0, "y": 3.5 }, { "x": 3.5, "y": 3.5 }] }
  ],
  "areas": [
    { "label": "lost", "tone": "warn",
      "points": [{ "x": 3.5, "y": 6.5 }, { "x": 5, "y": 5 }, { "x": 3.5, "y": 3.5 }] }
  ],
  "marks": [
    { "x": 5, "y": 5, "label": "no tax", "tone": "muted" },
    { "x": 3.5, "y": 6.5, "label": "buyers pay", "tone": "primary" },
    { "x": 3.5, "y": 3.5, "label": "sellers get", "tone": "accent" }
  ],
  "notes": [
    { "x": 7.2, "y": 8.4, "text": "wedge = 3" }
  ]
}$j$::jsonb
where lesson_id = 'microeconomics-margins-and-surplus' and position = 5;

-- Why the series converges, and why leakage matters more than the first round.
update public.lesson_blocks set visual_kind = 'plot', visual = $j${
  "caption": "Each round adds less than the one before, so the total settles rather than running away. Where more leaks out per round, it settles sooner and lower — the same policy, half the effect.",
  "xLabel": "rounds of spending",
  "yLabel": "cumulative effect, per 1 spent",
  "xRange": [1, 8],
  "yRange": [0, 5.5],
  "lines": [
    { "label": "MPC 0.8", "tone": "primary",
      "points": [{ "x": 1, "y": 1 }, { "x": 2, "y": 1.8 }, { "x": 3, "y": 2.44 }, { "x": 4, "y": 2.95 }, { "x": 5, "y": 3.36 }, { "x": 6, "y": 3.69 }, { "x": 7, "y": 3.95 }, { "x": 8, "y": 4.16 }] },
    { "label": "with imports", "tone": "accent",
      "points": [{ "x": 1, "y": 1 }, { "x": 2, "y": 1.6 }, { "x": 3, "y": 1.96 }, { "x": 4, "y": 2.18 }, { "x": 5, "y": 2.3 }, { "x": 6, "y": 2.38 }, { "x": 7, "y": 2.43 }, { "x": 8, "y": 2.46 }] },
    { "dashed": true, "tone": "muted",
      "points": [{ "x": 1, "y": 5 }, { "x": 8, "y": 5 }] },
    { "dashed": true, "tone": "muted",
      "points": [{ "x": 1, "y": 2.5 }, { "x": 8, "y": 2.5 }] }
  ],
  "areas": [],
  "marks": [],
  "notes": [
    { "x": 2.4, "y": 5.25, "text": "multiplier 5" },
    { "x": 2.6, "y": 2.75, "text": "multiplier 2.5" }
  ]
}$j$::jsonb
where lesson_id = 'macroeconomics-income-and-multiplier' and position = 1;

-- The advertising game, with the equilibrium ringed.
update public.lesson_blocks set visual_kind = 'matrix', visual = $j${
  "caption": "Advertising is the better reply to both of B's options, and the same holds for B. They land on the ringed cell — while (14, 14) sat available to both of them.",
  "rowPlayer": "Firm A",
  "colPlayer": "Firm B",
  "rowOptions": ["advertises", "does not"],
  "colOptions": ["advertises", "does not"],
  "cells": [["10, 10", "18, 4"], ["4, 18", "14, 14"]],
  "highlight": [0, 0]
}$j$::jsonb
where lesson_id = 'game-theory-dominance-and-equilibrium' and position = 2;
