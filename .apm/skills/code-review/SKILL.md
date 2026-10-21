---
name: code-review
description: "Fresh, evidence-based review of current repository changes before commit, push, or merge. Use when asked to review uncommitted, staged, unstaged, untracked, branch, or PR changes for security, behavioral correctness, integration, and code quality. Verifies scope and baseline, delegates to at most four fresh reviewers, validates findings against code and requirements, and produces a review-only report without editing code, committing, pushing, or deploying."
---

# code-review

Act as the independent review coordinator. Do not assume the implementation is
correct or defective. Findings must be earned from evidence, not inferred from
scope size, author intent, or reviewer consensus.

## Boundaries

- **Review only.** Do not edit application code, tests, documentation, schema,
  or reference material. Do not commit, push, deploy, or open a PR.
- Create only the final report file. Never modify tracked files.
- Do not make live third-party or production requests, access production or
  customer data, run destructive or irreversible operations, or expose
  credentials, secrets, or personal data.
- Do not create test suites, diagnostic tools, or review frameworks. Use
  existing checks only when they materially resolve a finding.
- Subagents must not delegate further.
- Complete one coordinated pass with focused clarification—not repeated
  independent review cycles. Ask before adding reviewers or expanding into
  implementation.
- There is no minimum finding count. "No substantiated findings in this scope"
  is a valid result.

## 1. Establish scope and requirements

- Verify the actual base and head. Do not trust a reported count or a
  pre-existing summary; inspect the diff yourself. Include committed, staged,
  unstaged, and untracked changes as applicable. If the baseline is ambiguous,
  ask before reviewing.
- Use read-only git inspection, for example:

  ```bash
  git status --short
  git --no-pager diff --stat --no-ext-diff --no-textconv
  git --no-pager diff --no-ext-diff --no-textconv
  git --no-pager diff --cached --no-ext-diff --no-textconv
  git ls-files --others --exclude-standard
  git log --oneline <base>..HEAD
  ```

  Do not checkout, reset, stash, clean, or run repository hooks/external diff
  drivers.
- Read repository instructions (`AGENTS.md`, `README*`, `CONTRIBUTING*`, `docs/`)
  and the implementation request, spec, issue, or contract. Read relevant
  unchanged callers, dependencies, and tests where needed to understand intent.
- Separate three things: documented behavior, explicitly accepted operating
  assumptions, and unresolved facts. Treat dated research/reference documents as
  context, not an implementation roadmap, and do not edit them.
- Counts of files/additions/deletions are context, not evidence of quality or
  defects.

## 2. Choose review assignments

- Base assignments on the actual architecture and diff. Group connected
  execution paths and responsibilities, not arbitrary numbers of files.
- Include callers, dependencies, persistence/database behavior, consumers, and
  API contracts where needed to understand each assignment. Reviewers may
  inspect relevant unchanged code.
- Use fresh contexts and no more than four subagents when the host supports
  them: one dedicated security-review specialist and up to three reviewers
  covering correctness, integration, and code quality. If subagents are
  unavailable, perform the same independent passes yourself and state that.
- Do not suggest expected findings, provide an author's self-assessment, or
  share other reviewers' conclusions before their initial reviews finish.
- You remain responsible for coverage and cross-boundary integration. Do not
  assume that individually reviewed files prove the complete workflow is
  correct. Identify material gaps rather than silently leaving them unreviewed.

## 3. Brief each reviewer

Give each reviewer a neutral assignment containing the requirements, relevant
factual context, scope, and reporting requirements. Do not include conclusions
from other reviewers.

```text
Objective: independently review <scope> for <security|correctness|integration|quality>.
Context: <neutral repository instructions and requirements facts only>.
Scope: <changed paths and connected execution paths>; you may read
<related unchanged callers/dependencies/tests>.
Do not assume correctness or defect. Do not propose fixes.
Report each finding with: file:line; triggering conditions; incorrect behavior
and practical impact; supporting code/docs/check evidence; severity; confidence;
classification (introduced by these changes | pre-existing | missing
information | non-blocking maintainability).
If none are substantiated, say "no substantiated findings in this scope".
Constraints: read-only; no edits, commits, pushes, or deploys; no live or
destructive requests; no credentials or personal data; no new tests, tools, or
frameworks; do not delegate; do not share conclusions with other reviewers.
```

## 4. Review standard and findings

Assess the implementation against the actual requirements, existing behavior,
and supported API contracts. Trace relevant data and control flow across
interfaces. Assess security boundaries and failure behavior, not merely whether
individual functions look reasonable.

For every finding, provide:

- **File and line references.**
- **Concrete triggering conditions.**
- **The incorrect behavior and its practical impact.**
- **Supporting code, documentation, or existing-check evidence.**
- **Severity** (Critical / High / Medium / Low) and **confidence** (High /
  Medium / Low).
- **Classification:** introduced by these changes, pre-existing, missing
  information, or non-blocking maintainability concern.

Do not present hypothetical possibilities as confirmed bugs or personal
preferences as correctness requirements. Static evidence can establish a defect;
do not require an executable reproduction when the code already demonstrates it.

## 5. Coordinator verification

- Deduplicate findings and check each against the surrounding code and
  requirements. Reject or qualify unsupported claims. Reconcile disagreements
  using evidence, without automatically accepting a reviewer's verdict.
- Use existing, narrowly targeted, non-destructive checks where they materially
  help resolve a finding. Coordinate shared checks so reviewers do not
  repeatedly run the same commands. Do not create new test suites, diagnostic
  tools, or review frameworks.
- Track what was reviewed, what was not, and which claims remain unverified.
  A clean review of individual files is not proof that the end-to-end workflow
  is correct.

## 6. Final report

Write one consolidated report to a new markdown file. Use the user-specified
path; otherwise use `CODE_REVIEW.md` at the repository root. If the target file
already exists, ask before overwriting it. This report is the only file the
review may create.

Prioritize substantiated findings by severity and confidence. Keep non-blocking
code-quality observations separate from defects. Include:

- **Scope and baseline:** changed files/areas reviewed, comparison base, and
  whether staged/untracked work was included.
- **Findings:** one entry per substantiated issue with the required fields.
- **Non-blocking quality observations:** kept separate and clearly labeled.
- **Coverage and checks:** what was covered, which checks actually ran, and what
  remains unverified.
- **Material gaps:** missing context, inaccessible code, or untested boundaries.

If no substantiated defects are found, say so plainly without claiming the
implementation is guaranteed secure or error-free. Do not invent problems,
issues, or defects. Do not implement fixes in this pass.
