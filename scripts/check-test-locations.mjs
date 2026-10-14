import { readdir } from "node:fs/promises";
const skip = new Set([
  "node_modules",
  ".git",
  "dist",
  "artifacts",
  ".demo-tools",
  ".pnpm-store",
  "test-results",
  "playwright-report",
  "data",
]);
const invalid = [];
async function walk(dir = ".") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(path);
    else if (
      /\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name) &&
      !path.startsWith("./tests/")
    )
      invalid.push(path);
  }
}
await walk();
if (invalid.length) {
  console.error("Tests must be located under tests/:\n" + invalid.join("\n"));
  process.exit(1);
}
