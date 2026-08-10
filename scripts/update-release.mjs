import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RELEASE_FILE = "RecordCove-macOS-preview.zip";
const RELEASE_REPOSITORY = "PrestonCoreSystems/recordcove-preview";
const TAG_PATTERN = /^v(\d+\.\d+\.\d+)-preview\.(\d+)$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

function requireValue(value, label, pattern) {
  if (!pattern.test(value)) {
    throw new Error(`${label} is invalid`);
  }
}

async function requireDirectory(directoryPath) {
  const stats = await lstat(directoryPath);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`${path.basename(directoryPath)} must be a real directory`);
  }
}

async function requireRegularFile(filePath, expectedParent) {
  const stats = await lstat(filePath);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${path.basename(filePath)} must be a regular non-symlink file`);
  }
  if ((await realpath(path.dirname(filePath))) !== expectedParent) {
    throw new Error(`${path.basename(filePath)} resolves outside the release directory`);
  }
}

function replaceExactlyOnce(content, previousValue, nextValue, label) {
  const pieces = content.split(String(previousValue));
  if (pieces.length !== 2) {
    throw new Error(`${label} must appear exactly once in the portal`);
  }
  return pieces.join(String(nextValue));
}

export async function updateRelease({
  root = process.cwd(),
  releaseTag,
  sourceRevision,
  archiveSha256,
  archiveBytes,
}) {
  requireValue(releaseTag, "release tag", TAG_PATTERN);
  requireValue(sourceRevision, "source revision", SHA_PATTERN);
  requireValue(archiveSha256, "archive SHA-256", DIGEST_PATTERN);

  const bytes = Number(archiveBytes);
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    throw new Error("archive byte size is invalid");
  }

  const manifestPath = path.join(root, "site", "release-manifest.json");
  const portalPath = path.join(root, "site", "index.html");
  const releaseDirectory = path.join(root, "site");
  await requireDirectory(root);
  await requireDirectory(releaseDirectory);
  const exactReleaseDirectory = await realpath(releaseDirectory);
  await Promise.all([
    requireRegularFile(manifestPath, exactReleaseDirectory),
    requireRegularFile(portalPath, exactReleaseDirectory),
  ]);

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const currentTagMatch = TAG_PATTERN.exec(manifest.releaseTag ?? "");
  const nextTagMatch = TAG_PATTERN.exec(releaseTag);
  if (!currentTagMatch || !nextTagMatch) {
    throw new Error("current or requested release tag is invalid");
  }
  if (
    currentTagMatch[1] !== nextTagMatch[1] ||
    Number(nextTagMatch[2]) !== Number(currentTagMatch[2]) + 1
  ) {
    throw new Error("release tag must be the next preview for the current version");
  }
  const currentDownloadUrl = `https://github.com/${RELEASE_REPOSITORY}/releases/download/${manifest.releaseTag}/${RELEASE_FILE}`;
  if (
    manifest.product !== "RecordCove" ||
    manifest.version !== currentTagMatch[1] ||
    manifest.file !== RELEASE_FILE ||
    manifest.downloadUrl !== currentDownloadUrl ||
    !SHA_PATTERN.test(manifest.sourceRevision ?? "") ||
    !DIGEST_PATTERN.test(manifest.sha256 ?? "") ||
    !Number.isSafeInteger(manifest.bytes) ||
    manifest.bytes <= 0 ||
    manifest.signing !== "ad-hoc" ||
    manifest.notarized !== false ||
    manifest.publicReleaseApproved !== false ||
    manifest.friendDownloadEnabled !== true ||
    manifest.audience !== "public-preview-testers"
  ) {
    throw new Error("current preview safety contract is invalid");
  }

  const downloadUrl = `https://github.com/${RELEASE_REPOSITORY}/releases/download/${releaseTag}/${RELEASE_FILE}`;
  let portal = await readFile(portalPath, "utf8");
  portal = replaceExactlyOnce(portal, manifest.downloadUrl, downloadUrl, "download URL");
  portal = replaceExactlyOnce(portal, manifest.bytes, bytes, "archive byte size");
  portal = replaceExactlyOnce(portal, manifest.sourceRevision, sourceRevision, "source revision");
  portal = replaceExactlyOnce(portal, manifest.sha256, archiveSha256, "archive SHA-256");

  manifest.version = nextTagMatch[1];
  manifest.releaseTag = releaseTag;
  manifest.bytes = bytes;
  manifest.sha256 = archiveSha256;
  manifest.sourceRevision = sourceRevision;
  manifest.downloadUrl = downloadUrl;

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(portalPath, portal, "utf8");
}

async function main() {
  const [releaseTag, sourceRevision, archiveSha256, archiveBytes] = process.argv.slice(2);
  if (!releaseTag || !sourceRevision || !archiveSha256 || !archiveBytes) {
    throw new Error(
      "usage: update-release.mjs <release-tag> <source-revision> <archive-sha256> <archive-bytes>",
    );
  }
  await updateRelease({ releaseTag, sourceRevision, archiveSha256, archiveBytes });
  process.stdout.write("RELEASE_UPDATE=OK\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`RELEASE_UPDATE=FAILED: ${error.message}\n`);
    process.exitCode = 2;
  });
}
