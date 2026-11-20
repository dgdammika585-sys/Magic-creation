// MAGIC CREATIONS — private guest-gallery owner moderation.
 // Guest uploads MUST be issued by a trusted Edge Function after invitation-token
 // verification. This browser module is owner-only: it lists submissions, creates
 // short-lived private previews, and records approve/reject decisions.
import { supabase } from './supabase-client.js';

const TABLE = 'guest_gallery_submissions';
const BUCKET = 'mc-guest-gallery-private';
const PREVIEW_SECONDS = 300;

function assert(ok, message) { if (!ok) throw new Error(message); }

async function signedInOwner() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  assert(data && data.user, 'Please sign in to manage guest photos.');
  return data.user;
}

export async function listGuestGallerySubmissions(invitationId, status = 'all') {
  assert(typeof invitationId === 'string' && invitationId, 'Invitation is missing.');
  await signedInOwner();
  let query = supabase.from(TABLE)
    .select('id,invitation_id,guest_id,guest_display_name,storage_path,caption,status,created_at,reviewed_at')
    .eq('invitation_id', invitationId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (['pending', 'approved', 'rejected'].includes(status)) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data || [];
  return Promise.all(rows.map(async (row) => {
    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET).createSignedUrl(row.storage_path, PREVIEW_SECONDS);
    if (signError) throw signError;
    return { ...row, previewUrl: signed.signedUrl };
  }));
}

export async function reviewGuestGallerySubmission(submissionId, decision) {
  assert(typeof submissionId === 'string' && submissionId, 'Photo submission is missing.');
  assert(decision === 'approved' || decision === 'rejected', 'Choose approve or reject.');
  await signedInOwner();
  const { data, error } = await supabase.from(TABLE)
    .update({ status: decision, reviewed_at: new Date().toISOString() })
    .eq('id', submissionId)
    .select('id,status,reviewed_at')
    .single();
  if (error) throw error;
  return data;
}
