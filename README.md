# Apress DaloyJS book demo code

Runnable `orders-api` snapshots for **DaloyJS: Contract-First, Secure-by-Default TypeScript APIs** (Apress) by Devlin Duldulao.

This tree is the downloadable source that ships with the book. Each `chapter_NN` folder is a **complete project** at the end of that chapter (not a patch).

## Requirements

| Tool | Version |
| --- | --- |
| Node.js | 24 LTS or 26+ |
| pnpm | 11+ |
| OS | Linux, macOS, or Windows |

No PowerShell required. The steps below work in bash, zsh, fish, or PowerShell.

## How to follow the book (readers)

1. Open the folder for the chapter you are on (for example chapter 10).
2. Install dependencies.
3. Run the tests, then start the app.

```sh
cd chapter_10
pnpm install
pnpm test
pnpm dev
```

That is the whole loop. You do **not** need to regenerate anything.

### Optional: work chapter by chapter

If you want a clean tree for each lab:

```sh
cd chapter_04
pnpm install && pnpm test

cd ../chapter_08
pnpm install && pnpm test

# …continue as the book advances
```

Or keep one checkout and `cd` into the next folder when the book says so.

### Chapter 18 (MCP)

REST and the MCP tool server are separate processes:

```sh
cd chapter_18
pnpm install
pnpm test

# Unix / macOS
export MCP_TOKEN="$(openssl rand -base64 48)"
pnpm dev          # REST on :3000
pnpm dev:mcp      # MCP on :3001

# Windows PowerShell
# $env:MCP_TOKEN = [Convert]::ToBase64String((1..36 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

## Folder map

| Folder | End state |
| --- | --- |
| `chapter_01` | Raw create-daloy scaffold (demo `/books` still present) |
| `chapter_02` | + supply-chain notes |
| `chapter_03` | Books demo removed; healthz only |
| `chapter_04` | Catalog + orders + `.strict()` + mass-assignment test |
| `chapter_05`–`07` | Guardrails / errors / boot-guard tests |
| `chapter_08` | `cors` + `csrf(fetch-metadata)` |
| `chapter_09` | rateLimit `keyGenerator` on client IP |
| `chapter_10` | `jwk()` ES256 demo JWKS + `requireScopes` |
| `chapter_11` | `/admin` + `ipRestriction` |
| `chapter_12`–`15` | `fetchGuard` webhook register + standing-order docs |
| `chapter_16`–`17` | Hardened CI + agent docs |
| `chapter_18` | MCP Streamable HTTP app + tests |
| `chapter_19`–`21` | OWASP / adapters / posture notes |
| `chapter_22` | Capstone assembly |
| `chapter_23` | Post-capstone returns resource |

## Pin

`@daloyjs/core` **1.0.0**, TypeScript 7, Zod 4.

## Maintainers / authors only

Readers can stop here. Book authors and agents who keep this tree in lockstep with the manuscript: see [`MAINTAINING.md`](MAINTAINING.md).

## License

MIT (same as DaloyJS) unless the published demo-code repo states otherwise.
