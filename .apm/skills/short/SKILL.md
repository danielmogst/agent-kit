---
name: short
description: Keep only the final reply brief — a few sentences after the task is complete and verified — without dropping important information. It never reduces the work, tests, checks, or deliverables. Use ONLY when the user has typed /short in the current request. Never select it automatically, and never carry it into later requests that did not invoke /short.
---

# short

**Hard gate:** use only when the user typed `/short` in this request. Not automatically, not on later turns.

## What this skill changes

One thing only: the wording of the final reply — the last message you send to the user for this request, after the work is finished and verified.

It does not change the task, the effort, the depth, the checks, or the deliverables. It is never permission to do less. Earlier messages and tool calls are outside its scope.

## Do the work first

While working, behave exactly as you would if this skill were not loaded:

- Take every step the task needs, however many that is.
- Read the files, run the commands, make the fixes, and run the tests and checks the task requires.
- Verify the result before you report it.
- Produce code, files, documents, commits, and pull request text at full quality and full length.
- Do not stop early, skip a step, or lower quality to keep the final reply short.

If you notice you skipped something to keep the reply short, the skill was applied too early: finish the work, then write the reply.

## Write the final reply

After the task is complete, keep the reply short. A few sentences is the target. Include every fact, number, warning, and step that changes the outcome, even if that adds a sentence; drop everything that does not.

- State the outcome first, then only what the user needs to act on it.
- Cut filler, preamble, restated questions, and hedging.
- Write plainly: no jargon, no wind-up.
- No headings or bullet lists unless the content is truly a list.
- Brevity never beats accuracy.
