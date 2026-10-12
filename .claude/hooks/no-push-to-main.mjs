// PreToolUse hook: stops Claude from pushing to main. Changes reach main only
// through pull requests. The GitHub ruleset blocks this too, but lets admins
// bypass it, and Claude pushes with the admin's credentials.
import { spawnSync } from "node:child_process";

let input = "";
for await (const chunk of process.stdin) input += chunk;

const command = JSON.parse(input).tool_input?.command ?? "";
const pushes = command.match(/\bgit\b[^;&|\n]*\bpush\b[^;&|\n]*/g) ?? [];

const currentBranch = spawnSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
}).stdout.trim();

for (const push of pushes) {
    const words = push.split(/\s+/).filter((word) => !word.startsWith("-"));
    const refspecs = words.slice(words.indexOf("push") + 2);
    const targetsMain =
        refspecs.length === 0
            ? currentBranch === "main"
            : refspecs.some((refspec) => /(^\+?|:)(refs\/heads\/)?main$/.test(refspec));
    if (targetsMain) {
        console.error(
            "Do not push to main. Push a branch and open a pull request instead (see AGENTS.md).",
        );
        process.exit(2);
    }
}
