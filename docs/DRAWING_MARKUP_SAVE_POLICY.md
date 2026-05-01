# Drawing Markup Save Policy

## 1. Current State

- B-8-5 connects `DrawingMarkingOverlay` to the worklog media flow as preview-only UI.
- `WorklogDrawingMarkupPreviewEditor` owns local `marks` state and passes changes through `onPreviewMarksChange`.
- `src/app/(app)/worklog/page.tsx` stores preview edits in `previewDrawingMarks`, keyed by attachment id.
- `buildWorklogPayload()` still builds `media_info` from uploaded `mediaAttachments`; preview-only marks are not mixed into the worklog save payload.
- `WorklogMediaInfoItem` already has optional `marks?: DrawingMarkupMark[]`, but the current preview-only editor does not persist into that field.
- Existing preview/export supports `brush`, `polygon-area`, `line`, `arrow`, `rectangle`, `ellipse`, and `text`.
- No `drawing_markups` table currently exists. The database has existing `drawings`, `daily_logs.media_info`, and `documents` structures.
- Photo sheet final-save already provides a useful pattern: pre-check locked/approved documents, store PDF in Storage, create/update `documents`, and avoid overwriting final records.

## 2. Save Candidate Comparison

| Candidate | Summary | Advantages | Disadvantages | RLS Difficulty | Partner Exposure Risk | Offline Support | Approval/Lock Fit | PDF/CSV Fit | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Store marks inside worklog `media_info` | Add marks directly to each drawing attachment in `daily_logs.media_info.attachments[]`. | Minimal schema work; close to existing preview mapper; simple draft restore. | Couples mutable markup to worklog save; hard to approve/lock per drawing; accidental partner exposure through worklog/media reads; JSON updates are coarse. | Medium | Medium to high | Good for drafts, weak for final | Acceptable for preview, weak for audit | Not recommended as final source of truth |
| B. Separate `drawing_markups` table | Store each drawing page/attachment markup in dedicated rows with `markup_json`. | Clear ownership, auditability, per-page status, RLS control, lock protection; works with document registration. | Requires migration/RLS/API work; more joining/mapping code. | Medium to high | Low if RLS is strict | Good with local draft staging | Strong | Recommended |
| C. Documents-centered `source_type='drawing_markup'` | Treat approved drawing markup as a `documents` row first, with file/storage metadata. | Reuses documents, partner filters, admin approval patterns, locked/final visibility. | Documents table is not ideal for mutable mark JSON; draft editing needs another backing store. | Medium | Low after approval/locked policy | Weak for active draft editing | Strong after final export | Recommended as final publication layer, not draft source |
| D. Local draft then document registration on approval | Keep mark edits local/offline first; persist/register only during approval/finalization. | Safe for preview-only UX; avoids premature DB writes; good offline behavior. | Risk of losing work before explicit save; cannot support cross-device drafts unless later persisted. | Low initially | Very low | Strong local-only | Good after promotion | Recommended as phase 1 behavior combined with B/C |

## 3. Recommended Architecture

Use a hybrid policy:

1. Draft editing starts local-only or in a future `drawing_markups` draft row.
2. `daily_logs.media_info` should keep drawing attachment metadata and, at most, a stable reference id such as `drawing_markup_id`; it should not be the final mark source of truth.
3. Original mark data is stored in `drawing_markups.markup_json`.
4. Before approval, access is limited to worker/site_manager/admin paths for the relevant site/worklog.
5. Approval/finalization creates or updates a `documents` row with `source_type='drawing_markup'` and `category='도면마킹'`.
6. Partner users see only approved/locked document records and only through read-only viewers.
7. Approved or locked drawing markup documents must never be overwritten by draft saves.

This keeps draft UX flexible while letting final records reuse the existing documents approval/partner visibility model.

## 4. Proposed State Model

Statuses:

- `draft`: editable by owner/authorized site roles.
- `pending`: submitted for review.
- `approved`: accepted for document publication.
- `rejected`: returned with reason.
- `locked`: final record, read-only.
- `archived`: hidden from normal active lists but kept for audit.

Field candidates:

| Field | Purpose |
| --- | --- |
| `id` | Primary key |
| `site_id` | Site scope for RLS and filtering |
| `worklog_id` | Optional source daily log id |
| `attachment_id` | Worklog media attachment id |
| `page_no` | Drawing page number |
| `original_path` | Original drawing Storage path |
| `marked_path` | Final rendered marked drawing/PDF path |
| `markup_json` | Canonical `DrawingMarkupMark[]` plus metadata |
| `status` | Draft lifecycle state |
| `approval_status` | Documents-compatible approval state |
| `approved_by`, `approved_at` | Approval metadata |
| `rejected_by`, `rejected_at` | Rejection metadata |
| `locked_by`, `locked_at` | Final/locked metadata |
| `created_by`, `updated_by` | Authorship/audit metadata |
| `created_at`, `updated_at` | Timestamps |

## 5. RLS Principles

- `worker`: can create and update own draft markups for assigned/accessible sites; cannot update approved/locked records.
- `site_manager`: can read site markups and review/approve markups for assigned sites.
- `admin`: can read/manage all drawing markups and documents.
- `partner`: no direct draft table access; can only read approved/locked `documents` rows through existing document visibility rules.
- `production_manager`: no default access unless a future production workflow explicitly requires it.

RLS should check both role and site scope. Final/locked rows should reject update/delete from normal client flows.

## 6. Documents Registration Policy

- Create a `documents` row when a drawing markup is approved or locked, not at first draft edit.
- Use:
  - `source_type='drawing_markup'`
  - `category='도면마킹'`
  - `source_id=<drawing_markups.id>`
  - `approval_status='approved'` once approved
  - `locked_at` when final
- Prefer `storage_bucket`/`storage_path` for the generated PDF or final marked image. Keep `file_url` only as compatibility fallback if required by existing viewers.
- Consider `document_versions` when a final document can be regenerated; otherwise first implementation can register a single immutable final document.
- Before uploading generated output, check for existing approved/locked documents by `source_type/source_id` to avoid overwrites.

## 7. PDF/CSV Export Policy

- Draft preview export is local-only and should not create documents.
- Approved/locked export should use the document record as the canonical source.
- CSV should include at least:
  - `page_no`
  - `mark_type`
  - `label`
  - `area_m2`
  - `area_pyeong`
  - `created_by`
- PDF should render the original drawing plus overlay marks from `markup_json`.
- Export must preserve all supported mark types: `brush`, `polygon-area`, `line`, `arrow`, `rectangle`, `ellipse`, and `text`.

## 8. Offline and Local Draft Policy

- Keep current preview-only state local until a formal save action is added.
- For offline-capable draft save, use a dedicated local draft shape keyed by `site_id`, `worklog_id` or work date, and `attachment_id`.
- Do not push local drafts into `daily_logs.media_info` automatically.
- Sync should create/update only draft `drawing_markups` rows and must fail fast if the remote row is approved or locked.
- Local draft conflicts should prefer preserving both copies over overwriting final server data.

## 9. Final/Locked Overwrite Prevention

- Any save path must pre-check `approval_status` and `locked_at`.
- If a matching markup or document is approved/locked, client save must stop before Storage upload or DB mutation.
- Draft saves must never reset approved/locked records to draft.
- Regeneration of final PDF/CSV must create a new version or require an explicit admin-only unlock/version action.

## 10. Implementation PR Order

1. A-core or A-security PR: Supabase migration, indexes, RLS, and optional audit/version policy for `drawing_markups`.
2. B-side contract PR: typed lib/hook layer for loading and saving draft markups without UI expansion.
3. Worklog PR: connect preview editor to draft save/load only.
4. Admin/SiteManager PR: review, approve, reject, and lock UI.
5. Partner PR: read-only viewer through approved/locked documents.
6. Export PR: final PDF/CSV generation, Storage save, and documents registration.

## 11. Non-Goals for This Document PR

- No app code changes.
- No Supabase migration.
- No RLS/RPC implementation.
- No Storage upload implementation.
- No PreviewCenter, BottomNav, global CSS, design token, route access, or navigation changes.
