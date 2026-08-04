import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("preview page carries the exact public preview package and safety boundary", async () => {
  const page = await readFile("site/index.html", "utf8");
  const manifest = JSON.parse(await readFile("site/release-manifest.json", "utf8"));
  assert.match(page, /RecordCove preview/);
  assert.match(page, /href="https:\/\/github\.com\/PrestonCoreSystems\/recordcove-preview\/releases\/download\/v0\.1\.0-preview\.4\/RecordCove-macOS-preview\.zip"/);
  assert.match(page, /not yet Apple-notarized/);
  assert.match(page, /Never disable Gatekeeper/);
  assert.doesNotMatch(page, /KeepVox/);
  assert.match(page, new RegExp(manifest.sha256));
  assert.equal(manifest.sourceRevision, "c5e63066bf56a25873a6457f560ed3a91f802d4c");
  assert.equal(manifest.bytes, 464106206);
  assert.equal(manifest.notarized, false);
  assert.equal(manifest.audience, "public-preview-testers");
  assert.equal(manifest.friendDownloadEnabled, true);
  assert.equal(manifest.publicReleaseApproved, false);
  assert.equal(manifest.releaseTag, "v0.1.0-preview.4");
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
