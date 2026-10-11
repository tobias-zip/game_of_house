// PostToolUse hook: formats the file Claude just edited with Biome, so formatting
// never needs manual attention. Lint fixes are left out on purpose: removing an
// unused import between two edits would break the second one. `pnpm format`
// applies them later.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

let input = "";
for await (const chunk of process.stdin) input += chunk;

const filePath = JSON.parse(input).tool_input?.file_path;
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const biome = join(projectDir, "node_modules", "@biomejs", "biome", "bin", "biome");

if (filePath && existsSync(biome)) {
    spawnSync(
        process.execPath,
        [
            biome,
            "check",
            "--write",
            "--linter-enabled=false",
            "--no-errors-on-unmatched",
            "--files-ignore-unknown=true",
            filePath,
        ],
        { cwd: projectDir, stdio: "ignore" },
    );
}
