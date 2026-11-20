// MAGIC CREATIONS — owner-scoped invitation cloud repository.
// Requires the additive workspace_data JSONB column documented in
// docs/CUSTOMER_DASHBOARD_CLOUD_INTEGRATION_2026-11-19.md.
// No service-role key is used here. RLS remains the final access boundary.
import { supabase } from './supabase-client.js';

const TABLE = 'invitations';
const INLINE_MEDIA_LIMIT = 150_000;

const PUBLIC_DATA_KEYS = [
  'invitationTitle', 'invitationSlug', 'invitationLanguage', 'groomName', 'brideName',
  'names', 'date', 'time', 'endTime', 'venue', 'address', 'mapLocation', 'message',
  'story', 'storyMilestones', 'template', 'type', 'sections', 'sectionOrder',
  'sectionSettings', 'designSettings', 'typographySettings', 'animationSettings',
  'musicSettings', 'agenda', 'gallery', 'venuePhotos', 'videoUrl', 'musicUrl',
  'welcomeMediaUrl', 'welcomeMediaName', 'welcomeMediaType', 'heroImageUrl',
  'heroImageData', 'heroImageName', 'finishBackgroundUrl', 'finishBackgroundData',
  'finishBackgroundVideoUrl', 'finishBackgroundName', 'sectionPhotos',
  'countdownDesign', 'eventDetails', 'ownSections', 'groomFamily', 'brideFamily',
  'ourPromise', 'dressCode', 'dressCodeHeading', 'dressCodeColors', 'quote',
  'custom1Title', 'custom1Text', 'contactEmail', 'contactPerson1Name',
  'contactPerson1Phone', 'contactPerson2Name', 'contactPerson2Phone',
  'contactPerson3Name', 'contactPerson3Phone', 'wishes'
];
const PRIVATE_NESTED_KEY = /^(?:host_?phone|phone|email|guest|guests|guest_?list|guest_?invite|tables?|expenses?|budget|owner(?:_?id)?|token|secret|password|private|seat_?assignment|total_?attendees|event_?id)$/i;

function cleanPublicValue(value, depth = 0) {
  if (depth > 9 || value == null) return value == null ? null : undefined;
  if (typeof value === 'string') return value.length > 120_000 ? undefined : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 50)
    .map((item) => cleanPublicValue(item, depth + 1))
    .filter((item) => item !== undefined);
  if (typeof value !== 'object') return undefined;
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_NESTED_KEY.test(key)) continue;
    const cleaned = cleanPublicValue(child, depth + 1);
    if (cleaned !== undefined) output[key] = cleaned;
  }
  return output;
}

function buildPublicInvitationData(event) {
  const source = event && typeof event === 'object' ? event : {};
  const output = { publicVersion: 1 };
  for (const key of PUBLIC_DATA_KEYS) {
    if (source[key] === undefined) continue;
    if (key === 'wishes') {
      output.wishes = Array.isArray(source.wishes)
        ? source.wishes.filter((wish) => wish && wish.approved === true)
          .slice(0, 100).map((wish) => ({
            name: String(wish.name || '').slice(0, 80),
            message: String(wish.message || '').slice(0, 600)
          }))
        : [];
      continue;
    }
    output[key] = cleanPublicValue(source[key]);
  }
  for (const key of ['videoUrl', 'musicUrl', 'welcomeMediaUrl', 'heroImageUrl',
    'finishBackgroundUrl', 'finishBackgroundVideoUrl']) {
    if (output[key] && !/^https:\\/\\//i.test(String(output[key]))) delete output[key];
  }
  return output;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  assert(data && data.user, 'Please sign in to continue.');
  return data.user;
}

function makeSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function inspectInlineMedia(value, path) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectInlineMedia(item, path + '[' + index + ']'));
    return;
  }
  Object.keys(value).forEach((key) => {
    const child = value[key];
    const childPath = path ? path + '.' + key : key;
    if (typeof child === 'string' && /^data:(image|video|audio)\//i.test(child)) {
      assert(
        child.length <= INLINE_MEDIA_LIMIT,
        'This invitation contains a large embedded media file (' + childPath +
          '). Upload media to MAGIC CREATIONS storage before cloud-saving this event.'
      );
    } else if (child && typeof child === 'object') {
      inspectInlineMedia(child, childPath);
    }
  });
}

function rowToEvent(row) {
  const saved = row.workspace_data && typeof row.workspace_data === 'object'
    ? row.workspace_data
    : {};
  return {
    ...saved,
    id: saved.id || row.id,
    _cloudId: row.id,
    _cloudUpdatedAt: row.updated_at || null,
    invitationTitle: row.couple_or_host_names || saved.invitationTitle || '',
    invitationSlug: row.slug,
    names: row.couple_or_host_names || saved.names || '',
    title: row.couple_or_host_names || saved.title || '',
    type: saved.type || row.event_type,
    date: row.event_date || '',
    time: row.event_time || '',
    venue: row.venue || '',
    template: row.template_key || saved.template || 'classic',
    message: row.message || '',
    videoUrl: row.video_url || saved.videoUrl || '',
    musicUrl: row.audio_url || saved.musicUrl || '',
    published: Boolean(row.published),
    language: row.language || 'en'
  };
}

function eventToRow(event, ownerId) {
  assert(event && typeof event === 'object', 'Invitation details are missing.');
  const names = String(event.names || event.title || event.invitationTitle || '').trim();
  const slug = makeSlug(event.invitationSlug || event.invitationTitle || names);
  assert(names, 'Add the event or couple names before saving.');
  assert(slug, 'Add a valid invitation link name before saving.');

  // Keep binary media in Storage, not inside a Postgres JSON row.
  inspectInlineMedia(event, 'invitation');

  const workspaceData = { ...event };
  delete workspaceData._cloudId;
  delete workspaceData._cloudUpdatedAt;
  delete workspaceData._localUpdatedAt;

  return {
    owner_id: ownerId,
    slug,
    event_type: String(event.type || 'wedding').toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40),
    couple_or_host_names: names.slice(0, 160),
    event_date: event.date || null,
    event_time: String(event.time || '').slice(0, 40),
    venue: String(event.venue || '').slice(0, 240),
    venue_address: String(event.venueAddress || '').slice(0, 500),
    language: ['en', 'si', 'both'].includes(event.language) ? event.language : 'en',
    template_key: String(event.template || 'classic').slice(0, 100),
    accent_colour: String(event.accentColour || '#8c6b85').slice(0, 20),
    message: String(event.message || '').slice(0, 5000),
    video_url: String(event.videoUrl || '').slice(0, 2000),
    audio_url: String(event.musicUrl || '').slice(0, 2000),
    published: Boolean(event.published),
    public_data: event.published ? buildPublicInvitationData(event) : {},
    show_guest_table: Boolean(event.showGuestTable),
    workspace_data: workspaceData,
    updated_at: new Date().toISOString()
  };
}

export async function getSignedInCustomer() {
  return currentUser();
}

export async function listMyInvitations() {
  const user = await currentUser();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToEvent);
}

export async function saveMyInvitation(event) {
  const user = await currentUser();
  const row = eventToRow(event, user.id);
  let query;

  if (event._cloudId) {
    query = supabase
      .from(TABLE)
      .update(row)
      .eq('id', event._cloudId)
      .eq('owner_id', user.id)
      .select('*')
      .single();
  } else {
    // The customer-selected, immutable slug is the stable migration key.
    // This avoids creating a second row if a browser closes after a successful
    // insert but before its returned cloud ID is written to localStorage.
    const existing = await supabase
      .from(TABLE)
      .select('id')
      .eq('owner_id', user.id)
      .eq('slug', row.slug)
      .maybeSingle();
    if (existing.error) throw existing.error;
    query = existing.data
      ? supabase.from(TABLE).update(row).eq('id', existing.data.id).eq('owner_id', user.id).select('*').single()
      : supabase.from(TABLE).insert(row).select('*').single();
  }

  const { data, error } = await query;
  if (error) throw error;
  return rowToEvent(data);
}

export async function deleteMyInvitation(cloudId) {
  assert(cloudId, 'Invitation record was not found.');
  const user = await currentUser();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', cloudId)
    .eq('owner_id', user.id);
  if (error) throw error;
  return true;
}
