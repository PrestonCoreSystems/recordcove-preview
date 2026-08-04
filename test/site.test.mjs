import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("preview page carries current identity and safety boundary", async () => {
  const page = await readFile("site/index.html", "utf8");
  const manifest = JSON.parse(await readFile("site/release-manifest.json", "utf8"));
  assert.match(page, /RecordCove preview/);
  assert.match(page, /downloads\.preview\.recordcove\.com/);
  assert.match(page, /not yet Apple-notarized/);
  assert.match(page, /one-time email code/);
  assert.match(page, /do not need a GitHub or RecordCove account/);
  assert.doesNotMatch(page, /KeepVox/);
  assert.match(page, new RegExp(manifest.sha256));
  assert.equal(manifest.sourceRevision, "766ec72bf4ef068134da07e282dfa83cefa2c8a5");
  assert.equal(manifest.notarized, false);
  assert.equal(manifest.publicReleaseApproved, false);
});

test("non-technical guides do not require GitHub access", async () => {
  const install = await readFile("INSTALL.md", "utf8");
  const testing = await readFile("TESTING.md", "utf8");
  assert.match(install, /To unzip means/);
  assert.match(testing, /simple first test/i);
  assert.doesNotMatch(`${install}\n${testing}`, /GitHub account/);
});
