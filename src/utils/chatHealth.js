// Whether this page's chat is actually connected to the channel it thinks it joined.
//
// Three pinned lines, the same shape as the meeting health lines in meetingHealth.js. Numbered
// 13, 14, 18 to continue the single step sequence DebugLogPanel.js pins across every tag - after
// [Meeting]'s 10-12 and 15-17 - so a step number is never reused by two different tags:
//
//   [Chat] 13. identity   — which channel this page expects, and which channel it is really
//                           receiving traffic from
//   [Chat] 14. connection — what the messaging session is doing right now
//   [Chat] 18. transition — which channel id the join flow picked, and why, whenever there was
//                           a previous one to compare against
//
// Step 13 is the one that answers "did this device join the right channel": the ARN passed in
// as a prop only says what was asked for, not what was joined. A channel that no longer exists,
// or an addChannelMembership that silently failed upstream, leaves the messaging session
// connected with nothing to prove it — this page would look healthy while receiving nothing.
// Every ChannelMessage record (live or from history) carries its own ChannelArn from the
// server, so the first one received is proof of which channel this session is really in.
//
// Nothing here writes to the console unless the panel is on — see utils/debugLog.

import { isDebugLogEnabled } from './debugLog';

const log = (text) => {
  if (isDebugLogEnabled()) {
    console.log(text);
  }
};

const pinned = (step, text, healthy) =>
  log(`[Chat] ${step}. ${text} — ${healthy ? 'ok' : 'check'}`);

// Channel ARNs end in ".../channel/<id>"; the id is enough to tell two of them apart
const short = (arn) => (arn ? `${arn}`.split('/').pop() : '?');

/* ------------------------------------------------------------------ *
 * 13. Which channel, and does the traffic match it?
 * ------------------------------------------------------------------ */

/**
 * Record which channel this page expects to be in, before any message has arrived to confirm it.
 */
export const logChannelExpectation = (expectedChannelArn) => {
  pinned(13, `expecting ${short(expectedChannelArn)} · no message received yet`, true);
};

/**
 * Compare the channel this page expected against the ChannelArn a received message actually
 * reports. Call this from `messagingSessionDidReceiveMessage`, once per event.
 */
export const logChannelIdentity = (expectedChannelArn, reportedChannelArn) => {
  if (!reportedChannelArn) {
    return;
  }
  const matches = expectedChannelArn === reportedChannelArn;
  pinned(
    13,
    matches
      ? `receiving from ${short(reportedChannelArn)} · matches`
      : `receiving from ${short(reportedChannelArn)} · expected ${short(expectedChannelArn)}`,
    matches
  );
};

/* ------------------------------------------------------------------ *
 * 14. Is the messaging session connected?
 * ------------------------------------------------------------------ */

/**
 * Follow the messaging session through connecting, started and stopped, the same way
 * `watchMeetingConnection` follows the audio session. A separate observer from the one the
 * component itself installs, so this keeps working even if that observer changes.
 *
 * `channelArn` is the channel this page expects - the messaging session's own configuration
 * carries no channel (that lives in the membership, not the session), so it is passed in and
 * carried in every line below the same way `watchMeetingConnection` carries its meeting id.
 */
export const watchChatConnection = (messagingSession, channelArn) => {
  if (!isDebugLogEnabled() || !messagingSession) {
    return;
  }
  const channel = short(channelArn);
  pinned(14, `channel ${channel} · not started yet`, false);
  messagingSession.addObserver({
    messagingSessionDidStartConnecting: (reconnecting) => {
      pinned(14, `channel ${channel} · ${reconnecting ? 'reconnecting…' : 'connecting…'}`, false);
    },
    messagingSessionDidStart: () => {
      pinned(14, `channel ${channel} · connected`, true);
    },
    messagingSessionDidStop: (event) => {
      pinned(14, `channel ${channel} · stopped: code ${event?.code} ${event?.reason || ''}`.trim(), false);
    },
  });
};

/* ------------------------------------------------------------------ *
 * 18. Did the channel id change since this page last had one, and why?
 * ------------------------------------------------------------------ */

/**
 * The channel-side counterpart to `logMeetingTransition` in meetingHealth.js: call it at every
 * point the join flow (Guide / Sub-Guide / Viewer, before ChatMessage even mounts) decides
 * which channel to use next, whenever there is a "before" to compare against. Accepts either a
 * full channelArn or a bare channel id on either side - `short()` reduces both to the same form.
 * Always logged as "ok"; step 13/14 are what judge whether the result is actually healthy.
 */
export const logChannelTransition = (before, after, reason) => {
  if (!isDebugLogEnabled()) {
    return;
  }
  const changed = short(before) !== short(after);
  pinned(
    18,
    changed
      ? `channel ${short(before)} → ${short(after)} · ${reason}`
      : `channel ${short(after)} unchanged · ${reason}`,
    true
  );
};
