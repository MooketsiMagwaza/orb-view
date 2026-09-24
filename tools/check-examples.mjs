// Runs every Python code example in content/depth and reports the ones that fail.
//
//   npm run check:examples                run them all
//   npm run check:examples -- calc-        only files whose name contains "calc-"
//   npm run check:examples -- --show       also print each example's first output line
//
// Examples that are shell commands (curl, dig, openssl, …) are skipped. Needs Python 3.12+ on the PATH;
// without it the script says so and exits cleanly, so it never blocks anything else.
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const depthDir = join(root, "content", "depth");
const args = process.argv.slice(2);
const show = args.includes("--show");
const filter = args.find((a) => !a.startsWith("--"));

const python = ["python", "python3"].find((cmd) => spawnSync(cmd, ["--version"], { encoding: "utf8" }).status === 0);
if (!python) {
  console.log("Python was not found on the PATH, so the examples were not run.");
  process.exit(0);
}

const SHELL = /^\s*(\$\s*)?(curl|openssl|dig|nslookup|traceroute|ping|ssh|sudo|npm|npx|git|docker|kubectl|nginx|wget|cat|echo|ls)\b/;
const scratch = mkdtempSync(join(tmpdir(), "orb-examples-"));

let ran = 0;
let skipped = 0;
const failures = [];
for (const file of readdirSync(depthDir).filter((f) => f.endsWith(".json") && (!filter || f.includes(filter)))) {
  const { depth } = JSON.parse(readFileSync(join(depthDir, file), "utf8"));
  for (const entry of depth) {
    if (!entry.example) continue;
    if (SHELL.test(entry.example.code)) { skipped++; continue; }
    const script = join(scratch, `example_${entry.id.replace(/-/g, "_")}.py`);   // a prefix, so no example shadows a standard module
    writeFileSync(script, `${entry.example.code}\n`);
    const result = spawnSync(python, [script], { encoding: "utf8", timeout: 30000, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    ran++;
    if (result.status !== 0) {
      failures.push({ file, id: entry.id, error: (result.error?.message ?? result.stderr ?? "").trim().split("\n").slice(-3).join("\n") });
    } else if (show) {
      console.log(`ok   ${entry.id.padEnd(28)} ${result.stdout.trim().split("\n")[0].slice(0, 90)}`);
    }
  }
}
rmSync(scratch, { recursive: true, force: true });

for (const f of failures) console.error(`FAIL ${f.file} › ${f.id}\n     ${f.error.replace(/\n/g, "\n     ")}`);
console.log(`${ran} examples run, ${skipped} shell examples skipped, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
