// Extract every `run:` block from a GitHub Actions workflow into numbered
// shell scripts, so they can be executed locally exactly as CI would.
//
//   node tools/extract-steps.js <workflow.yml> <outdir>
//
// Why: two workflow bugs reached GitHub before being caught, both because the
// logic was verified by hand while the workflow's own text was not. Running the
// extracted text removes that gap - a step that fails here fails there.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const [wf, outDir] = process.argv.slice(2);
if (!wf || !outDir) {
  console.error("usage: node extract-steps.js <workflow.yml> <outdir>");
  process.exit(2);
}

const lines = readFileSync(wf, "utf8").split("\n");
const steps = [];
let name = null;
let body = [];

for (let i = 0; i < lines.length; i++) {
  const nameMatch = /^\s*- name:\s*(.+)$/.exec(lines[i]);
  if (nameMatch) {
    if (body.length) steps.push({ name, body });
    name = nameMatch[1].trim();
    body = [];
    continue;
  }
  if (/^\s*run:\s*\|\s*$/.test(lines[i])) {
    // Block scalar: strip the indentation of the `run:` line plus two spaces.
    const base = lines[i].match(/^ */)[0].length;
    i++;
    while (i < lines.length) {
      if (lines[i].trim() === "") { body.push(""); i++; continue; }
      if (lines[i].match(/^ */)[0].length <= base) break;
      body.push(lines[i].slice(base + 2));
      i++;
    }
    // Step back onto the line that ended the block - it may be the next
    // step's `- name:`, which the for-loop's own increment would otherwise
    // skip, silently dropping every step after the first.
    i--;
  } else {
    // Inline single-line form: `run: some command`
    const inline = /^\s*run:\s*(.+)$/.exec(lines[i]);
    if (inline) body.push(inline[1].trim());
  }
}
if (body.length) steps.push({ name, body });

mkdirSync(outDir, { recursive: true });
steps.forEach((s, n) => {
  writeFileSync(`${outDir}/${n}.sh`, s.body.join("\n") + "\n");
});
console.log(steps.map((s, n) => `${n}\t${s.name}`).join("\n"));