import {
  createAdminClient,
  jsonResponse,
  originAllowed,
  readJson,
  sha256Hex,
  validToken,
} from "../_shared/common.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: jsonResponse(req, {}).headers });
  if (!originAllowed(req)) return jsonResponse(req, { error: "Origin not allowed." }, 403);
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed." }, 405);

  const body = await readJson(req);
  const token = body?.token;
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!validToken(token) || !slug || slug.length > 80) {
    return jsonResponse(req, { error: "Enter a valid invitation link." }, 400);
  }

  try {
    const admin = createAdminClient();
    const tokenHash = await sha256Hex(token);
    const { data: tokenRow, error: tokenError } = await admin
      .from("guest_invitation_tokens")
      .select("id, invitation_id, guest_id, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError || !tokenRow || tokenRow.revoked_at || new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      return jsonResponse(req, { error: "This personal invitation link is invalid or has expired." }, 404);
    }

    const { data: invitation, error: invitationError } = await admin
      .from("invitations")
      .select("id, slug, couple_or_host_names, event_date, event_time, venue, venue_address, language, template_key, published, show_guest_table")
      .eq("id", tokenRow.invitation_id)
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (invitationError || !invitation) {
      return jsonResponse(req, { error: "This invitation is not available." }, 404);
    }

    const { data: guest, error: guestError } = await admin
      .from("guests")
      .select("id, invitation_id, guest_name, guest_count, rsvp_status, table_id")
      .eq("id", tokenRow.guest_id)
      .eq("invitation_id", invitation.id)
      .maybeSingle();

    if (guestError || !guest) return jsonResponse(req, { error: "Guest invitation not found." }, 404);

    let tableName: string | null = null;
    if (invitation.show_guest_table && guest.rsvp_status === "attending" && guest.table_id) {
      const { data: table } = await admin
        .from("seating_tables")
        .select("table_name")
        .eq("id", guest.table_id)
        .eq("invitation_id", invitation.id)
        .maybeSingle();
      tableName = table?.table_name ?? null;
    }

    return jsonResponse(req, {
      invitation: {
        slug: invitation.slug,
        names: invitation.couple_or_host_names,
        date: invitation.event_date,
        time: invitation.event_time,
        venue: invitation.venue,
        address: invitation.venue_address,
        language: invitation.language,
        template: invitation.template_key,
      },
      guest: {
        name: guest.guest_name,
        invited_count: guest.guest_count,
        rsvp_status: guest.rsvp_status,
        table_name: tableName,
      },
    });
  } catch {
    return jsonResponse(req, { error: "Guest lookup is temporarily unavailable." }, 500);
  }
});
