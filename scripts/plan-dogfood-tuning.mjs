import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const qualityPath = resolve(root, "docs/dogfood/latest/QUALITY_REPORT.json");
const outPath = resolve(root, "docs/dogfood/latest/TUNING_TODO.md");

const data = JSON.parse(readFileSync(qualityPath, "utf8"));
const rows = (data.rows || []).slice().sort((a, b) => a.score - b.score);

const lines = [
  "# Destination Tuning TODO",
  "",
  "Generated from `QUALITY_REPORT.json`.",
  "",
  `- Average score: ${data.average_score}/100`,
  `- Threshold: ${data.threshold}/100`,
  "",
  "## Priority order (lowest score first)",
  "",
];

for (const row of rows) {
  const issues = [];
  if (row.metaBullets > 0) issues.push(`${row.metaBullets} meta bullet(s)`);
  if (row.longBullets > 0) issues.push(`${row.longBullets} long bullet(s)`);
  if (row.codeyBullets > 0) issues.push(`${row.codeyBullets} code-style bullet(s)`);
  if (issues.length === 0) issues.push("no major automatic flags");

  lines.push(`### ${row.file}`);
  lines.push(`- Score: ${row.score}/100`);
  lines.push(`- Issues: ${issues.join(", ")}`);

  if (row.metaBullets > 0) {
    lines.push("- Suggested action: increase high-signal filtering for this destination/scenario.");
  }
  if (row.longBullets > 0) {
    lines.push("- Suggested action: tighten max bullet length or increase summarization.");
  }
  if (row.codeyBullets > 0) {
    lines.push("- Suggested action: strip or normalize code-style formatting in output text.");
  }

  lines.push("");
}

writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`wrote ${outPath}`);
