// What this browser remembers about its place in each tour, so a reload rejoins as the same
// attendee and chat identity instead of a new one.
//
// Kept in localStorage, not in cookies. A cookie travels in the header of every request to the
// site, and one per tour holding the whole Chime meeting and attendee objects pushed the header
// past the host's limit after about seven tours in a day: the site answered "400 Request Header
// Or Cookie Too Large" before the page could even load. Nothing on the server ever read them.
//
// Only what cannot be fetched again is stored. The meeting itself is not: every screen fetches
// the tour's live meeting before it decides to reuse anything, and only reuses when the stored
// meetingId matches it, so the live object is the one to join with. The attendee's JoinToken
// cannot be fetched from the browser, so the attendee is kept, trimmed to what the SDK needs.
//
// Lifetimes: an entry lives a day, as the cookie did, and at most MAX_TOURS tours are kept, so
// the store stays bounded however many tours one device goes through.
//
// Every access is wrapped: Safari throws on localStorage in private browsing instead of
// returning null. Without storage nothing is remembered, and the next join starts fresh.

const STORAGE_KEY = 'vtg.tourSessions';
const VERSION = 1;
const ENTRY_LIFETIME_MS = 24 * 60 * 60 * 1000;
const MAX_TOURS = 20;

// The roles the screens store under - also the prefixes of the cookies this replaces
const LEGACY_COOKIE_PREFIXES = ['Main-Guide', 'Sub-Guide', 'User'];

const emptyStore = () => ({ version: VERSION, sessions: {} });

const readStore = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyStore();
    }
    const store = JSON.parse(raw);
    // Another shape means another version of this file wrote it; start over rather than guess
    if (store?.version !== VERSION || typeof store.sessions !== 'object' || store.sessions === null) {
      return emptyStore();
    }
    return store;
  } catch (error) {
    return emptyStore();
  }
};

const writeStore = (store) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    // No storage, or it is full: this join is simply not remembered
    console.warn('Could not save the tour session:', error);
  }
};

const isUsable = (entry, now) =>
  Boolean(entry)
  && entry.expiresAt > now
  && typeof entry.meetingId === 'string'
  && Boolean(entry.attendee?.AttendeeId)
  && Boolean(entry.attendee?.JoinToken);

// Drop expired entries, then keep only the MAX_TOURS tours saved most recently
const prune = (store, now) => {
  const tours = Object.entries(store.sessions)
    .map(([tourId, roles]) => {
      const live = Object.fromEntries(
        Object.entries(roles || {}).filter(([, entry]) => isUsable(entry, now))
      );
      const lastSavedAt = Math.max(0, ...Object.values(live).map((entry) => entry.savedAt || 0));
      return { tourId, live, lastSavedAt };
    })
    .filter(({ live }) => Object.keys(live).length > 0)
    .sort((a, b) => b.lastSavedAt - a.lastSavedAt)
    .slice(0, MAX_TOURS);
  return {
    version: VERSION,
    sessions: Object.fromEntries(tours.map(({ tourId, live }) => [tourId, live])),
  };
};

/**
 * Remember this browser's place in a tour for one role.
 * @param {string} tourId
 * @param {'Main-Guide'|'Sub-Guide'|'User'} role
 * @param {{ meeting: Object, attendee: Object, userArn: string, channelArn: string }} session
 */
const saveTourSession = (tourId, role, { meeting, attendee, userArn, channelArn }) => {
  const now = Date.now();
  const store = readStore();
  store.sessions[tourId] = {
    ...(store.sessions[tourId] || {}),
    [role]: {
      meetingId: meeting?.MeetingId,
      attendee: {
        AttendeeId: attendee?.AttendeeId,
        ExternalUserId: attendee?.ExternalUserId,
        JoinToken: attendee?.JoinToken,
      },
      userArn,
      channelArn,
      savedAt: now,
      expiresAt: now + ENTRY_LIFETIME_MS,
    },
  };
  writeStore(prune(store, now));
};

/**
 * What this browser remembers for a tour and role, or null when there is nothing usable.
 * @returns {{ meetingId: string, attendee: Object, userArn: string, channelArn: string } | null}
 */
const loadTourSession = (tourId, role) => {
  const entry = readStore().sessions[tourId]?.[role];
  return isUsable(entry, Date.now()) ? entry : null;
};

const clearTourSession = (tourId, role) => {
  const store = readStore();
  if (!store.sessions[tourId]?.[role]) {
    return;
  }
  delete store.sessions[tourId][role];
  writeStore(prune(store, Date.now()));
};

// Once per page load: keep the store bounded even when nothing new is saved
const pruneTourSessions = () => {
  const store = readStore();
  if (Object.keys(store.sessions).length > 0) {
    writeStore(prune(store, Date.now()));
  }
};

// Once per page load: delete the per-tour cookies earlier builds wrote. Only cookies whose value
// is the old { meeting, attendee } JSON go, so accessToken, refreshToken and i18next are left
// alone. A browser already past the header limit never gets here - the 400 comes before the
// page loads - and recovers when those cookies expire, a day after they were written
const dropLegacyTourCookies = () => {
  try {
    document.cookie.split(';').forEach((cookie) => {
      const separator = cookie.indexOf('=');
      const name = cookie.slice(0, separator).trim();
      if (separator < 0 || !LEGACY_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
        return;
      }
      try {
        const value = JSON.parse(decodeURIComponent(cookie.slice(separator + 1)));
        if (value?.meeting && value?.attendee) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        }
      } catch (error) {
        // Not one of ours
      }
    });
  } catch (error) {
    console.warn('Could not remove the old tour cookies:', error);
  }
};

const TourSessionStore = {
  saveTourSession,
  loadTourSession,
  clearTourSession,
  pruneTourSessions,
  dropLegacyTourCookies,
};

export default TourSessionStore;
