import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDirectory = join(root, "apps", "api");
const argumentsToRun = process.argv.slice(2);
const loadApiEnvironment = argumentsToRun[0] === "--load-api-env";
if (loadApiEnvironment) {
  argumentsToRun.shift();
}
const candidates = process.env.YALUMNI_API_PYTHON
  ? [process.env.YALUMNI_API_PYTHON]
  : process.platform === "win32"
    ? [join(root, ".venv", "Scripts", "python.exe"), "python"]
    : [join(root, ".venv", "bin", "python"), "python3", "python"];
const python = candidates.find(
  (candidate) => candidate === "python" || candidate === "python3" || existsSync(candidate)
);

if (!python || argumentsToRun.length === 0) {
  console.error("Usage: node scripts/run-api-python.mjs <python arguments>");
  process.exit(1);
}

const apiEnvironment = loadApiEnvironment
  ? Object.fromEntries(
      readFileSync(join(apiDirectory, ".env"), "utf8")
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const separator = line.indexOf("=");
          return [line.slice(0, separator), line.slice(separator + 1)];
        })
    )
  : {};

const result = spawnSync(python, argumentsToRun, {
  cwd: root,
  env: {
    ...process.env,
    ...apiEnvironment,
    PYTHONPATH: [apiDirectory, process.env.PYTHONPATH].filter(Boolean).join(process.platform === "win32" ? ";" : ":")
  },
  stdio: "inherit"
});

if (result.error) {
  console.error(`Unable to start Python with ${python}: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
