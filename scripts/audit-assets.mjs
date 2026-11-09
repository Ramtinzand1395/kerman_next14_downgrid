import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const ignored = new Set([".git", ".next", "node_modules", "artifacts", "coverage"]);
const imageExtension = /\.(?:png|jpe?g|webp|gif|svg|ico|avif)$/i;
const mediaExtension = /\.(?:png|jpe?g|webp|gif|svg|ico|avif|woff2?)$/i;

async function walk(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const nested = await Promise.all(entries.filter((entry) => !ignored.has(entry.name)).map(async (entry) => {
    const file = path.posix.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  }));
  return nested.flat();
}

const files = await walk("");
const publicFiles = files.filter((file) => file.startsWith("public/"));
const sources = await Promise.all(files
  .filter((file) => /\.(?:[cm]?[jt]sx?|css)$/.test(file) && !file.endsWith(".test.mjs"))
  .map(async (file) => ({ file, text: await readFile(path.join(root, file), "utf8") })));
const manifest = JSON.parse(await readFile(path.join(root, "config/optimized-images.json"), "utf8"));
const redirects = new Map(manifest.map(({ source, destination }) => [source, destination]));
const publicPaths = new Set(publicFiles.map((file) => `/${file.slice(7)}`));
// Next.js serves file-based metadata directly from app/.
if (files.includes("app/favicon.ico")) publicPaths.add("/favicon.ico");
const missing = [];

function stringsInSource(file, text) {
  if (file.endsWith(".css")) {
    return [...text.matchAll(/url\(["']?(\/[^"')]+)["']?\)/g)].map((match) => match[1]);
  }
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const constants = new Map();
  for (const statement of source.statements) {
    if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.Const) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) constants.set(declaration.name.text, declaration.initializer);
      }
    }
  }
  function evaluate(node, seen = new Set()) {
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isIdentifier(node) && constants.has(node.text) && !seen.has(node.text)) {
      return evaluate(constants.get(node.text), new Set([...seen, node.text]));
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = evaluate(node.left, seen);
      const right = evaluate(node.right, seen);
      if (typeof left === "string" && typeof right === "string") return left + right;
    }
    return undefined;
  }
  const values = [];
  function visit(node) {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const value = evaluate(node);
      if (value !== undefined) values.push(value);
      // Never interpret a concatenation suffix as an absolute public path.
      return;
    }
    if (ts.isStringLiteralLike(node)) values.push(node.text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return values;
}

// Resolve local constant concatenations too; DB and other runtime paths need review.
for (const { file, text } of sources) {
  for (const value of stringsInSource(file, text)) {
    const pathname = value.split(/[?#]/, 1)[0];
    if (!pathname.startsWith("/") || pathname.startsWith("//") || !mediaExtension.test(pathname)) continue;
    let url;
    try { url = decodeURI(pathname); } catch { continue; }
    if (!publicPaths.has(url) && !redirects.has(url)) missing.push({ file, url });
  }
}
for (const { source, destination } of manifest) {
  if (!publicPaths.has(destination) || publicPaths.has(source)) {
    missing.push({ file: "config/optimized-images.json", url: source, destination });
  }
}

const hashes = new Map();
const assets = await Promise.all(publicFiles.filter((file) => mediaExtension.test(file)).map(async (file) => {
  const data = await readFile(path.join(root, file));
  const hash = createHash("sha256").update(data).digest("hex");
  hashes.set(hash, [...(hashes.get(hash) || []), file]);
  const url = `/${file.slice(7)}`;
  const basename = path.posix.basename(file);
  const references = sources.filter(({ text }) => text.includes(url) || text.includes(basename)).map(({ file }) => file);
  return { file, bytes: data.length, references };
}));
const totalPublicBytes = (await Promise.all(publicFiles.map((file) => stat(path.join(root, file))))).reduce((sum, entry) => sum + entry.size, 0);
const result = {
  publicFileCount: publicFiles.length,
  totalPublicBytes,
  imageCount: assets.filter(({ file }) => imageExtension.test(file)).length,
  largest: [...assets].sort((a, b) => b.bytes - a.bytes).slice(0, 12).map(({ file, bytes }) => ({ file, bytes })),
  unreferencedCandidates: assets.filter(({ references }) => !references.length).map(({ file }) => file),
  exactDuplicates: [...hashes.values()].filter((group) => group.length > 1),
  missing,
  note: "Unreferenced candidates are advisory. Check constructed URLs and database content before deleting files. Remote Cloudinary files are outside this audit.",
};
console.log(JSON.stringify(result, null, 2));
if (missing.length && process.argv.includes("--check")) process.exitCode = 1;
