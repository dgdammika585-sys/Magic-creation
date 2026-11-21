// MAGIC CREATIONS — explicit, owner-scoped guest-list synchronization.
// Local guest IDs are never sent as database IDs. A UUID is assigned locally
// and persisted before insert so retrying an interrupted sync is idempotent.
import { supabase } from './supabase-client.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assert(ok, message) { if (!ok) throw new Error(message); }

async function signedInUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  assert(data?.user?.id, 'Please sign in before syncing guest records.');
  return data.user;
}

export async function syncInvitationGuests(invitation, guests, persistLocal) {
  assert(invitation?._cloudId && UUID.test(invitation._cloudId),
    'Save this invitation to your MAGIC CREATIONS account first.');
  assert(invitation.published === true,
    'Publish the invitation before syncing guest records for guest photo links.');
  assert(Array.isArray(guests), 'Guest list is unavailable.');
  const user = await signedInUser();

  const { data: existingRows, error: listError } = await supabase
    .from('guests')
    .select('id,invitation_id,owner_id')
    .eq('invitation_id', invitation._cloudId)
    .eq('owner_id', user.id);
  if (listError) throw listError;
  const ownedIds = new Set((existingRows || []).map((row) => row.id));

  let created = 0;
  let updated = 0;
  for (const guest of guests) {
    assert(guest && String(guest.name || '').trim(), 'Every guest needs a name before syncing.');
    if (!guest.cloudGuestId) {
      assert(globalThis.crypto?.randomUUID, 'This browser cannot create secure guest record IDs. Please use a modern browser.');
      guest.cloudGuestId = globalThis.crypto.randomUUID();
      // Persist mapping before the network write. If the request times out after
      // the database insert, the next sync updates the same UUID rather than
      // creating a duplicate row.
      if (typeof persistLocal === 'function') persistLocal();
    }
    assert(UUID.test(guest.cloudGuestId), 'A guest has an invalid cloud record ID. Please review the guest list.');

    const row = {
      id: guest.cloudGuestId,
      invitation_id: invitation._cloudId,
      owner_id: user.id,
      guest_name: String(guest.name).trim().slice(0, 160),
      guest_phone: String(guest.phone || '').trim().slice(0, 40),
      rsvp_status: guest.status === 'accepted' ? 'attending' : guest.status === 'declined' ? 'not_attending' : 'pending',
      guest_count: Math.max(1, Math.min(20, Number(guest.count) || 1))
    };

    if (ownedIds.has(guest.cloudGuestId)) {
      const { data, error } = await supabase.from('guests')
        .update(row)
        .eq('id', guest.cloudGuestId)
        .eq('invitation_id', invitation._cloudId)
        .eq('owner_id', user.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      assert(data?.id === guest.cloudGuestId,
        'A guest record could not be updated. Reload the guest list and try again.');
      updated += 1;
    } else {
      // Explicit UUID is stable across retries; a conflicting row is never
      // adopted because all ownership/invitation checks remain in force.
      const { data, error } = await supabase.from('guests')
        .insert(row)
        .select('id')
        .single();
      if (error) throw error;
      assert(data?.id === guest.cloudGuestId, 'The cloud guest record was not confirmed.');
      ownedIds.add(data.id);
      created += 1;
    }
  }
  return { created, updated, total: guests.length };
}
