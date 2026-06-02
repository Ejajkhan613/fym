const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const sourceDirectory = path.join(__dirname, "..", "src");

function collectJavaScriptFiles(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...collectJavaScriptFiles(entryPath));
            continue;
        }

        if (entry.isFile() && entry.name.endsWith(".js")) {
            files.push(entryPath);
        }
    }

    return files;
}

const files = collectJavaScriptFiles(sourceDirectory).sort();

for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], {
        encoding: "utf8"
    });

    if (result.status !== 0) {
        process.stderr.write(result.stderr || result.stdout);
        process.exit(result.status || 1);
    }
}

console.log(`Checked ${files.length} JavaScript files.`);
