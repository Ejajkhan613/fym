const { readdirSync, statSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

const ROOTS = ["services", "packages"];
const SKIP_DIRS = new Set(["node_modules", ".git"]);

function collectJavaScriptFiles(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) collectJavaScriptFiles(path, files);
      continue;
    }

    if (entry.endsWith(".js")) files.push(path);
  }

  return files;
}

const files = ROOTS.flatMap((root) =>
  collectJavaScriptFiles(join(process.cwd(), root)),
);
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || result.stdout);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
