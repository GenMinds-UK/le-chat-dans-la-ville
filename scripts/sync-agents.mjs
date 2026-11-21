// Copies the tool-neutral .agents/ folders to where specific tools look for them.
// .agents/ is the source of truth. The targets are local to each clone: list them
// in .agents/sync-targets.local.json (gitignored) as pairs of [from, to], e.g.
//   [[".agents/skills", ".mytool/skills"], [".agents/agents", ".mytool/agents"]]
// Without that file this script does nothing. Keep the copies out of git.
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";

const TARGETS_FILE = ".agents/sync-targets.local.json";

const targets = existsSync(TARGETS_FILE) ? JSON.parse(readFileSync(TARGETS_FILE, "utf8")) : [];

for (const [from, to] of targets) {
  if (!existsSync(from)) continue;
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  console.log(`synced ${from} -> ${to}`);
}
