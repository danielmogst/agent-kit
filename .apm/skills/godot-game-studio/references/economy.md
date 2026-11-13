# Economy and balance method

Agents tend to type numbers that "look right". Do the opposite: **derive, simulate, assert.** Pacing math is necessary but not sufficient: a perfectly paced economy can still be shallow. Read `game-depth.md` for *what* the player buys and combines (taxonomy, tag synergies, power-ups, depth metrics); the simulator below must compute those depth metrics too. Contents: 1 pacing targets, 2 formulas, 3 genre adapters, 4 `economy.md` structure, 5 simulator and bot, 6 sync rule, 7 decision richness.

## 1. Start from time, not from prices

Write pacing targets first, then derive prices and rates from them. The defaults below are **idle/incremental defaults**; the brief's values win, and section 3 says how to adapt them to other genres.

| Target | Default (override per brief) |
|---|---|
| Time to first meaningful purchase | 5-15 s |
| Time between purchases, first 5 min | 8-30 s |
| Time between purchases, 5-20 min | 30-120 s |
| Visible milestone or unlock | every 60-120 s early, every 2-3 min after |
| Dead zone (nothing affordable and no milestone) | never longer than 90 s in the first 20 min |
| First prestige/reset, if present | 20-40 min active play, never under 10 min |
| Run 2 to reach the same point as run 1 | 40-60% of the time |
| Active play versus idle income | active 2-3x idle early, converging to 1.3-1.5x late |
| Offline earnings | `rate * min(away, cap) * efficiency`, efficiency 0.5-1.0, cap from the brief |

## 2. Core formulas

Write the ones you use into `economy.md` with your chosen parameters.

- **Escalating cost:** `cost(n) = base * r^n`, `r` in 1.07-1.15 (1.15 is the idle standard; lower for cheap early items).
- **Cost of buying k more when owning n:** `base * r^n * (r^k - 1) / (r - 1)`.
- **Max affordable k with budget B:** `floor( ln(1 + B*(r-1) / (base*r^n)) / ln(r) )`.
- **Payback time:** `cost(n) / income_per_unit`. Keep the next-best purchase's payback inside a band that grows slowly (for example 10 s early, 2 min mid, 10 min late). If payback explodes the player stalls; if it collapses nothing matters.
- **Milestone multipliers** (x2 income at 25 / 50 / 100 owned, or the brief's version) counter cost growth so progress does not hit a wall.
- **Tier ladder:** tier `k` cost `base0 * mc^k`, income `inc0 * mi^k`, with `mc` slightly above `mi` (cost x10-12, income x8-10), so higher tiers are worth unlocking but not strictly dominant.
- **Prestige currency:** `earned = floor(c * (total_run_earnings / threshold)^p)`, `p` between 0.5 and 0.33; bonus `1 + a * currency`, or the brief's flat bonus. Choose `c`, `p`, `a` so run 2 meets the table. With a flat bonus, still compute how many prestiges are needed to feel a difference and report it.
- **Combo/streak:** `m(c) = 1 + min(c, cap) * step` with a decay timer. Cap the total so an optimal active player gets about 2-3x idle, not 20x.
- **Probabilities:** for each chance `p` record expected attempts `1/p` and `P(at least one in n) = 1 - (1-p)^n`. Compare expected time to first occurrence with session length. A 1/64 chance at 10 s per attempt averages about 10 minutes; decide whether that is the intended feel and add **pity** (guaranteed within N attempts) when the wait exceeds the target.
- **Rarity ladder:** each tier roughly x0.2-0.3 of the previous (70 / 20 / 7 / 2.5 / 0.5). Print the expected-value table.
- **Numeric range:** GDScript `float` is 64-bit (to about 1e308, 15-16 significant digits); `int` overflows near 9.2e18. Use `float` for currencies that can exceed 1e15 and never test floats for equality. JSON round-trips integers as floats and loses integer precision above 2^53, so store large currencies as floats or strings and cast on load. If the brief needs larger ranges, use a mantissa/exponent type and test it. Unit-test the number formatter (K, M, B, T, aa, ab...) on 0, 999, 1000, 1e15, 1e100 and negative zero.

## 3. Genre adapters

Do not force idle formulas onto other genres. Replace "purchase" with the genre's unit of progress and keep the method (targets first, derive, simulate, assert).

| Genre | Progress unit | Targets to set | Formulas |
|---|---|---|---|
| Action / roguelike | encounter, room, level-up | time-to-kill band (normal 3-8 s, boss 30-90 s), time between level-ups, run length, damage taken per encounter | enemy HP `H0 * g^level`; player damage matched to hold time-to-kill in band; XP `base * n^1.5`; loot per minute |
| Puzzle | level | solve time per level, hint use, difficulty slope | per-level parameter table; check every level is solvable (solver or scripted proof) |
| Management / builder | build, unlock | time between meaningful placements, resource flow balance per second | source/sink table per resource; assert no resource has permanent surplus or deficit |
| Card / deck | draft pick, battle | win rate by deck power, turns per battle | simulate AI-versus-AI at several power levels |

Whatever the genre, keep a **sources and sinks** table per currency and assert that no currency accumulates unspent forever.

## 4. `economy.md` required structure

1. **Pacing targets** (table above, filled in).
2. **Currencies, sources and sinks**, with rates per second at start, 5 min and 20 min.
3. **Formula ledger**, one row per tunable number: `Name | Value | Formula or reason | Sensitivity at x2 and x0.5 | File`. No row, no number.
4. **Item tables** (cost, income, payback, unlock condition), generated from formulas, never typed by hand.
5. **Timeline table**: expected time of each purchase/milestone for an optimal bot and a lazy player.
6. **Prestige analysis**: first prestige, run 2, run N, diminishing returns.
7. **Randomness analysis**: probabilities, expected values, pity rules.
8. **Active versus idle** and **offline** analysis.
9. **Risks and exploits**: clock manipulation (clamp negative or absurd offline deltas), multi-instance, rapid-click abuse (rate-limit), overflow.
10. **Simulator results**: command, latest summary, date of last run.

## 5. Simulator and bot

Create `tools/sim_economy.py` (or a headless `.gd` script) that:
- Reads the **same data files** the game reads, never a copy of the numbers.
- Simulates at least three players: **optimal** (greedy by payback, plus a lookahead variant), **casual** (taps in bursts, buys late), **idle** (no input).
- Writes a CSV timeline to `qa/economy/` and **asserts** each pacing row. Non-zero exit on violation.
- Runs a **sensitivity sweep**: rerun with each ledger parameter at x0.5 and x2 and record which targets break. This fills the Sensitivity column with measurements instead of guesses.
- Uses a seeded RNG for random drops and runs enough seeds (for example 200) to report mean and 5th/95th percentile times.
- Is rerun after every tuning change; paste its summary into `economy.md` section 10.

`tests/bot_playthrough.gd` plays the real game logic headless at accelerated time and logs the same metrics. A difference of more than 10% between simulator and bot is a bug in one of them; investigate before shipping.

## 6. Sync rule

A test (`tests/test_economy_sync`) recomputes the item tables from the parameters in `data/` using the `economy.md` formulas and fails if any data value differs by more than epsilon. Generate data with `tools/gen_economy_data.py` from a single parameter file. Hand-edited derived numbers are forbidden because they drift from the doc silently.

## 7. Depth checks in the simulator

The simulator is also the depth auditor. In addition to timing, it must produce (details and thresholds in `game-depth.md` section 7):
- **Ablation sweep:** remove each item and record the change in time to milestone (irrelevant under 2%, mandatory over 30%).
- **Usage rates** per item across policies and seeds (dead under 5%, mandatory over 95%).
- **Build diversity:** at least 3 clusters of final inventories finishing within 15% of the best.
- **Best-choice drift:** the best next purchase changes during a run.
- **Stacking stress test:** try to break the synergy rules with the strongest stack; growth must stay inside the cap.
- **Policy comparison:** greedy versus random-valid. If greedy wins by more than about 3x, choices are fake; add trade-offs.

Write results to `qa/depth/` and paste the summary into `economy.md` section 10. A failed depth check is handled like a failed pacing assert: fix the data, rerun, record.
