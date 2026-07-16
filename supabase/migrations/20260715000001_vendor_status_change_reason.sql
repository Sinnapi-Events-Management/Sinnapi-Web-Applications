-- =====================================================================
-- Sinnapi — 0020 Vendors: status change reason
--
-- Admins suspend or reactivate a live vendor from the admin portal. Both
-- transitions are destructive enough to warrant a justification: suspending
-- hides the listing from the public site, reactivating puts it back. The
-- portal now confirms every transition and requires a reason, stored here
-- alongside the status it explains.
--
-- RLS is row-level, not column-level: `vendors_admin_write` (vendor.manage)
-- already authorises writes to this column, so no policy change is needed.
-- =====================================================================

-- Why the vendor's status was last changed, captured in the admin portal's
-- confirm dialog. Null for vendors whose status has never been toggled.
-- `updated_by` / `updated_at` already record who changed it and when.
alter table public.vendors
  add column if not exists status_change_reason text;
