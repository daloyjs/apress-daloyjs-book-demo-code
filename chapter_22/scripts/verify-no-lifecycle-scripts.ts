// scripts/verify-no-lifecycle-scripts.ts
//
// orders-api's own install-time lifecycle gate.
// Lifecycle hooks (preinstall/install/postinstall/
// prepare) are the primary execution channel used
// by npm supply-chain worms, because they run
// automatically on `npm install` / `pnpm install`
// with no separate confirmation step. This gate
// fails the build if our own package.json ever
// declares one.
import { readFile } from "node:fs/promises";

const FORBIDDEN_HOOKS = [
  "preinstall",
  "install",
  "postinstall",
  "prepare",
  "preprepare",
  "postprepare",
] as const;

interface PackageJsonLike {
  readonly scripts?: Record<string, unknown>;
}

export function findForbiddenLifecycleScripts(
  pkg: PackageJsonLike,
): readonly string[] {
  const scripts = pkg.scripts ?? {};
  return FORBIDDEN_HOOKS.filter((hook) =>
    Object.prototype.hasOwnProperty.call(
      scripts,
      hook,
    ),
  );
}

async function main(): Promise<void> {
  const pkg = JSON.parse(
    await readFile("package.json", "utf8"),
  ) as PackageJsonLike;
  const offending =
    findForbiddenLifecycleScripts(pkg);

  if (offending.length > 0) {
    console.error(
      `verify-no-lifecycle-scripts: forbidden ` +
        `install-time lifecycle script(s) in ` +
        `package.json: ${offending.join(", ")}`,
    );
    console.error(
      "Lifecycle hooks run automatically on " +
        "install. If this hook is genuinely " +
        "needed, get it reviewed and documented " +
        "in SECURITY.md instead of merging it " +
        "silently.",
    );
    process.exitCode = 1;
  } else {
    console.log(
      "verify-no-lifecycle-scripts: no forbidden " +
        "lifecycle hooks found.",
    );
  }
}

if (
  process.argv[1]?.endsWith(
    "verify-no-lifecycle-scripts.ts",
  )
) {
  await main();
}
