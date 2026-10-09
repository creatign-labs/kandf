# Audit findings and cleanup plan

## What I found

**1. Why "5 students" shows when there are none (bug)**
Every new account is automatically given the "Student" role, even Super Admins and Vendors. Right now there are 5 logins, and all 5 carry the Student role:
- superadmin@demo.com (Student + Admin + Super Admin)
- vendor@demo.com (Student + Vendor)
- student@demo.com, student2@demo.com, teststudent@demo.com (Student)

So the Notifications page counts and lists all of them as students, including Super Admin and Demo Vendor.

**2. Notifications page doesn't update live**
The counts and recipient lists load once and stay as they were. Adding or removing a student, chef or staff member doesn't show until you refresh the page.

**3. Serious security holes (critical)**
- A demo tool lets anyone on the internet reset **any** account's password, Super Admin included, with no login.
- Another demo tool lets anyone, without logging in, delete and recreate accounts.

**4. Leftover demo/test pages**
- "Flow Walkthrough" and "Feature Report" pages can be opened publicly by anyone.
- A "Data Template" admin page that was only used for loading sample data.

## What I will do once you approve

1. **Accounts:** delete student@demo.com, student2@demo.com, teststudent@demo.com and vendor@demo.com. Keep **superadmin@demo.com** as the only login, and take the wrong Student role off it.
2. **Stop auto-giving the Student role:** new accounts get only the role they are created with (student, chef, admin, vendor).
3. **Notifications page:** count and list only people who really have each role, and update live as people are added or removed. Remove the old notification history that was sent to the demo accounts.
4. **Remove the unsafe demo tools:** password reset, demo account creation, and the two old sample-data clearing tools.
5. **Remove the demo pages:** Flow Walkthrough, Feature Report and Data Template.
6. **Code tidy-up:** remove unused imports and commented-out code (for example the hidden Assessments page link stays hidden, but its dead code goes), then confirm every page still loads.

## What stays untouched
All real features: leads, payments, enrolment, batches, recipes, inventory, chef, vendor and student portals, emails, reports.

## Technical details
- Migration: `handle_new_user` stops inserting the `student` role; remove the student role from users who also have admin/super_admin/vendor/chef.
- `Notifications.tsx`: join `user_roles` → `profiles` with inner join, exclude elevated roles from the student segment, add realtime subscription on `user_roles`/`profiles` to invalidate queries.
- Delete edge functions: `reset-demo-password`, `create-demo-users`, `clear-demo-data`, `clear-sample-data` (also undeploy).
- Delete `FlowWalkthrough.tsx`, `FeatureReport.tsx`, `DataTemplate.tsx` and their routes.
- Run typecheck/build and a quick page-load check afterwards.
