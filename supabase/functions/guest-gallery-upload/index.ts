// MAGIC CREATIONS — guest gallery upload endpoint.
// Per-guest 256-bit invitation tokens are SHA-256 checked against the database.
// Gateway JWT verification is disabled because this endpoint uses its own guest token.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const BUCKET = "mc-guest-gallery-private";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_ATTEMPTS = 5;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-guest-token, x-caption",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};
function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function hex(bytes: Uint8Array) { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
async function sha256(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}
async function readLimited(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > MAX_BYTES) throw new Error("FILE_TOO_LARGE");
  if (!req.body) throw new Error("EMPTY_FILE");
  const reader = req.body.getReader(), chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > MAX_BYTES) { await reader.cancel(); throw new Error("FILE_TOO_LARGE"); }
    chunks.push(part.value);
  }
  if (!total) throw new Error("EMPTY_FILE");
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}
function detectImage(b: Uint8Array, type: string) {
  const jpeg = b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255;
  const png = b.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => b[i] === v);
  const webp = b.length >= 12 && String.fromCharCode(...b.slice(0,4)) === "RIFF" && String.fromCharCode(...b.slice(8,12)) === "WEBP";
  if (jpeg && type === "image/jpeg") return { type, ext: "jpg" };
  if (png && type === "image/png") return { type, ext: "png" };
  if (webp && type === "image/webp") return { type, ext: "webp" };
  throw new Error("UNSUPPORTED_IMAGE");
}
function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const secretMap = Deno.env.get("SUPABASE_SECRET_KEYS");
  let key = "";
  if (secretMap) {
    try {
      const names = JSON.parse(secretMap);
      const envName = names.default || "";
      key = envName ? Deno.env.get(envName) || "" : "";
    } catch { throw new Error("SERVER_CONFIG"); }
  }
  key = key || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) throw new Error("SERVER_CONFIG");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const token = req.headers.get("x-guest-token") || "";
    if (!/^[0-9a-f]{64}$/i.test(token)) return json({ error: "This guest upload link is invalid or expired." }, 401);
    const contentType = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!["image/jpeg","image/png","image/webp"].includes(contentType)) return json({ error: "Please upload a JPG, PNG, or WebP photo." }, 415);
    const bytes = await readLimited(req);
    const image = detectImage(bytes, contentType);
    const tokenHash = await sha256(token.toLowerCase());
    const admin = adminClient();

    const { data: tokenRow, error: tokenError } = await admin.from("guest_invitation_tokens")
      .select("invitation_id,guest_id,expires_at,revoked_at").eq("token_hash", tokenHash).maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow || tokenRow.revoked_at || new Date(tokenRow.expires_at).getTime() <= Date.now()) return json({ error: "This guest upload link is invalid or expired." }, 401);

    const { data: guest, error: guestError } = await admin.from("guests")
      .select("id,invitation_id,guest_name").eq("id", tokenRow.guest_id).eq("invitation_id", tokenRow.invitation_id).maybeSingle();
    if (guestError) throw guestError;
    if (!guest) return json({ error: "This guest upload link is invalid or expired." }, 401);

    const { data: invitation, error: invitationError } = await admin.from("invitations")
      .select("id,published").eq("id", tokenRow.invitation_id).maybeSingle();
    if (invitationError) throw invitationError;
    if (!invitation || !invitation.published) return json({ error: "This invitation is not accepting uploads." }, 403);

    const { data: attempts, error: rateError } = await admin.rpc("mc_consume_guest_gallery_upload_attempt", { p_token_hash: tokenHash });
    if (rateError) throw rateError;
    if (Number(attempts) > MAX_ATTEMPTS) return json({ error: "Upload limit reached. Please try again in 15 minutes." }, 429);

    const submissionId = crypto.randomUUID();
    const storagePath = tokenRow.invitation_id + "/" + submissionId + "/" + crypto.randomUUID() + "." + image.ext;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, { contentType: image.type, cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;

    const caption = (req.headers.get("x-caption") || "").trim().slice(0, 160);
    const { error: insertError } = await admin.from("guest_gallery_submissions").insert({
      id: submissionId, invitation_id: tokenRow.invitation_id, guest_id: guest.id,
      guest_display_name: String(guest.guest_name || "").slice(0, 100),
      storage_path: storagePath, caption, status: "pending",
    });
    if (insertError) { await admin.storage.from(BUCKET).remove([storagePath]); throw insertError; }
    return json({ ok: true, submission_id: submissionId, status: "pending" }, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "FILE_TOO_LARGE") return json({ error: "Each photo must be 8 MB or smaller." }, 413);
    if (code === "EMPTY_FILE") return json({ error: "Choose a photo before uploading." }, 400);
    if (code === "UNSUPPORTED_IMAGE") return json({ error: "The photo content does not match a supported JPG, PNG, or WebP image." }, 415);
    if (code === "SERVER_CONFIG") return json({ error: "Guest uploads are not configured yet." }, 503);
    console.error("guest-gallery-upload failed:", error);
    return json({ error: "The photo could not be uploaded. Please try again." }, 500);
  }
});
