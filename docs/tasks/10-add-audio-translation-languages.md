# Task #10 — Add languages to the audio translation

## Implementation status

Code for all four languages (Korean, Spanish, French, Thai) is written:

- `src/utils/constant.js` — `ko-KR` / `es-ES` / `fr-FR` / `th-TH` added to both menu arrays.
- `MultiLangAudio.js` — `getNormalizedLanguageCode` extended (`ko-KR`→`ko` etc.); the commented-out
  `selectLanguage` mid-session send is now wired (a `useEffect` on `targetLanguageCode` sends it
  over the already-open socket, skipping the first run since `connectState` already carries it).
- `select-language/handler.ts` — changed `put` → `update` (the trap described below), so selecting
  a language mid-session no longer drops `tourId`/`userType` off the connection row.
- `translate-audio/handler.ts` — `languages` is now derived from `connections.Items` (the dynamic
  list from "Four traps" below), source language excluded; `getVoiceId` fixed to switch on the
  *normalized* tags (`ko`/`es`/`fr`, not `ko-KR`) and gained Spanish (`Lucia`) and French (`Lea`);
  Thai routes to Google Cloud TTS (`th-TH-Standard-A`).
- `translate-text-speech/handler.ts` (the unused REST handler, checklist item 6) — voice map
  extended for parity; not wired to Google TTS since nothing calls this handler today.

**Credential wiring differs from the plan below**: instead of the reference branch's
`GOOGLE_TTS_SECRET_NAME` (Secrets Manager) / `GOOGLE_APPLICATION_CREDENTIALS_JSON` (env var) split
plus a manual IAM grant, `translate-audio/resource.ts` now declares
`GOOGLE_APPLICATION_CREDENTIALS_JSON: secret('GOOGLE_APPLICATION_CREDENTIALS_JSON')` — the same
`secret()` helper already used by `loginCognito/get-credentials` and `uploadFileS3/view` in this
repo. Amplify resolves it per branch and grants the function read access automatically, so **no
manual Secrets Manager IAM grant is needed**. One secret name, set independently per environment:

```
npx ampx sandbox secret set GOOGLE_APPLICATION_CREDENTIALS_JSON   # local
```

or via the Amplify Console's Secrets page for each deployed branch (dev22 / kennet / clubtourism).
Paste the full service-account JSON as the value. **Not done yet** (needs a real GCP project):
creating that service account and setting this secret in each environment — until then, Thai
requests fail with a caught, logged error and the other languages are unaffected (Verification
case 7 below).

**Still open, not addressed by this pass** (also not required for the four languages to work):
the exact Polly voice choice for KO/ES/FR (defaulted to `Seoyeon`/`Lucia`/`Lea`, standard engine,
matching the existing hardcoded `Engine: 'standard'`) and the Google voice for Thai (defaulted to
`th-TH-Standard-A`) can be swapped by editing one line each; whether Thai should ship as audio at
all vs. subtitle-only first; per-tour language restriction (`useTheTranslationFunction` already
exists but this task doesn't touch it — all tours that have translation enabled get all languages).


**Source:** `feedback_response_実施項目.docx`, item 10 — 【ご要望】音声翻訳の言語を増やしたい（→タイ、スペイン、韓国、フランス）
**Answer given:** 対応可能（言語の追加） · **estimate in the document:** 中 / 初回1〜1.5人日＋0.5人日/言語

## The request

Today a listener can choose 日本語 / 英語 / 中国語. The customer asked for Thai, Spanish, Korean
and French.

## Service support — checked (region `Config.region` = `us-east-1`)

| Language | Menu key | Amazon Translate target | Amazon Polly voice | TTS provider |
|---|---|---|---|---|
| Korean  | `ko-KR` | `ko` | `Seoyeon` (neural + standard) — already in `getVoiceId` | Polly |
| Spanish | `es-ES` | `es` | `Lucia` / `Conchita` / `Enrique` (es-ES); neural available | Polly |
| French  | `fr-FR` | `fr` | `Léa` / `Céline` / `Mathieu` (fr-FR); neural available | Polly |
| Thai    | `th-TH` | `th` | **none — Polly has no `th-TH` voice in any region** | **Google Cloud TTS** |

Amazon Translate and Amazon Transcribe both support all four (Transcribe only matters if a *guide*
speaks them — source side). Polly is the only gap, and only for Thai.

**Decision:** Korean / Spanish / French follow the existing Polly path. Thai routes its TTS call to
**Google Cloud Text-to-Speech**. The reference implementation is on branch **`feature/gg-tts`**,
which does exactly this for Vietnamese (another Polly-less language) — copy that pattern for `th`.

## A language is defined in five places

| # | Place | Code |
|---|---|---|
| 1 | The menu the listener sees, labelled in English and in Japanese | `src/utils/constant.js:9-24` (`LISTEN_VOICE_LANGUAGES`, `JA_LISTEN_VOICE_LANGUAGES`) |
| 2 | The tag actually sent to the server, after normalisation | `MultiLangAudio.js:378-385` (`cmn-CN` → `zh`), sent as the connection's `languageCode` at `:489-496` |
| 3 | The fan-out list the backend translates into | `.../translate-text-speech-socket/translate-audio/handler.ts:9` — `const languages = ['en-US', 'zh'];` |
| 4 | The Polly voice for that language | same file, `getVoiceId` `:11-19` and `getSpeechParams` `:21-32` |
| 5 | The TTS-provider route — Polly for most languages, Google Cloud TTS for the Polly-less ones (Thai; Vietnamese on the reference branch) | `translate-audio/handler.ts` per-language loop — see "Thai has no Polly voice" below; full diff on branch `feature/gg-tts` |

`getDefaultListenVoiceLanguageKey` (`constant.js:37-48`) also decides which entry is preselected
from the UI language, and already handles the `zh` ↔ `cmn` mismatch.

`getVoiceId` already knows `ko-KR → Seoyeon`, so Korean is half done.

## Adding one language — the checklist

1. Add `{ key, label }` to **both** arrays in `constant.js` (English label and Japanese label).
2. If the menu key is not the tag Amazon Translate expects, extend `getNormalizedLanguageCode`
   (`MultiLangAudio.js:378-385`) the way `cmn-CN` → `zh` is handled. (`ko-KR`→`ko`, `es-ES`→`es`,
   `fr-FR`→`fr`, `th-TH`→`th`.)
3. Add the tag to `languages` in `translate-audio/handler.ts:9` — or better, make that list dynamic
   (see below).
4. **If Polly has a voice for it** (Korean / Spanish / French): add it to `getVoiceId`, and a
   `LanguageCode` override in `getSpeechParams` if the voice needs one (as `zh` does).
5. **If Polly has no voice for it** (Thai): route that tag to Google Cloud TTS instead of Polly —
   see "Thai has no Polly voice" below.
6. Optional: the same voice map exists a second time in the REST handler
   (`translates/translate-text-speech/handler.ts:51-59`) — keep them in step or extract one map.

## Thai has no Polly voice — use Google Cloud TTS

Confirmed: Amazon Polly ships **no `th-TH` voice in any region**. Amazon Translate *does* translate
to `th`, so Thai text is available; only synthesis is missing. Branch **`feature/gg-tts`** solves
the identical problem for Vietnamese and is the template to copy for `th`.

### What that branch changes — all in `translate-audio/handler.ts`

- Adds `import jwt from 'jsonwebtoken'` (already a dependency, `package.json:41` — no new install).
- Adds three helpers:
  - **`getGoogleCredentials()`** — returns the service-account JSON, read in priority order:
    `GOOGLE_TTS_SECRET_NAME` (name of an AWS Secrets Manager secret, for prod) →
    `GOOGLE_APPLICATION_CREDENTIALS_JSON` (the JSON inline in an env var, for dev) → `null`.
  - **`getGoogleAccessToken(creds)`** — signs an RS256 JWT (`iss: client_email`,
    `scope: https://www.googleapis.com/auth/cloud-platform`, `aud: https://oauth2.googleapis.com/token`,
    1 h expiry) and exchanges it at `https://oauth2.googleapis.com/token` for an OAuth2 access token.
  - **`synthesize…Speech(text)`** — `POST https://texttospeech.googleapis.com/v1/text:synthesize`
    with body `{ input: { text }, voice: { languageCode, name }, audioConfig: { audioEncoding: 'MP3' } }`;
    returns a `Buffer` from the base64 `audioContent`. If `getGoogleCredentials()` gave `null`, it
    falls back to an API-key call `…/text:synthesize?key=${GOOGLE_TTS_API_KEY}` — **local testing
    only**.
- In the per-language loop, after `translate.translateText`, it routes the TTS call and leaves
  everything after it (the `listeners` filter, `postToConnection` with `type: 'translationWithAudio'`)
  shared — so the front end needs no change, it already just plays `audioBase64`:

  ```ts
  let audioBase64: string;
  if (lang === 'th') {                         // 'vi' on the reference branch
    audioBase64 = (await synthesizeThaiSpeech(translatedText)).toString('base64');
  } else {
    const voiceId = getVoiceId(lang);
    const speechParams = getSpeechParams(translatedText, voiceId, lang);
    const speech = await polly.synthesizeSpeech(speechParams).promise();
    if (!speech.AudioStream || !(speech.AudioStream instanceof Buffer)) {
      console.warn(`❌ Invalid AudioStream for lang ${lang}`);
      return;
    }
    audioBase64 = speech.AudioStream.toString('base64');
  }
  ```

### For Thai specifically

- Menu key `th-TH`; `getNormalizedLanguageCode` maps `th-TH` → `th` (same place `cmn-CN` → `zh` is
  handled). Route on the normalised tag `th` — that is what the loop iterates.
- Google voice: `languageCode: 'th-TH'`, `name: 'th-TH-Neural2-C'` (female, Neural2) or
  `'th-TH-Standard-A'` (cheaper). Google *does* have Thai voices — Standard, Neural2, Chirp3-HD.
- Send `th` as `TargetLanguageCode` to Amazon Translate (no `th-TH`).

### Credential wiring — the reference branch does NOT do this, it must be added

`feature/gg-tts` edits only the handler. Two gaps to close before it runs in the cloud:

1. **The Lambda has no env vars.** `translate-audio/resource.ts` is a bare `defineFunction`; add
   `environment: { GOOGLE_TTS_SECRET_NAME: '…' }` (prod) / `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   (dev) there or in `amplify/backend.ts`. The repo-root `.env` is a CRA *frontend* file and never
   reaches the Lambda.
2. **The prod path needs IAM.** It calls `new AWS.SecretsManager().getSecretValue`; grant
   `secretsmanager:GetSecretValue` on that secret to the `translate-audio` function in
   `amplify/backend.ts`.

Store the service-account JSON in Secrets Manager (prod) / a deploy-time env var (dev). **Never
commit it.** The reference branch checked a live `GOOGLE_TTS_API_KEY` into `.env`; treat that key as
leaked (rotate it) and use a service account, not an API key, for the real integration.

## Four traps

**The three services do not use the same language tags.** The menu keys are Transcribe/Polly style
(`en-US`, `cmn-CN`, `ja-JP`), and they are passed to `translate.translateText` as
`TargetLanguageCode` unchanged, except Chinese which is remapped to `zh`
(`translate-audio/handler.ts:66-70`). Before promising a language, check it in three lists for the
deployment region (`Config.region`): the Amazon Translate language codes, the Amazon Transcribe
codes (source side only), and the Polly voice list. **This has been done** (see "Service support"
above): Korean / Spanish / French are fine on Polly in `us-east-1`; Thai has no Polly voice and goes
through Google Cloud TTS instead.

**The reference branch leaks a key and does not wire the Lambda.** `feature/gg-tts` commits a live
`GOOGLE_TTS_API_KEY` into `.env` (a tracked file) — rotate it, do not merge it as-is. It also never
sets the Lambda env var or the Secrets Manager IAM grant, so the handler code on its own throws
`Google TTS credentials not configured` in the cloud. Both are covered just above.

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

- The exact four languages and the Polly voice for Korean / Spanish / French (male/female, standard
  vs neural — `Engine` is hardcoded to `'standard'` at `translate-audio/handler.ts:24`; neural
  voices sound better and cost more).
- The Google Cloud TTS voice for Thai — `th-TH-Neural2-C` vs `th-TH-Standard-A` vs a Chirp3-HD voice
  (quality vs cost), and male or female.
- The GCP project + service account for Google Cloud TTS: Cloud Text-to-Speech API enabled, billing
  on, and where the JSON key lives per environment (Secrets Manager secret name for prod, deploy
  env var for dev).
- That routing Thai audio through Google (extra network hop on every Thai segment + a separate GCP
  bill, per character) is acceptable — or whether Thai should ship as **subtitle text only, no
  audio** as a first cut.
- Whether the UI labels for the new languages are needed in Japanese only, or in every UI language.
- Whether all languages are offered on every tour, or per tour (the tour record already carries
  `useTheTranslationFunction`, `TourForm.js:216-220`).

## Effort

| Part | Estimate |
|---|---|
| First time: dynamic fan-out list, voice-map cleanup, checking service support | 1〜1.5人日 |
| Per language after that (menu, tag, voice, one round of listening) | 0.5人日 |
| Google Cloud TTS route for Thai: handler wiring + Lambda env var + Secrets Manager IAM + a round of listening | +1人日 |

Matches the document for KO/ES/FR. Thai adds ~1人日 for the Google Cloud TTS path — the handler
code is mostly done on `feature/gg-tts`, so most of that is credential wiring and testing. Fixing
`selectLanguage` (above) adds ~0.5人日 and is recommended alongside.

## Verification

| # | Case | Expected |
|---|---|---|
| 1 | Korean / Spanish / French selected before joining | Polly audio plays, subtitle text matches |
| 2 | Thai selected before joining | Google Cloud TTS audio plays, Thai subtitle matches |
| 3 | Japanese selected | still the live guide audio, no translated audio queued (`MultiLangAudio.js:702-705`) |
| 4 | Two listeners on different languages (incl. one on Thai) | each hears only their own |
| 5 | Nobody on language X | no Translate / Polly / Google TTS call for X in the lambda log |
| 6 | Language changed mid-session | the new language starts within one segment |
| 7 | Google TTS credentials missing or invalid | handler logs a clear error; the other languages still play; the Thai listener gets subtitle text, not a hang |
| 8 | A language with no Polly voice and no Google route | falls back gracefully instead of a silent listener |
