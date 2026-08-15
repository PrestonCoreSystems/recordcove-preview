# RecordCove preview operations

This public, preview-only repository controls the RecordCove pre-release portal, release manifest, public prerelease archive, and non-technical tester guidance. Product source code, recordings, transcripts, model files, tester data, and credentials are not stored here.

The tester portal is `https://preview.recordcove.com`. The exact archive is attached to the manifest-pinned public GitHub prerelease after its revision, byte size, SHA-256 checksum, bundle identity, and ad-hoc signature are verified. Testers do not need a GitHub account to download a public release asset.

The Downloads page reads the public GitHub prerelease inventory and displays only releases at or below the manifest-pinned accepted preview. The newest displayed asset must match the manifest URL, byte size, and SHA-256 digest exactly. A newer staged GitHub prerelease is therefore not promoted before its manifest is accepted. The page remembers the last selected version only in that browser's local storage; no download history is uploaded.

The preview is not Apple-notarized and is not the public product launch. The portal must retain that warning and the current Gatekeeper recovery path: attempt one launch, choose **Done** if macOS offers only **Move to Bin** and **Done**, then use **System Settings**, **Privacy & Security**, **Open Anyway**, authentication, and the final **Open** confirmation. It must never tell testers to disable Gatekeeper, lower app-security settings, or use Terminal commands to remove quarantine.

The next bundled-model preview includes verified Whisper Small English and IBM Granite 4.1 3B inside the application. Whisper is the default transcription model and Granite is the default Understanding model for titles, summaries, and enhancement. Testers must not need a second Granite download or be silently moved to Apple on-device. The measured owner-preview candidate is 2,528,517,655 bytes as a ZIP, so it cannot be uploaded as one GitHub Release asset. Publication remains blocked until a reviewed distribution channel can serve that exact large artifact without changing the package or safety contract.

## Current model scope

For this preview, RecordCove focuses model discovery, qualification, and packaging on model developers and originating model families from North America, Europe, and Africa. Models originating from mainland China are outside the current evaluation and packaging scope.

This is a current release-scope and supply-chain qualification decision. It is not a claim that an included model is universally better, that an excluded model is lower quality, or that developer region proves local privacy.

## Maintainer checklist

1. Verify the exact clean RecordCove owner-preview package and source revision.
2. Match the portal manifest to the archive filename, byte size, and SHA-256 checksum.
3. Keep the product repository and all user content out of this preview-only repository.
4. Deploy the static portal only to the Terraform-managed Pages project.
5. Upload the exact archive only to the manifest-pinned public prerelease.
6. Verify the portal, download, checksum, extraction, and first-launch guide from an independent browser session.
7. Keep Developer ID signing, notarization, Homebrew, trusted CI, and public product launch outside this preview lane.
8. Use only privacy-safe product imagery with synthetic content. Public screenshots must never show a real recording, transcript, summary, prompt, model output, filename, path, category, tag, or other user data.
9. Version static CSS and image URLs when their bytes change so cached preview pages cannot combine new markup with stale presentation rules.
10. Explain that both default local models are included, why the archive is large, and that at least 6 GB of temporary free space is recommended for download plus extraction.

Tester instructions are in [INSTALL.md](INSTALL.md) and [TESTING.md](TESTING.md). The distribution boundary is in [PRIVATE_PREVIEW_NOTICE.md](PRIVATE_PREVIEW_NOTICE.md).

## Continuous integration

Every pull request and protected-main update runs the locked test and static-build pipeline on a GitHub-hosted runner.

The public repository never routes pull-request code to a persistent self-hosted runner.

RecordCove application packaging remains in the private product repository on the restricted M3 runner.

Publication and Cloudflare deployment run separately on a GitHub-hosted runner so release and cloud credentials are never placed on the M3.
