# Vendor application — certificate of incorporation never reached the reviewer

**Reported:** 2026-10-23. A registered business attached its business registration document; the
reviewer's Documents card showed **National ID → "Tap to preview"** and **Business registration
document → "Not provided"**.

**Target:** `vendor-application` on the project the public site posts to. Both `.env` files
currently point at **develop `oxrndnpnecrwldbigxek`**, while `supabase/.temp/project-ref` is
**production `mnecsflrsyackeibixfn`** — so a bare `supabase functions deploy` goes to **production**.
Pass `--project-ref` on every command below and read it back before you press enter.

## What went wrong

Nothing in the browser. The form uploads each document and only then files the application, and
`send()` aborts the whole submission if any upload throws — so the existence of that intake row is
itself proof that the certificate reached the private `application-intake` bucket, at
`{submission_ref}/business-registration/…`.

The deployed endpoint threw the path away. `vendor-application` on develop was version 100 of
2026-10-11, which is `HEAD`:

```
$ git show HEAD:supabase/functions/vendor-application/index.ts | grep -n 'nationalIdPath\|businessRegistration'
86:  nationalIdPath?: string;          ← accepted
338:        national_id_path: …        ← stored
                                       ← no match for businessRegistrationDocumentPath
```

An unknown key in a JSON body is not an error, it is just ignored. So the National ID was recorded,
the certificate was not, and the column stayed NULL. The reviewer's card still rendered the row
because it keys off `applicant_type = 'registered_business'`, not off the path — which is correct,
and is what made the loss visible at all.

**No migration is needed.** `business_registration_document_path` already exists on develop
(`/rest/v1/vendor_application_intake?select=business_registration_document_path` answers `200 []`,
not a 400 for an unknown column), which also means `20261022000002` was applied there — and since
uploads into both document folders still succeed, `20261023000001` must be applied on top of it too.
The schema is ahead of the function, not behind it.

## The fix

Deploy the function. Delete it first so the recreated deployment carries nothing from the old one:

```bash
cd <repo root>                      # config.toml must be found — see the warning below
cat supabase/.temp/project-ref      # expect mnecsflrsyackeibixfn (production)

# develop — the project the local apps actually post to
supabase functions delete vendor-application --project-ref oxrndnpnecrwldbigxek
supabase functions deploy vendor-application --project-ref oxrndnpnecrwldbigxek

# production — only when the branch ships
supabase functions delete vendor-application --project-ref mnecsflrsyackeibixfn
supabase functions deploy vendor-application --project-ref mnecsflrsyackeibixfn
```

Three things to know before running it:

1. **Between the two commands the endpoint 404s.** Any application submitted in that window fails
   with the generic error and the applicant is invited to retry — they lose nothing, but do not do
   this on production during the day.
2. **Deploy from the repo root.** `supabase/config.toml` carries `[functions.vendor-application]
verify_jwt = false`, and a delete takes that flag with it. A deploy that cannot read config.toml
   recreates the function with JWT verification on.
3. **Secrets survive.** `TURNSTILE_SECRET` and `VENDOR_APPLICATIONS_INBOX` are project-level, not
   per-function, so deleting the function does not clear them. Confirm with
   `supabase secrets list --project-ref <ref>` if a submission comes back 403 afterwards —
   the shared helpers fail closed, so a missing secret looks like a user error.

## Verify

```bash
supabase functions list --project-ref oxrndnpnecrwldbigxek | grep vendor-application
# VERSION must have incremented and UPDATED_AT must be today
```

Then file one test application as a registered business with a certificate attached, and check the
reviewer's Documents card shows **both** documents as "Tap to preview". The browser console must
stay silent: the form now compares what it uploaded against the `storedDocuments` receipt the
endpoint returns, and logs `[vendor-application] uploaded but NOT recorded on the application: …`
with the `submissionRef` whenever a document it sent was not recorded. That line appearing again
means the deployed function is still behind the form.

## Applications already filed

Not backfilled, by decision on 2026-10-23. The files are not lost — they are in the private bucket
under each submission's ref, and only the path column is empty. To see which rows are recoverable:

```sql
select i.id,
       i.business_name,
       i.owner_email,
       i.status,
       o.name as orphaned_certificate,
       o.created_at
from public.vendor_application_intake i
join storage.objects o
  on o.bucket_id = 'application-intake'
 and (storage.foldername(o.name))[1] = i.submission_ref::text
 and (storage.foldername(o.name))[2] = 'business-registration'
where i.business_registration_document_path is null
order by o.created_at desc;
```

Each row is a reviewer looking at "Not provided" with the document sitting one join away. Setting
`business_registration_document_path = o.name` for them is a one-statement recovery if that call
is ever revisited — take the newest object per ref, since a retried submission can leave more than
one.
