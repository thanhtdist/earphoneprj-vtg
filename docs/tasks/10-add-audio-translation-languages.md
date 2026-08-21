# Task #10 — Add languages to the audio translation

**Source:** `feedback_response_実施項目.docx`, item 10 — 【ご要望】音声翻訳の言語を増やしたい（→タイ、スペイン、韓国、フランス）
**Answer given:** 対応可能（言語の追加） · **estimate in the document:** 中 / 初回1〜1.5人日＋0.5人日/言語

## The request

Today a listener can choose 日本語 / 英語 / 中国語. The customer asked for Thai, Spanish, Korean
and French.

## A language is defined in four places

| # | Place | Code |
|---|---|---|
| 1 | The menu the listener sees, labelled in English and in Japanese | `src/utils/constant.js:9-24` (`LISTEN_VOICE_LANGUAGES`, `JA_LISTEN_VOICE_LANGUAGES`) |
| 2 | The tag actually sent to the server, after normalisation | `MultiLangAudio.js:378-385` (`cmn-CN` → `zh`), sent as the connection's `languageCode` at `:489-496` |
| 3 | The fan-out list the backend translates into | `.../translate-text-speech-socket/translate-audio/handler.ts:9` — `const languages = ['en-US', 'zh'];` |
| 4 | The Polly voice for that language | same file, `getVoiceId` `:11-19` and `getSpeechParams` `:21-32` |

`getDefaultListenVoiceLanguageKey` (`constant.js:37-48`) also decides which entry is preselected
from the UI language, and already handles the `zh` ↔ `cmn` mismatch.

`getVoiceId` already knows `ko-KR → Seoyeon`, so Korean is half done.

## Adding one language — the checklist

1. Add `{ key, label }` to **both** arrays in `constant.js` (English label and Japanese label).
2. If the menu key is not the tag Amazon Translate expects, extend `getNormalizedLanguageCode`
   (`MultiLangAudio.js:378-385`) the way `cmn-CN` → `zh` is handled.
3. Add the tag to `languages` in `translate-audio/handler.ts:9` — or better, make that list dynamic
   (see below).
4. Add the Polly voice to `getVoiceId`, and a `LanguageCode` override in `getSpeechParams` if the
   voice needs one (as `zh` does).
5. Optional: the same voice map exists a second time in the REST handler
   (`translates/translate-text-speech/handler.ts:51-59`) — keep them in step or extract one map.

## Three traps

**The three services do not use the same language tags.** The menu keys are Transcribe/Polly style
(`en-US`, `cmn-CN`, `ja-JP`), and they are passed to `translate.translateText` as
`TargetLanguageCode` unchanged, except Chinese which is remapped to `zh`
(`translate-audio/handler.ts:66-70`). Before promising a language, check it in three lists for the
deployment region (`Config.region`): the Amazon Translate language codes, the Amazon Transcribe
codes (source side only), and the Polly voice list. **Thai in particular needs checking on the Polly
side** — text translation and a Polly voice are separate questions, and if there is no voice the
language can still be offered as on-screen text but not as audio.

**Every language is synthesised on every transcript segment, listener or not.**
`translate-audio/handler.ts:66-100` loops over the fixed `languages` array, calls Translate and
Polly for each, and only then filters the connections by `languageCode` (`:85`). Going from 2 to 6
languages triples the Translate + Polly calls per segment and lengthens the `Promise.all` the
listeners wait on. The connections are already loaded a few lines above, so the list can be derived
from who is actually connected:

```ts
const languages = [...new Set((connections.Items || []).map(c => c.languageCode).filter(Boolean))];
```

Same output, work proportional to the audience. This is the "初回1〜1.5人日" part of the estimate —
do it once, before adding the languages.

**Changing the language mid-session may not reach the server.** The listener's `languageCode` is
stored when the socket opens (`connect-state/handler.ts:22-34`). `connectWebSocket` returns early
when a socket already exists (`useConnectWebSocket.js:13-16`), and the `selectLanguage` message
that would update the row is commented out (`MultiLangAudio.js:497-502`). With two languages this
is rarely noticed; with six it will be. Note also that the `selectLanguage` handler
(`select-language/handler.ts:24-33`) writes the row with `put` and only `connectionId` +
`languageCode` — that **overwrites** `tourId` and `userType`, which would drop the listener out of
the `tourId-index` the fan-out queries and out of the role counts of [task #5](05-connection-count-by-role.md).
Fix it to `update` before wiring the FE call.

Related: [`docs/report/issue-11-duplicated-language-options.md`](../report/issue-11-duplicated-language-options.md)
covers the menu itself.

## To confirm before building

- The exact four languages and the voice for each (male/female, standard vs neural — `Engine` is
  hardcoded to `'standard'` at `translate-audio/handler.ts:24`; neural voices sound better and cost
  more).
- Whether the UI labels for the new languages are needed in Japanese only, or in every UI language.
- Whether all languages are offered on every tour, or per tour (the tour record already carries
  `useTheTranslationFunction`, `TourForm.js:216-220`).

## Effort

| Part | Estimate |
|---|---|
| First time: dynamic fan-out list, voice-map cleanup, checking service support | 1〜1.5人日 |
| Per language after that (menu, tag, voice, one round of listening) | 0.5人日 |

Matches the document. Fixing `selectLanguage` (above) adds ~0.5人日 and is recommended alongside.

## Verification

| # | Case | Expected |
|---|---|---|
| 1 | Each new language selected before joining | translated audio plays, subtitle text matches |
| 2 | Japanese selected | still the live guide audio, no translated audio queued (`MultiLangAudio.js:702-705`) |
| 3 | Two listeners on different languages | each hears only their own |
| 4 | Nobody on language X | no Translate/Polly call for X in the lambda log |
| 5 | Language changed mid-session | the new language starts within one segment |
| 6 | A language with no Polly voice | falls back gracefully instead of a silent listener |
