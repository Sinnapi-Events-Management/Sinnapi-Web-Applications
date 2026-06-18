// content-moderation — invoked on message/review create (or via DB webhook).
// Runs profanity / scam / off-platform detection and sets moderation status,
// raising a flag when content is suspicious. service_role.
import { handler, json } from "../_shared/http.ts";
import { adminClient, HttpError } from "../_shared/supabase.ts";

const PROFANITY = (Deno.env.get("PROFANITY_LIST") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
// crude off-platform / scam heuristics (phone, email, "pay outside", whatsapp)
const SCAM = [/\b\+?\d[\d\s-]{7,}\b/, /[\w.+-]+@[\w-]+\.\w+/, /whats\s?app/i, /pay\s+(outside|directly|cash)/i, /telegram/i];

function score(text: string): { status: "clean" | "flagged" | "blocked"; score: number; reason?: string } {
  const lower = text.toLowerCase();
  if (PROFANITY.some((w) => w && lower.includes(w))) return { status: "blocked", score: 1, reason: "profanity" };
  const scam = SCAM.some((re) => re.test(text));
  if (scam) return { status: "flagged", score: 0.7, reason: "off_platform" };
  return { status: "clean", score: 0 };
}

Deno.serve(handler(async (req) => {
  const { kind, id, text } = await req.json(); // kind: 'message' | 'review'
  if (!id || typeof text !== "string") throw new HttpError(422, "invalid_input");
  const supa = adminClient();
  const verdict = score(text);

  if (kind === "message") {
    await supa.from("messages").update({ moderation_status: verdict.status, moderation_score: verdict.score }).eq("id", id);
    if (verdict.status !== "clean") {
      await supa.from("message_flags").insert({ message_id: id, flagged_by: null, reason: verdict.reason ?? "other", status: "open" });
    }
  } else if (kind === "review") {
    await supa.from("reviews").update({ moderation_status: verdict.status === "clean" ? "clean" : "flagged" }).eq("id", id);
    if (verdict.status !== "clean") {
      await supa.from("review_reports").insert({ review_id: id, reported_by: null, reason: verdict.reason ?? "other", status: "open" });
    }
  }
  return json(req, { ok: true, verdict });
}));
