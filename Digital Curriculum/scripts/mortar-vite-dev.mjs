#!/usr/bin/env node
/**
 * Default `npm run dev` uses Firebase preset "dev" (`.env.dev`) unless you pass your own `--mode`.
 *
 * Fixes: `npm run dev -- --mode staging` must not become `vite --mode dev --mode staging`
 * (package.json used to hard-code `--mode dev`, which kept mortar-dev in play).
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = join(root, "node_modules", "vite", "bin", "vite.js");

if (!existsSync(viteBin)) {
  console.error("[mortar-vite-dev] Run npm install (vite not found).");
  process.exit(1);
}

const forwarded = process.argv.slice(2);

function argvHasMode(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mode" || a.startsWith("--mode=")) return true;
  }
  return false;
}

const args = argvHasMode(forwarded) ? forwarded : ["--mode", "dev", ...forwarded];

const child = spawn(process.execPath, [viteBin, ...args], {
  stdio: "inherit",
  cwd: root,
  windowsHide: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
