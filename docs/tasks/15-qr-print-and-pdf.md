# Task #15 — Print the QR code and export it as PDF

**Source:** `feedback_response_実施項目.docx`, item 15 — 【ご要望】QRコードを印刷・PDF化したい
**Answer given:** 対応可能 · **estimate in the document:** 小 / 印刷0.5人日・PDF1〜1.5人日

## The request

Today the QR code can only be downloaded as a PNG. The customer wants to print it and to save it
as a PDF — presumably to hand out or to post inside the bus.

## Where the QR codes are today

| Screen | Code | What it encodes | What you can do with it |
|---|---|---|---|
| Admin, tour register/update | `admin/tours/GenerateQRCode.js:39-44` (`QRCodeCanvas`, 128px) | the **guide** URL, `Config.appGuideURL()/tourId` (`:14`) | PNG download (`:25-33`), copy the URL (`:17-23`) |
| Guide screen header popup | `common/Header.js:91` (`QRCodeSVG`, 256px, `level="H"`) | the **listener** or **sub-guide** URL (`:41`) | nothing — display only |

`package.json` has `qrcode.react@^4.0.1` and **no PDF library** (no jsPDF, no html2canvas).

## Plan — print first, PDF second

**Step 1 — printing (0.5人日, no new dependency).**

A print-only block plus `@media print` CSS and a 印刷 button calling `window.print()`:

- the tour name, the QR at ~40 mm, and the URL as text underneath (so a phone that cannot scan can
  still type it),
- a caption saying which QR it is (お客様用 / サブガイド用),
- everything else on the page hidden by the print stylesheet.

This also covers most of the PDF request at zero extra cost: every desktop browser's print dialog
offers "Save as PDF", and iOS Safari's print preview does the same through the share sheet.

**Step 2 — a real PDF file (brings the total to 1〜1.5人日).**

Only worth it if the layout has to be fixed — A4 with a logo, both QRs on one sheet, or several
copies per page for cutting up. That needs jsPDF (~330 KB) plus the QR as a PNG data URL from a
hidden `QRCodeCanvas` (`toDataURL`, the same call `GenerateQRCode.js:26` already makes).

> **The hidden cost of step 2 is Japanese text.** jsPDF's built-in fonts have no Japanese glyphs —
> a tour name in Japanese comes out blank or as boxes. It needs an embedded font (a subset of Noto
> Sans JP, for example), which is most of the difference between the 0.5人日 and the 1.5人日. If the
> PDF only has to carry the QR and an ASCII URL, this disappears; if it carries ツアー名, it does not.

## Details that matter for a scannable print

- Keep `level="H"` (already used in `Header.js:91`) — it survives a fold or a coffee ring.
- Print at 2 cm or more, black on white, with the 4-module quiet zone the library already leaves.
  Do not put the QR on a coloured panel; the header colours only the frame today
  (`Header.js:53`, `:64`), and that must stay true on paper.
- `QRCodeSVG` scales for print; `QRCodeCanvas` is what jsPDF needs. If both routes are built, render
  the SVG for the page and a hidden canvas for the PDF.

## To confirm before building

- **Which QR, on which screen.** The admin screen currently shows the *guide* URL, while the thing
  worth printing for customers is the *listener* URL — which is only on the guide screen today
  (`Header.js:41`). Printing for guests probably means adding the listener QR to the admin screen.
- Whether one sheet should carry both the listener and sub-guide QR, or one each.
- What else belongs on the sheet: tour name, date, a line of instructions, a logo.
- Paper size and how many per page.

## Effort

| Part | Estimate |
|---|---|
| Print layout, `@media print` CSS, button, labels | 0.5人日 |
| jsPDF sheet (only if a fixed layout is required) | +0.5人日, +0.5人日 if Japanese text must be embedded |
| Verification incl. a real print and a scan test | 0.25人日 |

Matches the 印刷0.5 / PDF1〜1.5人日 in the document.

## Verification

| # | Case | Expected |
|---|---|---|
| 1 | Print from Chrome on Windows | one page, QR ≥2 cm, URL legible |
| 2 | Print from Safari on iOS | the same layout through the share sheet |
| 3 | "Save as PDF" from the print dialog | opens correctly, QR still scans |
| 4 | Scan the printed sheet from ~30 cm | lands on the right screen for the right tour |
| 5 | Japanese tour name | renders in both print and PDF (see the font note) |
| 6 | The existing PNG download | unchanged |
