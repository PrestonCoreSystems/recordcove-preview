import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse as parseYaml } from "yaml";
import { renderPortal } from "../scripts/build.mjs";
import { updateRelease } from "../scripts/update-release.mjs";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("preview page carries the exact public preview package and safety boundary", async () => {
  const template = await readFile("site/index.html", "utf8");
  const manifest = JSON.parse(await readFile("site/release-manifest.json", "utf8"));
  const page = renderPortal(template, manifest);
  assert.match(page, /RecordCove preview/);
  assert.match(page, new RegExp(`href="${escapeRegex(manifest.downloadUrl)}"`));
  assert.match(page, /not yet Apple-notarized/);
  assert.match(page, /Never disable Gatekeeper/);
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
  const requested = {
    root,
    releaseTag: "v0.1.0-preview.5",
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
  assert.match(page, new RegExp(requested.releaseTag));
  assert.match(page, new RegExp(requested.sourceRevision));
  assert.match(page, new RegExp(requested.archiveSha256));
  assert.match(page, new RegExp(`href="${escapeRegex(manifest.downloadUrl)}"`));
  assert.match(page, new RegExp(`<code>${manifest.bytes} bytes</code>`));
  assert.doesNotMatch(page, /v0\.1\.0-preview\.4/);
});

test("release updater fails closed on skipped tags and symlinked controls", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "recordcove-preview-release-negative-"));
  await cp("site", path.join(root, "site"), { recursive: true });
  const requested = {
    root,
    releaseTag: "v0.1.0-preview.6",
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
    updateRelease({ ...requested, releaseTag: "v0.1.0-preview.5" }),
    /regular non-symlink/,
  );
});

test("release updater leaves the sole release control unchanged before atomic commit", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "recordcove-preview-release-atomic-"));
  await cp("site", path.join(root, "site"), { recursive: true });
  const manifestPath = path.join(root, "site", "release-manifest.json");
  const before = await readFile(manifestPath, "utf8");
  await assert.rejects(
    updateRelease({
      root,
      releaseTag: "v0.1.0-preview.5",
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
  const concurrentManifestPath = path.join(concurrentRoot, "site", "release-manifest.json");
  const concurrentContent = `${before.trimEnd()}\n `;
  await assert.rejects(
    updateRelease({
      root: concurrentRoot,
      releaseTag: "v0.1.0-preview.5",
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
    releaseTag: "v0.1.0-preview.5",
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
    await assert.rejects(updateRelease({ root, ...baseRequest, ...mutation }));
  }

  const root = await mkdtemp(path.join(os.tmpdir(), "recordcove-preview-release-contract-"));
  await cp("site", path.join(root, "site"), { recursive: true });
  const manifestPath = path.join(root, "site", "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.publicReleaseApproved = true;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await assert.rejects(updateRelease({ root, ...baseRequest }), /safety contract/);
});

test("non-technical guides explain the ZIP and safe first launch", async () => {
  const install = await readFile("INSTALL.md", "utf8");
  const testing = await readFile("TESTING.md", "utf8");
  assert.match(install, /Double-click `RecordCove-macOS-preview\.zip`/);
  assert.match(install, /Hold the Control key/);
  assert.match(testing, /simple first test/i);
  assert.match(testing, /Feedwish/);
  assert.match(testing, /without an account/);
  assert.match(testing, /private management code/);
  assert.doesNotMatch(`${install}\n${testing}`, /GitHub account/);
  assert.match(install, /Do not disable Gatekeeper/);
  assert.doesNotMatch(install, /quarantine-removal command/);
});

test("public preview CI stays on a GitHub-hosted least-privilege boundary", async () => {
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
  assert.deepEqual(Object.keys(parsed.jobs), ["verify"]);
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
  assert.doesNotMatch(
    JSON.stringify(parsed),
    /secrets|self-hosted|preston-apple|preston-shared|pull_request_target|:\s*write/i,
  );
});
