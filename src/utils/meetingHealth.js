// Whether this page is talking to a meeting that actually exists, and who else is in it.
//
// Three pinned lines, the same on the guide and the listener screens:
//
//   [Meeting] 10. identity   — which meeting is being joined, and where the id came from
//   [Meeting] 11. connection — what the session is doing right now
//   [Meeting] 12. attendees  — who the server says is in the meeting
//
// These exist because a session can fail in a way that leaves every audio step looking
// healthy. A meeting id kept in a cookie outlives the meeting it names: the page joins,
// signaling answers `4410 meeting unavailable`, the session stops — and six seconds later
// the microphone opens, Voice Focus engages and `realtimeUnmuteLocalAudio` returns true,
// all into a session that is no longer connected. Steps 4, 5, 6 and 9 cannot tell that
// apart from a working broadcast, because from their side nothing is wrong.
//
// Step 12 is the one that answers "are the two sides in the same meeting": presence is
// reported by the server, so an attendee only appears here if the meeting is live and
// both pages reached it. On a dead meeting the callback never fires at all.
//
// Nothing here writes to the console unless the panel is on — see utils/debugLog.

import { MeetingSessionStatusCode } from 'amazon-chime-sdk-js';
import { isDebugLogEnabled } from './debugLog';

const log = (text) => {
  if (isDebugLogEnabled()) {
    console.log(text);
  }
};

const pinned = (step, text, healthy) =>
  log(`[Meeting] ${step}. ${text} — ${healthy ? 'ok' : 'check'}`);

// Meeting and attendee ids are long random strings; the first block is enough to tell two
// of them apart, and a full one wraps to three lines on a phone
const short = (id) => (id ? `${id}`.split('-')[0] : '?');

/* ------------------------------------------------------------------ *
 * 10. Which meeting, and does it match the tour?
 * ------------------------------------------------------------------ */

// The meeting id the tour currently points at, as last read from the backend. Kept here
// rather than threaded through props: the value is read in one place and needed in another,
// and it describes the page, not any one component
let tourMeetingId = null;

/** Record the meeting id the tour points at, from `getMeetingByTourId`. */
export const noteTourMeetingId = (meetingId) => {
  tourMeetingId = meetingId || null;
};

/**
 * Record which meeting this page is about to join.
 *
 * @param meetingId the id being joined
 * @param source where it came from:
 *        'created' — createMeeting() just returned it, on the guide screens only
 *        'api'     — resolved from the tour record, so it should equal it
 *        'cookie'  — read from this device's cookie, so it may be anything
 */
export const logMeetingIdentity = (meetingId, source) => {
  if (!isDebugLogEnabled()) {
    return;
  }
  // A meeting that was just created is the new truth, not a mismatch. The tour record is
  // repointed at it by `updateMeetingIdAndChannelId` a few calls later in the same flow, so
  // at this moment the tour still names the previous one. Comparing them here would mark the
  // healthy path red — adopt the new id as the tour's instead, for the comparisons that follow
  if (source === 'created') {
    tourMeetingId = meetingId || tourMeetingId;
    pinned(10, `joining ${short(meetingId)} · newly created, the tour is being repointed at it`, true);
    return;
  }
  const facts = [`joining ${short(meetingId)} from ${source || 'unknown'}`];
  // Only the cookie can disagree with the tour; a mismatch means the page is about to join
  // a meeting nobody else is in, which is the failure this step exists for
  if (!tourMeetingId) {
    facts.push('tour meeting not read yet');
    pinned(10, facts.join(' · '), true);
    return;
  }
  const matches = tourMeetingId === meetingId;
  facts.push(matches ? `matches the tour` : `tour has ${short(tourMeetingId)}`);
  pinned(10, facts.join(' · '), matches);
};

/* ------------------------------------------------------------------ *
 * 11. Is the session connected?
 * ------------------------------------------------------------------ */

// MeetingSessionStatusCode is a numeric enum, so it reverse-maps to the name
const statusName = (code) => {
  try {
    return MeetingSessionStatusCode[code] || `code ${code}`;
  } catch (error) {
    return `code ${code}`;
  }
};

/**
 * Follow the session through connecting, started and stopped.
 *
 * `audioVideoDidStop` is the one that matters: nothing in the application reacts to it
 * today, so a session that ended keeps a UI that says it is broadcasting.
 */
export const watchMeetingConnection = (session) => {
  if (!isDebugLogEnabled() || !session?.audioVideo) {
    return;
  }
  pinned(11, 'not started yet', false);
  session.audioVideo.addObserver({
    audioVideoDidStartConnecting: (reconnecting) => {
      pinned(11, reconnecting ? 'reconnecting…' : 'connecting…', false);
    },
    audioVideoDidStart: () => {
      pinned(11, 'connected', true);
    },
    audioVideoDidStop: (sessionStatus) => {
      const code = sessionStatus?.statusCode?.();
      const name = statusName(code);
      // MeetingEnded means the id was accepted but the meeting behind it is gone — the
      // cookie case. Anything else is a genuine disconnect
      const hint = code === MeetingSessionStatusCode.MeetingEnded
        ? ' — the meeting id is stale, clear the cookie'
        : '';
      pinned(11, `stopped: ${name} (${code})${hint}`, false);
    },
  });
};

/* ------------------------------------------------------------------ *
 * 12. Who is in the meeting?
 * ------------------------------------------------------------------ */

// externalUserId is "Guide|1786951626999" — the part before the bar is the role, which is
// what makes this readable: "Guide, User ×2" answers the question, a list of uuids does not
const roleOf = (externalUserId, attendeeId) =>
  (externalUserId ? `${externalUserId}`.split('|')[0] : null) || short(attendeeId);

const describeRoles = (roles) => {
  const counts = {};
  for (const role of roles) {
    counts[role] = (counts[role] || 0) + 1;
  }
  return Object.keys(counts)
    .sort()
    .map(role => (counts[role] > 1 ? `${role} ×${counts[role]}` : role))
    .join(', ');
};

/**
 * Track the roster the server reports.
 *
 * Presence comes from the signaling connection, so this is proof the meeting is live and
 * this page is really in it — stronger than anything read off the local session object.
 * A guide that never sees itself appear here is not in a meeting at all.
 */
export const watchMeetingAttendees = (session) => {
  if (!isDebugLogEnabled() || !session?.audioVideo) {
    return;
  }
  const present = new Map();
  pinned(12, 'no attendee reported yet', false);
  session.audioVideo.realtimeSubscribeToAttendeeIdPresence(
    (attendeeId, isPresent, externalUserId) => {
      try {
        if (isPresent) {
          present.set(attendeeId, roleOf(externalUserId, attendeeId));
        } else {
          present.delete(attendeeId);
        }
        const roles = Array.from(present.values());
        // One attendee is this page alone — the meeting is live but nobody is listening yet.
        // That is not an error, so it stays "ok"; the count is what the reader needs
        pinned(
          12,
          roles.length
            ? `attendees ×${roles.length} · ${describeRoles(roles)}`
            : 'nobody in the meeting',
          roles.length > 0
        );
      } catch (error) {
        console.error('[Meeting] 12. could not read the attendee presence:', error);
      }
    }
  );
};
