// MAGIC CREATIONS — issue private guest photo-upload links.
// Requires a real Supabase guests.id UUID. Local workspace guest IDs are not
// interchangeable with database guest IDs; the RPC enforces invitation ownership.
import { supabase } from './supabase-client.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function issueGuestPhotoUploadLink(invitation, guestCloudId) {
  assert(invitation && invitation._cloudId, 'This invitation must be saved to your MAGIC CREATIONS account first.');
  assert(invitation.published === true && invitation.invitationSlug,
    'Publish this invitation before issuing a guest photo-upload link.');
  assert(typeof guestCloudId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guestCloudId),
    'A valid cloud guest record is required. Save/sync the guest list first.');

  const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
  if (sessionError) throw sessionError;
  assert(sessionData?.user, 'Please sign in to issue a guest photo-upload link.');

  const { data, error } = await supabase.rpc('issue_guest_invitation_token', {
    p_guest_id: guestCloudId
  });
  if (error) throw error;
  assert(data && typeof data.token === 'string' && /^[a-f0-9]{64}$/.test(data.token),
    'The server did not return a valid guest access token.');

  const url = new URL('guest-photo-upload.html', window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('slug', invitation.invitationSlug);
  url.searchParams.set('token', data.token);

  // Do not persist the raw token in workspace_data, localStorage or analytics.
  return { url: url.toString(), expiresAt: data.expires_at };
}
