# Task #5 — Show the connection count by role (main guide / sub-guide / listener)

**Source:** `feedback_response_実施項目.docx`, item 5 — 【ご要望】接続数を役割別（メイン・サブ・リスナー）に表示したい
**Answer given:** 対応可能（表示の追加） · **estimate in the document:** 中 / 1〜1.5人日

## The request

The header shows one participant number. The customer wants it split into main guide,
sub-guide and listeners.

## The answer in the document is accurate

「内部では役割別に集計済みのため、表示を追加するだけで実現できます」 — and the code agrees.
`updateConnectionHistoryAndBroadcast` already computes the three numbers:

```ts
const connectionCount = connections.length;
const guideCount    = connections.filter(c => c.userType === 'Guide').length;
const subGuideCount = connections.filter(c => c.userType === 'Sub-Guide').length;
const userCount     = connections.filter(c => c.userType === 'User').length;
```

`amplify/functions/translates/translate-text-speech-socket/common/connectionUtils.ts:25-28`.
All four are written to the `CONNECTION_HISTORY` table (`:31-45`) — but the message pushed to the
browsers carries only the total (`:51-55`):

```ts
const message = { type: 'connectionUpdate', tourId, connectionCount };
```

So the breakdown exists on the server and is thrown away one line before it is sent.

## The path the number takes today

| Step | Where |
|---|---|
| Every screen opens the WebSocket and announces `{ tourId, languageCode, userType }` | `src/hooks/useConnectWebSocket.js:26-33` |
| The connection row is stored with its `userType` | `.../connect-state/handler.ts:22-34` |
| The rows are recounted and `connectionUpdate` is broadcast | `.../common/connectionUtils.ts:14-79` |
| The browser reads `message.connectionCount` | `src/hooks/useConnectWebSocket.js:53-59` |
| …and puts it in `participantsCount` | `StartLiveSession.js:879`, `LiveSubSpeaker.js:885`, `JapaneseAudio.js:438`, `MultiLangAudio.js:496` |
| `Header` renders `<Participants count={count} />` — one icon, one number | `Header.js:46`, `Participants.js:11-14` |

The roles are `Guide`, `Sub-Guide` and `User` (`StartLiveSession.js:126`, `LiveSubSpeaker.js:324`,
`MultiLangAudio.js:79`), the same three values the backend filters on.

## What to change

**Backend — one line.** Add the three counts to the broadcast message
(`connectionUtils.ts:51-55`):

```ts
const message = { type: 'connectionUpdate', tourId, connectionCount, guideCount, subGuideCount, userCount };
```

Nothing else on the server moves: the numbers are already in scope.

**Frontend.**

1. `useConnectWebSocket.js:53-59` — hand the whole message (or `{ total, guide, subGuide, listener }`)
   to `onConnectionUpdate` instead of only `message.connectionCount`. Keep it tolerant: if the
   role fields are missing (an older deployment), fall back to showing the total alone.
2. The four call sites keep one state object instead of a number.
3. `Participants.js` — render the breakdown. Three small groups next to the existing icon, or the
   total with the breakdown under it; the component is 17 lines, so this is where the work is.
4. Labels go in `src/locales/en/translation.json` and `src/locales/ja/translation.json`
   (メインガイド / サブガイド / お客様).

**Not in scope but worth knowing:** `LiveViewerJa.js:281` does not use the WebSocket number at all —
it counts Chime attendees (`attendeeSet.size`). The same code is present but commented out on the
other screens (`StartLiveSession.js:924`, `MultiLangAudio.js:353`, `JapaneseAudio.js:324`). If the
`/viewer_ja` screen is also meant to show the breakdown, it needs the WebSocket source instead —
attendee presence carries the role in `externalUserId` (`"Guide|1786951626999"`, parsed already by
`src/utils/meetingHealth.js:135-138`), so either source can produce it, but mixing the two on one
screen would show two different numbers.

## To confirm before building

- **Who sees the breakdown?** Recommended: the guide and sub-guide screens; listeners keep the
  single total. Showing listeners the guide count exposes staffing to customers.
- **Does the count include yourself?** Today the total does. Decide whether "メインガイド: 1" is
  the person reading the screen or someone else.
- **Wording in Japanese** — メイン / サブ / お客様 vs ガイド / サブガイド / リスナー.

## Effort

| Part | Estimate |
|---|---|
| Backend field + deploy | 0.25人日 |
| Frontend state, component, labels | 0.5〜0.75人日 |
| Verification on three device types | 0.25〜0.5人日 |

Matches the 1〜1.5人日 in the document.

## Verification

| # | Case | Expected |
|---|---|---|
| 1 | Guide alone | `guide 1 · sub 0 · listener 0` |
| 2 | Guide + sub-guide + 2 listeners | `1 / 1 / 2`, total 4 |
| 3 | A listener closes the tab | the listener count drops on every other screen within one broadcast |
| 4 | A listener switches language | the counts do not change |
| 5 | Older backend still deployed | the UI shows the total only, no crash |
| 6 | `/viewer_ja` | the number shown there agrees with the guide screen |
