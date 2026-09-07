# PDF Parsing

## Scenario: Parse text-layer resume PDFs

### 1. Scope / Trigger

Use this contract whenever resume upload, reparse, manual correction, or downstream analysis changes PDF-derived text or `structured_content`. The parser supports text-layer PDFs only; OCR and non-PDF inputs are outside this boundary.

### 2. Signatures

- `parsePdfDocument(bytes: Uint8Array): Promise<ParsedDocument>` extracts page/block layout or throws `PdfParseError`.
- `parseResumePdf(bytes: Uint8Array)` returns `{ totalPages, text, document, structuredContent }`.
- `discoverResumeSections(document: ParsedDocument): ResumeSection[]` finds sections from layout, not title vocabulary.
- `enhanceResumeStructure(document, fallback)` may refine ambiguous sections with AI and must return `fallback` on any invalid model result.
- Upload/reparse failures return HTTP 422 with `code: "encrypted" | "invalid" | "insufficient_text"` when classified.

### 3. Contracts

- Every content block has a stable ID, page number, bounding box, style, column and original text.
- A section preserves `title`, `originalTitle`, optional `normalizedKind`, `items`, and ordered `sourceBlockIds`.
- Title aliases may set `normalizedKind`; they must never decide whether a section exists.
- AI output is a partition of existing content block IDs: every ID exactly once, original order preserved, and `titleBlockId` first in its section.
- Parser metadata lives inside `structured_content.document`; existing `parsed_text`, `sections`, version and private-PDF contracts remain readable.
- Manual corrections retain legacy parser v4 display compatibility and set `quality.manually_corrected` for current results.

### 4. Validation & Error Matrix

- Missing/invalid PDF structure -> `PdfParseError("invalid")` -> HTTP 422.
- Password-protected/encrypted PDF -> `PdfParseError("encrypted")` -> HTTP 422.
- Too little usable text, including scanning-only PDFs -> `PdfParseError("insufficient_text")` -> HTTP 422 with no empty resume document created.
- AI timeout, invalid JSON, unknown/duplicate/reordered/omitted block ID -> discard AI output and return local layout result.
- Low extraction quality -> AI must not raise quality above the extraction layer's quality.

### 5. Good/Base/Bad Cases

- Good: a two-column English resume is read column-by-column; custom headings retain their original text.
- Base: a resume without obvious headings returns complete text in locally discovered or unnamed sections, with a quality warning.
- Bad: a three-column table is treated as two document columns and reordered; prevent this with table-shape detection.
- Bad: a large name/job-title pair at the top becomes a resume section; heading discovery must protect the document intro.

### 6. Tests Required

- Unit-test single/two-column ordering, multi-column tables, repeated headers/footers, page numbers and cross-page text.
- Unit-test Chinese, English, custom headings, no-heading fallback, intro name/title protection and line preservation.
- Unit-test `encrypted`, `invalid` and `insufficient_text` classification.
- Unit-test AI block completeness, uniqueness, order, title-first validation, prompt escaping and fallback.
- Keep upload, reparse, storage, manual-correction and rendered source contracts passing.

### 7. Wrong vs Correct

#### Wrong

```ts
if (KNOWN_SECTION_NAMES.includes(line.text)) startSection(line.text);
```

This loses unknown headings and couples document extraction to resume semantics.

#### Correct

```ts
if (layoutHeadingScore(block, dominantBodyStyle) >= threshold) {
  startSection({ originalTitle: block.text, normalizedKind: optionalHint(block.text) });
}
```

Layout discovers the section; vocabulary only adds an optional semantic hint.
