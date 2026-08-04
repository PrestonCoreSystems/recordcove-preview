# Install the RecordCove macOS preview

These steps are written for someone who does not normally install preview software.

## Before you start

You need an Apple silicon Mac, macOS 14 or later, about 1 GB of free disk space, and an internet connection. RecordCove works locally and does not require a RecordCove account.

This preview is not yet Apple-notarized. macOS may block the first launch even when the download is genuine. The steps below approve only RecordCove. Never disable the Mac's security system globally.

## Download

1. Open `https://preview.recordcove.com` in Safari, Chrome, or another browser.
2. Enter the email address where you want to receive the private access code.
3. Open the message from Cloudflare and copy the one-time code. Check Spam or Junk if it does not arrive after a few minutes.
4. Return to the browser, enter the code, and continue to the RecordCove preview page. You do not need a GitHub or RecordCove account.
5. Select **Download RecordCove for Mac**. The download may ask for the same email code because the app file is protected separately.
6. If your browser asks whether to allow the download, choose **Allow**.
7. Wait for the download to finish. The file is large because the default English transcription model is included.

The downloaded file normally appears in the **Downloads** folder. Open Finder, then select **Downloads** in the left sidebar to find it.

## Check that the download is complete

The preview page shows a SHA-256 checksum. This is a long sequence of letters and numbers that identifies the exact approved file.

If you are comfortable with Terminal:

1. Open **Terminal** from Applications, then Utilities.
2. Type `shasum -a 256 `, including the final space.
3. Drag the downloaded ZIP from Finder into the Terminal window.
4. Press Return.
5. Confirm the result exactly matches the checksum shown on the preview page.

If you are not comfortable with Terminal, confirm that the browser reports a successful download and that the file name exactly matches the one shown on the preview page. Ask the maintainer before continuing if the browser reports an interrupted or unsafe download.

## Unzip and move the app

To unzip means to open the downloaded package so the RecordCove application appears.

1. Double-click the downloaded ZIP file in Finder.
2. Wait until `RecordCove.app` appears in the same folder.
3. Open a second Finder window and select **Applications** in the left sidebar.
4. Drag `RecordCove.app` into **Applications**.
5. If macOS asks for your Mac password or Touch ID, approve the move.

## First launch

1. Open **Applications** in Finder.
2. Double-click **RecordCove** once.
3. If RecordCove opens, continue to the onboarding screens.
4. If macOS blocks the app, close the message.
5. Open **System Settings**, then **Privacy & Security**.
6. Scroll down until you see a message that RecordCove was blocked.
7. Select **Open Anyway** next to that exact RecordCove message.
8. Confirm **Open** when macOS asks again.

Do not run commands that remove quarantine from every download and do not disable Gatekeeper.

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
