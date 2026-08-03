# Install KeepVox private preview

## Requirements

- Apple silicon Mac
- macOS 14 or later
- A GitHub account invited to this private repository
- Internet access when downloading optional local models

## Download and verify

1. Open the repository's Releases page and choose the newest private preview.
2. Download the KeepVox ZIP and `SHA256SUMS.txt` into the same folder.
3. Open Terminal in that folder and run:

   ```sh
   shasum -a 256 -c SHA256SUMS.txt
   ```

4. Continue only when the result ends with `OK`.
5. Unzip the archive and move `KeepVox.app` to Applications.

## First launch

This private preview is ad-hoc signed and is not yet Developer ID signed or
Apple-notarized. The first normal launch may be blocked by macOS.

1. Try to open KeepVox once from Applications.
2. Open System Settings and select Privacy & Security.
3. Find the message about the blocked KeepVox app and choose Open Anyway.
4. Confirm that you want to open this exact app.

Do not disable Gatekeeper globally and do not run commands that remove macOS
security protections.

## Updating

For a later preview, quit KeepVox when no recording is active, verify the new
ZIP checksum, and replace the old application in Applications. Your local
library is separate from the app bundle.

If installation fails, open a content-free Issue using [TESTING.md](TESTING.md).
