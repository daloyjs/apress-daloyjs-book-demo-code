#!/usr/bin/env node
/**
 * Maintainer tool: re-apply stage seeds onto existing chapter_01..23 folders.
 * Readers do not need this. Cross-platform (Node 24+): Linux, macOS, Windows.
 *
 * From monorepo root or this package:
 *   node otherdocs/apress/apress-daloyjs-book-demo-code/scripts/apply-stage-seeds.mjs
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SEEDS = join(__dirname, "seeds");

function ch(n) {
  return join(ROOT, `chapter_${String(n).padStart(2, "0")}`);
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function copyIntoCh(n, rel, src) {
  const dest = join(ch(n), rel);
  ensureDir(dirname(dest));
  copyFileSync(src, dest);
}

function write(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content, "utf8");
}

function range(from, to) {
  const out = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
}

function setScript(pkgPath, name, value) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (!pkg.scripts) pkg.scripts = {};
  if (pkg.scripts[name] !== value) {
    pkg.scripts[name] = value;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  }
}

console.log("Applying stage seeds...");

for (const n of range(4, 23)) {
  copyIntoCh(n, "src/domain/catalog-orders.ts", join(SEEDS, "domain/catalog-orders.ts"));
}
for (const n of range(10, 23)) {
  copyIntoCh(n, "src/auth/demo-keys.ts", join(SEEDS, "auth/demo-keys.ts"));
}

copyFileSync(join(SEEDS, "build-app-ch03.ts"), join(ch(3), "src/build-app.ts"));
copyFileSync(join(SEEDS, "build-app-ch04.ts"), join(ch(4), "src/build-app.ts"));
for (const n of range(5, 7)) {
  copyFileSync(join(SEEDS, "build-app-ch04.ts"), join(ch(n), "src/build-app.ts"));
}
copyFileSync(join(SEEDS, "build-app-ch08.ts"), join(ch(8), "src/build-app.ts"));
copyFileSync(join(SEEDS, "build-app-ch09.ts"), join(ch(9), "src/build-app.ts"));
copyFileSync(join(SEEDS, "build-app-ch10.ts"), join(ch(10), "src/build-app.ts"));
copyFileSync(join(SEEDS, "build-app-ch11.ts"), join(ch(11), "src/build-app.ts"));
copyFileSync(join(SEEDS, "build-app-ch12.ts"), join(ch(12), "src/build-app.ts"));
for (const n of range(13, 21)) {
  copyFileSync(join(SEEDS, "build-app-ch12.ts"), join(ch(n), "src/build-app.ts"));
}
copyFileSync(join(SEEDS, "build-app-ch22.ts"), join(ch(22), "src/build-app.ts"));
copyFileSync(join(SEEDS, "build-app-ch23.ts"), join(ch(23), "src/build-app.ts"));

for (const n of range(22, 23)) {
  const routeDir = join(ch(n), "src/routes");
  ensureDir(routeDir);
  for (const f of ["schemas.ts", "catalog.ts", "orders.ts", "admin.ts", "webhooks.ts"]) {
    copyFileSync(join(SEEDS, "routes", f), join(routeDir, f));
  }
}
copyFileSync(join(SEEDS, "routes/returns.ts"), join(ch(23), "src/routes/returns.ts"));
rmSync(join(ch(22), "src/routes/returns.ts"), { force: true });

// Known-dependency-names gate: introduced in Chapter 14, inherited forward.
for (const n of range(14, 23)) {
  ensureDir(join(ch(n), "scripts"));
  copyFileSync(
    join(SEEDS, "ci/verify-known-deps.ts"),
    join(ch(n), "scripts/verify-known-deps.ts"),
  );
  setScript(
    join(ch(n), "package.json"),
    "verify:known-deps",
    "node scripts/verify-known-deps.ts",
  );
}

// Hardened CI workflow + install-time lifecycle gate: introduced in Chapter 16.
for (const n of range(16, 23)) {
  const gh = join(ch(n), ".github");
  ensureDir(join(gh, "workflows"));
  copyFileSync(join(SEEDS, "ci/ci.yml"), join(gh, "workflows/ci.yml"));
  copyFileSync(join(SEEDS, "ci/CODEOWNERS"), join(gh, "CODEOWNERS"));
  ensureDir(join(ch(n), "scripts"));
  // Native Node 24 TS (no tsx), matching the manuscript's Listing 16-3.
  rmSync(join(ch(n), "scripts/verify-no-lifecycle-scripts.mjs"), {
    force: true,
  });
  copyFileSync(
    join(SEEDS, "ci/verify-no-lifecycle-scripts.ts"),
    join(ch(n), "scripts/verify-no-lifecycle-scripts.ts"),
  );
  copyFileSync(
    join(SEEDS, "tests/verify-no-lifecycle-scripts.test.ts"),
    join(ch(n), "tests/verify-no-lifecycle-scripts.test.ts"),
  );
  setScript(
    join(ch(n), "package.json"),
    "verify:no-lifecycle-scripts",
    "node scripts/verify-no-lifecycle-scripts.ts",
  );
}

const massNoCsrf = `import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";

test("a role field smuggled onto product creation is refused", async () => {
  const app = buildApp();
  const res = await app.request("/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Evil", priceCents: 100, role: "admin" }),
  });
  assert.ok(res.status === 400 || res.status === 422, "got " + res.status);
});

test("create product happy path", async () => {
  const app = buildApp();
  const res = await app.request("/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Notebook", priceCents: 900 }),
  });
  assert.equal(res.status, 201);
});
`;

const massCsrf = `import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";

const browserHeaders = {
  "content-type": "application/json",
  "sec-fetch-site": "same-origin",
};

test("a role field smuggled onto product creation is refused", async () => {
  const app = buildApp();
  const res = await app.request("/products", {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify({ name: "Evil", priceCents: 100, role: "admin" }),
  });
  assert.ok(res.status === 400 || res.status === 422, "got " + res.status);
});

test("create product happy path", async () => {
  const app = buildApp();
  const res = await app.request("/products", {
    method: "POST",
    headers: browserHeaders,
    body: JSON.stringify({ name: "Notebook", priceCents: 900 }),
  });
  assert.equal(res.status, 201);
});
`;

for (const n of range(4, 7)) write(join(ch(n), "tests/mass-assignment.test.ts"), massNoCsrf);
for (const n of range(8, 9)) write(join(ch(n), "tests/mass-assignment.test.ts"), massCsrf);

const authTest = `import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";
import { mintDemoToken } from "../src/auth/demo-keys.ts";

const browser = { "content-type": "application/json", "sec-fetch-site": "same-origin" };

test("create order without token is 401", async () => {
  const app = buildApp();
  const res = await app.request("/orders", {
    method: "POST",
    headers: browser,
    body: JSON.stringify({ items: [{ productId: "sku_mug", quantity: 1 }] }),
  });
  assert.equal(res.status, 401);
});

test("create order with write token is 201", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:write orders:read catalog:write", "user_alice");
  const res = await app.request("/orders", {
    method: "POST",
    headers: { ...browser, authorization: "Bearer " + token },
    body: JSON.stringify({ items: [{ productId: "sku_mug", quantity: 1 }] }),
  });
  assert.equal(res.status, 201);
});

test("read-only token cannot create orders", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_bob");
  const res = await app.request("/orders", {
    method: "POST",
    headers: { ...browser, authorization: "Bearer " + token },
    body: JSON.stringify({ items: [{ productId: "sku_mug", quantity: 1 }] }),
  });
  assert.equal(res.status, 403);
});
`;

for (const n of range(10, 23)) {
  write(join(ch(n), "tests/auth.test.ts"), authTest);
  rmSync(join(ch(n), "tests/mass-assignment.test.ts"), { force: true });
}

const adminTest = `import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";
import { mintDemoToken } from "../src/auth/demo-keys.ts";

test("admin summary allowed from loopback", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_alice");
  const res = await app.request("/admin/orders-summary", {
    headers: {
      authorization: "Bearer " + token,
      "x-test-client-ip": "127.0.0.1",
    },
  });
  assert.equal(res.status, 200);
});

test("admin summary refused from non-allowlisted IP", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_alice");
  const res = await app.request("/admin/orders-summary", {
    headers: {
      authorization: "Bearer " + token,
      "x-test-client-ip": "203.0.113.9",
    },
  });
  assert.equal(res.status, 403);
});
`;

const adminCapstoneTest = `import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";
import {
  DEMO_ADMIN_CERT_HEADERS,
  mintDemoToken,
} from "../src/auth/demo-keys.ts";

test("admin summary allowed from loopback with verified client cert", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_alice");
  const res = await app.request("/admin/orders-summary", {
    headers: {
      authorization: "Bearer " + token,
      "x-test-client-ip": "127.0.0.1",
      ...DEMO_ADMIN_CERT_HEADERS,
    },
  });
  assert.equal(res.status, 200);
});

test("admin summary refused from non-allowlisted IP even with cert", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_alice");
  const res = await app.request("/admin/orders-summary", {
    headers: {
      authorization: "Bearer " + token,
      "x-test-client-ip": "203.0.113.9",
      ...DEMO_ADMIN_CERT_HEADERS,
    },
  });
  assert.equal(res.status, 403);
});

test("admin summary refused without client certificate", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:read", "user_alice");
  const res = await app.request("/admin/orders-summary", {
    headers: {
      authorization: "Bearer " + token,
      "x-test-client-ip": "127.0.0.1",
    },
  });
  assert.equal(res.status, 401);
});
`;

for (const n of range(11, 21)) write(join(ch(n), "tests/admin.test.ts"), adminTest);
for (const n of range(22, 23)) write(join(ch(n), "tests/admin.test.ts"), adminCapstoneTest);

const ssrfTest = `import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/build-app.ts";
import { mintDemoToken } from "../src/auth/demo-keys.ts";

test("webhook registration refuses metadata IP via fetchGuard", async () => {
  const app = buildApp();
  const token = await mintDemoToken("orders:write", "user_alice");
  const res = await app.request("/webhooks/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      authorization: "Bearer " + token,
    },
    body: JSON.stringify({ url: "http://169.254.169.254/latest/meta-data/" }),
  });
  assert.equal(res.status, 403);
});
`;

for (const n of range(12, 23)) write(join(ch(n), "tests/ssrf.test.ts"), ssrfTest);

const readmes = [
  [8, "Headers, CORS, and CSRF", "cors + csrf(fetch-metadata) on catalog/orders."],
  [9, "Rate Limiting and Abuse Control", "rateLimit keyGenerator on client IP."],
  [10, "Authentication and Authorization, Safely", "jwk(ES256 demo JWKS) + requireScopes; mintDemoToken tests."],
  [11, "Locking Down Admin and Internal Surfaces", "/admin group with ipRestriction."],
  [12, "Outbound Safety", "POST /webhooks/register via fetchGuard."],
  [16, "CI as a Security Gate", "Hardened .github/workflows/ci.yml (SHA pins, permissions, verify:no-lifecycle-scripts)."],
  [22, "Capstone", "Modular routes; loadShedding; admin mTLS+IP; createWebhookSender; partner httpSignatureAuth; MCP process."],
  [23, "Post-capstone complete", "POST /orders/:id/returns module on assembled capstone tree."],
];

for (const [n, title, adds] of readmes) {
  const prev = String(n - 1).padStart(2, "0");
  const id = String(n).padStart(2, "0");
  write(
    join(ch(n), "README.md"),
    `# Chapter ${n}: ${title}

**Demo snapshot** for the Apress book. Continues from \`chapter_${prev}\`.

What this chapter adds: ${adds}

\`\`\`sh
pnpm install
pnpm test
pnpm dev
\`\`\`

Pin: \`@daloyjs/core\` ^1.0.0. Tag: \`chapter-${id}\`.
`,
  );
}

copyFileSync(join(SEEDS, "tests/errors.test.ts"), join(ch(6), "tests/errors.test.ts"));
copyFileSync(join(SEEDS, "tests/boot-guards.test.ts"), join(ch(7), "tests/boot-guards.test.ts"));
// Guardrails seed already includes sec-fetch-site for Ch8+ csrf(fetch-metadata).
// Ch5–7 have no csrf yet: strip those headers so POSTs are not 403'd early.
const guardFull = readFileSync(join(SEEDS, "tests/guardrails.test.ts"), "utf8");
const guardNoCsrf = guardFull
  .replace(/"sec-fetch-site": "same-origin",\s*/g, "")
  .replace(/,\s*"sec-fetch-site": "same-origin"/g, "");
for (const n of range(5, 7)) write(join(ch(n), "tests/guardrails.test.ts"), guardNoCsrf);
for (const n of range(8, 9)) write(join(ch(n), "tests/guardrails.test.ts"), guardFull);
for (const n of range(10, 23)) {
  rmSync(join(ch(n), "tests/guardrails.test.ts"), { force: true });
}
copyFileSync(join(SEEDS, "tests/rate-limit.test.ts"), join(ch(9), "tests/rate-limit.test.ts"));
// MCP tests (Ch18+)
if (existsSync(join(SEEDS, "tests/mcp.test.ts"))) {
  for (const n of range(18, 23)) {
    write(join(ch(n), "tests/mcp.test.ts"), readFileSync(join(SEEDS, "tests/mcp.test.ts"), "utf8"));
  }
}

const capstoneTest = `import assert from "node:assert/strict";
import test from "node:test";
import { signMessage } from "@daloyjs/core";
import { buildApp } from "../src/build-app.ts";
import { DEMO_PARTNER_HMAC } from "../src/auth/demo-keys.ts";

test("capstone posture keeps secureDefaults and finite body limit", () => {
  const app = buildApp();
  const posture = app.getSecurityPosture();
  assert.equal(posture.secureDefaults, true);
  assert.ok(posture.bodyLimitBytes > 0 && posture.bodyLimitBytes <= 1024 * 1024);
});

test("capstone still serves healthz under layered middleware and loadShedding", async () => {
  const app = buildApp();
  const res = await app.request("/healthz");
  assert.equal(res.status, 200);
});

test("partner webhook without signature is 401", async () => {
  const app = buildApp();
  const res = await app.request("/webhooks/partner", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify({ eventType: "order.shipped", orderId: "ord_1" }),
  });
  assert.equal(res.status, 401);
});

test("partner webhook with valid HMAC signature is 202", async () => {
  const app = buildApp();
  const body = JSON.stringify({ eventType: "order.shipped", orderId: "ord_1" });
  // app.request resolves relative paths against http://test.local
  const url = "http://test.local/webhooks/partner";
  const created = Math.floor(Date.now() / 1000);
  const sig = await signMessage({
    method: "POST",
    url,
    alg: "hmac-sha256",
    key: DEMO_PARTNER_HMAC,
    keyid: "partner-demo",
    created,
  });
  const res = await app.request("/webhooks/partner", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      "signature-input": sig.signatureInput,
      signature: sig.signature,
    },
    body,
  });
  assert.equal(res.status, 202, await res.text());
});
`;

for (const n of range(22, 23)) write(join(ch(n), "tests/capstone.test.ts"), capstoneTest);

const ciTest = `import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

test("ci.yml is least-privilege and SHA-pinned", () => {
  const yml = readFileSync(resolve(".github/workflows/ci.yml"), "utf8");
  assert.match(yml, /permissions:\\s*\\{\\}/);
  assert.match(yml, /harden-runner@[0-9a-f]{40}/);
  assert.match(yml, /actions\\/checkout@[0-9a-f]{40}/);
  assert.match(yml, /npm_config_ignore_scripts/);
  assert.match(yml, /verify:no-lifecycle-scripts/);
  assert.match(yml, /verify:known-deps/);
  assert.doesNotMatch(yml, /actions\\/checkout@v\\d/);
});

test("verify-no-lifecycle-scripts gate is green on this package", () => {
  assert.ok(existsSync(resolve("scripts/verify-no-lifecycle-scripts.ts")));
  const r = spawnSync(process.execPath, ["scripts/verify-no-lifecycle-scripts.ts"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("verify-known-deps gate is green on this package", () => {
  assert.ok(existsSync(resolve("scripts/verify-known-deps.ts")));
  const r = spawnSync(process.execPath, ["scripts/verify-known-deps.ts"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});
`;

for (const n of range(16, 23)) write(join(ch(n), "tests/ci-gate.test.ts"), ciTest);

if (!existsSync(ch(1))) {
  console.warn(
    "Warning: chapter_01 missing. Run generate-progressive.mjs once if you need a full rebuild.",
  );
}

console.log("Stage seeds applied.");
