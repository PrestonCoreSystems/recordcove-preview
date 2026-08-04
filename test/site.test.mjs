import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("preview page carries current identity and safety boundary", async () => {
  const page = await readFile("site/index.html", "utf8");
  const manifest = JSON.parse(await readFile("site/release-manifest.json", "utf8"));
  assert.match(page, /RecordCove preview/);
  assert.doesNotMatch(page, /href="https:\/\/downloads\.preview\.recordcove\.com/);
  assert.match(page, /Friend download is being prepared/);
  assert.match(page, /not downloadable by friends/);
  assert.match(page, /one-time email code/);
  assert.match(page, /do not need a GitHub or RecordCove account/);
  assert.doesNotMatch(page, /KeepVox/);
  assert.match(page, new RegExp(manifest.sha256));
  assert.equal(manifest.sourceRevision, "db463753d7efdc266f80c6c6943a86e720e912a4");
  assert.equal(manifest.bytes, 464107032);
  assert.equal(manifest.notarized, false);
  assert.equal(manifest.audience, "owner-only");
  assert.equal(manifest.friendDownloadEnabled, false);
  assert.equal(manifest.publicReleaseApproved, false);
});

test("non-technical guides do not require GitHub access", async () => {
  const install = await readFile("INSTALL.md", "utf8");
  const testing = await readFile("TESTING.md", "utf8");
  assert.match(install, /DMG, which is a Mac disk image/);
  assert.match(testing, /simple first test/i);
  assert.doesNotMatch(`${install}\n${testing}`, /GitHub account/);
  assert.match(install, /Do not select \*\*Open Anyway\*\*/);
  assert.doesNotMatch(install, /Scroll down until you see a message that RecordCove was blocked/);
});
