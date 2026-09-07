// A Chime meeting record can exist and be joinable while the Guide who is meant to be
// broadcasting into it has not actually joined yet - e.g. the tour's meetingId was just
// written to the DB but the Guide's own session/mic negotiation hasn't finished, or the
// Guide's connection dropped after this Listener already joined. getMeeting (the 404/200
// check the "waiting for guide" poll already uses) cannot see this - it only confirms the
// meeting object exists, not who is actually in it.
//
// This tracks the live Chime attendee roster instead, over the same signaling connection
// presence is already reported on, and calls back only on a Guide/no-Guide transition, not on
// every attendee join/leave (a Listener joining or leaving is not interesting here).
//
// Subscribing after the Guide already joined still works correctly: the SDK replays the
// current roster to a new subscriber. Confirmed by manual testing - Guide joins, waits ~20s,
// Listener joins, and the Listener's very first presence callback already reports the Guide.
export const watchGuidePresence = (session, onChange) => {
  if (!session?.audioVideo) {
    return;
  }
  const guidesPresent = new Set();
  // Nobody confirmed yet. Set before subscribing, so that if the SDK's roster replay (see
  // above) calls back synchronously it is this line it overwrites, not the other way around
  onChange(false);
  session.audioVideo.realtimeSubscribeToAttendeeIdPresence(
    (attendeeId, isPresent, externalUserId) => {
      // externalUserId is "Guide|<timestamp>" - see meetingHealth.js's roleOf for the same
      // convention used there for the debug panel
      const role = externalUserId ? `${externalUserId}`.split('|')[0] : null;
      if (role !== 'Guide') {
        return;
      }
      if (isPresent) {
        guidesPresent.add(attendeeId);
      } else {
        guidesPresent.delete(attendeeId);
      }
      onChange(guidesPresent.size > 0);
    }
  );
};
