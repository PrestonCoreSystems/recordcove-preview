# RecordCove preview operations

This private repository controls the access-protected RecordCove preview portal, release manifests, and non-technical tester guidance. The RecordCove product source, recordings, transcripts, model files, and signing credentials are not stored here.

The tester-facing portal is prepared for `https://preview.recordcove.com` behind Cloudflare Access email verification. Preview binaries are revision-bound, checksum-pinned, and published separately from the portal only after the matching package evidence is verified.

## Maintainer checklist

1. Verify the exact RecordCove Release package and its source revision.
2. Confirm the package receipt says `publicReleaseApproved: false` and does not claim Developer ID signing or notarization.
3. Keep an ad-hoc `owner-preview` archive owner-only; never expose it through the friend portal.
4. Publish a friend artifact only after its manifest proves Developer ID signing, Apple notarization, stapling, Gatekeeper acceptance, and the exact source revision.
5. Deploy the static portal through the shared Cloudflare workflow and keep its download disabled until that proof exists.
6. Test the portal, access control, download, checksum, disk image, and first-launch instructions from a clean browser session.
7. Keep public launch, Homebrew, signing authority changes, and automatic updates outside this preview lane.

Tester instructions are in [INSTALL.md](INSTALL.md) and [TESTING.md](TESTING.md). The distribution boundary is in [PRIVATE_PREVIEW_NOTICE.md](PRIVATE_PREVIEW_NOTICE.md).
