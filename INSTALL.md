# Install the RecordCove macOS preview

These steps are written for someone who does not normally install preview software.

## Before you start

You need an Apple silicon Mac, macOS 14 or later, about 1 GB of free disk space, and an internet connection. RecordCove works locally and does not require a RecordCove account.

The friend download is not open yet. Wait for the maintainer to confirm that the exact build is Developer ID signed, Apple-notarized, and ready. Never install an owner-only ZIP or follow instructions that ask you to bypass macOS security.

## Download

1. Open `https://preview.recordcove.com` in Safari, Chrome, or another browser.
2. Enter the email address where you want to receive the private access code.
3. Open the message from Cloudflare and copy the one-time code. Check Spam or Junk if it does not arrive after a few minutes.
4. Return to the browser, enter the code, and continue to the RecordCove preview page. You do not need a GitHub or RecordCove account.
5. If the page says the friend download is still being prepared, stop here and return after the maintainer confirms it is ready.
6. When the verified download opens, select **Download RecordCove for Mac**. The download may ask for the same email code because the app file is protected separately.
7. If your browser asks whether to allow the download, choose **Allow**.
8. Wait for the download to finish. The file is large because the default English transcription model is included.

The downloaded file normally appears in the **Downloads** folder. Open Finder, then select **Downloads** in the left sidebar to find it.

## Check that the download is complete

The preview page will show the exact friend-build filename and SHA-256 checksum. This is a long sequence of letters and numbers that identifies the exact verified file.

If you are comfortable with Terminal:

1. Open **Terminal** from Applications, then Utilities.
2. Type `shasum -a 256 `, including the final space.
3. Drag the downloaded DMG from Finder into the Terminal window.
4. Press Return.
5. Confirm the result exactly matches the checksum shown on the preview page.

If you are not comfortable with Terminal, confirm that the browser reports a successful download and that the file name exactly matches the one shown on the preview page. Ask the maintainer before continuing if the browser reports an interrupted or unsafe download.

## Open the download and move the app

The verified friend package will be a DMG, which is a Mac disk image that opens like a temporary folder.

1. Double-click the downloaded DMG file in Finder.
2. Wait for the RecordCove window to appear.
3. Drag **RecordCove** onto the **Applications** shortcut in that window.
4. If macOS asks for your Mac password or Touch ID, approve the move.
5. Close the RecordCove disk-image window and eject it from Finder.

## First launch

1. Open **Applications** in Finder.
2. Double-click **RecordCove** once.
3. Confirm RecordCove opens without an unidentified-developer or damaged-app warning.
4. If macOS shows either warning, stop and tell the maintainer.

Do not select **Open Anyway**, run a quarantine-removal command, or disable Gatekeeper for a friend preview.

## Microphone permission

RecordCove asks for microphone permission only when it needs to record. Choose **Allow** if you intend to record. You can review this later in **System Settings**, **Privacy & Security**, then **Microphone**.

## Updating later

1. Finish or cancel any active recording.
2. Quit RecordCove.
3. Download and verify the newer preview.
4. Move the newer `RecordCove.app` into Applications and choose **Replace**.

Your recording library is stored separately from the application, so replacing the app does not remove it.

## If something goes wrong

Do not send recordings, transcripts, summaries, prompts, model output, tokens, personal filenames, or full file paths. Follow [TESTING.md](TESTING.md) and describe only the screen, button, expected behavior, and high-level result.
