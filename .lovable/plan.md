

# Real Data Migration Plan

## What You Already Have

Your platform has a **Data Management Centre** (accessible from the admin dashboard) that handles CSV-based data import with built-in validation. It supports: Courses, Modules, Recipes, Assessments, Questions, Inventory, Batches, and Jobs.

## Step-by-Step Execution Plan

### Phase 0: Clean Out Demo Data
Before importing real data, all demo/seed data must be removed. I will build a **"Clear All Demo Data"** button on the Data Management Centre that wipes the following tables in safe dependency order:
- attendance, bookings, recipe_batch_memberships, recipe_batches
- student_recipe_progress, payment_schedules, enrollments
- questions, assessments, recipe_ingredients
- recipes, modules, inventory, batches, jobs, courses

This ensures no foreign key conflicts and gives you a clean slate.

### Phase 1: Prepare Your CSV Files
Download templates from the Data Management Centre ("Download All Templates" button). Fill them with your real data following this **strict order**:

```text
Order    Table          Depends On
─────    ─────          ──────────
1        Courses        (none)
2        Modules        Courses
3        Recipes        Courses, Modules
4        Assessments    Courses, Modules
5        Questions      Assessments
6        Inventory      (none)
7        Batches        Courses
8        Jobs           (none — vendor jobs can come later)
```

### Phase 2: Import Data (In Order)
Upload each CSV file through the Data Management Centre in the order above. The system will:
- Validate each row
- Resolve references automatically (e.g., `course_title` → `course_id`)
- Report success/failure counts per file

### Phase 3: Link Recipe Ingredients
After recipes and inventory are both imported, you'll need to link them via the **Recipe Ingredients** page in the admin panel (`/admin/recipe-ingredients`). This maps which inventory items are used by which recipe and in what quantity per student.

### Phase 4: Verification
After all imports, verify through the admin dashboard:
- Courses page shows all courses with correct fees and levels
- Each course has its modules and recipes listed
- Assessments have their questions attached
- Inventory shows correct stock levels
- Batches are scheduled with correct dates and time slots

## What I Will Build

1. **"Clear Demo Data" function** — A button on the Data Management Centre that safely purges all seed/demo data in dependency order, giving you a clean database for real data
2. **Import result summary** — An enhanced post-import verification checklist showing record counts per table so you can confirm everything landed correctly

## Important Notes

- **Import order matters** — Modules reference Courses, Recipes reference Courses+Modules, Questions reference Assessments. Importing out of order will cause failures.
- **Exact title matching** — When your Modules CSV says `course_title = "Foundation Baking"`, a course with that exact title must already exist.
- **No duplicates** — If you re-import the same CSV, it will create duplicate records. Clear first, then import.
- **Students/Staff are NOT imported via CSV** — Students sign up or are created via admin. Chefs and admins are managed through the Staff page.

