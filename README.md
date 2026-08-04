# RecordCove preview operations

This public, preview-only repository controls the RecordCove pre-release portal, release manifest, public prerelease archive, and non-technical tester guidance. Product source code, recordings, transcripts, model files, tester data, and credentials are not stored here.

The tester portal is `https://preview.recordcove.com`. The exact archive is attached to the manifest-pinned public GitHub prerelease after its revision, byte size, SHA-256 checksum, bundle identity, and ad-hoc signature are verified. Testers do not need a GitHub account to download a public release asset.

The preview is not Apple-notarized and is not the public product launch. The portal must retain that warning and the standard Finder control-click **Open** instructions. It must never tell testers to disable Gatekeeper or run a quarantine-removal command.

## Maintainer checklist

1. Verify the exact clean RecordCove owner-preview package and source revision.
2. Match the portal manifest to the archive filename, byte size, and SHA-256 checksum.
3. Keep the product repository and all user content out of this preview-only repository.
4. Deploy the static portal only to the Terraform-managed Pages project.
5. Upload the exact archive only to the manifest-pinned public prerelease.
6. Verify the portal, download, checksum, extraction, and first-launch guide from an independent browser session.
7. Keep Developer ID signing, notarization, Homebrew, trusted CI, and public product launch outside this preview lane.

Tester instructions are in [INSTALL.md](INSTALL.md) and [TESTING.md](TESTING.md). The distribution boundary is in [PRIVATE_PREVIEW_NOTICE.md](PRIVATE_PREVIEW_NOTICE.md).
