Prerequisites before applying
Create these in Supabase → Vault: bank_encryption_key (bank-field crypto), and for cron functions_base_url + service_role_key. Enable extensions pgsodium/Vault, pg_cron, pg_net. Set the PSP/FX/email env vars on the functions (PESAPAL_*, PAYPAL_*, FX_API_URL, EMAIL_*, ALLOWED_ORIGINS).

Two design notes (non-blocking): bank numbers use pgp_sym_encrypt with a Vault-stored key (swap to native pgsodium keyrings if you prefer managed keys); and approve_escrow_release auto-creates the payout against the vendor's primary bank account — if none exists it leaves escrow at payout_approved for the vendor to add banking, rather than erroring.

Want me to generate the frontend scaffolding (monorepo workspace + shared packages) next, or pause here for you to apply and review the backend?