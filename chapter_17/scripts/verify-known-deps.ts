import { readFileSync } from "node:fs";

/**
 * Every dependency name this project has
 * explicitly decided to trust. Add a name here
 * only in the same PR that adds it to
 * package.json, and read the name twice before
 * you do: this list is the one place in the
 * repository where a slopsquatted or
 * typosquatted package name has to survive a
 * human actually looking at it on purpose.
 */
const KNOWN = new Set([
  // dependencies
  "@daloyjs/core",
  "zod",
  // devDependencies
  "@hey-api/openapi-ts",
  "@types/node",
  "typescript",
]);

const pkg = JSON.parse(
  readFileSync("package.json", "utf8"),
);
const names = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
];
const unknown = names.filter(
  (name) => !KNOWN.has(name),
);

if (unknown.length > 0) {
  console.error(
    `Unknown dependenc${
      unknown.length === 1 ? "y" : "ies"
    } (add deliberately or remove): ${unknown.join(
      ", ",
    )}`,
  );
  process.exit(1);
}

console.log(
  `All ${names.length} dependency names are known.`,
);
