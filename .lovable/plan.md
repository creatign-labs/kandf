## Problem

The Data Management Centre templates and the importer in `src/pages/admin/DataTemplate.tsx` drifted from the actual Add-dialog forms. Several templates expose fields the form no longer collects, miss fields the form requires, mark optional fields as required (and vice-versa), or use a column shape no admin form actually produces. Result: imports succeed/fail in ways that don't match what an admin sees when adding the same row by hand.

## Field-by-field audit (template vs Add dialog)

### Courses — `src/pages/admin/Courses.tsx`
Form sends: `title`, `course_code`, `description`, `duration` (Select `1 month`..`12 months`), `base_fee`, `level` (Beginner/Intermediate/Advanced), and a multi-select **Recipes for this Course**.
Validation: `title`, `description`, `duration`, `base_fee>0` required. `level` defaults to `Beginner`.
Template today: marks `level` as required, and has no way to attach existing recipes.

Fixes:
- Drop `level` from `requiredFields` (form has a default; not blocking).
- Add an optional `recipe_titles` column (semicolon-separated, e.g. `Classic Chocolate Chip Cookies; Sourdough Bread`). Importer resolves names → recipe ids and updates `recipes.course_id` for each match (mirrors the dialog's recipe relinking, with same "skip unmatched" behaviour as ingredients).
- Update notes: clarify duration is "1 month..12 months" exactly, level optional (default Beginner).

### Recipes — `src/pages/admin/AdminRecipes.tsx`
Form sends: `title`, `recipe_code`, `course_id` (required), `description`, `difficulty` (default Easy), `prep_time`, `cook_time`, `video_url`, `instructions`, plus `recipe_ingredients` rows `{inventory_id, quantity_per_student}`.
Validation: `title` and `course_id` required.
Template today: matches well. Already requires `course_title` + `title`. Ingredients column shape `name:qty;name:qty` matches the form's per-ingredient pair.

Fixes:
- No schema change required. Tighten notes to mention difficulty default (`Easy` if blank) and that `course_title` must match exactly.

### Inventory — `src/pages/admin/Inventory.tsx`
Form sends: `name`, `category`, `unit`, `current_stock`, `required_stock`, `reorder_level` (default 10). **No `cost_per_unit`.**
Template today: includes `cost_per_unit` as a column.

Fixes:
- Keep `cost_per_unit` but mark it explicitly optional in notes (used by Purchase Orders only — not collected by the Add Item dialog). This is the one intentional template-only field; we will surface that in the preview dialog so admins know it's safe to leave empty.

### Batches — `src/pages/admin/Batches.tsx`
Form sends: `course_id`, `batch_name`, `start_date`, `days` (joined from selected weekdays), `time_slot` (built from `startTime - endTime`), `total_seats` (default 30), `available_seats = total_seats`, `booking_enabled` (default true via DB).
Validation: `batch_name`, `course_id`, days, time required.
Template today: matches except missing optional `booking_enabled`.

Fixes:
- Add optional `booking_enabled` column (`true`/`false`, default `true`).
- Note: `days` must use the long weekday names the picker accepts (`Mon, Tue, Wed, Thu, Fri, Sat, Sun`) and `time_slot` must follow `HH:MM AM - HH:MM PM` to round-trip into the form.

### Jobs — `src/pages/vendor/JobForm.tsx`
Form sends: `title`, `location`, `type` (Full-time / Part-time / **Contract** / Internship), `salary_range`, `description` (min 50 chars). Company auto-filled from vendor profile; no separate requirement columns — requirements are not part of the dialog.
Template today: requires `company` + four `requirement_N` columns.

Fixes:
- Keep `company` required for **admin** bulk import (jobs table needs it; vendor portal handles it differently). Add `Contract` to allowed `type` values in notes.
- Replace `requirement_1..4` with a single optional `requirements` column (semicolon-separated). Importer splits on `;`, trims, and stores as `text[]`. Old 4-column files still work via a back-compat path that also reads `requirement_1..4` if present.
- Add note: description should be ≥50 chars to match the dialog's validation.

### Modules — `src/pages/admin/...` (no dedicated dialog; managed via course content)
No form drift. Leave as-is.

### Users — handled by `import-real-users` edge function
Already matches the bulk admin flow. No change.

## Implementation plan

1. **Update `src/pages/admin/DataTemplate.tsx` `templates` array** to the corrected schemas above (headers, requiredFields, example, notes).
2. **Extend `processRowData`**:
   - `courses`: after insert, if `recipe_titles` is set, resolve names → ids and `update recipes set course_id = newCourseId where id in (...)`. Skip unmatched titles (mirrors ingredients).
   - `batches`: pass `booking_enabled` (parse `true`/`false`/`1`/`0`, default `true`).
   - `jobs`: build `requirements` from new `requirements` column first, fall back to `requirement_1..4` for back-compat.
3. **Preview dialog tweak**: when `cost_per_unit` (inventory) or `recipe_titles` (courses) is missing, surface it as "Optional — not collected by the Add dialog" rather than a generic missing-optional warning, so admins aren't confused about parity.
4. **Bump example rows** so each downloaded CSV imports cleanly end-to-end against a fresh DB (Foundation Baking → its module → its recipe → a batch → a job).
5. **Smoke test (in build mode)** by downloading each template, re-importing it on a clean test row, and confirming the resulting record matches what the Add dialog would produce.

## Out of scope

- No DB schema or RLS changes (the previous round already fixed `super_admin` write access for these tables).
- No changes to the Users importer or the edge functions.
- No new templates beyond the existing six.
