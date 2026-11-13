# Game depth: what the numbers are for

Pacing math (`economy.md`) says when rewards arrive. This file decides **what the player can buy, combine and choose**. Shallow games almost always fail here: balanced timing, but every purchase is the same "+X%" in a different costume. Contents: 1 the verb rule, 2 loop layers, 3 purchasable taxonomy, 4 tag-based synergies, 5 power-up cards, 6 depth minimums, 7 depth metrics from the simulator, 8 variety and surprise, 9 core interaction toy test, 10 banned shallow patterns, 11 depth review.

## 1. The verb rule

Every purchasable, power or upgrade must change **what the player does or decides**, not only how big a number is. Test: remove the numbers from its description. If nothing is left ("more income"), it is a number, not an item. Rewrite it so it opens a new action, creates a trade-off, rewards a timing, or interacts with something else the player owns.

## 2. Loop layers

Design three layers, and give each at least one real decision type.

| Layer | Timescale | Question the player answers | Example (adapt to genre) |
|---|---|---|---|
| Micro | 1-10 s | How do I act right now? | tap rhythm, aim, dodge, use ability now or later |
| Meso | 1-5 min | What do I build or prepare? | which synergy cluster, which consumable to save |
| Macro | session and beyond | What do I commit to long term? | prestige branch, permanent unlock, run modifier |

Write one row per layer in `design.md` under "Depth map". A layer with no decision is a defect.

## 3. Purchasable taxonomy

Cover the categories below. Most shallow games contain only the first.

1. **Producers:** raw output (generators, damage, income).
2. **Multipliers:** global, per-type, conditional (only while X, only above Y).
3. **Synergies:** X boosts Y by count, adjacency, tag or state (section 4).
4. **Active abilities:** cost, cooldown and timing windows that change the player's rhythm.
5. **Consumables and power-ups:** temporary, stockpile-or-spend decision, best used at specific moments (section 5).
6. **Trade-offs:** mutually exclusive branches, gain A and lose B, risk/reward gambles.
7. **Unlockers:** reveal a new mechanic, area, currency or event type (not just a sprite).
8. **Automation:** hands off a chore so the player's role shifts to higher-level choices.
9. **Meta-progression:** permanent choices that change how the next run is played, not only a bigger multiplier.

For action and roguelike games read "purchasable" as weapon, ability, passive, relic, modifier or character; for puzzle games as tool, rule modifier or level mutator. The categories still apply.

## 4. Tag-based synergies

Combinatorial depth is cheap if synergies point at **tags**, not at named items.
- Give every item 1-3 tags from a small vocabulary (for example `fire`, `swarm`, `burst`, `economy`, `tap`, `passive`, `risky`).
- Write synergies as rules over tags: "each `swarm` item owned adds +2% to `burst` items", "`risky` items trigger twice while below 30% health".
- Keep them in `data/synergies.json`, generated or validated by the same parameter file as the economy.
- **Stacking rule:** add within a category, multiply between categories, and cap each. Uncapped multiplicative loops are the classic cause of runaway numbers; the simulator must try to break them.
- Constraints (check in a test): every tag appears in at least 2 synergies; no item has zero synergies; no cycle yields unbounded growth in the sim.

## 5. Power-up and ability cards

Write one card per power-up or active ability in `design.md`:

`Name | Trigger | Duration | Cost | Cooldown | Opportunity cost | Best moment | Worst moment | Visual/audio signature`

If "best moment" and "worst moment" are the same, the power-up is a button, not a decision. Rewrite it.

## 6. Depth minimums (vertical-slice defaults; the brief wins)

Scale with the content runway (roughly one new item or interaction per 1-2 minutes of runway):
- At least **6 of the 9** categories present, each with 2+ items.
- At least **3 mutually exclusive choice points**, **2 active abilities** with timing, **3 consumable or power-up types**.
- At least **8 tags**, and every item in at least one synergy.
- At least **3 viable builds** (section 7) and at least **3 distinct player verbs**.
- At least one **event or modifier** that changes the rules for a while.

## 7. Depth metrics (the simulator and bot must compute these)

Output to `qa/depth/` and assert thresholds. Run many seeds and several policies: greedy, random-valid, tag-focused (one per tag cluster), and casual.

- **Ablation sweep:** remove each item in turn and measure the change in time to the target milestone. If |change| < 2% the item is irrelevant (fix or cut). If > 30% it is mandatory (rebalance or make it a tutorial unlock).
- **Usage rate:** share of runs that buy each item. Under 5% is a dead item; over 95% is mandatory. Both are defects.
- **Build diversity:** cluster final inventories (for example by dominant tag). At least 3 clusters should finish within 15% of the best time.
- **Dominance check:** an item that is cheaper-or-equal and better-or-equal than another in every measured effect strictly dominates it; flag.
- **Best-choice drift:** the best next purchase should change over a run. If greedy buys the same item every time, choices are fake.
- **Decision density:** meaningful decisions per minute from the bot event log (a decision means 2+ affordable, meaningfully different options).
- **Novelty timeline:** timestamped list of "new things" (unlock, mechanic, event, visual layer, sound layer). Assert no gap above the target (2-3 min).

A depth failure is a failing check, not an opinion: fix the data, rerun, and record the output.

## 8. Variety and surprise

- Schedule **events** (rule-changing windows, rare spawns, timed challenges) so that two sessions are not identical. Seeded randomness keeps tests reproducible.
- Plan **reveal beats**: moments when a new mechanic, currency or area appears with a deliberate presentation (screen change, new music layer, tutorial hint).
- Escalate challenge and spectacle together; do not start at maximum feedback.
- For active games add **skill expression**: timing windows, risk and positioning choices, combos with input buffering, telegraphed threats the player can answer.

## 9. Core interaction toy test (greybox phase)

The core verb should be pleasant with no goals attached. Before building systems, check it in isolation:
- Input to visible response in under 100 ms.
- At least 3 feedback channels on each core action (for example motion, sound, particle or number pop).
- Variation (randomized pitch or scale within a range) so repetition does not grate.
- Escalation hook: feedback intensity can rise with combo or progress (capped).
If it is dull in the greybox, adding systems will not fix it.

## 10. Banned shallow patterns

Reject and redesign any of these:
- Ten or more items that differ only in name, price and a single percentage.
- Linear upgrade ladders with no trade-off ("+1 level, +10%") as the main progression.
- Unlocks whose only effect is a different sprite.
- Power-ups that are strictly better than the thing they replace.
- A single currency with no sinks that conflict.
- Purchases that never compete for the same resources or slots.
- Events that only add a bonus and never change what the player should do.

## 11. Independent depth review

Give a fresh reviewer only the item table, synergy table and depth metrics, with this prompt: "Here are a game's purchasable items and their interactions. Describe three different ways a player could build toward the late game. Which items would you never buy, and which would you always buy? Where would two different players end up in the same place?" Convert findings into depth-metric fixes or ledger changes.
