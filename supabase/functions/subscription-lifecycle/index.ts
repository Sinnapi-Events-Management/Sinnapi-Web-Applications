// subscription-lifecycle — cron (every 15 min). Rolls trials/periods into
// grace, expires after the configurable grace window, and toggles vendor
// visibility. Active bookings are unaffected. service_role.
import { handler, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(handler(async (req) => {
  const supa = adminClient();
  const { data, error } = await supa.rpc("apply_subscription_state");
  if (error) throw new Error(error.message);
  return json(req, { ok: true, transitioned: data });
}));
