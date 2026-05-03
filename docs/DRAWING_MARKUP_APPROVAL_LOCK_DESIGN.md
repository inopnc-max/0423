# Drawing Markup Approval and Lock Flow Design

## 1. Purpose

This document defines the next implementation boundary for drawing markup review, approval, rejection, and final lock flows.

The editor v1 stabilization and draft save/readback path already established the worker-side entry point. This design keeps the remaining approval work separate from editor E2E refinements and avoids introducing app code, migration, RLS, Storage, or document publication changes in this PR.

## 2. Current Baseline

- PR #154 stabilized the drawing markup editor v1.
- `drawing_markups` draft save, readback, and submit-for-review contracts exist in `src/lib/drawing-markup-records.ts` and the related hook.
- `WorklogDrawingMarkupPreviewEditor` can move a saved draft to `pending` through `submitForReview`.
- Pending, approved, and locked records are treated as read-only by the editor.
- `daily_logs.media_info` remains attachment metadata only. Drawing marks are not written into the worklog payload.
- Draft drawing markups are not registered into `documents` or `document_versions`.
- Partner exposure is still expected to happen only after approved/locked document publication.

## 3. Scope of the Future Approval/Lock PR

The future implementation should add an admin/site-manager review surface that can:

- list drawing markup records awaiting review;
- open a read-only preview of the submitted markup;
- approve a pending drawing markup;
- reject a pending drawing markup with an optional reason;
- lock an approved drawing markup as a final record;
- prevent draft saves from overwriting pending, approved, or locked rows;
- keep document publication separate unless that PR explicitly owns document registration.

The first implementation should prioritize completing review state transitions safely before adding export, partner publication, or document versioning.

## 4. Non-Goals

This design PR does not implement:

- app code changes;
- Supabase migration, RLS, or RPC changes;
- Storage upload or generated PDF/image save;
- `documents` or `document_versions` registration;
- PreviewCenter integration changes;
- BottomNav, route access, navigation, global CSS, or design token changes;
- partner-facing document visibility changes.

## 5. Roles and Permissions

| Role | Expected Capability | Boundary |
| --- | --- | --- |
| worker | Create and edit own draft, submit for review | Cannot edit pending, approved, or locked rows |
| site_manager | Review markups for assigned sites | Cannot access unrelated sites |
| admin | Review and manage all drawing markups | Can approve/reject/lock across sites |
| partner | No direct draft table access | Sees only approved/locked documents after publication |
| production_manager | No drawing markup approval access by default | Future production use must be designed separately |

All review actions must preserve site scope. A site manager approval flow should derive allowed sites from the same site-manager access model used by worklog approval and worker panels.

## 6. State Model

Drawing markup records already use two state fields:

| Field | Values | Meaning |
| --- | --- | --- |
| `status` | `draft`, `pending`, `approved`, `rejected`, `locked`, `archived` | Lifecycle state for the drawing markup row |
| `approval_status` | `draft`, `pending`, `approved`, `rejected` | Approval-compatible state for review UI and future document publication |

Recommended transitions:

| From | Action | To | Actor |
| --- | --- | --- | --- |
| `draft` | submit for review | `pending` / `pending` | worker/admin editor |
| `pending` | approve | `approved` / `approved` | admin or assigned site_manager |
| `pending` | reject | `rejected` / `rejected` | admin or assigned site_manager |
| `rejected` | revise and resubmit | `pending` / `pending` | original creator or authorized editor |
| `approved` | lock final | `locked` / `approved` | admin, or site_manager if allowed |
| `locked` | normal edit/save | blocked | all normal client flows |

The `locked` lifecycle state should keep `approval_status='approved'` so downstream document visibility can treat final locked records as approved.

## 7. Approval Action Contracts

Future lib/hook methods should be explicit and role-aware:

| Method | Input | Output | Notes |
| --- | --- | --- | --- |
| `listDrawingMarkupReviewQueue` | role context, site scope, filters | records | Must filter by site scope and status |
| `approveDrawingMarkup` | id, actor id | updated record | Sets `status='approved'`, `approval_status='approved'`, `approved_by`, `approved_at` |
| `rejectDrawingMarkup` | id, actor id, reason | updated record | Sets `status='rejected'`, `approval_status='rejected'`, `rejected_by`, `rejected_at` |
| `lockDrawingMarkup` | id, actor id | updated record | Sets `status='locked'`, `locked_by`, `locked_at`; keeps approved metadata |

Approval and lock operations must be implemented in the lib/hook layer, not by direct Supabase calls inside UI components.

## 8. Review UI Placement

Preferred first review surface:

- admin path: `/admin/worklogs` or a dedicated admin drawing markup panel if the existing worklog approval page becomes too dense;
- site manager path: reuse the site manager approval area if the record can be scoped to assigned sites;
- row-level preview: read-only drawing markup preview with status, site, worklog/date, attachment name, requester, and submitted timestamp.

The first UI should avoid partner publication, export, and document registration controls. It should focus on approving or rejecting pending markups and locking approved markups if lock is included in the same PR.

## 9. Read-Only Preview Rules

Any review preview should:

- render `markup_json` over the original drawing/PDF preview;
- disable all drawing tools;
- hide draft save controls;
- show status and approval metadata;
- show rejection reason if available in a future field;
- avoid mutating `daily_logs.media_info`.

If the original file cannot be loaded, the review UI should still display record metadata and a clear preview error state without changing the record.

## 10. Document Publication Boundary

Approval/lock and document publication are related but should remain separate unless explicitly owned by a later PR.

Recommended boundary:

1. Approval PR updates `drawing_markups` state only.
2. Publication PR renders final output, uploads generated file to Storage, and creates or updates `documents`.
3. Partner visibility starts only after the publication PR creates an approved/locked document record.

This avoids accidentally exposing drafts or pending markups to partner users.

## 11. RLS and Security Requirements

When implementation reaches Supabase policy work:

- enable strict site-scoped policies for `drawing_markups`;
- allow workers to update only editable drafts they created;
- allow site managers to read/review only assigned site records;
- allow admins to manage all records;
- block normal client updates to `locked` rows;
- keep partner users out of the draft table;
- make sure UPDATE policies include the SELECT access required by Postgres RLS.

Any RLS issue found during E2E should be split into an A-core or A-security hotfix, not patched inside B-side UI work.

## 12. Audit and Metadata

Approval and lock actions should preserve:

- actor id;
- action timestamp;
- previous and next state where possible;
- optional rejection reason;
- source attachment id and page number;
- site id and worklog id.

If an audit log table is used in the future, it should be added in a dedicated data-layer PR. The initial UI should still set the existing metadata columns consistently.

## 13. Failure Handling

Expected failure categories:

| Failure | Handling |
| --- | --- |
| record not found | show not-found state, no mutation |
| no site permission | show access denied, no mutation |
| already locked | show read-only final state |
| already approved | disable duplicate approve action |
| RLS update failure | report as environment/data-layer blocker |
| original file unavailable | keep review actions separate from preview availability |

The UI should not retry state mutations blindly. It should surface the failed action and preserve the current record state.

## 14. Suggested Implementation Order

1. Add lib methods for queue listing, approve, reject, and lock.
2. Add focused hook wrappers with loading/error states.
3. Add admin/site-manager queue UI with read-only preview.
4. Add approval/rejection actions.
5. Add lock action for approved records.
6. Verify pending rows become read-only in the editor after approval/lock state changes.
7. Defer documents publication and partner visibility to a separate PR.

## 15. QA Checklist for the Future Implementation

| Scenario | Expected Result |
| --- | --- |
| worker submits draft | row becomes `pending` |
| worker reopens pending row | editor is read-only |
| admin sees pending row | review queue includes the row |
| unrelated site_manager opens row | access denied or row absent |
| assigned site_manager opens row | read-only preview opens |
| approve pending row | status and approval status become approved |
| reject pending row | status and approval status become rejected |
| lock approved row | status becomes locked, locked metadata set |
| draft save after pending/approved/locked | blocked |
| partner checks documents | no draft/pending exposure until document publication |

## 16. Open Questions

- Should site managers be allowed to lock final records, or should final lock be admin-only?
- Should rejection reason require a new column, reuse an audit log, or wait for a later schema PR?
- Should approval automatically trigger generated PDF creation, or remain a separate final publication action?
- Should an approved but unlocked markup be visible to partner users, or only a locked published document?
- Should read-only previews live in PreviewCenter or remain inside the admin review panel for the first version?
