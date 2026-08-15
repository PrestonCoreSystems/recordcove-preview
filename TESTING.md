# Test the RecordCove preview

Thank you for helping test RecordCove. Use only recordings you are legally allowed to make. You never need to share the recording or its written content to report a problem.

The preview currently focuses model discovery and qualification on developers and originating model families from North America, Europe, and Africa. Models originating from mainland China are outside the current evaluation and packaging scope. This boundary explains the available choices; it is not a comparative quality or privacy claim.

## A simple first test

1. Open RecordCove.
2. Complete the four onboarding screens.
3. Confirm **Whisper Small English** and **IBM Granite 4.1 3B** are both shown as included and verified. No second model download should be required.
4. Confirm Whisper Small English is selected for transcription and IBM Granite is selected for Understanding.
5. Select **New Recording**.
6. Record about 20 seconds of ordinary, non-private speech.
7. Select **Stop and Save**.
8. Confirm the recording appears in **All Recordings** and does not say it was recovered after a normal save.
9. Play the recording and transcribe it with Whisper Small English.
10. Generate a title and summary, then try **Enhance**. Confirm the local results complete without switching to Apple on-device unless you explicitly selected Apple yourself.
11. Confirm the transcript covers the full recording.

## Everyday feature checks

- Copy the transcript and confirm the button changes back from **Copied** to **Copy** after a short moment.
- Regenerate a Summary with IBM Granite selected.
- Try **Enhance** and confirm the original transcript remains available in Version History.
- Try **Clean up** and confirm the original transcript remains available.
- Create a Quick Note, type a title, press Return, and confirm the cursor moves into the note body.
- Move the pointer over a note and confirm the row visibly highlights and looks clickable.
- Move a recording or note to **Recently Deleted**, restore it, and confirm the 30-day recovery message.
- Search, sort, and filter the recording list.
- Quit and reopen RecordCove only when no recording is active, then confirm the library is still present.

## Long recording test

If you already have a long recording you are allowed to use, transcribe it and let RecordCove finish without interrupting it. Check that the beginning, middle, and end are represented and that transitions between processing segments do not cut words or create unrelated paragraph jumps. Do not send the audio or transcript when reporting the result.

## Report useful feedback

Select **Feedback** in RecordCove, or open the RecordCove board on Feedwish at `https://feedwish-dev.prestoncore.com/` in your browser. You can submit without an account and may add a display name if you want. Save the private management code shown after submission; it lets you check that feedback and permanently withdraw it later. Signing in is optional and is only needed to follow feedback over time.

Include:

- your macOS version;
- your Mac type, such as MacBook Air with Apple silicon;
- the RecordCove version and revision shown in About;
- the selected transcription or Understanding model;
- the screen and button you used;
- what you expected;
- what happened at a high level; and
- the approximate time, if it helps locate a content-free operational event.

Never attach or paste audio, recordings, transcripts, summaries, prompts, model output, tokens, credentials, personal filenames, or full local paths. For a crash, say only that a crash occurred and which workflow step you were using. Wait for a specifically scoped request before sharing any diagnostic information.
