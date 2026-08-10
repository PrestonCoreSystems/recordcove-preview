import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateReleaseManifest } from "./update-release.mjs";

const replacements = {
  "{{RECORDCOVE_DOWNLOAD_URL}}": "downloadUrl",
  "{{RECORDCOVE_ARCHIVE_BYTES}}": "bytes",
  "{{RECORDCOVE_SOURCE_REVISION}}": "sourceRevision",
  "{{RECORDCOVE_ARCHIVE_SHA256}}": "sha256",
};

export function renderPortal(template, manifest) {
  validateReleaseManifest(manifest);
  let rendered = template;
  for (const [placeholder, key] of Object.entries(replacements)) {
    const pieces = rendered.split(placeholder);
    if (pieces.length !== 2) {
      throw new Error(`${placeholder} must appear exactly once in the portal template`);
    }
    rendered = pieces.join(String(manifest[key]));
  }
  if (/\{\{RECORDCOVE_[A-Z_]+\}\}/.test(rendered)) {
    throw new Error("an unknown release placeholder remains in the portal");
  }
  return rendered;
}

export async function buildPortal(root = process.cwd()) {
  const site = path.join(root, "site");
  const dist = path.join(root, "dist");
  const manifest = JSON.parse(await readFile(path.join(site, "release-manifest.json"), "utf8"));
  const template = await readFile(path.join(site, "index.html"), "utf8");

  await rm(dist, { force: true, recursive: true });
  await mkdir(dist, { recursive: true });
  await cp(site, dist, { recursive: true });
  await writeFile(path.join(dist, "index.html"), renderPortal(template, manifest), "utf8");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildPortal().catch((error) => {
    process.stderr.write(`PORTAL_BUILD=FAILED: ${error.message}\n`);
    process.exitCode = 2;
  });
}
