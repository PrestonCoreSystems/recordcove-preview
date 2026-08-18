const RELEASE_API = "https://api.github.com/repos/PrestonCoreSystems/recordcove-preview/releases";
const RELEASE_REPOSITORY = "PrestonCoreSystems/recordcove-preview";
const RELEASE_ORIGIN = "https://downloads.preview.recordcove.com";
const RELEASE_FILE = "RecordCove-macOS-preview.zip";
const RELEASE_PAGE_SIZE = 100;
const MAX_RELEASE_PAGES = 20;
const MAX_HISTORICAL_MANIFEST_REQUESTS = 4;
const RELEASE_TAG = /^v(\d+)\.(\d+)\.(\d+)-preview\.(\d+)$/;
const DIGEST = /^sha256:([0-9a-f]{64})$/;
const SHA256 = /^[0-9a-f]{64}$/;
const REVISION = /^[0-9a-f]{40}$/;
const STORAGE_KEY = "recordcove.preview.lastSelectedDownload.v1";

function releaseParts(tag) {
  const match = RELEASE_TAG.exec(tag ?? "");
  return match ? match.slice(1).map(Number) : null;
}

export function compareReleaseTags(left, right) {
  const leftParts = releaseParts(left);
  const rightParts = releaseParts(right);
  if (!leftParts || !rightParts) {
    throw new Error("preview release tag is invalid");
  }
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

function isExactR2Manifest(manifest, releaseTag, expectedDownloadUrl) {
  const parts = releaseParts(releaseTag);
  return Boolean(
    parts &&
      manifest?.product === "RecordCove" &&
      manifest.version === `${parts[0]}.${parts[1]}.${parts[2]}` &&
      REVISION.test(manifest.sourceRevision ?? "") &&
      manifest.file === RELEASE_FILE &&
      manifest.releaseTag === releaseTag &&
      manifest.downloadUrl === expectedDownloadUrl &&
      Number.isSafeInteger(manifest.bytes) &&
      manifest.bytes > 0 &&
      SHA256.test(manifest.sha256 ?? "") &&
      manifest.platform === "macOS 14 or later on Apple silicon" &&
      manifest.signing === "ad-hoc" &&
      manifest.notarized === false &&
      manifest.audience === "public-preview-testers" &&
      manifest.friendDownloadEnabled === true &&
      manifest.publicReleaseApproved === false,
  );
}

export function normalizeRelease(release, manifest = null) {
  const parts = releaseParts(release?.tag_name);
  if (!parts || release.draft !== false || release.prerelease !== true) {
    return null;
  }
  const expectedReleaseUrl = `https://github.com/${RELEASE_REPOSITORY}/releases/tag/${release.tag_name}`;
  const expectedDownloadUrl = `https://github.com/${RELEASE_REPOSITORY}/releases/download/${release.tag_name}/${RELEASE_FILE}`;
  const expectedR2DownloadUrl = `${RELEASE_ORIGIN}/previews/${release.tag_name}/${RELEASE_FILE}`;
  const asset = release.assets?.find((candidate) => candidate.name === RELEASE_FILE);
  const digestMatch = DIGEST.exec(asset?.digest ?? "");
  const publishedAt = new Date(release.published_at ?? "");
  if (
    release.html_url !== expectedReleaseUrl ||
    Number.isNaN(publishedAt.getTime())
  ) {
    return null;
  }
  if (isExactR2Manifest(manifest, release.tag_name, expectedR2DownloadUrl)) {
    if (
      !Array.isArray(release.assets) ||
      release.assets.length !== 0 ||
      !String(release.body ?? "").includes(`Verified download: ${expectedR2DownloadUrl}`)
    ) {
      return null;
    }
    return {
      tag: release.tag_name,
      version: `${parts[0]}.${parts[1]}.${parts[2]}`,
      previewNumber: parts[3],
      publishedAt: publishedAt.toISOString(),
      releaseUrl: release.html_url,
      downloadUrl: manifest.downloadUrl,
      bytes: manifest.bytes,
      sha256: manifest.sha256,
    };
  }
  if (
    !asset ||
    asset.state !== "uploaded" ||
    asset.browser_download_url !== expectedDownloadUrl ||
    !Number.isSafeInteger(asset.size) ||
    asset.size <= 0 ||
    !digestMatch
  ) {
    return null;
  }
  return {
    tag: release.tag_name,
    version: `${parts[0]}.${parts[1]}.${parts[2]}`,
    previewNumber: parts[3],
    publishedAt: publishedAt.toISOString(),
    releaseUrl: release.html_url,
    downloadUrl: asset.browser_download_url,
    bytes: asset.size,
    sha256: digestMatch[1],
  };
}

export function acceptedReleases(rawReleases, manifest, historicalR2Manifests = new Map()) {
  const releases = rawReleases
    .map((release) =>
      normalizeRelease(
        release,
        release.tag_name === manifest.releaseTag
          ? manifest
          : historicalR2Manifests.get(release.tag_name),
      ),
    )
    .filter(Boolean)
    .filter((release) => compareReleaseTags(release.tag, manifest.releaseTag) <= 0)
    .sort((left, right) => compareReleaseTags(right.tag, left.tag));
  const current = releases.find((release) => release.tag === manifest.releaseTag);
  if (
    !current ||
    current.downloadUrl !== manifest.downloadUrl ||
    current.bytes !== manifest.bytes ||
    current.sha256 !== manifest.sha256
  ) {
    throw new Error("latest release does not match the accepted preview manifest");
  }
  return releases;
}

export async function fetchHistoricalR2Manifests(fetcher, rawReleases, currentManifest) {
  const manifests = new Map();
  const candidates = rawReleases.filter((release) => {
    const tag = release?.tag_name;
    const expectedDownloadUrl = `${RELEASE_ORIGIN}/previews/${tag}/${RELEASE_FILE}`;
    return (
      tag !== currentManifest.releaseTag &&
      releaseParts(tag) &&
      compareReleaseTags(tag, currentManifest.releaseTag) < 0 &&
      Array.isArray(release.assets) &&
      release.assets.length === 0 &&
      REVISION.test(release.target_commitish ?? "") &&
      String(release.body ?? "").includes(`Verified download: ${expectedDownloadUrl}`)
    );
  });

  let nextCandidate = 0;
  const workers = Array.from(
    { length: Math.min(MAX_HISTORICAL_MANIFEST_REQUESTS, candidates.length) },
    async () => {
      while (nextCandidate < candidates.length) {
        const release = candidates[nextCandidate];
        nextCandidate += 1;
        const manifestUrl =
          `https://raw.githubusercontent.com/${RELEASE_REPOSITORY}/` +
          `${release.target_commitish}/site/release-manifest.json`;
        try {
          const response = await fetcher(manifestUrl, { cache: "no-store" });
          if (!response.ok) {
            continue;
          }
          const manifest = await response.json();
          const expectedDownloadUrl =
            `${RELEASE_ORIGIN}/previews/${release.tag_name}/${RELEASE_FILE}`;
          if (isExactR2Manifest(manifest, release.tag_name, expectedDownloadUrl)) {
            manifests.set(release.tag_name, manifest);
          }
        } catch {
          // One unavailable historical manifest must not hide the current accepted preview.
        }
      }
    },
  );
  await Promise.all(workers);
  return manifests;
}

export async function fetchReleasePages(fetcher, manifestTag) {
  if (!releaseParts(manifestTag)) {
    throw new Error("accepted preview release tag is invalid");
  }
  const releases = [];
  let manifestFound = false;
  for (let page = 1; page <= MAX_RELEASE_PAGES; page += 1) {
    const url = `${RELEASE_API}?per_page=${RELEASE_PAGE_SIZE}&page=${page}`;
    const response = await fetcher(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("preview history is temporarily unavailable");
    }
    const pageReleases = await response.json();
    if (!Array.isArray(pageReleases)) {
      throw new Error("preview history response is invalid");
    }
    releases.push(...pageReleases);
    manifestFound ||= pageReleases.some((release) => release.tag_name === manifestTag);
    if (pageReleases.length < RELEASE_PAGE_SIZE) {
      if (!manifestFound) {
        throw new Error("accepted preview release is unavailable");
      }
      return releases;
    }
  }
  throw new Error("preview history exceeds the safe pagination limit");
}

export function downloadState(latestTag, remembered) {
  if (!remembered) {
    return { kind: "none", message: "No preview download is remembered in this browser yet." };
  }
  if (!releaseParts(remembered.releaseTag)) {
    return { kind: "none", message: "No preview download is remembered in this browser yet." };
  }
  if (compareReleaseTags(latestTag, remembered.releaseTag) > 0) {
    return {
      kind: "update",
      message: `${latestTag} is available. This browser last selected ${remembered.releaseTag}.`,
    };
  }
  if (latestTag === remembered.releaseTag) {
    return {
      kind: "current",
      message: `This browser last selected the current preview, ${latestTag}.`,
    };
  }
  return {
    kind: "newer-local",
    message: `This browser remembers ${remembered.releaseTag}, which is newer than the accepted preview currently shown.`,
  };
}

function readRememberedDownload() {
  try {
    const remembered = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (
      !remembered ||
      !releaseParts(remembered.releaseTag) ||
      Number.isNaN(new Date(remembered.selectedAt).getTime())
    ) {
      return null;
    }
    return remembered;
  } catch {
    return null;
  }
}

function rememberDownload(releaseTag) {
  const remembered = { releaseTag, selectedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remembered));
  } catch {
    // Downloads still work when browser storage is unavailable.
  }
  return remembered;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(bytes) {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  }
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function releaseCard(release, remembered, isLatest) {
  const article = document.createElement("article");
  article.className = "release-card";

  const heading = document.createElement("div");
  heading.className = "release-heading";
  const title = document.createElement("h3");
  title.textContent = release.tag;
  heading.append(title);
  if (isLatest) {
    const badge = document.createElement("span");
    badge.className = "badge latest";
    badge.textContent = "Latest";
    heading.append(badge);
  }
  if (remembered?.releaseTag === release.tag) {
    const badge = document.createElement("span");
    badge.className = "badge remembered";
    badge.textContent = "Last selected here";
    heading.append(badge);
  }

  const details = document.createElement("p");
  details.className = "release-meta";
  details.textContent = `Published ${formatDate(release.publishedAt)} · ${formatBytes(release.bytes)} · Apple silicon`;

  const actions = document.createElement("div");
  actions.className = "release-actions";
  const download = document.createElement("a");
  download.className = "button small";
  download.href = release.downloadUrl;
  download.download = `RecordCove-macOS-${release.tag}.zip`;
  download.dataset.releaseTag = release.tag;
  download.textContent = `Download ${release.tag}`;
  const notes = document.createElement("a");
  notes.className = "secondary-button";
  notes.href = release.releaseUrl;
  notes.textContent = "Release notes";
  actions.append(download, notes);

  const checksum = document.createElement("details");
  checksum.className = "release-checksum";
  const summary = document.createElement("summary");
  summary.textContent = "Show SHA-256 checksum";
  const code = document.createElement("code");
  code.textContent = release.sha256;
  checksum.append(summary, code);

  article.append(heading, details, actions, checksum);
  return article;
}

function render(releases, remembered) {
  const latest = releases[0];
  const status = downloadState(latest.tag, remembered);
  const statusElement = document.getElementById("download-status");
  statusElement.className = `download-status ${status.kind}`;
  statusElement.textContent = status.message;

  const latestContainer = document.getElementById("latest-release");
  const historyContainer = document.getElementById("release-history");
  latestContainer.replaceChildren(releaseCard(latest, remembered, true));
  historyContainer.replaceChildren(
    ...releases.slice(1).map((release) => releaseCard(release, remembered, false)),
  );
  if (releases.length === 1) {
    const empty = document.createElement("p");
    empty.className = "release-empty";
    empty.textContent = "No previous accepted previews are available yet.";
    historyContainer.replaceChildren(empty);
  }

  document.querySelectorAll("[data-release-tag]").forEach((link) => {
    link.addEventListener("click", () => {
      const nextRemembered = rememberDownload(link.dataset.releaseTag);
      const nextStatus = downloadState(latest.tag, nextRemembered);
      statusElement.className = `download-status ${nextStatus.kind}`;
      statusElement.textContent = nextStatus.message;
      document.querySelectorAll(".badge.remembered").forEach((badge) => badge.remove());
      const badge = document.createElement("span");
      badge.className = "badge remembered";
      badge.textContent = "Last selected here";
      link.closest(".release-card").querySelector(".release-heading").append(badge);
    });
  });
}

async function loadDownloads() {
  const manifestResponse = await fetch("/release-manifest.json", { cache: "no-store" });
  if (!manifestResponse.ok) {
    throw new Error("preview history is temporarily unavailable");
  }
  const manifest = await manifestResponse.json();
  const rawReleases = await fetchReleasePages(fetch, manifest.releaseTag);
  const historicalR2Manifests = await fetchHistoricalR2Manifests(
    fetch,
    rawReleases,
    manifest,
  );
  const releases = acceptedReleases(
    rawReleases,
    manifest,
    historicalR2Manifests,
  );
  render(releases, readRememberedDownload());
}

if (typeof document !== "undefined") {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadDownloads().catch(() => {
    const status = document.getElementById("download-status");
    status.className = "download-status error";
    status.textContent = "The verified preview history could not be loaded. Please try again shortly.";
  });
}
