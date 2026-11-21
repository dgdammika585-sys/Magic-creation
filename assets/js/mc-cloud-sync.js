// MAGIC CREATIONS — shared local-first cloud sync for Dashboard and Event Workspace.
import { getSignedInCustomer, listMyInvitations, saveMyInvitation } from './mc-cloud-store.js';

const STORAGE_KEY = 'magic_creations_workspace_v1';
const OWNER_KEY = 'magic_creations_workspace_owner_v1';
const ACCOUNT_STORAGE_PREFIX = STORAGE_KEY + ':account:';
const LEGACY_STORAGE_KEY = STORAGE_KEY + ':legacy-unassigned';
let activeOwnerId = null;
let pendingState = null;
let pendingTimer = null;
let syncInProgress = false;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// The old prototype used one shared localStorage key for every signed-in user.
// Never import that shared state into a different customer's cloud account.
function stateForSignedInOwner(currentState, ownerId) {
  let storedOwner = null;
  try { storedOwner = localStorage.getItem(OWNER_KEY); } catch (error) {}
  if (storedOwner === ownerId) return currentState;

  try {
    if (currentState && Array.isArray(currentState.events) && currentState.events.length) {
      const backupKey = storedOwner
        ? ACCOUNT_STORAGE_PREFIX + storedOwner
        : LEGACY_STORAGE_KEY;
      localStorage.setItem(backupKey, JSON.stringify(currentState));
    }
    const scoped = localStorage.getItem(ACCOUNT_STORAGE_PREFIX + ownerId);
    if (scoped) {
      const parsed = JSON.parse(scoped);
      if (parsed && Array.isArray(parsed.events)) return parsed;
    }
  } catch (error) {
    // If account-scoped storage cannot be read, fail closed with an empty state.
  }
  return { active: null, events: [] };
}

function bindLocalStateToOwner(ownerId) {
  if (activeOwnerId && activeOwnerId !== ownerId) {
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = null;
    pendingState = null;
  }
  activeOwnerId = ownerId;
  try { localStorage.setItem(OWNER_KEY, ownerId); } catch (error) {}
}
function slugOf(event) {
  return String(event && (event.invitationSlug || event.invitationTitle || event.names || event.title) || '')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
function persistLocal(state) {
  if (!activeOwnerId) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(ACCOUNT_STORAGE_PREFIX + activeOwnerId, JSON.stringify(state));
    localStorage.setItem(OWNER_KEY, activeOwnerId);
    return true;
  } catch (error) { return false; }
}
function mergeRemoteIntoLocal(localState, remoteEvents) {
  const state = localState && Array.isArray(localState.events) ? localState : { active: null, events: [] };
  const local = state.events.slice();
  const merged = [];
  const usedRemote = new Set();

  local.forEach((event) => {
    const slug = slugOf(event);
    const index = remoteEvents.findIndex((remote, i) =>
      !usedRemote.has(i) && ((event._cloudId && remote._cloudId === event._cloudId) ||
      (slug && remote.invitationSlug === slug))
    );
    if (index < 0) {
      merged.push(event);
      return;
    }
    usedRemote.add(index);
    const remote = remoteEvents[index];
    const localTime = (event._localUpdatedAt ? Date.parse(event._localUpdatedAt) : 0) || 0;
    const cloudTime = (remote._cloudUpdatedAt ? Date.parse(remote._cloudUpdatedAt) : 0) || 0;
    if (localTime > cloudTime) {
      merged.push({ ...event, _cloudId: remote._cloudId, _cloudUpdatedAt: remote._cloudUpdatedAt, published: Boolean(remote.published), ...(remote.published ? {} : { link: '' }) });
    } else {
      merged.push({ ...remote, id: event.id || remote.id });
    }
  });

  remoteEvents.forEach((event, index) => {
    if (!usedRemote.has(index)) merged.push(event);
  });
  state.events = merged;
  if (state.active === 'event-demo' && remoteEvents.length) state.active = remoteEvents[0].id;
  if (!state.active || !merged.some((event) => event.id === state.active)) {
    state.active = merged[0] ? merged[0].id : null;
  }
  return state;
}

async function syncSnapshot(snapshot, onStatus) {
  if (syncInProgress) {
    pendingState = snapshot;
    return;
  }
  syncInProgress = true;
  const ownerAtStart = activeOwnerId;
  try {
    const user = await getSignedInCustomer();
    if (!ownerAtStart || activeOwnerId !== ownerAtStart || ownerAtStart !== user.id) {
      throw new Error('Customer account changed. Reload before syncing invitation data.');
    }
    const remote = await listMyInvitations();
    if (activeOwnerId !== ownerAtStart) throw new Error('Customer account changed during sync. Reload before saving.');
    const next = mergeRemoteIntoLocal(snapshot, remote);
    for (const event of next.events) {
      if (activeOwnerId !== ownerAtStart) throw new Error('Customer account changed during sync. Reload before saving.');
      if (!event || event.id === 'event-demo') continue;
      const slug = slugOf(event);
      if (!slug || !(event.names || event.title || event.invitationTitle)) continue;
      const cloudMatch = remote.find((row) =>
        (event._cloudId && row._cloudId === event._cloudId) || row.invitationSlug === slug
      );
      if (cloudMatch) {
        const localTime = Date.parse(event._localUpdatedAt || 0) || 0;
        const cloudTime = (cloudMatch._cloudUpdatedAt ? Date.parse(cloudMatch._cloudUpdatedAt) : 0) || 0;
        if (localTime <= cloudTime) continue;
        event._cloudId = cloudMatch._cloudId;
      }
      const saved = await saveMyInvitation(event, cloudMatch && cloudMatch._cloudUpdatedAt
        ? { expectedUpdatedAt: cloudMatch._cloudUpdatedAt } : {});
      event._cloudId = saved._cloudId;
      event._cloudUpdatedAt = saved._cloudUpdatedAt;
      event.published = Boolean(saved.published);
      if (!event.published) event.link = '';
      delete event._localUpdatedAt;
    }
    if (activeOwnerId !== ownerAtStart) throw new Error('Customer account changed before local sync could finish.');
    persistLocal(next);
    if (typeof onStatus === 'function') onStatus('saved', next);
    return next;
  } catch (error) {
    if (typeof onStatus === 'function') onStatus('error', error);
    return null;
  } finally {
    syncInProgress = false;
    if (pendingState) {
      const latest = pendingState;
      pendingState = null;
      syncSnapshot(latest, onStatus);
    }
  }
}

export async function publishInvitation(event) {
  if (!event || typeof event !== 'object') throw new Error('Invitation details are missing.');
  const user = await getSignedInCustomer();
  if (!activeOwnerId || activeOwnerId !== user.id) throw new Error('Customer account changed. Reload before publishing.');
  const saved = await saveMyInvitation({ ...event, published: true }, {
    publish: true,
    ...(event._cloudUpdatedAt ? { expectedUpdatedAt: event._cloudUpdatedAt } : {})
  });
  if (!saved || !saved._cloudId || !saved.published) throw new Error('The invitation was not confirmed as published.');
  return saved;
}

export async function unpublishInvitation(event) {
  if (!event || typeof event !== 'object') throw new Error('Invitation details are missing.');
  const user = await getSignedInCustomer();
  if (!activeOwnerId || activeOwnerId !== user.id) throw new Error('Customer account changed. Reload before unpublishing.');
  return saveMyInvitation({ ...event, published: false }, {
    unpublish: true,
    ...(event._cloudUpdatedAt ? { expectedUpdatedAt: event._cloudUpdatedAt } : {})
  });
}

export async function hydrateLocalState(state, onStatus) {
  try {
    const user = await getSignedInCustomer();
    const ownerState = stateForSignedInOwner(state, user.id);
    bindLocalStateToOwner(user.id);
    const remote = await listMyInvitations();
    if (activeOwnerId !== user.id) throw new Error('Customer account changed during invitation loading. Reload the page.');
    const merged = mergeRemoteIntoLocal(clone(ownerState), remote);
    // Only drafts already bound to this same customer account can reach this
    // point. Unassigned legacy drafts are kept in a separate local backup and
    // are never silently uploaded to whichever account signs in first.
    for (const event of merged.events) {
      if (activeOwnerId !== user.id) throw new Error('Customer account changed during invitation loading. Reload the page.');
      if (!event || event.id === 'event-demo') continue;
      if (!slugOf(event) || !(event.names || event.title || event.invitationTitle)) continue;
      if (event._cloudId) {
        const remoteRow = remote.find((row) => row._cloudId === event._cloudId);
        if (!remoteRow) continue;
        const localTime = (event._localUpdatedAt ? Date.parse(event._localUpdatedAt) : 0) || 0;
        const cloudTime = (remoteRow._cloudUpdatedAt ? Date.parse(remoteRow._cloudUpdatedAt) : 0) || 0;
        if (event._cloudUpdatedAt && event._cloudUpdatedAt !== remoteRow._cloudUpdatedAt) {
          event._syncConflict = true;
          if (typeof onStatus === 'function') onStatus('conflict', event);
          continue;
        }
        if (localTime <= cloudTime) continue;
      }
      const saved = await saveMyInvitation(event, event._cloudId && event._cloudUpdatedAt
        ? { expectedUpdatedAt: event._cloudUpdatedAt } : {});
      event._cloudId = saved._cloudId;
      event._cloudUpdatedAt = saved._cloudUpdatedAt;
      event.published = Boolean(saved.published);
      if (!event.published) event.link = '';
      delete event._syncConflict;
      delete event._localUpdatedAt;
    }
    if (activeOwnerId !== user.id) throw new Error('Customer account changed before invitation loading could finish.');
    persistLocal(merged);
    if (typeof onStatus === 'function') onStatus('saved', merged);
    return merged;
  } catch (error) {
    if (typeof onStatus === 'function') onStatus('error', error);
    return state;
  }
}

export function queueLocalStateSync(state, onStatus) {
  if (!activeOwnerId) return;
  pendingState = clone(state);
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    const snapshot = pendingState;
    pendingState = null;
    syncSnapshot(snapshot, onStatus);
  }, 1200);
}
