// node tests/run.mjs [filter] — runs tests/checks/*.mjs, each in a fresh headless Chrome
import { readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { withPage } from "./cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(join(here, "..", "index.html")).href;
const filter = process.argv[2] || "";
mkdirSync(join(here, "shots"), { recursive: true });
let failed = 0, ran = 0;
for (const f of readdirSync(join(here, "checks")).filter(f => f.endsWith(".mjs") && f.includes(filter)).sort()) {
  const mod = await import(pathToFileURL(join(here, "checks", f)).href);
  const runs = Array.isArray(mod.opts) ? mod.opts : [mod.opts || {}];
  for (const o of runs) {
    const name = f.replace(/\.mjs$/, "") + (o.label ? ` [${o.label}]` : "");
    ran++;
    try {
      const logs = await withPage({ url, ...o }, t => mod.default(t, o));
      const bad = logs.filter(l => /^(EXCEPTION|error)/.test(l));
      if (bad.length) throw new Error("console errors:\n  " + bad.join("\n  "));
      console.log(`PASS ${name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${name}: ${e.message}`);
    }
  }
}
console.log(`${ran - failed}/${ran} passed`);
process.exit(failed || !ran ? 1 : 0);
