-- =====================================================================
-- Sinnapi — 1105h Booking invoices follow their escrow; client alerts
--
-- A `sinnapi_escrow` invoice is paid when the booking's escrow is funded
-- — the client's money is then verifiably with Sinnapi's payment provider,
-- which is a real payment record, unlike anything a browser could claim.
-- A full refund puts it back to `issued` with nothing paid; a partial
-- refund leaves it paid (both confirmed 2026-11-05).
--
-- The rule lives in `_invoice_sync_escrow` (1105f); this trigger only
-- calls it whenever an escrow row appears or changes status. `issue_invoice`
-- calls the same function, so an invoice issued after funding is paid at once.
--
-- The trigger changes nothing about escrow itself: it reads the escrow
-- row and writes only to vendor_invoices.
-- =====================================================================

create or replace function public.tg_escrow_invoice_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  for v_id in
    select i.id from public.vendor_invoices i
     where i.booking_id = new.booking_id
       and i.payment_channel = 'sinnapi_escrow'
       and i.status not in ('draft', 'void')
       and i.deleted_at is null
  loop
    perform public._invoice_sync_escrow(v_id);
  end loop;

  return new;
end;$$;

revoke all on function public.tg_escrow_invoice_sync() from public, anon, authenticated;

drop trigger if exists trg_escrow_invoice_sync on public.escrow_transactions;
create trigger trg_escrow_invoice_sync
  after insert or update of status on public.escrow_transactions
  for each row execute function public.tg_escrow_invoice_sync();

-- ---------------------------------------------------------------------
-- In-app alerts for registered clients. `payment.` is an existing
-- notification domain, so the portals route these with no change to
-- `resolveDomain`. In-app only on purpose: the vendor's own email (with
-- the PDF attached) is sent by send-financial-document when they choose to
-- send it, and an automatic second email would duplicate it. 
-- ---------------------------------------------------------------------
insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values
('payment.invoice_issued.client', 'in_app', 'New invoice from {{vendor_name}}',
 '{{document_no}} is for {{currency}} {{total}}, due {{due_date}}. Open it to see the details or download it.', 'en'),
('payment.receipt_issued.client', 'in_app', '{{vendor_name}} confirmed your payment',
 'Receipt {{document_no}}: {{currency}} {{amount}} received. You can download it any time.', 'en')
on conflict (trigger_key, channel, locale) do update
  set subject = excluded.subject, body_template = excluded.body_template, is_active = true;
