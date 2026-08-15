# Install the RecordCove macOS preview

These steps are written for someone who does not normally install preview software.

## Before you start

You need an Apple silicon Mac, macOS 14 or later, at least 6 GB of free disk space during installation, and an internet connection for the initial download. RecordCove works locally after installation and does not require a RecordCove account.

The preview is a large download because it includes two verified local models: **Whisper Small English** for transcription and **IBM Granite 4.1 3B** for titles, summaries, and transcript enhancement. Both are installed with RecordCove. Granite is selected by default so a new tester can evaluate the intended local Understanding experience without a second model download. Apple on-device and Ministral remain optional choices in Models.

This early preview is ad-hoc signed and is not Apple-notarized. Install it only if you trust Preston Core Systems Limited, downloaded it from `https://preview.recordcove.com`, and the filename and checksum match the preview page.

## Download and unzip

1. Open `https://preview.recordcove.com/downloads.html` in Safari, Chrome, or another browser.
2. Choose the newest accepted preview. The page shows its publication date and remembers the version selected in that browser so it can highlight a later update.
3. Wait for the download to finish. The current bundled-model candidate is about 2.53 GB as a ZIP and about 2.5 GB after extraction. Keeping at least 6 GB free allows the ZIP and extracted application to exist together during installation.
4. Open Finder and select **Downloads** in the left sidebar.
5. Double-click `RecordCove-macOS-preview.zip`. Your Mac creates a folder containing `RecordCove.app`.
6. Drag **RecordCove** into the **Applications** folder in Finder.

## Optional checksum check

The Downloads page shows the exact SHA-256 checksum for every preview. If you are comfortable with Terminal, open Terminal, type `shasum -a 256`, press the Space bar once, drag the ZIP into the window, and press Return. The result must match the selected preview exactly.

## First launch

1. Open **Applications** in Finder.
2. Double-click **RecordCove** once. macOS may explain that Apple cannot verify the app is free of malware.
3. If the alert offers only **Move to Bin** and **Done**, select **Done**. Select **Move to Bin** instead if the source, filename, or checksum does not match the preview page.
4. Open the Apple menu, select **System Settings**, then select **Privacy & Security**.
5. Scroll down to **Security**. Confirm that the message names **RecordCove**, then select **Open Anyway**.
6. Authenticate with your Mac login password or Touch ID if macOS asks.
7. The warning appears again. After confirming the app name, source, filename, and checksum, select **Open**.
8. RecordCove should open. macOS saves this as an exception for this specific copy of the app.

The **Open Anyway** button is available for about one hour after a blocked launch. If it is missing, try to open RecordCove once more and immediately return to **Privacy & Security**. If it still does not appear, or macOS says the app is damaged, stop and tell the maintainer.

Do not disable Gatekeeper, lower **Allow applications from**, or use Terminal workarounds such as `xattr`, `spctl`, `sudo`, or removal of `com.apple.quarantine`.

## Microphone permission

RecordCove asks for microphone permission only when it needs to record. Select **Allow** if you intend to record. You can review this later in **System Settings**, **Privacy & Security**, then **Microphone**.

## Updating later

1. Finish or cancel any active recording.
2. Quit RecordCove.
3. Return to Preview downloads. If the page says a newer accepted preview is available, download and verify it.
4. Replace the application in Applications.

Your recording library is stored separately from the application, so replacing the app does not remove it.

## If something goes wrong

Do not send recordings, transcripts, summaries, prompts, model output, tokens, personal filenames, or full file paths. Follow [TESTING.md](TESTING.md) and describe only the screen, button, expected behavior, and high-level result.
