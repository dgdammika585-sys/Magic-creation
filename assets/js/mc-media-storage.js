// MAGIC CREATIONS — customer-owned invitation media uploads.
// Uses the signed-in Supabase user and owner-scoped Storage policies.
// IMPORTANT: mc-invitation-media is currently a PUBLIC bucket. Objects uploaded
// here are retrievable by anyone who has the URL. Do not use for guest/private media.
import { supabase } from './supabase-client.js';

const BUCKET = 'mc-invitation-media';
const RULES = {
  image: { max: 15 * 1024 * 1024, types: ['image/jpeg','image/png','image/webp','image/gif'] },
  video: { max: 100 * 1024 * 1024, types: ['video/mp4'] },
  audio: { max: 20 * 1024 * 1024, types: ['audio/mpeg','audio/wav','audio/ogg'] }
};
const EXT = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','audio/mpeg':'mp3','audio/wav':'wav','audio/ogg':'ogg' };

function slugify(value) {
  return String(value || 'invitation').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) || 'invitation';
}
function assert(ok, message) { if (!ok) throw new Error(message); }

export async function uploadInvitationMedia(file, event, kind='image') {
  const rule = RULES[kind];
  assert(rule, 'Unsupported media type.');
  assert(file instanceof File, 'Choose a file to upload.');
  assert(rule.types.includes(String(file.type || '').toLowerCase()),
    kind === 'video' ? 'Only MP4 videos are supported.' :
    kind === 'audio' ? 'Choose MP3, WAV or OGG music.' :
    'Choose JPG, PNG, WebP or GIF images.');
  assert(file.size > 0 && file.size <= rule.max,
    'File is too large. Maximum: ' + Math.round(rule.max / 1024 / 1024) + ' MB.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  assert(auth && auth.user, 'Please sign in before uploading media.');
  const ownerId = auth.user.id;
  const eventSlug = slugify(event && (event.invitationSlug || event.invitationTitle || event.names || event.title));
  const ext = EXT[file.type.toLowerCase()];
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const path = ownerId + '/' + eventSlug + '/' + kind + '/' + id + '.' + ext;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type
  });
  if (error) throw error;
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  assert(publicData && publicData.publicUrl, 'Upload completed but its media URL could not be created.');
  return {
    id, name: file.name, path: data.path, url: publicData.publicUrl,
    type: file.type, kind, size: file.size, uploadedAt: new Date().toISOString()
  };
}

export async function removeInvitationMedia(path) {
  assert(typeof path === 'string' && path.length > 0, 'Media path is missing.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  assert(auth && auth.user, 'Please sign in before removing media.');
  assert(path.startsWith(auth.user.id + '/'), 'You can only remove your own invitation media.');
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
  return true;
}
