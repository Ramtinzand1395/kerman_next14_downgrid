import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve(
  process.cwd(),
  process.env.PS5_CATALOG_OUTPUT || "artifacts/ps5-catalog-2026-10-31",
);
const discovery = JSON.parse(
  await readFile(path.join(outputDirectory, "discovery.json"), "utf8"),
);

const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const rows = [
  [
    "order",
    "id",
    "old_name",
    "auto_status",
    "candidate_1",
    "score_1",
    "url_1",
    "candidate_2",
    "score_2",
    "url_2",
    "candidate_3",
    "score_3",
    "url_3",
    "error",
  ],
];

for (const match of discovery.matches) {
  const candidates = [...(match.candidates || [])]
    .filter((candidate) => candidate.officialName)
    .sort((left, right) => (right.score || 0) - (left.score || 0));
  rows.push([
    match.order,
    match.id,
    match.oldName,
    match.status,
    candidates[0]?.officialName,
    candidates[0]?.score,
    candidates[0]?.sourceUrl,
    candidates[1]?.officialName,
    candidates[1]?.score,
    candidates[1]?.sourceUrl,
    candidates[2]?.officialName,
    candidates[2]?.score,
    candidates[2]?.sourceUrl,
    match.error,
  ]);
}

const target = path.join(outputDirectory, "review-candidates.csv");
await writeFile(
  target,
  `${rows.map((row) => row.map(csvValue).join(",")).join("\n")}\n`,
  "utf8",
);
console.log(target);

if (process.argv.includes("--print")) {
  const start = Number(process.env.PS5_REVIEW_START || 0);
  const end = Number(process.env.PS5_REVIEW_END || discovery.matches.length);
  const requestedOrders = new Set(
    String(process.env.PS5_REVIEW_ORDERS || "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(Number.isInteger),
  );
  const printable = requestedOrders.size
    ? discovery.matches.filter((match) => requestedOrders.has(match.order))
    : discovery.matches.slice(start, end);
  for (const match of printable) {
    const candidateLimit = Number(process.env.PS5_REVIEW_CANDIDATE_LIMIT || 3);
    const candidates = [...(match.candidates || [])]
      .filter((candidate) => candidate.officialName)
      .sort((left, right) => (right.score || 0) - (left.score || 0));
    console.log(
      JSON.stringify({
        order: match.order,
        oldName: match.oldName,
        candidates: candidates.slice(0, candidateLimit).map((candidate) => ({
          name: candidate.officialName,
          score: candidate.score,
        })),
      }),
    );
  }
}
