import {
  createAdminClient,
  jsonResponse,
  originAllowed,
  readJson,
  sha256Hex,
  validToken,
} from "../_shared/common.ts";

function validUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: jsonResponse(req, {}).headers });
  if (!originAllowed(req)) return jsonResponse(req, { error: "Origin not allowed." }, 403);
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed." }, 405);

  const body = await readJson(req);
  const token = body?.token;
  const response = body?.response;
  const requestId = body?.request_id;
  if (!validToken(token) || !["attending", "not_attending"].includes(String(response)) || !validUuid(requestId)) {
    return jsonResponse(req, { error: "The RSVP details are invalid. Please refresh your invitation and try again." }, 400);
  }

  try {
    const admin = createAdminClient();
    const tokenHash = await sha256Hex(token);
    const { data, error } = await admin.rpc("submit_guest_rsvp", {
      p_token_hash: tokenHash,
      p_response: response,
      p_request_id: requestId,
    });

    if (error || !data?.saved) {
      return jsonResponse(req, { error: "Your RSVP could not be saved. Please check your invitation link and try again." }, 400);
    }

    return jsonResponse(req, {
      saved: true,
      idempotent: Boolean(data.idempotent),
      guest_name: data.guest_name,
      rsvp_status: data.rsvp_status,
      guest_count: data.guest_count ?? null,
    });
  } catch {
    return jsonResponse(req, { error: "RSVP service is temporarily unavailable. Please try again." }, 500);
  }
});
