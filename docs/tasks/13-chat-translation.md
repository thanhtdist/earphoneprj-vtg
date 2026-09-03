# Task #13 — Translate chat messages

**Source:** `feedback_response_実施項目.docx`, item 13 — 【ご質問】チャットで翻訳できるか
**Answer given:** 現状は未対応。新規開発で対応可 · **estimate in the document:** 中 / 2〜3人日

## The request

Chat messages are delivered as typed. The customer asked whether they can be translated for the
person reading them.

## Where the chat is today

Chat runs on Chime SDK messaging, entirely separate from the audio translation pipeline.

| Step | Code |
|---|---|
| Send | `ChatMessage.js:175` / `:180` → `api.js:137-162` (`sendMessage`) → `channels/send-channel-message/handler.ts:41-55` |
| Receive (live) | `ChatMessage.js:120-131` — `messageData.Content` |
| Receive (history on open) | `ChatMessage.js:107-118` — `messageData.ChannelMessages` |
| Render | `ChatMessage.js:326-329` |
| Free-form field already in use | `Metadata`, currently carrying attachments (`ChatMessage.js:165-174`, parsed at `:115` and `:128`, passed through by the lambda at `:47`) |

The translation that exists is audio-only: the WebSocket path
(`translate-audio/handler.ts`) and the REST path `translate-text-speech`
(`api.js:312-332` → `translates/translate-text-speech/handler.ts`). Both **always** call Polly —
the REST one synthesises speech at `:63` and returns the audio in the response — so neither can be
used for chat as it stands without paying for an MP3 nobody plays.

## Two designs

**A — translate when the message is sent, store the result in `Metadata` (recommended).**

The sender (or better, the `send-channel-message` lambda) translates the text into each supported
chat language and stores them next to the attachments:

```json
{ "attachments": [...], "translations": { "en": "...", "ja": "..." } }
```

- One Translate call per language per message, no matter how many people read it.
- History works for free: `ChannelMessages` already carries `Metadata` (`ChatMessage.js:115`).
- A reader who joins later, or switches language, sees the translation instantly.
- Cost grows with the number of chat languages, not with the audience.

**B — translate on each device when the message arrives.**

- Simplest to build; no backend change beyond a text-only endpoint.
- Cost multiplies by the number of listeners, and opening the chat re-translates the whole backlog
  on every device. With a bus of 40 people this is the wrong shape.

Recommend A, with the translation done in the lambda so every client stores the same thing and a
device cannot send a message with no translations attached.

## Backend work either way

Add a **text-only** translate endpoint — `amplify/functions/translates/translate-text/`, a copy of
`translate-text-speech/handler.ts` with the Polly half removed — or make `engine` optional in the
existing handler and skip Polly when it is absent. The copy is safer: `translate-text-speech` is
live on the audio path and its contract (`{ translatedText, speech }`) is consumed as is.

**Source language.** Every existing call passes a fixed `sourceLanguageCode`. A chat message can be
in any language, so either pass the sender's UI language (`i18n.language`, always `ja` or `en` —
`src/i18n.js`) or use Amazon Translate's `SourceLanguageCode: 'auto'`. Auto-detect calls Comprehend
under the hood and needs `comprehend:DetectDominantLanguage` on the lambda role. Note that **no IAM
policy statements exist anywhere in `amplify/`** — Translate, Polly and DynamoDB permissions were
granted outside this repository, so find out where before assuming a new permission is a one-line
change.

## Frontend work

- A target language per reader: the UI language (`i18n.language`) is the natural choice for text —
  the voice language (`selectedVoiceLanguage`) belongs to the audio.
- Render both: the translation as the message, the original underneath or behind a toggle. Never
  translate the reader's own messages.
- Leave `' '` placeholder messages (sent with attachments, `ChatMessage.js:175`) untranslated.
- Attachment file names stay as they are.
- The chat restriction setting (`allChat` / `guideOnly` / `nochat`, `MessageBox.js:13-21`) is
  unaffected.

## To confirm before building

- **Which languages** chat translates into. The UI languages (ja/en) are two Translate calls per
  message; following the listening languages of [task #10](10-add-audio-translation-languages.md)
  could be six or more.
- Whether the guide should see the original text of every message as well as the translation.
- Whether old messages already in a channel need to be back-filled (they have no `translations`
  in their metadata) or may stay untranslated.

## Effort

| Part | Estimate |
|---|---|
| `translate-text` endpoint + wiring in `send-channel-message` | 0.5〜1人日 |
| Metadata shape, rendering, original/translation toggle, labels | 1〜1.5人日 |
| Verification across the three screens | 0.5人日 |

Matches the 2〜3人日 in the document, provided design A and a fixed, small language set.

## Implemented

Design **A** (translate once, store in `Metadata`), with the translation done **on the sender's
device at send time** rather than in the `send-channel-message` lambda. Reason: that lambda has no
Translate permission and, as noted above, IAM for these functions is managed outside this repo — a
client-side call avoids adding a permission to a lambda that sends messages. If the translation
call fails the message is still sent, just without `translations`, and readers fall back to the
original (case 5).

Chat translation has its own lambda and endpoint, `translate-text` — a copy of the old
`translate-text-speech` handler with the Polly step removed entirely (no `engine` param at all).
It started as a reuse of `translate-text-speech` with `engine` made optional, to dodge granting a
new function IAM permissions outside this repo; once that permission was confirmed available, it
was split out so the endpoint name matches what it does.

`translate-text-speech` itself — REST lambda, resource, and `/translate-text-speech` API Gateway
path — was then deleted outright rather than left in place. It was already dead code before this
task: the REST audio-translation path it served has been superseded by the WebSocket path
(`translate-text-speech-socket/translate-audio`), and task #10's notes already flagged it as "the
unused REST handler". Confirmed unreferenced (`translateTextSpeech` had no live call sites, only a
commented-out import in `JapaneseAudio.js` / `MultiLangAudio.js`) before removing it, along with
the matching `src/apis/api.js` function and the two dead commented-out imports.

**Target language = the language the reader chose to listen in.** A viewer who joined and picked
Thai reads chat in Thai; a guide / sub-guide (no listening language) always reads chat in Japanese
— fixed `"ja"`, independent of the admin UI language, since guide-side staff on this product speak
Japanese regardless of which UI language they run the console in. That value — `chatLanguage`, an
Amazon Translate code — is the reader's display language. So a message is translated on send into
every chat language: up to seven Amazon Translate calls per message (`ja en zh ko es fr th`), run
in parallel, each with `SourceLanguageCode: 'auto'`.

**Source language is auto-detected, not assumed.** The sender's `chatLanguage` is only a fallback.
Amazon Translate resolves `'auto'` via Comprehend and echoes the detected code back on every
response; `sendMessageClick` takes it from whichever call returns first and drops that language's
entry from the stored `translations` (translating into the language the text is already in is
redundant — a reader in that language sees the original via the `sourceLang !== myLang` check).
This means a Thai listener who types in Japanese is tagged `sourceLang: "ja"` correctly, and Thai
readers still get a Thai translation. Requires `comprehend:DetectDominantLanguage` on the
`translate-text` lambda role — granted outside this repo (see IAM note above); if it were ever
missing, every call fails, `sourceLang` falls back to the sender's `chatLanguage`, and the message
sends with no `translations`, same as any other Translate failure (case 5).

| Piece | Change |
|---|---|
| Text-only translate | New lambda `amplify/functions/translates/translate-text/` (`resource.ts` + `handler.ts`), formerly a copy of `translate-text-speech/handler.ts` with Polly removed. Response is `{ translatedText, sourceLanguageCode }`. `sourceLanguageCode` echoes Translate's resolved source (the detected language when the caller passed `'auto'`). Wired into `backend.ts` behind its own `/translate-text` path on `TranslateVTGRestApi`. The old `translate-text-speech` lambda/resource/path and its `src/apis/api.js` function are deleted (dead REST audio path, superseded by the WebSocket path). |
| API | `src/apis/api.js` → `translateText(inputText, source, target)` — POSTs to `translate-text`, returns `{ translatedText, sourceLanguageCode }` or `null`. |
| Languages | `src/utils/constant.js` → `getChatLanguageCode(voiceKey)` (`th-TH`→`th`, `ja-JP`→`ja`, …), `CHAT_TRANSLATION_LANGUAGES` derived from `LISTEN_VOICE_LANGUAGES`. |
| Metadata shape | `{ attachments, translations: { ja, en, zh, ko, es, fr, th }, sourceLang }` — `translations`/`sourceLang` added next to the existing `attachments` (only the languages that translated successfully, minus the detected source, are stored). |
| Wiring | `MultiLangAudio.js` passes `chatLanguage={getChatLanguageCode(selectedVoiceLanguage)}`; `JapaneseAudio.js`, `StartLiveSession.js` (guide) and `LiveSubSpeaker.js` (sub-guide) all pass the fixed `"ja"` — guide-side staff always speak/read Japanese here, regardless of admin UI language. `MessageBox.js` forwards it to `ChatMessage`. |
| Send | `ChatMessage.js` `sendMessageClick` — translates the message into every chat language with `sourceLanguageCode: 'auto'`, tags it with the detected source, stores the results in `Metadata`. `' '` attachment-only messages are not translated. |
| Receive | `parseChatMetadata` reads `translations`/`sourceLang` for both history and live messages (also hardens the previously unguarded `JSON.parse`). |
| Render | `MessageContent` shows `translations[chatLanguage]` when present, with a **Show original / Hide original** toggle (`chat.showOriginal` / `chat.hideOriginal` in `en`/`ja`). Own messages and messages already in the reader's language are shown as typed. Changing the listening language re-renders from stored `translations` — no re-translation. |

Not done: back-fill of messages already in a channel (they have no `translations` and stay
untranslated).

**To verify before shipping this part:** whether `comprehend:DetectDominantLanguage` is already
granted wherever these lambdas' IAM is managed (see "Backend work either way" above) — the code
degrades gracefully if not (no translations, per case 5), but the whole feature is silently
inert until it is. Also worth confirming: auto-detect now runs seven Comprehend calls per chat
message instead of zero, which is a real (if likely small) added AWS cost.

## Verification

| # | Case | Expected |
|---|---|---|
| 1 | JA sender, EN reader | the reader sees English, the sender sees their own text unchanged |
| 2 | Message with an attachment | the file still opens, the caption is translated |
| 3 | Reader opens the chat late | history is translated too |
| 4 | Reader switches UI language | already-received messages switch as well (design A) |
| 5 | Translate fails | the original text is shown, no empty bubble |
| 6 | `guideOnly` / `nochat` | unchanged behaviour |
