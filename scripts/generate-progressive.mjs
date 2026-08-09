#!/usr/bin/env node
/**
 * Maintainer tool: full rebuild of chapter_01..23 from create-daloy node-basic.
 * Rare. Day-to-day re-sync is apply-stage-seeds.mjs. Cross-platform (Node 24+).
 *
 * From monorepo root:
 *   node otherdocs/apress/apress-daloyjs-book-demo-code/scripts/generate-progressive.mjs
 *   node otherdocs/apress/apress-daloyjs-book-demo-code/scripts/apply-stage-seeds.mjs
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..");
const REPO = join(__dirname, "..", "..", "..", "..");
const TEMPLATE = join(REPO, "packages", "create-daloy", "templates", "node-basic");
const SEEDS = join(__dirname, "seeds");

function chapterDir(n) {
  return join(OUT, `chapter_${String(n).padStart(2, "0")}`);
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function copyTree(src, dst) {
  if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
  ensureDir(dirname(dst));
  cpSync(src, dst, { recursive: true });
}

function renameTemplateFiles(dir) {
  const map = {
    _gitignore: ".gitignore",
    _npmrc: ".npmrc",
    "_env.example": ".env.example",
    _Dockerfile: "Dockerfile",
    _dockerignore: ".dockerignore",
    _githooks: ".githooks",
    _vscode: ".vscode",
    _agents: ".agents",
  };
  for (const [fromName, toName] of Object.entries(map)) {
    const from = join(dir, fromName);
    const to = join(dir, toName);
    if (!existsSync(from)) continue;
    if (existsSync(to)) rmSync(to, { recursive: true, force: true });
    renameSync(from, to);
  }
}

function setPkgVersion(dir, ver, name = "orders-api") {
  const pkgPath = join(dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = name;
  pkg.version = ver;
  pkg.dependencies = pkg.dependencies ?? {};
  pkg.dependencies["@daloyjs/core"] = "^1.0.0";
  pkg.scripts = pkg.scripts ?? {};
  pkg.scripts.test = "node --experimental-strip-types --test tests/**/*.test.ts";
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function writeChapterReadme(n, title, adds, prev) {
  const id = String(n).padStart(2, "0");
  const prevLabel = prev ? `chapter_${prev}` : "(none)";
  return `# Chapter ${n}: ${title}

**Demo snapshot** for *DaloyJS: Contract-First, Secure-by-Default TypeScript APIs* (Apress).

| | |
| --- | --- |
| Continues from | \`${prevLabel}\` |
| Book chapter | manuscript under \`otherdocs/apress/\` |
| Project | \`orders-api\` from create-daloy \`node-basic\` |
| What this chapter adds | ${adds} |

## Run

\`\`\`sh
pnpm install
pnpm test
pnpm dev
\`\`\`

Pin: \`@daloyjs/core\` ^1.0.0, Node 24 LTS or 26+, pnpm 11+, TypeScript 7, Zod 4.

This folder is a **full tree** at the end of the chapter (not a patch). Prefer it or tag \`chapter-${id}\`.
`;
}

function copyChapter(from, to) {
  copyTree(chapterDir(from), chapterDir(to));
  const nm = join(chapterDir(to), "node_modules");
  if (existsSync(nm)) rmSync(nm, { recursive: true, force: true });
  const lock = join(chapterDir(to), "pnpm-lock.yaml");
  if (existsSync(lock)) rmSync(lock, { force: true });
}

function write(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content, "utf8");
}

if (!existsSync(TEMPLATE)) {
  console.error(`Template not found: ${TEMPLATE}`);
  console.error("Run this script from the DaloyJS monorepo (packages/create-daloy present).");
  process.exit(1);
}

console.log("Generating progressive demo code from create-daloy...");

const c01 = chapterDir(1);
copyTree(TEMPLATE, c01);
renameTemplateFiles(c01);
setPkgVersion(c01, "0.1.0");
{
  const idx = join(c01, "src/index.ts");
  const text = readFileSync(idx, "utf8").replace('name: "DaloyJS API"', 'name: "orders-api"');
  writeFileSync(idx, text, "utf8");
}
write(
  join(c01, "README.md"),
  writeChapterReadme(
    1,
    "Vibe Coding Already Shipped to Production",
    "Baseline create-daloy node-basic (demo /books still present).",
    null,
  ),
);

copyChapter(1, 2);
setPkgVersion(chapterDir(2), "0.2.0");
write(
  join(chapterDir(2), "docs/SUPPLY_CHAIN.md"),
  `# Chapter 2 notes

The scaffold already ships a hardened \`.npmrc\` (\`ignore-scripts=true\`, \`minimum-release-age=1440\`).
Do not turn off \`ignore-scripts\` to make install easier.
`,
);
write(
  join(chapterDir(2), "README.md"),
  writeChapterReadme(2, "Your Dependencies Are the Attack Surface", "Same as chapter_01 plus docs/SUPPLY_CHAIN.md.", "01"),
);

copyChapter(2, 3);
setPkgVersion(chapterDir(3), "0.3.0");
cpSync(join(SEEDS, "build-app-ch03.ts"), join(chapterDir(3), "src/build-app.ts"));
write(
  join(chapterDir(3), "README.md"),
  writeChapterReadme(3, "Secure Without the Tax", "Demo /books route removed; healthz-only orders-api.", "02"),
);

copyChapter(3, 4);
setPkgVersion(chapterDir(4), "0.4.0");
ensureDir(join(chapterDir(4), "src/domain"));
cpSync(join(SEEDS, "domain/catalog-orders.ts"), join(chapterDir(4), "src/domain/catalog-orders.ts"));
cpSync(join(SEEDS, "build-app-ch04.ts"), join(chapterDir(4), "src/build-app.ts"));
write(
  join(chapterDir(4), "README.md"),
  writeChapterReadme(4, "The Contract Is the Sanitizer", "Catalog + orders with .strict() schemas; mass-assignment test.", "03"),
);

for (let n = 5; n <= 9; n++) {
  copyChapter(n - 1, n);
  setPkgVersion(chapterDir(n), `0.${n}.0`);
}

const mid = [
  [11, "Locking Down Admin and Internal Surfaces", "docs/ADMIN.md"],
  [12, "Outbound Safety", "docs/OUTBOUND.md"],
  [13, "Why Zero Runtime Dependencies Matters", "docs/DEPS.md"],
  [14, "Locking the Install", "Reaffirm .npmrc (already present from create-daloy)."],
  [15, "Proving Provenance", "docs/PROVENANCE.md"],
  [16, "CI as a Security Gate", ".github/workflows/ci.yml"],
  [17, "Designing for Coding Agents", "AGENTS.md webhook rule for fetchGuard."],
];

// Build 5-10 scaffold chain continues from 4; chapter 10 next
copyChapter(9, 10);
setPkgVersion(chapterDir(10), "0.10.0");
cpSync(join(SEEDS, "build-app-ch10.ts"), join(chapterDir(10), "src/build-app.ts"));
write(
  join(chapterDir(10), "README.md"),
  writeChapterReadme(10, "Authentication and Authorization, Safely", "jwk + requireScopes (seeds refine tests).", "09"),
);

let prev = 10;
for (const [n, title, adds] of mid) {
  copyChapter(prev, n);
  setPkgVersion(chapterDir(n), `0.${n}.0`);
  write(join(chapterDir(n), "README.md"), writeChapterReadme(n, title, adds, String(prev).padStart(2, "0")));
  prev = n;
}

write(join(chapterDir(11), "docs/ADMIN.md"), "Do not mount /admin on the public app without a separate trust boundary (Ch11).\n");
write(join(chapterDir(12), "docs/OUTBOUND.md"), "Customer webhook URLs must use fetchGuard(), never bare fetch (Ch12).\n");
write(join(chapterDir(13), "docs/DEPS.md"), "Runtime deps stay @daloyjs/core + zod only (Ch13).\n");
write(join(chapterDir(15), "docs/PROVENANCE.md"), "Release builds: SBOM + npm provenance OIDC (Ch15).\n");
ensureDir(join(chapterDir(16), ".github/workflows"));
if (existsSync(join(SEEDS, "ci/ci.yml"))) {
  cpSync(join(SEEDS, "ci/ci.yml"), join(chapterDir(16), ".github/workflows/ci.yml"));
}

{
  const agentsPath = join(chapterDir(17), "AGENTS.md");
  let agents = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : "";
  if (!agents.includes("fetchGuard")) {
    agents += `

## Webhooks (Chapter 17)

- Outbound webhook URLs go through fetchGuard() before use.
- Never set allowPrivate/allowLoopback true on the production sender to make a test pass.
`;
    write(agentsPath, agents);
  }
}

copyChapter(17, 18);
setPkgVersion(chapterDir(18), "0.18.0");
{
  const pkgPath = join(chapterDir(18), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.scripts = pkg.scripts ?? {};
  pkg.scripts["dev:mcp"] = "node --experimental-strip-types --watch src/mcp/index.ts";
  pkg.scripts["start:mcp"] = "node --experimental-strip-types src/mcp/index.ts";
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}
const mcpDir = join(chapterDir(18), "src/mcp");
ensureDir(mcpDir);
ensureDir(join(chapterDir(18), "client"));
for (const f of readdirSync(join(SEEDS, "mcp"))) {
  cpSync(join(SEEDS, "mcp", f), join(mcpDir, f));
}
{
  let mcpApp = readFileSync(join(mcpDir, "build-mcp-app.ts"), "utf8");
  mcpApp = mcpApp.replace(/getOrderForOwner\(orderId, "demo"\)/g, 'getOrderForOwner(orderId, "user_alice")');
  writeFileSync(join(mcpDir, "build-mcp-app.ts"), mcpApp, "utf8");
}
write(
  join(chapterDir(18), "client/mcp.json"),
  `{
  "mcpServers": {
    "orders-api": {
      "url": "http://127.0.0.1:3001/mcp",
      "headers": { "Authorization": "Bearer \${MCP_TOKEN}" }
    }
  }
}
`,
);
write(
  join(chapterDir(18), ".env.example"),
  `PORT=3000
MCP_PORT=3001
MCP_TOKEN=replace-with-openssl-rand-base64-48
NODE_ENV=development
`,
);
write(
  join(chapterDir(18), "README.md"),
  writeChapterReadme(18, "Exposing Tools to Agents with MCP", "Dedicated MCP Streamable HTTP app + tests + client/mcp.json.", "17"),
);

const late = [
  [19, "Mapping to OWASP", "docs/OWASP_MAPPING.md"],
  [20, "Run It Anywhere, Securely", "src/adapters/README.md"],
  [21, "Testing Your Security Posture", "tests/posture.test.ts"],
  [22, "Capstone", "docs/CAPSTONE.md"],
];
prev = 18;
for (const [n, title, adds] of late) {
  copyChapter(prev, n);
  setPkgVersion(chapterDir(n), `0.${n}.0`);
  write(join(chapterDir(n), "README.md"), writeChapterReadme(n, title, adds, String(prev).padStart(2, "0")));
  prev = n;
}
write(join(chapterDir(19), "docs/OWASP_MAPPING.md"), "See book Chapter 19. Map API1-API10 to controls in this tree.\n");
write(join(chapterDir(20), "src/adapters/README.md"), "buildApp() stays pure. Only entrypoints import runtime adapters (Ch20).\n");
write(join(chapterDir(22), "docs/CAPSTONE.md"), "- REST + MCP green\n- pnpm test\n- dual-runtime deploy without changing build-app.ts\n");

copyChapter(22, 23);
setPkgVersion(chapterDir(23), "0.23.0");
cpSync(join(SEEDS, "build-app-ch23.ts"), join(chapterDir(23), "src/build-app.ts"));
write(
  join(chapterDir(23), "README.md"),
  writeChapterReadme(23, "Post-capstone complete", "POST /orders/:id/returns after capstone exercise.", "22"),
);

console.log(`Scaffold tree written under ${OUT}`);
console.log("Next: node scripts/apply-stage-seeds.mjs  (same directory) to apply labs and tests.");
