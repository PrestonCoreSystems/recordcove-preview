import { constants } from "node:fs";
import { lstat, open, realpath, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
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

async function openRegularFileNoFollow(filePath, expectedParent) {
  const stats = await lstat(filePath);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${path.basename(filePath)} must be a regular non-symlink file`);
  }
  if ((await realpath(path.dirname(filePath))) !== expectedParent) {
    throw new Error(`${path.basename(filePath)} resolves outside the release directory`);
  }
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  const openedStats = await handle.stat();
  if (!openedStats.isFile() || openedStats.dev !== stats.dev || openedStats.ino !== stats.ino) {
    await handle.close();
    throw new Error(`${path.basename(filePath)} changed during validation`);
  }
  return handle;
}

export function validateReleaseManifest(manifest) {
  const tagMatch = TAG_PATTERN.exec(manifest.releaseTag ?? "");
  const currentDownloadUrl = `https://github.com/${RELEASE_REPOSITORY}/releases/download/${manifest.releaseTag}/${RELEASE_FILE}`;
  if (
    !tagMatch ||
    manifest.product !== "RecordCove" ||
    manifest.version !== tagMatch[1] ||
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
  return tagMatch;
}

export async function updateRelease({
  root = process.cwd(),
  releaseTag,
  sourceRevision,
  archiveSha256,
  archiveBytes,
  beforeCommit = async () => {},
}) {
  requireValue(releaseTag, "release tag", TAG_PATTERN);
  requireValue(sourceRevision, "source revision", SHA_PATTERN);
  requireValue(archiveSha256, "archive SHA-256", DIGEST_PATTERN);

  const bytes = Number(archiveBytes);
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    throw new Error("archive byte size is invalid");
  }

  const manifestPath = path.join(root, "site", "release-manifest.json");
  const releaseDirectory = path.join(root, "site");
  await requireDirectory(root);
  await requireDirectory(releaseDirectory);
  const exactReleaseDirectory = await realpath(releaseDirectory);
  const manifestHandle = await openRegularFileNoFollow(manifestPath, exactReleaseDirectory);
  const initialManifestStats = await manifestHandle.stat();

  let manifest;
  let originalManifest;
  try {
    originalManifest = await manifestHandle.readFile("utf8");
    manifest = JSON.parse(originalManifest);
  } finally {
    await manifestHandle.close();
  }
  const currentTagMatch = validateReleaseManifest(manifest);
  const nextTagMatch = TAG_PATTERN.exec(releaseTag);
  if (!nextTagMatch) {
    throw new Error("current or requested release tag is invalid");
  }
  if (
    currentTagMatch[1] !== nextTagMatch[1] ||
    Number(nextTagMatch[2]) !== Number(currentTagMatch[2]) + 1
  ) {
    throw new Error("release tag must be the next preview for the current version");
  }
  const downloadUrl = `https://github.com/${RELEASE_REPOSITORY}/releases/download/${releaseTag}/${RELEASE_FILE}`;
  manifest.version = nextTagMatch[1];
  manifest.releaseTag = releaseTag;
  manifest.bytes = bytes;
  manifest.sha256 = archiveSha256;
  manifest.sourceRevision = sourceRevision;
  manifest.downloadUrl = downloadUrl;

  const stagedPath = path.join(releaseDirectory, `.release-manifest.${randomUUID()}.tmp`);
  let staged = false;
  try {
    const stagedHandle = await open(
      stagedPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600,
    );
    staged = true;
    try {
      await stagedHandle.writeFile(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
      await stagedHandle.sync();
    } finally {
      await stagedHandle.close();
    }
    await beforeCommit();

    const currentHandle = await openRegularFileNoFollow(manifestPath, exactReleaseDirectory);
    const currentManifestStats = await currentHandle.stat();
    const currentManifest = await currentHandle.readFile("utf8");
    await currentHandle.close();
    if (
      currentManifestStats.dev !== initialManifestStats.dev ||
      currentManifestStats.ino !== initialManifestStats.ino
    ) {
      throw new Error("release manifest changed during update");
    }
    if (currentManifest !== originalManifest) {
      throw new Error("release manifest content changed during update");
    }
    if ((await realpath(releaseDirectory)) !== exactReleaseDirectory) {
      throw new Error("release directory changed during update");
    }
    await rename(stagedPath, manifestPath);
    staged = false;
  } finally {
    if (staged && (await realpath(releaseDirectory).catch(() => null)) === exactReleaseDirectory) {
      await unlink(stagedPath).catch(() => {});
    }
  }
}

async function main() {
  const [releaseTag, sourceRevision, archiveSha256, archiveBytes] = process.argv.slice(2);
  if (!releaseTag || !sourceRevision || !archiveSha256 || !archiveBytes) {
    throw new Error(
      "usage: update-release.mjs <release-tag> <source-revision> <archive-sha256> <archive-bytes>",
    );
  }
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  await updateRelease({
    root: repositoryRoot,
    releaseTag,
    sourceRevision,
    archiveSha256,
    archiveBytes,
  });
  process.stdout.write("RELEASE_UPDATE=OK\n");
}

async function isMainModule() {
  if (!process.argv[1]) {
    return false;
  }
  return (await realpath(process.argv[1])) === (await realpath(fileURLToPath(import.meta.url)));
}

if (await isMainModule()) {
  main().catch((error) => {
    process.stderr.write(`RELEASE_UPDATE=FAILED: ${error.message}\n`);
    process.exitCode = 2;
  });
}
