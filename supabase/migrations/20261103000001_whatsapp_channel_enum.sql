-- =====================================================================
-- Sinnapi — 1103a WhatsApp notifications, step 1: the channel name.
--
-- Split from the body of the work (1103b) because `alter type … add value`
-- cannot be *used* by another statement in the same transaction, and the
-- Supabase CLI runs each file in one. Nothing here is referenced until the
-- next file. See docs/whatsapp-notifications.md.
-- =====================================================================
alter type notification_channel add value if not exists 'whatsapp';
