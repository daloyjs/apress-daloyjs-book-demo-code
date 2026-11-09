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

From this repo's root:

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
node scripts/generate-progressive.mjs --daloy ../daloy
node scripts/apply-stage-seeds.mjs
```

`--daloy` (or the `DALOY_REPO` environment variable) must point at an up-to-date checkout of the DaloyJS framework repo ([daloyjs/daloy](https://github.com/daloyjs/daloy)). The script copies `packages/create-daloy/templates/node-basic` from there and prints the `create-daloy` version it used. It refuses to run without the path, so it can never rebuild the chapters from a stale copy of the framework. After a full rebuild, reinstall in any chapter you test (`pnpm install`).

## Lockstep rule

When a manuscript chapter teaches a feature, the matching `chapter_NN` folder (and later folders that inherit it) must implement it. Drift is a release-blocking bug. The manuscript's `AGENTS.md` (in the book repo, one level above this folder when it is checked out as the `books/apress/apress-daloyjs-book-demo-code` submodule) has the full rule.

## Manual step-by-step (no scripts)

If you prefer not to run the Node tools:

1. Edit the relevant file under `scripts/seeds/` (or edit a chapter folder directly).
2. Copy that file into every chapter that should have it (for example ch12 REST into ch12–21, capstone into ch22–23).
3. Update tests in those folders the same way.
4. `pnpm test` in each affected chapter.

The `.mjs` scripts only automate those copy steps.
