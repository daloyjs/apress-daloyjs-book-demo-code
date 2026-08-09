# Chapter 16: CI as a Security Gate

**Demo snapshot** for the Apress book. Continues from `chapter_15`.

What this chapter adds: Hardened .github/workflows/ci.yml (SHA pins, permissions, verify:no-lifecycle-scripts).

```sh
pnpm install
pnpm test
pnpm dev
```

Pin: `@daloyjs/core` ^1.0.0. Tag: `chapter-16`.
