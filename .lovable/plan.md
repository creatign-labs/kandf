## Why the vendor login showed the wrong/random portal

The Magnolia Bakery vendor record exists and is approved, but its account currently has only the `student` role, not the `vendor` role. The login page redirects by role priority, so after login it treated `mb@gmail.com` like a student and sent it into the student flow instead of the vendor portal.

The root cause is the default new-user backend trigger: every newly created auth user gets a `student` role automatically. Vendor signup tries to add a `vendor` role from the browser, but that can fail because role assignment is protected. The approval function updated the vendor profile and password, but did not guarantee the `vendor` role existed or remove the accidental `student` role.

## Implementation plan

### 1. Fix vendor registration form
- Add a mandatory **GST Number** field to `/vendor/signup`.
- Make every registration field mandatory at validation level and UI level:
  - Full Name
  - Company Name
  - Phone Number
  - Email
  - GST Number
  - Terms acceptance
- Add GST format validation suitable for Indian GSTIN format.
- Store GST Number on the vendor profile.

### 2. Add backend support for GST Number
- Add `gst_number` to `vendor_profiles`.
- Keep it available to vendor self-profile, admin/vendor approval views, and future job/vendor records.
- Add safe length/format constraints where appropriate.

### 3. Fix vendor role provisioning permanently
- Update the vendor approval backend function so approval is the authority for vendor activation.
- On approval, it will:
  - Ensure the user has the `vendor` role.
  - Remove the accidental `student` role if the account is only meant to be a vendor.
  - Keep the vendor profile approved and active.
  - Generate/update credentials as it currently does.
- Backfill/fix the existing Magnolia Bakery account (`mb@gmail.com`) so it has `vendor` role and no accidental `student-only` routing issue.

### 4. Harden login redirect logic
- Update login routing so approved vendors are detected by their vendor profile as well as role.
- If a user has an approved active vendor profile, route them to `/vendor`.
- If a vendor profile is pending/rejected, route to the vendor awaiting/rejected state instead of falling through to student.
- Keep the existing student/admin/chef routing intact.

### 5. Harden protected vendor routes
- Update protected route checks so vendor access requires:
  - vendor role, and
  - approved active vendor profile.
- If role/profile state is inconsistent, show the correct vendor pending/blocked page instead of redirecting to unrelated student/admin routes.

### 6. Complete vendor portal consistency
- Update vendor profile page to show/edit GST Number where appropriate.
- Update Super Admin vendor approvals table/details to display GST Number.
- Ensure dashboard stats only count the current vendor’s jobs/applications, not global released applicant totals.
- Preserve the PII gate: vendors only see student identities after admin release.

### 7. Validate the flow
- Test a new vendor registration through approval and login.
- Test the existing Magnolia Bakery account fix.
- Verify approved vendors land on `/vendor` and see vendor dashboard/profile/jobs.
- Verify pending vendors land on awaiting approval.
- Verify student portal connections remain unchanged: students can apply to jobs, admins release applications, vendors then see released candidates only.