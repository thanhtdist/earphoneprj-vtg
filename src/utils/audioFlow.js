// Where sound stops on its way from the guide's microphone to a listener's speaker. Three
// pinned lines, on two different pages:
//
//   guide     [Audio] 9. outgoing audio — the microphone is producing signal and it is sent
//   listener  [Audio] 7. incoming audio — packets arrive, and they carry signal
//   listener  [Audio] 8. audio element  — the page is playing them out loud
//
// The levels come from `RTCInboundRtpStreamStats.audioLevel` and `RTCAudioSourceStats
// .audioLevel`, which the SDK surfaces as observable metrics. Reading them costs nothing and
// touches nothing — the alternative, tapping the stream with an AnalyserNode, would mean
// running a live WebRTC stream through Web Audio, which on iOS can silence the element it is
// measuring.
//
// Everything is driven by the SDK's `metricsDidReceive`, which fires about once a second
// while the session is connected, so there is no timer here and no risk of flooding the log.
//
// See docs/report/listener-hears-crackling-before-anyone-speaks.md.

import { isDebugLogEnabled } from './debugLog';

const log = (text) => {
  if (isDebugLogEnabled()) {
    console.log(text);
  }
};

/**
 * Whether `?vf=0` was passed, which runs the microphone raw.
 *
 * Voice Focus sits between the capture and the meeting and can remove signal as well as
 * noise — noise suppression can gate a voice it misclassifies, and echo reduction subtracts
 * a far-end reference that, if wrong, takes the speaker's own voice with it. Either leaves
 * exactly what a listener describes as a faint hiss. This makes the two cases comparable on
 * the same device without an edit and a reload of the whole app.
 *
 * Not remembered: an experiment should not outlive the tab it was run in.
 */
export const isVoiceFocusDisabled = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return new URLSearchParams(window.location.search).get('vf') === '0';
};

const pinned = (step, text, healthy) =>
  log(`[Audio] ${step}. ${text} — ${healthy ? 'ok' : 'check'}`);

const round = (value, places = 0) =>
  typeof value === 'number' && isFinite(value) ? Number(value.toFixed(places)) : null;

// audioLevel is 0..1 against full scale. Room tone and line noise sit around 0.001-0.005;
// speech peaks from roughly 0.05 upwards. The threshold has to sit above the noise floor,
// not just above zero — a peak of 0.0027 is a microphone that captured nothing but the room
const SPEECH = 0.01;
const level = (value) =>
  typeof value === 'number' && isFinite(value) ? value.toFixed(4) : '?';

// The instantaneous level is almost always low — nobody talks continuously — so the peak
// since the page loaded is what answers "has any sound ever come through this path"
const peaks = { in: 0, out: 0 };

const trackPeak = (key, value) => {
  if (typeof value === 'number' && isFinite(value) && value > peaks[key]) {
    peaks[key] = value;
  }
  return peaks[key];
};

/* ------------------------------------------------------------------ *
 * 7. Listener: is audio arriving, and does it carry sound?
 * ------------------------------------------------------------------ */

const reportIncoming = (metrics) => {
  // audioPacketsReceived is already a per-second rate, not a running total
  const packets = round(metrics.audioPacketsReceived);
  const loss = round(metrics.audioPacketsReceivedFractionLoss, 1);
  const jitter = round(metrics.audioDownstreamJitterMs);
  const buffer = round(metrics.audioSpeakerDelayMs);
  const peak = trackPeak('in', metrics.audioDownstreamLevel);

  const facts = [
    `incoming audio ${packets === null ? '?' : packets}/s`,
    `level ${level(metrics.audioDownstreamLevel)} peak ${level(peak)}`,
  ];
  if (loss) {
    facts.push(`loss ${loss}%`);
  }
  if (jitter !== null) {
    facts.push(`jitter ${jitter}ms`);
  }
  if (buffer !== null) {
    facts.push(`buffer ${buffer}ms`);
  }
  // Packets keep flowing even when nobody speaks, so packets alone do not mean sound. A peak
  // still at zero after a while means this listener is being sent silence
  pinned(7, facts.join(' · '), packets > 0 && peak > SPEECH);
};

/* ------------------------------------------------------------------ *
 * 8. Listener: can it be heard?
 * ------------------------------------------------------------------ */

const reportElement = (element) => {
  if (!element) {
    pinned(8, 'audio element missing', false);
    return;
  }
  // `track.muted` is not the user muting anything: it is the browser saying no media is
  // currently flowing into the track, which is the difference between "not playing" and
  // "playing nothing"
  const track = element.srcObject?.getAudioTracks?.()[0];
  const facts = [
    element.paused ? 'paused' : 'playing',
    element.muted ? 'muted' : 'unmuted',
    `vol ${element.volume}`,
    track
      ? `track ${track.readyState}${track.muted ? ', receiving nothing' : ''}${track.enabled ? '' : ', disabled'}`
      : 'no stream bound',
  ];
  const audible = !element.paused &&
    !element.muted &&
    element.volume > 0 &&
    !!track &&
    track.readyState === 'live' &&
    track.enabled &&
    !track.muted;
  pinned(8, facts.join(' · '), audible);
};

/**
 * Listener side: what is arriving and whether it can be heard.
 *
 * @param session the DefaultMeetingSession
 * @param getAudioElement a function returning the element, not the element itself — it is
 *        read on every tick, so a ref that is still empty at subscribe time is fine
 */
export const watchIncomingAudio = (session, getAudioElement) => {
  if (!isDebugLogEnabled() || !session?.audioVideo) {
    return;
  }
  session.audioVideo.addObserver({
    metricsDidReceive: (clientMetricReport) => {
      try {
        reportIncoming(clientMetricReport.getObservableMetrics());
        reportElement(getAudioElement());
      } catch (error) {
        console.error('[Audio] 7. could not read the incoming audio metrics:', error);
      }
    },
  });
};

/* ------------------------------------------------------------------ *
 * 9. Guide: is the microphone producing anything, and is it going out?
 * ------------------------------------------------------------------ */

/**
 * Guide side: whether the captured microphone carries signal and reaches the meeting.
 *
 * This is the other end of step 7. A listener seeing packets arrive at a flat zero level and
 * a guide seeing the same here means the microphone is open but silent; a guide seeing signal
 * while the listener sees none puts the problem in between.
 */
export const watchOutgoingAudio = (session) => {
  if (!isDebugLogEnabled() || !session?.audioVideo) {
    return;
  }
  session.audioVideo.addObserver({
    metricsDidReceive: (clientMetricReport) => {
      try {
        const metrics = clientMetricReport.getObservableMetrics();
        const packets = round(metrics.audioPacketsSent);
        const peak = trackPeak('out', metrics.audioUpstreamLevel);
        const rtt = round(metrics.audioUpstreamRoundTripTimeMs);

        const facts = [
          `outgoing audio ${packets === null ? '?' : packets}/s`,
          `level ${level(metrics.audioUpstreamLevel)} peak ${level(peak)}`,
        ];
        if (rtt !== null) {
          facts.push(`rtt ${rtt}ms`);
        }
        pinned(9, facts.join(' · '), packets > 0 && peak > SPEECH);
      } catch (error) {
        console.error('[Audio] 9. could not read the outgoing audio metrics:', error);
      }
    },
  });
};
