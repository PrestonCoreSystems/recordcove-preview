# Install the RecordCove macOS preview

These steps are written for someone who does not normally install preview software.

## Before you start

You need an Apple silicon Mac, macOS 14 or later, about 1 GB of free disk space, and an internet connection. RecordCove works locally and does not require a RecordCove account.

This early preview is ad-hoc signed and is not Apple-notarized. Install it only if you trust Preston Core Systems Limited, downloaded it from `https://preview.recordcove.com`, and the filename and checksum match the preview page.

## Download and unzip

1. Open `https://preview.recordcove.com` in Safari, Chrome, or another browser.
2. Select **Download RecordCove for Mac**.
3. Wait for the download to finish. It is large because Whisper Small English is included.
4. Open Finder and select **Downloads** in the left sidebar.
5. Double-click `RecordCove-macOS-preview.zip`. Your Mac creates a folder containing `RecordCove.app`.
6. Drag **RecordCove** into the **Applications** folder in Finder.

## Optional checksum check

The preview page shows the exact SHA-256 checksum. If you are comfortable with Terminal, open Terminal, type `shasum -a 256 ` with a final space, drag the ZIP into the window, and press Return. The result must match the preview page exactly.

## First launch

1. Open **Applications** in Finder.
2. Hold the Control key while clicking **RecordCove**, then select **Open**.
3. macOS explains that Apple cannot verify the developer. Select **Open** only if the file and checksum match the preview page.
4. RecordCove should open. If macOS says the app is damaged, stop and tell the maintainer.

Do not disable Gatekeeper and do not run a Terminal command to remove quarantine.

## Microphone permission

RecordCove asks for microphone permission only when it needs to record. Select **Allow** if you intend to record. You can review this later in **System Settings**, **Privacy & Security**, then **Microphone**.

## Updating later

1. Finish or cancel any active recording.
2. Quit RecordCove.
3. Download and verify the newer preview.
4. Replace the application in Applications.

Your recording library is stored separately from the application, so replacing the app does not remove it.

## If something goes wrong

Do not send recordings, transcripts, summaries, prompts, model output, tokens, personal filenames, or full file paths. Follow [TESTING.md](TESTING.md) and describe only the screen, button, expected behavior, and high-level result.
