# Maintaining the demo code (authors and agents)

Readers of the book do **not** need this file. They only `cd chapter_NN`, install, and test (see [README.md](README.md)).

This document is for people updating the progressive demos when the manuscript changes.

## Layout

| Path | Role |
| --- | --- |
| `chapter_01` … `chapter_23` | Committed, runnable snapshots (the product) |
| `scripts/seeds/` | Source of truth for stage `build-app`, routes, tests, CI |
| `scripts/apply-stage-seeds.mjs` | Copy seeds into the chapter folders |
| `scripts/generate-progressive.mjs` | Rare full rebuild from `create-daloy` node-basic |

All maintainer scripts are **Node** (`.mjs`). They run on Linux, macOS, and Windows. No PowerShell.

## Day-to-day re-sync

When you change a seed (or want every chapter folder to match the seeds again):

```sh
# from the DaloyJS monorepo root
node otherdocs/apress/apress-daloyjs-book-demo-code/scripts/apply-stage-seeds.mjs
```

Or from this directory:

```sh
node scripts/apply-stage-seeds.mjs
```

Then run tests on the milestones you touched:

```sh
cd chapter_10 && pnpm test
cd ../chapter_22 && pnpm test
cd ../chapter_23 && pnpm test
```

## Full rebuild (rare)

Only if the chapter trees are missing or you intentionally reset from the scaffolder:

```sh
node otherdocs/apress/apress-daloyjs-book-demo-code/scripts/generate-progressive.mjs
node otherdocs/apress/apress-daloyjs-book-demo-code/scripts/apply-stage-seeds.mjs
```

`generate-progressive.mjs` expects the monorepo (`packages/create-daloy/templates/node-basic`). After a full rebuild, reinstall in any chapter you test (`pnpm install`).

## Lockstep rule

When a manuscript chapter teaches a feature, the matching `chapter_NN` folder (and later folders that inherit it) must implement it. Drift is a release-blocking bug. See [`../AGENTS.md`](../AGENTS.md).

## Manual step-by-step (no scripts)

If you prefer not to run the Node tools:

1. Edit the relevant file under `scripts/seeds/` (or edit a chapter folder directly).
2. Copy that file into every chapter that should have it (for example ch12 REST into ch12–21, capstone into ch22–23).
3. Update tests in those folders the same way.
4. `pnpm test` in each affected chapter.

The `.mjs` scripts only automate those copy steps.
