-- 0917a — the PayPal tables, captured from the main database.
--
-- These six tables were created by hand in the dashboard during the PayPal
-- integration and never written as a migration, so no fresh environment could
-- ever build them. This file is a faithful capture of main's definitions:
-- tables, indexes, row-level security, policies and the updated_at trigger.
-- Nothing here is new design; it is the existing production shape, recorded.
--
-- Privileges are deliberately absent: these tables inherit the same default
-- privileges as every other table in public, which matches main exactly.

CREATE OR REPLACE FUNCTION public.handle_paypal_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$

;


CREATE TABLE public.paypal_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid,
    paypal_transaction_id text,
    dispute_id text NOT NULL,
    case_id text,
    dispute_reason text,
    dispute_status text,
    dispute_category text,
    gross_amount numeric(14,2),
    currency text,
    dispute_date timestamp with time zone,
    response_due_date timestamp with time zone,
    resolution_date timestamp with time zone,
    outcome text,
    resolution_notes text,
    messages jsonb,
    evidence jsonb,
    assigned_to uuid,
    internal_notes text,
    internal_status text,
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.paypal_disputes IS 'PayPal dispute, chargeback, and case management';

CREATE TABLE public.paypal_refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    refund_id text NOT NULL,
    capture_id text,
    order_id text,
    refund_amount numeric(14,2) NOT NULL,
    currency text NOT NULL,
    refund_reason text,
    note_to_payer text,
    fee_refund_amount numeric(14,2),
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    internal_refund_id uuid,
    raw_response jsonb
);

COMMENT ON TABLE public.paypal_refunds IS 'Detailed PayPal refund tracking';

CREATE TABLE public.paypal_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    paypal_subscription_id text NOT NULL,
    plan_id text,
    billing_agreement_id text,
    billing_token text,
    payer_id text,
    payer_email text,
    payer_name jsonb,
    frequency text,
    frequency_interval integer,
    total_cycles integer,
    current_cycle integer DEFAULT 0,
    status text NOT NULL,
    status_update_reason text,
    next_billing_date timestamp with time zone,
    last_payment_date timestamp with time zone,
    amount numeric(14,2) NOT NULL,
    currency text NOT NULL,
    paypal_fee_rate numeric(5,2),
    paypal_fee_amount numeric(14,2),
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.paypal_subscriptions IS 'PayPal subscription and billing agreement data';

CREATE TABLE public.paypal_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    order_id text NOT NULL,
    capture_id text,
    payment_source_type text,
    card_brand text,
    card_last_digits text,
    card_expiry text,
    paypal_fee_amount numeric(14,2),
    paypal_fee_currency text,
    net_amount numeric(14,2),
    seller_protection_eligible boolean,
    seller_protection_type text,
    risk_level text,
    fraud_management_filters jsonb,
    custom_fields jsonb,
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.paypal_transactions IS 'PayPal-specific transaction metadata and details';

CREATE TABLE public.paypal_vaulted_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vendor_id uuid,
    vault_token text NOT NULL,
    payment_source_type text NOT NULL,
    card_brand text,
    card_last_digits text,
    card_expiry_month integer,
    card_expiry_year integer,
    cardholder_name text,
    paypal_email text,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    billing_address jsonb,
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.paypal_vaulted_methods IS 'Customer saved PayPal payment methods for future use';

CREATE TABLE public.paypal_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    event_type text NOT NULL,
    resource_type text,
    summary text,
    signature_valid boolean NOT NULL,
    verification_status text,
    processing_status text,
    processing_error text,
    processed_at timestamp with time zone,
    payment_id uuid,
    dispute_id uuid,
    subscription_id uuid,
    raw_payload jsonb,
    headers jsonb,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.paypal_webhook_events IS 'Enhanced PayPal webhook event logging';

ALTER TABLE ONLY public.paypal_disputes
    ADD CONSTRAINT paypal_disputes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.paypal_refunds
    ADD CONSTRAINT paypal_refunds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.paypal_subscriptions
    ADD CONSTRAINT paypal_subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.paypal_transactions
    ADD CONSTRAINT paypal_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.paypal_vaulted_methods
    ADD CONSTRAINT paypal_vaulted_methods_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.paypal_webhook_events
    ADD CONSTRAINT paypal_webhook_events_pkey PRIMARY KEY (id);

CREATE INDEX ix_paypal_card ON public.paypal_transactions USING btree (card_last_digits);

CREATE INDEX ix_paypal_dispute_due ON public.paypal_disputes USING btree (response_due_date) WHERE (dispute_status = 'OPEN'::text);

CREATE INDEX ix_paypal_dispute_internal ON public.paypal_disputes USING btree (internal_status);

CREATE INDEX ix_paypal_dispute_payment ON public.paypal_disputes USING btree (payment_id);

CREATE INDEX ix_paypal_dispute_status ON public.paypal_disputes USING btree (dispute_status);

CREATE INDEX ix_paypal_payment ON public.paypal_transactions USING btree (payment_id);

CREATE INDEX ix_paypal_refund_payment ON public.paypal_refunds USING btree (payment_id);

CREATE INDEX ix_paypal_refund_status ON public.paypal_refunds USING btree (status);

CREATE INDEX ix_paypal_subscription_next_billing ON public.paypal_subscriptions USING btree (next_billing_date) WHERE (status = 'ACTIVE'::text);

CREATE INDEX ix_paypal_subscription_status ON public.paypal_subscriptions USING btree (status);

CREATE INDEX ix_paypal_vault_user ON public.paypal_vaulted_methods USING btree (user_id, is_active);

CREATE INDEX ix_paypal_vault_vendor ON public.paypal_vaulted_methods USING btree (vendor_id, is_active);

CREATE INDEX ix_paypal_webhook_payment ON public.paypal_webhook_events USING btree (payment_id);

CREATE INDEX ix_paypal_webhook_received ON public.paypal_webhook_events USING btree (received_at);

CREATE INDEX ix_paypal_webhook_status ON public.paypal_webhook_events USING btree (processing_status);

CREATE INDEX ix_paypal_webhook_type ON public.paypal_webhook_events USING btree (event_type);

CREATE UNIQUE INDEX ux_paypal_capture_id ON public.paypal_transactions USING btree (capture_id) WHERE (capture_id IS NOT NULL);

CREATE UNIQUE INDEX ux_paypal_dispute_id ON public.paypal_disputes USING btree (dispute_id);

CREATE UNIQUE INDEX ux_paypal_order_id ON public.paypal_transactions USING btree (order_id);

CREATE UNIQUE INDEX ux_paypal_refund_id ON public.paypal_refunds USING btree (refund_id);

CREATE UNIQUE INDEX ux_paypal_subscription_id ON public.paypal_subscriptions USING btree (paypal_subscription_id);

CREATE UNIQUE INDEX ux_paypal_subscription_local ON public.paypal_subscriptions USING btree (subscription_id);

CREATE UNIQUE INDEX ux_paypal_vault_token ON public.paypal_vaulted_methods USING btree (vault_token);

CREATE UNIQUE INDEX ux_paypal_vault_user_default ON public.paypal_vaulted_methods USING btree (user_id) WHERE ((is_default = true) AND (vendor_id IS NULL));

CREATE UNIQUE INDEX ux_paypal_vault_vendor_default ON public.paypal_vaulted_methods USING btree (vendor_id) WHERE ((is_default = true) AND (vendor_id IS NOT NULL));

CREATE UNIQUE INDEX ux_paypal_webhook_event ON public.paypal_webhook_events USING btree (event_id);

CREATE TRIGGER on_paypal_disputes_update BEFORE UPDATE ON public.paypal_disputes FOR EACH ROW EXECUTE FUNCTION public.handle_paypal_updated_at();

CREATE TRIGGER on_paypal_subscriptions_update BEFORE UPDATE ON public.paypal_subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_paypal_updated_at();

CREATE TRIGGER on_paypal_transactions_update BEFORE UPDATE ON public.paypal_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_paypal_updated_at();

CREATE TRIGGER on_paypal_vaulted_methods_update BEFORE UPDATE ON public.paypal_vaulted_methods FOR EACH ROW EXECUTE FUNCTION public.handle_paypal_updated_at();

ALTER TABLE ONLY public.paypal_disputes
    ADD CONSTRAINT paypal_disputes_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.paypal_disputes
    ADD CONSTRAINT paypal_disputes_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.paypal_refunds
    ADD CONSTRAINT paypal_refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.paypal_subscriptions
    ADD CONSTRAINT paypal_subscriptions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.paypal_transactions
    ADD CONSTRAINT paypal_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.paypal_vaulted_methods
    ADD CONSTRAINT paypal_vaulted_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.paypal_vaulted_methods
    ADD CONSTRAINT paypal_vaulted_methods_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.paypal_webhook_events
    ADD CONSTRAINT paypal_webhook_events_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.paypal_disputes(id);

ALTER TABLE ONLY public.paypal_webhook_events
    ADD CONSTRAINT paypal_webhook_events_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);

ALTER TABLE ONLY public.paypal_webhook_events
    ADD CONSTRAINT paypal_webhook_events_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.paypal_subscriptions(id);

CREATE POLICY "Admins can manage PayPal disputes" ON public.paypal_disputes USING (((auth.role() = 'service_role'::text) OR public.is_admin()));

CREATE POLICY "Service role can manage PayPal refunds" ON public.paypal_refunds USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Service role can manage PayPal subscriptions" ON public.paypal_subscriptions USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Service role can manage PayPal transactions" ON public.paypal_transactions USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Service role can manage vaulted methods" ON public.paypal_vaulted_methods USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Service role can manage webhook events" ON public.paypal_webhook_events USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Users can manage own vaulted methods" ON public.paypal_vaulted_methods USING (((user_id = auth.uid()) OR ((vendor_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.vendors v
  WHERE ((v.id = paypal_vaulted_methods.vendor_id) AND (v.owner_id = auth.uid()) AND (v.deleted_at IS NULL)))))));

CREATE POLICY "Users can view own PayPal disputes" ON public.paypal_disputes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.payments p
  WHERE ((p.id = paypal_disputes.payment_id) AND (p.payer_id = auth.uid())))));

CREATE POLICY "Users can view own PayPal refunds" ON public.paypal_refunds FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.payments p
  WHERE ((p.id = paypal_refunds.payment_id) AND (p.payer_id = auth.uid())))));

CREATE POLICY "Users can view own PayPal subscriptions" ON public.paypal_subscriptions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.subscriptions s
     JOIN public.vendors v ON ((v.id = s.vendor_id)))
  WHERE ((s.id = paypal_subscriptions.subscription_id) AND (v.owner_id = auth.uid()) AND (v.deleted_at IS NULL)))));

CREATE POLICY "Users can view own PayPal transactions" ON public.paypal_transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.payments p
  WHERE ((p.id = paypal_transactions.payment_id) AND (p.payer_id = auth.uid())))));

ALTER TABLE public.paypal_disputes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.paypal_refunds ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.paypal_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.paypal_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.paypal_vaulted_methods ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;

