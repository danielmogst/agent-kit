---
name: auto-commit
description: Manual-only shipping routine. Use ONLY when the user has typed /auto-commit in the current request. Creates one branch, one commit and one pull request in a fixed format (plain-language paragraph, ---, one bullet per change) with pre-commit gates, secret scanning and branch protection. Never select this skill automatically and never infer it from a finished task, a dirty tree or a mention of committing.
---

# auto-commit

## HARD GATE

**Never run unless the user typed `/auto-commit` in the current request.**

Not from a finished task, a dirty tree, a request to "commit"/"push"/"open a PR",
or from this file being auto-imported. No slash command: stop. No branch, no
commit, no push, no PR, no staging. If this file was auto-loaded, say so and do
nothing. If the user asked for a commit without invoking the skill, do it outside
this skill.

## Preflight

Read `git log --oneline -20`, `CONTRIBUTING*`, `AGENTS.md`, CI config. Base branch from
`git symbolic-ref --short refs/remotes/origin/HEAD` — never assume `main`. Repo
conventions override wording; the body shapes below are fixed.

## Branch

One branch per task from `origin/<base>`, named `type/short-description`, where
`type` = `feat|fix|refactor|perf|docs|test|chore`. Descriptive. No dates, session
ids, tool names, or `wip`.

## Commit

Subject: `type(scope): imperative summary` — imperative, ≤72 chars, no trailing
period, optional scope, blank second line.

Body: one `- ` line per user-visible change, e.g.

- Add a retry action to a failed charge, so a customer can recover without support

One line per change, no wrapping, nesting, numbering or blank lines between.
State outcome and reason, never implementation trivia or a restatement of the subject. 
No attribution trailers or "generated with". One commit per branch — split only if every commit gates green alone.

## Stage

Explicit paths only — never `git add -A` / `git add .`. Verify with `git diff --cached --name-only`, then read `git diff --cached`. 
Never stage `.env*`, credentials, keys, local config, build output, caches, editor noise or planning notes. Scan the staged diff before committing:

```bash
git diff --cached | grep -nEi 'api[_-]?key|secret|passw|token|private key|BEGIN [A-Z ]*PRIVATE|postgres(ql)?://|mongodb(\+srv)?://|sk_live|ghp_|AKIA[0-9A-Z]{16}'
```

Every hit gets read. Remove debug leftovers.

## Gates

Discover the project's gates; never invent commands. 
All must exit 0 on the exact tree being committed; record exit codes. No dev servers, watchers or long-lived processes. 
Environment-blocked or unrelated failure: prove it on the base branch and say so. Never report a gate not run; never hide a red one.

## Push and PR

`git push -u origin <branch>`, then `gh pr create` / `glab mr create` when authenticated; otherwise API, or compare URL plus the body to paste. 
Keep body text in an ignored path.

Title: the commit subject for a single-commit branch, else a feature-level title
under the same rules.

Body, exactly three parts:

```
<one plain-language paragraph: what the user gets now>

---

- <change>
- <change>
```

Paragraph: complete sentences, no jargon, no file paths, no process narration, no gate output or counts — the after, not the journey. 
Bullets: one per change, wording consistent with the commit body. 
Repo PR templates: keep their sections, paragraph stays first. No secrets, tokens, internal URLs, customer data or PII.

After opening, verify title, base branch, section order and changed-file list. A malformed PR is a shipped defect.

## Revise

Own unmerged commit: amend, then `git push --force-with-lease` — never plain `--force`. 
Already-reviewed PR: add a commit. After a rebase: re-run all gates and note it in the PR.

## Prohibitions

No commit or push to the base branch. No merge. No deleting or force-pushing another's branch. 
No rewriting published history. No PR with a failing gate. No fabricated verification — "not run" is a valid, required answer. 
No reformatting of unrelated files. Code made unreachable by the change is deleted, not left behind.

## Reply

Branch and PR link; what changed in user terms; each gate with exit code and notable count; 
what was not verified with its residual risk; known-remaining items marked intentional or pre-existing.
