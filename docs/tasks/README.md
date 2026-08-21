# Task notes — feedback of 2026/5/5

One note per item of `feedback_response_実施項目.docx` (16 items, received 2026/5/5). Each note
takes the answer already given to the customer and checks it against the code: what exists today,
what has to change in the frontend and in `amplify/`, what still has to be decided, and how to
verify it.

Estimates are the ones quoted in the document, confirmed or corrected here.

| # | Task | Answer given | Estimate |
|---|---|---|---|
| 5 | [Connection count by role](05-connection-count-by-role.md) | 対応可能（表示の追加） | 1〜1.5人日 |
| 10 | [More audio-translation languages](10-add-audio-translation-languages.md) | 対応可能（言語の追加） | 初回1〜1.5＋0.5人日/言語 |
| 13 | [Chat translation](13-chat-translation.md) | 新規開発で対応可 | 2〜3人日 |
| 15 | [QR print and PDF](15-qr-print-and-pdf.md) | 対応可能 | 印刷0.5・PDF1〜1.5人日 |
| 12 | [Free spoken / listening language](12-free-source-and-listening-language.md) | 設計変更が必要 | 5〜8人日＋検証 |

Suggested order: **5 → 15 → 10 → 13 → 12**. Items 5 and 15 are self-contained; 10 makes the
translation fan-out dynamic, which 12 depends on; 13 only shares the Translate service with the
others and can move independently.

Bug reports for the same product live in [`../report/`](../report/).
