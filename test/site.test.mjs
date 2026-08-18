import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { parse as parseYaml } from "yaml";
import { renderPortal } from "../scripts/build.mjs";
import { updateRelease } from "../scripts/update-release.mjs";
import {
  acceptedReleases,
  compareReleaseTags,
  downloadState,
  fetchHistoricalR2Manifests,
  fetchReleasePages,
  normalizeRelease,
} from "../site/downloads.mjs";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const execFileAsync = promisify(execFile);

async function previewTags(root) {
  const manifestPath = path.join(root, "site", "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const match = /^v(\d+\.\d+\.\d+)-preview\.(\d+)$/.exec(manifest.releaseTag);
  assert.ok(match);
  const previewNumber = Number(match[2]);
  return {
    current: manifest.releaseTag,
    next: `v${match[1]}-preview.${previewNumber + 1}`,
    skipped: `v${match[1]}-preview.${previewNumber + 2}`,
  };
}

test("preview page carries the exact public preview package and safety boundary", async () => {
  const template = await readFile("site/index.html", "utf8");
  const manifest = JSON.parse(await readFile("site/release-manifest.json", "utf8"));
  const page = renderPortal(template, manifest);
  assert.match(page, /RecordCove preview/);
  assert.match(page, new RegExp(`href="${escapeRegex(manifest.downloadUrl)}"`));
  assert.match(page, /not yet Apple-notarized/);
  assert.match(page, /Never disable Gatekeeper/);
  assert.match(page, /North America, Europe, and Africa/);
  assert.match(page, /mainland China are outside the current evaluation and packaging scope/);
  assert.match(page, /not a claim that included models are universally better/);
  assert.match(page, /Whisper Small English/);
  assert.match(page, /IBM Granite 4\.1 3B/);
  assert.match(page, /latest preview is about 2\.53 GB/);
  assert.match(page, /verified download is available from the Preview downloads page/);
  assert.doesNotMatch(page, /KeepVox/);
  assert.match(page, new RegExp(manifest.sha256));
  assert.match(manifest.sourceRevision, /^[0-9a-f]{40}$/);
  assert.ok(Number.isSafeInteger(manifest.bytes) && manifest.bytes > 0);
  assert.equal(manifest.notarized, false);
  assert.equal(manifest.audience, "public-preview-testers");
  assert.equal(manifest.friendDownloadEnabled, true);
  assert.equal(manifest.publicReleaseApproved, false);
  assert.match(manifest.releaseTag, /^v\d+\.\d+\.\d+-preview\.\d+$/);
});

test("release updater changes only the next exact preview identity", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "recordcove-preview-release-"));
  await cp("site", path.join(root, "site"), { recursive: true });
  const tags = await previewTags(root);
  const requested = {
    root,
    releaseTag: tags.next,
    sourceRevision: "a".repeat(40),
    archiveSha256: "b".repeat(64),
    archiveBytes: "467833359",
  };

  await updateRelease(requested);
  const manifest = JSON.parse(
    await readFile(path.join(root, "site", "release-manifest.json"), "utf8"),
  );
  const template = await readFile(path.join(root, "site", "index.html"), "utf8");
  const page = renderPortal(template, manifest);
  assert.equal(manifest.releaseTag, requested.releaseTag);
  assert.equal(manifest.sourceRevision, requested.sourceRevision);
  assert.equal(manifest.sha256, requested.archiveSha256);
  assert.equal(manifest.bytes, Number(requested.archiveBytes));
  assert.equal(
    manifest.downloadUrl,
    `https://downloads.preview.recordcove.com/previews/${requested.releaseTag}/RecordCove-macOS-preview.zip`,
  );
  assert.match(page, new RegExp(requested.releaseTag));
  assert.match(page, new RegExp(requested.sourceRevision));
  assert.match(page, new RegExp(requested.archiveSha256));
  assert.match(page, new RegExp(`href="${escapeRegex(manifest.downloadUrl)}"`));
  assert.match(page, new RegExp(`<code>${manifest.bytes} bytes</code>`));
  assert.doesNotMatch(page, new RegExp(escapeRegex(tags.current)));
});

test("release updater CLI resolves its repository independently of the caller directory", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "recordcove-preview-cli-root-"));
  const callerRoot = await mkdtemp(path.join(os.tmpdir(), "recordcove-preview-cli-caller-"));
  try {
    await mkdir(path.join(root, "scripts"));
    await cp("scripts/update-release.mjs", path.join(root, "scripts", "update-release.mjs"));
    await cp("site", path.join(root, "site"), { recursive: true });

    const manifestPath = path.join(root, "site", "release-manifest.json");
    const tags = await previewTags(root);
    const sourceRevision = "c".repeat(40);
    const archiveSha256 = "d".repeat(64);
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        path.join(root, "scripts", "update-release.mjs"),
        tags.next,
        sourceRevision,
        archiveSha256,
        "467815498",
      ],
      { cwd: callerRoot },
    );

    assert.equal(stdout, "RELEASE_UPDATE=OK\n");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    assert.equal(manifest.sourceRevision, sourceRevision);
    assert.equal(manifest.sha256, archiveSha256);
  } finally {
    await Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(callerRoot, { recursive: true, force: true }),
    ]);
  }
});

test("release updater fails closed on skipped tags and symlinked controls", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "recordcove-preview-release-negative-"));
  await cp("site", path.join(root, "site"), { recursive: true });
  const tags = await previewTags(root);
  const requested = {
    root,
    releaseTag: tags.skipped,
    sourceRevision: "a".repeat(40),
    archiveSha256: "b".repeat(64),
    archiveBytes: "467833359",
  };
  await assert.rejects(updateRelease(requested), /next preview/);

  const manifestPath = path.join(root, "site", "release-manifest.json");
  const realManifestPath = path.join(root, "site", "release-manifest.real.json");
  await cp(manifestPath, realManifestPath);
  await unlink(manifestPath);
  await symlink(realManifestPath, manifestPath);
  await assert.rejects(
    updateRelease({ ...requested, releaseTag: tags.next }),
    /regular non-symlink/,
  );
});

test("release updater leaves the sole release control unchanged before atomic commit", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "recordcove-preview-release-atomic-"));
  await cp("site", path.join(root, "site"), { recursive: true });
  const tags = await previewTags(root);
  const manifestPath = path.join(root, "site", "release-manifest.json");
  const before = await readFile(manifestPath, "utf8");
  await assert.rejects(
    updateRelease({
      root,
      releaseTag: tags.next,
      sourceRevision: "a".repeat(40),
      archiveSha256: "b".repeat(64),
      archiveBytes: "467833359",
      beforeCommit: async () => {
        throw new Error("injected failure");
      },
    }),
    /injected failure/,
  );
  assert.equal(await readFile(manifestPath, "utf8"), before);

  const concurrentRoot = await mkdtemp(
    path.join(os.tmpdir(), "recordcove-preview-release-concurrent-"),
  );
  await cp("site", path.join(concurrentRoot, "site"), { recursive: true });
  const concurrentTags = await previewTags(concurrentRoot);
  const concurrentManifestPath = path.join(concurrentRoot, "site", "release-manifest.json");
  const concurrentContent = `${before.trimEnd()}\n `;
  await assert.rejects(
    updateRelease({
      root: concurrentRoot,
      releaseTag: concurrentTags.next,
      sourceRevision: "a".repeat(40),
      archiveSha256: "b".repeat(64),
      archiveBytes: "467833359",
      beforeCommit: () => writeFile(concurrentManifestPath, concurrentContent, "utf8"),
    }),
    /content changed/,
  );
  assert.equal(await readFile(concurrentManifestPath, "utf8"), concurrentContent);
});

test("release updater rejects malformed identity and changed safety controls", async () => {
  const baseRequest = {
    sourceRevision: "a".repeat(40),
    archiveSha256: "b".repeat(64),
    archiveBytes: "467833359",
  };
  for (const mutation of [
    { sourceRevision: "A".repeat(40) },
    { archiveSha256: "g".repeat(64) },
    { archiveBytes: "0" },
    { releaseTag: "v0.1.1-preview.5" },
  ]) {
    const root = await mkdtemp(path.join(os.tmpdir(), "recordcove-preview-release-invalid-"));
    await cp("site", path.join(root, "site"), { recursive: true });
    const tags = await previewTags(root);
    await assert.rejects(
      updateRelease({ root, releaseTag: tags.next, ...baseRequest, ...mutation }),
    );
  }

  const root = await mkdtemp(path.join(os.tmpdir(), "recordcove-preview-release-contract-"));
  await cp("site", path.join(root, "site"), { recursive: true });
  const tags = await previewTags(root);
  const manifestPath = path.join(root, "site", "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.publicReleaseApproved = true;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await assert.rejects(
    updateRelease({ root, releaseTag: tags.next, ...baseRequest }),
    /safety contract/,
  );
});

test("non-technical guides explain the ZIP and safe first launch", async () => {
  const install = await readFile("INSTALL.md", "utf8");
  const installPage = await readFile("site/install.html", "utf8");
  const testing = await readFile("TESTING.md", "utf8");
  assert.match(install, /Double-click `RecordCove-macOS-preview\.zip`/);
  for (const guide of [install, installPage]) {
    assert.match(guide, /at least 6 GB/);
    assert.match(guide, /Whisper Small English/);
    assert.match(guide, /IBM Granite 4\.1 3B/);
    assert.match(guide, /2\.53 GB/);
    assert.match(guide, /Move to Bin/);
    assert.match(guide, /Done/);
    assert.match(guide, /System Settings/);
    assert.match(guide, /Privacy &amp; Security|Privacy & Security/);
    assert.match(guide, /Open Anyway/);
    assert.match(guide, /password or Touch ID/);
    assert.match(guide, /select <strong>Open<\/strong>|select \*\*Open\*\*/);
    assert.match(guide, /about one hour/);
    assert.match(guide, /Do not disable Gatekeeper/);
    assert.match(guide, /xattr/);
    assert.match(guide, /spctl/);
    assert.match(guide, /sudo/);
    assert.match(guide, /com\.apple\.quarantine/);
  }
  assert.match(testing, /simple first test/i);
  assert.match(await readFile("site/testing.html", "utf8"), /No second model download should be required/);
  assert.match(testing, /Feedwish/);
  assert.match(testing, /without an account/);
  assert.match(testing, /private management code/);
  assert.doesNotMatch(`${install}\n${testing}`, /GitHub account/);
  assert.doesNotMatch(`${install}\n${installPage}`, /disable Gatekeeper to continue/i);
  assert.doesNotMatch(`${install}\n${installPage}`, /run (?:the )?(?:following )?command/i);
});

test("downloads page exposes accepted preview history and browser-local update tracking", async () => {
  const page = await readFile("site/downloads.html", "utf8");
  const index = await readFile("site/index.html", "utf8");
  const install = await readFile("site/install.html", "utf8");
  const testing = await readFile("site/testing.html", "utf8");
  assert.match(page, /Preview downloads/);
  assert.match(page, /Latest accepted preview/);
  assert.match(page, /Previous previews/);
  assert.match(page, /stored only in this browser/);
  assert.match(page, /downloads\.mjs\?v=2/);
  for (const document of [index, install, testing]) {
    assert.match(document, /href="\/downloads\.html"/);
  }
});

test("all public pages use the versioned responsive stylesheet", async () => {
  for (const filename of ["index.html", "downloads.html", "install.html", "testing.html"]) {
    const page = await readFile(path.join("site", filename), "utf8");
    assert.match(page, /href="\/styles\.css\?v=3"/);
    assert.doesNotMatch(page, /href="\/styles\.css"/);
  }

  const styles = await readFile("site/styles.css", "utf8");
  assert.match(styles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /\.site-nav \{ position: sticky/);
});

test("overview shows a privacy-safe local app preview", async () => {
  const page = await readFile("site/index.html", "utf8");
  const image = await readFile("site/assets/recordcove-app-preview.svg", "utf8");
  assert.match(page, /A calm workspace for local recordings/);
  assert.match(page, /recordcove-app-preview\.svg\?v=1/);
  assert.match(page, /Privacy-safe product preview using sample content/);
  assert.match(image, /RecordCove/);
  assert.match(image, /Sample recording/);
  assert.doesNotMatch(image, /\/Users\//);
  assert.doesNotMatch(image, /KeepVox/);
});

test("release catalog accepts exact historical assets and manifest-bounded R2 metadata", async () => {
  const manifest = JSON.parse(await readFile("site/release-manifest.json", "utf8"));
  const release = (tag, overrides = {}) => ({
    tag_name: tag,
    name: `RecordCove ${tag}`,
    draft: false,
    prerelease: true,
    published_at: "2026-08-15T07:55:59Z",
    html_url: `https://github.com/PrestonCoreSystems/recordcove-preview/releases/tag/${tag}`,
    body: "",
    assets: [
      {
        name: "RecordCove-macOS-preview.zip",
        state: "uploaded",
        size: manifest.bytes,
        digest: `sha256:${manifest.sha256}`,
        browser_download_url: `https://github.com/PrestonCoreSystems/recordcove-preview/releases/download/${tag}/RecordCove-macOS-preview.zip`,
      },
    ],
    ...overrides,
  });
  const current = manifest.downloadUrl.startsWith("https://downloads.preview.recordcove.com/")
    ? release(manifest.releaseTag, {
        assets: [],
        body: `Verified download: ${manifest.downloadUrl}`,
      })
    : release(manifest.releaseTag);
  const previousTag = "v0.1.0-preview.7";
  const previous = release(previousTag, {
    published_at: "2026-08-15T04:12:01Z",
    assets: [
      {
        name: "RecordCove-macOS-preview.zip",
        state: "uploaded",
        size: 467819479,
        digest: `sha256:${"4f94f65772c2ef3e47daca8c945e313feb1bb76b019482205dd9a58a0db8fd96"}`,
        browser_download_url: `https://github.com/PrestonCoreSystems/recordcove-preview/releases/download/${previousTag}/RecordCove-macOS-preview.zip`,
      },
    ],
  });
  const currentPreviewNumber = Number(manifest.releaseTag.match(/preview\.(\d+)$/)?.[1]);
  assert.ok(Number.isSafeInteger(currentPreviewNumber));
  const nextPreviewTag = manifest.releaseTag.replace(
    /preview\.\d+$/,
    `preview.${currentPreviewNumber + 1}`,
  );
  const future = release(nextPreviewTag);
  const invalid = release("v0.1.0-preview.6", {
    html_url: "https://example.com/untrusted",
  });
  assert.equal(normalizeRelease(invalid), null);
  assert.ok(compareReleaseTags(manifest.releaseTag, previousTag) > 0);
  assert.deepEqual(
    acceptedReleases([future, previous, invalid, current], manifest).map(({ tag }) => tag),
    [manifest.releaseTag, previousTag],
  );

  const legacyTag = "v0.1.0-preview.8";
  const legacyManifest = {
    releaseTag: legacyTag,
    downloadUrl: `https://github.com/PrestonCoreSystems/recordcove-preview/releases/download/${legacyTag}/RecordCove-macOS-preview.zip`,
    bytes: 467841491,
    sha256: "135467bc95d15f51fe2cc383dbe8d20ea3b7e2c0009ba06f9cd07e74e50a758d",
  };
  const legacyCurrent = release(legacyTag, {
    assets: [
      {
        name: "RecordCove-macOS-preview.zip",
        state: "uploaded",
        size: legacyManifest.bytes,
        digest: `sha256:${legacyManifest.sha256}`,
        browser_download_url: legacyManifest.downloadUrl,
      },
    ],
  });
  const r2Tag = "v0.1.0-preview.9";
  const r2DownloadUrl = `https://downloads.preview.recordcove.com/previews/${r2Tag}/RecordCove-macOS-preview.zip`;
  const r2Manifest = {
    ...legacyManifest,
    product: "RecordCove",
    version: "0.1.0",
    sourceRevision: "e".repeat(40),
    file: "RecordCove-macOS-preview.zip",
    releaseTag: r2Tag,
    downloadUrl: r2DownloadUrl,
    bytes: 2600000000,
    sha256: "a".repeat(64),
    platform: "macOS 14 or later on Apple silicon",
    signing: "ad-hoc",
    notarized: false,
    audience: "public-preview-testers",
    friendDownloadEnabled: true,
    publicReleaseApproved: false,
  };
  const r2Current = release(r2Tag, {
    assets: [],
    body: `Verified download: ${r2DownloadUrl}`,
    target_commitish: "b".repeat(40),
  });
  assert.deepEqual(
    acceptedReleases([r2Current, legacyCurrent, previous], r2Manifest).map(({ tag }) => tag),
    [r2Tag, legacyTag, previousTag],
  );
  assert.equal(normalizeRelease({ ...r2Current, body: "" }, r2Manifest), null);
  assert.equal(normalizeRelease({ ...r2Current, assets: legacyCurrent.assets }, r2Manifest), null);

  const newerR2Tag = "v0.1.0-preview.10";
  const newerR2DownloadUrl =
    `https://downloads.preview.recordcove.com/previews/${newerR2Tag}/RecordCove-macOS-preview.zip`;
  const newerR2Manifest = {
    ...r2Manifest,
    releaseTag: newerR2Tag,
    downloadUrl: newerR2DownloadUrl,
    sourceRevision: "c".repeat(40),
    bytes: 2600000001,
    sha256: "d".repeat(64),
    product: "RecordCove",
    version: "0.1.0",
    file: "RecordCove-macOS-preview.zip",
    platform: "macOS 14 or later on Apple silicon",
    signing: "ad-hoc",
    notarized: false,
    audience: "public-preview-testers",
    friendDownloadEnabled: true,
    publicReleaseApproved: false,
  };
  const newerR2Current = release(newerR2Tag, {
    assets: [],
    body: `Verified download: ${newerR2DownloadUrl}`,
  });
  const historicalManifests = new Map([[r2Tag, {
    ...r2Manifest,
    sourceRevision: "e".repeat(40),
    product: "RecordCove",
    version: "0.1.0",
    file: "RecordCove-macOS-preview.zip",
    platform: "macOS 14 or later on Apple silicon",
    signing: "ad-hoc",
    notarized: false,
    audience: "public-preview-testers",
    friendDownloadEnabled: true,
    publicReleaseApproved: false,
  }]]);
  assert.deepEqual(
    acceptedReleases(
      [newerR2Current, r2Current, legacyCurrent],
      newerR2Manifest,
      historicalManifests,
    ).map(({ tag }) => tag),
    [newerR2Tag, r2Tag, legacyTag],
  );
});

test("historical R2 manifests are fetched from their immutable release revisions", async () => {
  const currentTag = "v0.1.0-preview.10";
  const historicalTag = "v0.1.0-preview.9";
  const historicalRevision = "d15ab2ad461b72badb84854ca6677eab70c9ebc2";
  const historicalDownloadUrl =
    `https://downloads.preview.recordcove.com/previews/${historicalTag}/RecordCove-macOS-preview.zip`;
  const currentManifest = {
    releaseTag: currentTag,
  };
  const historicalManifest = {
    product: "RecordCove",
    version: "0.1.0",
    sourceRevision: "f0ec4f1ba035c57860760e2b618a3e40d1ded2a3",
    file: "RecordCove-macOS-preview.zip",
    downloadUrl: historicalDownloadUrl,
    releaseTag: historicalTag,
    bytes: 2528555456,
    sha256: "a7fbf65eb70212eb2e53dcc7d3add89e0cbcd86478dc9604b02907d42a649d4f",
    platform: "macOS 14 or later on Apple silicon",
    signing: "ad-hoc",
    notarized: false,
    audience: "public-preview-testers",
    friendDownloadEnabled: true,
    publicReleaseApproved: false,
  };
  const releases = [
    {
      tag_name: historicalTag,
      assets: [],
      body: `Verified download: ${historicalDownloadUrl}`,
      target_commitish: historicalRevision,
    },
    {
      tag_name: "v0.1.0-preview.8",
      assets: [{ name: "RecordCove-macOS-preview.zip" }],
      target_commitish: "f".repeat(40),
    },
    {
      tag_name: "v0.1.0-preview.7",
      assets: [],
      body: "Verified download: https://example.com/untrusted.zip",
      target_commitish: "a".repeat(40),
    },
  ];
  const requestedUrls = [];
  const manifests = await fetchHistoricalR2Manifests(async (url) => {
    requestedUrls.push(url);
    return { ok: true, json: async () => historicalManifest };
  }, releases, currentManifest);
  assert.deepEqual(requestedUrls, [
    `https://raw.githubusercontent.com/PrestonCoreSystems/recordcove-preview/${historicalRevision}/site/release-manifest.json`,
  ]);
  assert.deepEqual(manifests.get(historicalTag), historicalManifest);

  const rejected = await fetchHistoricalR2Manifests(async () => ({
    ok: true,
    json: async () => ({ ...historicalManifest, publicReleaseApproved: true }),
  }), releases, currentManifest);
  assert.equal(rejected.size, 0);
});

test("historical R2 manifest requests use bounded concurrency", async () => {
  const currentManifest = { releaseTag: "v0.1.0-preview.10" };
  const releases = Array.from({ length: 6 }, (_, index) => {
    const previewNumber = 9 - index;
    const tag = `v0.1.0-preview.${previewNumber}`;
    const revision = String(previewNumber).repeat(40).slice(0, 40);
    return {
      tag_name: tag,
      assets: [],
      body:
        `Verified download: https://downloads.preview.recordcove.com/previews/${tag}/` +
        "RecordCove-macOS-preview.zip",
      target_commitish: revision,
    };
  });
  let activeRequests = 0;
  let maximumActiveRequests = 0;
  const manifests = await fetchHistoricalR2Manifests(async (url) => {
    activeRequests += 1;
    maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
    await new Promise((resolve) => setTimeout(resolve, 5));
    activeRequests -= 1;
    const release = releases.find(({ target_commitish }) => url.includes(target_commitish));
    const downloadUrl =
      `https://downloads.preview.recordcove.com/previews/${release.tag_name}/` +
      "RecordCove-macOS-preview.zip";
    return {
      ok: true,
      json: async () => ({
        product: "RecordCove",
        version: "0.1.0",
        sourceRevision: "a".repeat(40),
        file: "RecordCove-macOS-preview.zip",
        downloadUrl,
        releaseTag: release.tag_name,
        bytes: 2528555456,
        sha256: "b".repeat(64),
        platform: "macOS 14 or later on Apple silicon",
        signing: "ad-hoc",
        notarized: false,
        audience: "public-preview-testers",
        friendDownloadEnabled: true,
        publicReleaseApproved: false,
      }),
    };
  }, releases, currentManifest);
  assert.equal(manifests.size, releases.length);
  assert.equal(maximumActiveRequests, 4);
});

test("download state distinguishes current and newer accepted previews", () => {
  assert.equal(downloadState("v0.1.0-preview.8", null).kind, "none");
  assert.equal(
    downloadState("v0.1.0-preview.8", { releaseTag: "v0.1.0-preview.8" }).kind,
    "current",
  );
  assert.equal(
    downloadState("v0.1.0-preview.8", { releaseTag: "v0.1.0-preview.7" }).kind,
    "update",
  );
});

test("release history paginates until a later-page manifest release is retained", async () => {
  const manifestTag = "v0.1.0-preview.8";
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    tag_name: `v0.1.0-preview.${108 - index}`,
  }));
  const secondPage = [
    { tag_name: manifestTag },
    { tag_name: "v0.1.0-preview.7" },
    { tag_name: "v0.1.0-preview.6" },
  ];
  const requestedUrls = [];
  const releases = await fetchReleasePages(async (url) => {
    requestedUrls.push(url);
    return {
      ok: true,
      json: async () => (url.endsWith("page=1") ? firstPage : secondPage),
    };
  }, manifestTag);
  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[0], /per_page=100&page=1$/);
  assert.match(requestedUrls[1], /per_page=100&page=2$/);
  assert.equal(releases.length, 103);
  assert.equal(releases[100].tag_name, manifestTag);
  assert.equal(releases[102].tag_name, "v0.1.0-preview.6");
});

test("public preview CI and deploy stay on GitHub-hosted least-privilege boundaries", async () => {
  const workflow = await readFile(".github/workflows/ci.yml", "utf8");
  const parsed = parseYaml(workflow);
  assert.deepEqual(Object.keys(parsed.on).sort(), ["pull_request", "push"]);
  assert.equal(parsed.on.pull_request, null);
  assert.deepEqual(parsed.on.push, { branches: ["main"] });
  assert.deepEqual(parsed.permissions, { contents: "read" });
  assert.deepEqual(parsed.concurrency, {
    group: "recordcove-preview-ci-${{ github.ref }}",
    "cancel-in-progress": true,
  });
  assert.deepEqual(Object.keys(parsed.jobs), ["verify", "deploy"]);
  const verify = parsed.jobs.verify;
  assert.equal(verify["runs-on"], "ubuntu-latest");
  assert.equal(verify["timeout-minutes"], 10);
  assert.deepEqual(
    verify.steps.map((step) => step.name),
    [
      "Check out the reviewed revision",
      "Set up Node.js",
      "Install locked dependencies",
      "Run tests",
      "Build the static portal",
      "Verify generated portal",
    ],
  );
  assert.equal(verify.steps[0].with["persist-credentials"], false);
  assert.equal(verify.steps[2].run, "npm ci --ignore-scripts");
  assert.equal(verify.steps[3].run, "npm test");
  assert.equal(verify.steps[4].run, "npm run build");
  assert.equal(verify.steps[5].run, "test -f dist/index.html");
  assert.doesNotMatch(JSON.stringify(verify), /secrets/i);

  const deploy = parsed.jobs.deploy;
  assert.equal(
    deploy.if,
    "github.event_name == 'push' && github.ref == 'refs/heads/main'",
  );
  assert.equal(deploy.needs, "verify");
  assert.equal(deploy["runs-on"], "ubuntu-latest");
  assert.equal(deploy["timeout-minutes"], 10);
  assert.equal(deploy.environment, "recordcove-preview-production");
  assert.deepEqual(deploy.concurrency, {
    group: "recordcove-preview-production",
    "cancel-in-progress": true,
  });
  assert.deepEqual(
    deploy.steps.map((step) => step.name),
    [
      "Check out the accepted revision",
      "Set up Node.js",
      "Install locked dependencies",
      "Build the accepted portal",
      "Deploy the accepted portal",
    ],
  );
  assert.equal(deploy.steps[0].with["persist-credentials"], false);
  assert.equal(deploy.steps[2].run, "npm ci --ignore-scripts");
  assert.equal(deploy.steps[3].run, "npm run build");
  assert.equal(
    deploy.steps[4].uses,
    "cloudflare/wrangler-action@ebbaa1584979971c8614a24965b4405ff95890e0",
  );
  assert.deepEqual(deploy.steps[4].with, {
    apiToken: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
    accountId: "${{ vars.CLOUDFLARE_ACCOUNT_ID }}",
    wranglerVersion: "4.103.0",
    command:
      "pages deploy dist --project-name=recordcove-preview --branch=main --commit-hash=${{ github.sha }} --commit-dirty=true",
  });
  assert.doesNotMatch(
    JSON.stringify(parsed),
    /self-hosted|preston-apple|preston-shared|pull_request_target|:\s*write/i,
  );
});
