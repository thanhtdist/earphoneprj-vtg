# Task #12 — Let the spoken language and the listening language be chosen freely

**Source:** `feedback_response_実施項目.docx`, item 12 — 【ご質問】発信側と受信側の言語を自由に選べるか（例: スペイン語→タイ語）
**Answer given:** 現状は不可。対応には設計変更が必要 · **estimate in the document:** 大 / 5〜8人日＋検証

## The request

Today the guide speaks Japanese and listeners choose a language. The customer asked for any pair —
a Spanish-speaking guide with a Thai-speaking listener, for example.

## Why this is not "add a dropdown"

The source language is not a setting; it is the literal `ja-JP` written into every stage of the
pipeline, plus one structural assumption: **"Japanese" and "the original audio" are the same thing
throughout the listener code.**

| Stage | Today | Code |
|---|---|---|
| The menu of speakable languages | one entry, `ja-JP` | `src/utils/constant.js:3-7` (`SPEAK_VOICE_LANGUAGES`, `SPEAK_VOICE_LANGUAGES_KEY`) |
| Transcription | started with that constant | `StartLiveSession.js:965` → `api.js:292-310` → `meetings/start-meeting-transcription/handler.ts:33-41` |
| Every transcript sent for translation | `sourceLanguageCode: 'ja-JP'` hardcoded | `StartLiveSession.js:893-897` |
| The guide's own WebSocket registration | `languageCode: 'ja-JP'` hardcoded | `StartLiveSession.js:877` |
| Target languages | a fixed array | `translate-audio/handler.ts:9` |
| Listener: "original" audio | the live meeting stream is bound **only** when `ja-JP` is selected | `MultiLangAudio.js:119-142` |
| Listener: translated audio | skipped **only** for `ja-JP` | `MultiLangAudio.js:702-705` |
| Listener routing | a whole screen for the Japanese case | `LiveViewer.js:58-62`, `JapaneseAudio.js`, `LiveViewerJa.js` |

The good news: **transcription is already parameterised.** `start-meeting-transcription` takes
`languageCode` and passes it to `EngineTranscribeSettings` — the caller just never varies it.

## The shape of the change

1. **Store the source language on the tour.** It belongs next to `useTheTranslationFunction` and
   `subGuideFunctionAvailable` in the tour record and the admin form (`TourForm.js:208-220`), so
   every screen can read it before joining. A guide-side selector alone is not enough: the listener
   screens need it too, before any audio arrives.
2. **Replace the literals** listed above with that value — transcription start, the `translateAudio`
   payload, the guide's WebSocket registration.
3. **Rework "listen to the original".** This is the largest piece. The rule must become *"if the
   selected language equals the tour's source language, bind the meeting stream; otherwise play the
   translated audio"* — replacing three `=== 'ja-JP'` tests and the `JapaneseAudio` /
   `MultiLangAudio` split at `LiveViewer.js:58-62`. The listener menu also has to exclude the source
   language from the translated list and offer it as 原語（ライブ）.
4. **Make the backend fan-out dynamic** — the fixed `languages` array and the voice map, i.e.
   [task #10](10-add-audio-translation-languages.md). Do that task first; this one depends on it.
5. **Handle a language change mid-tour.** Chime transcription is started once per meeting
   (`StartLiveSession.js:954-966`); there is no `stop-meeting-transcription` function in
   `amplify/functions/meetings/`, so switching the spoken language after the meeting has started
   needs one added, or the guide has to restart the session.

## Traps

- **Not every pair is supported, and the tags differ per service.** The menu keys are
  Transcribe/Polly style (`ja-JP`, `en-US`), Translate wants its own codes (`ja`, `zh`), and the
  current code passes the menu key straight through except for Chinese
  (`MultiLangAudio.js:378-385`, `translate-audio/handler.ts:66-70`). Every new source language must
  be checked against Transcribe *and* Translate, every target against Translate *and* Polly.
- **Verification grows as source × target.** Six languages each way is 30 pairs. Test a
  representative matrix — each source once, each target once, plus the pairs the customer actually
  asked for — not the full grid.
- **The Japanese listener path is the one users hear as "live".** Anything that breaks it regresses
  the current product for its main audience; see
  [`docs/report/issue-14-japanese-audio-not-audible.md`](../report/issue-14-japanese-audio-not-audible.md)
  for how fragile that path already is on iOS.

## To confirm before building

- Is the spoken language **per tour** (set when the tour is registered) or **per session** (the
  guide picks it before going live)? Per tour is far cheaper and is what the listener screens need.
- Which sources must be supported — the full set, or Japanese plus one or two?
- Should the guide hear anything back? Item 8 in the same document (メインガイドは受信無効) is a
  separate change but touches the same code.

## Effort

The document's 5〜8人日＋検証 is realistic **for the code changes**, on the condition that
[task #10](10-add-audio-translation-languages.md) lands first. Rough split:

| Part | Estimate |
|---|---|
| Tour field + admin form + guide selector | 1〜1.5人日 |
| Replacing the `ja-JP` literals end to end | 1人日 |
| Reworking the listener "original vs translated" logic and the two screens | 2〜3人日 |
| Transcription restart on a language change | 0.5〜1人日 |
| Pair verification (representative matrix) | 1〜2人日 |

## Verification

| # | Case | Expected |
|---|---|---|
| 1 | Existing Japanese tour, untouched | identical behaviour, live audio for JA listeners |
| 2 | Spanish source, Thai listener | translated audio arrives, subtitles match |
| 3 | Listener selects the source language | live meeting audio, no translated audio queued |
| 4 | Source language changed before going live | transcription starts in the new language |
| 5 | Unsupported pair | a clear message, not silence |
| 6 | `/viewer_ja` and the sub-guide screen | still work on a non-Japanese tour |
