# Drawing Markup Multipage and Area Calculation Design

## 1. Purpose

This document defines the design boundary for future drawing markup multipage support, area calculation, and later export/document publication flows.

The current drawing markup editor already supports core mark creation, color and stroke width selection, undo/redo/clear all, and stable text input. This PR does not add implementation. It records the intended contracts so the next work can be split safely across UI, data, export, and approval/document publication PRs.

## 2. Current Baseline

- `DrawingMarkingOverlay` renders and edits marks for one active drawing preview surface.
- Supported mark types are `brush`, `line`, `arrow`, `rectangle`, `ellipse`, `text`, and `polygon-area`.
- `polygon-area` currently behaves as an overlay mark type, not as a calibrated measurement system.
- PDF preview can render a selected page through `PdfCanvasPreview`.
- Existing mark coordinates are normalized from `0` to `1` within the visible page surface.
- Draft save/readback and approval/lock policy are designed separately from this document.
- `daily_logs.media_info` should remain attachment metadata and should not become the final source of truth for drawing markup data.
- Final document publication, Storage export, and partner visibility remain separate future phases.

## 3. Goals

The future multipage and area work should support:

- editing marks per PDF page without mixing page state;
- preserving page number with every saved markup record or page mark group;
- calculating polygon area only after a clear scale/calibration contract exists;
- showing page-level area summaries in preview/review surfaces;
- keeping draft editing separate from final document publication;
- preparing a path for later PDF/CSV export without implementing export in the first PR;
- preventing approved or locked markup records from being overwritten by page edits.

## 4. Non-Goals for This Document PR

This design PR does not implement:

- app code changes;
- editor UI changes;
- Supabase migration, RLS, or RPC changes;
- Storage upload or generated marked PDF creation;
- `documents` or `document_versions` registration;
- partner-facing publication;
- approval, review, or lock behavior changes;
- worklog payload structure changes;
- PreviewCenter, BottomNav, route access, navigation, global CSS, or design token changes.

## 5. Recommended Data Shape

Future implementations should keep marks grouped by page. Two compatible shapes are acceptable depending on the selected persistence layer.

### 5.1 Row Per Page

One `drawing_markups` row represents one drawing attachment page.

| Field | Purpose |
| --- | --- |
| `site_id` | Site scope for RLS and filtering |
| `worklog_id` | Optional source daily log id |
| `attachment_id` | Stable source attachment id |
| `page_no` | One-based PDF page number |
| `markup_json` | `DrawingMarkupMark[]` for the page |
| `scale_json` | Optional calibration metadata |
| `area_summary_json` | Optional derived measurement summary |
| `status` | Draft/review/final lifecycle |
| `approval_status` | Approval-compatible status |

This shape makes page locking, page review, and page export straightforward, but creates more rows for multipage PDFs.

### 5.2 Row Per Attachment

One `drawing_markups` row represents a drawing attachment and stores page groups.

```ts
type DrawingMarkupPageGroup = {
  pageNo: number
  marks: DrawingMarkupMark[]
  scale?: DrawingMarkupScale
  areaSummary?: DrawingMarkupAreaSummary
}
```

This shape reduces row count but makes partial page updates, page-level locking, and conflict handling more complex.

Recommendation: use row-per-page for server persistence unless a later data-layer review finds a strong reason to group pages in one row.

## 6. Page Navigation Contract

The future editor should treat page navigation as a state boundary:

- changing pages must save or preserve the current page draft before loading another page;
- marks from page 1 must not render on page 2 unless explicitly copied;
- undo/redo history should be scoped to the current page;
- clear all should clear only the current page unless the UI explicitly offers a full-document action;
- read-only state should apply from the page or parent record lifecycle;
- PDF page count should be loaded from the PDF renderer layer, not guessed from file metadata.

The first implementation should prefer a simple page selector with previous/next controls and a visible current page count.

## 7. Area Calculation Contract

Area calculation must not infer real-world area from normalized coordinates without calibration.

Required inputs:

| Input | Purpose |
| --- | --- |
| polygon points | Normalized page coordinates from `polygon-area` marks |
| page size | Render/page coordinate basis |
| scale method | How normalized drawing units become real-world units |
| unit | `m2`, `pyeong`, or both |

Recommended calibration options:

1. Manual scale ratio: user enters real-world length per drawing unit.
2. Reference segment: user draws or selects a known-length line and enters the real length.
3. Document metadata: use known drawing scale only if reliable metadata exists.

The first area implementation should use an explicit manual or reference calibration step. If no scale exists, the UI may show uncalibrated polygon count or page coverage, but must not label it as square meters.

## 8. Area Formula

For polygon marks, calculate the raw page-space area with the shoelace formula:

```txt
area = abs(sum(x_i * y_next - x_next * y_i)) / 2
```

Because current points are normalized, the raw area is a page-relative value. It becomes real-world area only after multiplying by calibrated width and height scale factors.

Recommended derived fields:

| Field | Meaning |
| --- | --- |
| `rawNormalizedArea` | Area in normalized page coordinate space |
| `areaM2` | Calibrated square meters |
| `areaPyeong` | `areaM2 / 3.305785` |
| `calibrationId` | Scale reference used for the result |
| `calculatedAt` | Timestamp for derived summary |

Derived area should be recalculated from marks and scale when rendering summaries. Persisted summaries can be cached for review/export, but marks plus scale should remain the source of truth.

## 9. Scale Metadata

Suggested scale metadata:

```ts
type DrawingMarkupScale = {
  mode: 'manual-ratio' | 'reference-line'
  unit: 'm' | 'mm'
  pageNo: number
  ratio?: {
    metersPerNormalizedX: number
    metersPerNormalizedY: number
  }
  referenceLine?: {
    start: DrawingMarkupPoint
    end: DrawingMarkupPoint
    realLengthMeters: number
  }
}
```

If a reference line is used, the implementation must define whether the same scale applies to one page or all pages in the attachment. The safer default is page-only scale unless the user explicitly applies it to all pages.

## 10. Area Summary UI Boundary

Future UI should show measurement summaries without turning the editor into a reporting tool too early.

Recommended first UI:

- per-page total calibrated area;
- per-polygon label or index;
- optional square meter and pyeong display;
- clear "uncalibrated" state when scale is missing;
- no automatic document registration from area summary calculation.

The editor should continue to save mark data through the drawing markup contract, not through worklog payload mutation.

## 11. Export and Documents Boundary

Export and document registration should remain a later PR after multipage editing and area summaries are stable.

Future export should:

- render all selected pages with their own marks;
- include text, brush, line, arrow, rectangle, ellipse, and polygon-area marks;
- include area summaries only when calibrated;
- generate CSV rows per page and per polygon;
- upload generated output to Storage only in the export/publication PR;
- register `documents` only in the document publication PR;
- avoid exposing draft or pending records to partner users.

## 12. Approval and Lock Interaction

Multipage editing must respect the existing approval/lock direction:

- draft pages are editable by authorized editor flows;
- pending pages should render read-only in worker editor flows;
- approved and locked pages must not be overwritten by draft saves;
- page-level edits must not downgrade an attachment or document from approved/locked to draft;
- lock behavior should be defined before final export regeneration is allowed.

If the persistence model stores one row per page, lock checks can be page-specific. If it stores one row per attachment, lock checks should apply to the entire page group unless a later design introduces page-level status.

## 13. Suggested Implementation Order

1. Data contract PR: choose row-per-page or row-per-attachment shape and add typed helpers only.
2. UI state PR: add page navigation and page-scoped mark state without persistence expansion.
3. Draft persistence PR: save/load marks per page through the drawing markup lib/hook layer.
4. Calibration PR: add explicit scale metadata and uncalibrated/calibrated states.
5. Area summary PR: calculate and display page and polygon summaries.
6. Review PR: confirm pending/approved/locked multipage records render read-only.
7. Export PR: generate multipage marked PDF and CSV.
8. Documents PR: register approved/locked generated output for document workflows.
9. Partner PR: expose only approved/locked published documents through read-only views.

## 14. QA Checklist for Future Implementation

| Scenario | Expected Result |
| --- | --- |
| open multipage PDF | page selector shows available pages |
| draw on page 1 then page 2 | marks remain scoped to their page |
| undo on page 2 | only page 2 history changes |
| clear all on page 2 | only page 2 marks clear |
| return to page 1 | page 1 marks are preserved |
| polygon without scale | area is shown as uncalibrated or hidden |
| add calibration | calibrated area appears for supported polygons |
| change calibration | summaries recalculate |
| save draft | page marks persist without worklog payload mutation |
| reopen draft | each page restores its own marks |
| pending/approved/locked record | editor is read-only |
| export future final PDF | all selected pages render their own marks |
| partner access before publication | no draft or pending exposure |

## 15. Open Questions

- Should calibration be stored per page, per attachment, or both?
- Should a reference line be a normal mark type, a hidden scale object, or a special calibration overlay?
- Should page-level approval be allowed, or should the whole attachment move through review together?
- Should area labels be editable text marks or generated summary labels?
- Should CSV export include every polygon vertex, or only summary rows?
- Should pyeong display be always shown for Korean users, or controlled by a unit setting?
