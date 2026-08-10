import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse as parseYaml } from "yaml";

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
