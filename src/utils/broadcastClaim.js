/**
 * Whether another Main-Guide device is already in the meeting, purely for a heads-up notice.
 *
 * Since a guide device without a cookie joins the meeting the tour already points at
 * instead of opening its own, several Main-Guide devices can sit in the same meeting at
 * once: a second phone, a private tab, a colleague who scanned the guide QR code. Every one
 * of them is free to broadcast - the mic button is never disabled - this only tells a guide
 * whose own mic is still off that someone else is already on air, so listeners hearing two
 * microphones mixed together is expected rather than a surprise.
 *
 * The state is read from the attendee roster alone. A device that arrives and finds another
 * Main-Guide already in the meeting is told so; a device that finds the meeting empty of
 * guides is not. No server, no lock and no message of our own is involved - each device only
 * has to look at who was there when it arrived.
 *
 * The state is kept once settled to "another guide is here" for the rest of the session: a
 * guide that left and returned still sees the notice on a device that noticed it earlier.
 */

// externalUserId is "Guide|1786951626999": the role, then the moment the attendee was made.
// The role is what tells a main guide apart from a sub-guide or a listener in the roster
export const MAIN_GUIDE_ROLE = 'Guide';

// How long to keep listening after our own attendee shows up before deciding. The roster of
// everyone already in the meeting arrives in the same burst as our own presence, so this is
// only a margin for the rest of that burst, not a wait for something that may never come
export const CLAIM_SETTLE_MS = 1200;

// Used when presence never reports us at all - a signaling connection that never came up.
// Deciding late is better than leaving the guide with a microphone that can never be started
export const CLAIM_SETTLE_FALLBACK_MS = 10000;

// The three states of the claim. 'checking' is the roster still being read, and is what the
// page starts on: assuming the microphone is free before looking is what lets two go live
export const CLAIM_CHECKING = 'checking';
export const CLAIM_GRANTED = 'granted';
export const CLAIM_BLOCKED = 'blocked';

/**
 * The role an attendee joined the meeting under, or null when it carries no role.
 * @param {string} externalUserId - The external user ID reported by the presence event.
 * @returns {string|null} The part before the bar, e.g. "Guide", "Sub-Guide", "User".
 */
export const attendeeRole = (externalUserId) => {
  if (!externalUserId) {
    return null;
  }
  return `${externalUserId}`.split('|')[0] || null;
};

/**
 * Is this attendee another main guide, i.e. a device that could broadcast?
 * @param {string} externalUserId - The external user ID reported by the presence event.
 * @returns {boolean} True for a Main-Guide attendee, false for sub-guides and listeners.
 */
export const isMainGuide = (externalUserId) => attendeeRole(externalUserId) === MAIN_GUIDE_ROLE;
