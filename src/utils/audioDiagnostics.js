// Counters for the three things that make a listener hear crackling from a microphone that
// is not being spoken into: the same microphone captured twice, the audio input restarted in
// a loop, and the meeting audio element bound more than once.
//
// Each counter keeps one pinned line in DebugLogPanel, numbered after the [VoiceFocus] steps:
//
//   [Audio] 4. startAudioInput   — how many times the input was started, per device
//   [Audio] 5. live mic streams  — how many capture streams the browser has open right now
//   [Audio] 6. bindAudioElement  — how many times an element was bound, per element
//
// A line ends in "— ok" or "— check", which is what colours it in the panel. "check" is not a
// verdict that something is broken, only that the number is above the one the healthy path
// produces and is worth reading the detail lines for.
//
// Nothing here writes to the console unless the panel is on — see utils/debugLog.
//
// See docs/report/chime-sdk-browser-support.md for the other pinned steps.

import { isDebugLogEnabled } from './debugLog';

const log = (text) => {
  if (isDebugLogEnabled()) {
    console.log(text);
  }
};

const times = (count) => `×${count}`;

// "a ×2 · b" — the breakdown that says which device or element the count belongs to
const describeCounts = (counts) =>
  Object.keys(counts)
    .map(key => (counts[key] > 1 ? `${key} ${times(counts[key])}` : key))
    .join(' · ');

const pinned = (step, text, healthy) =>
  log(`[Audio] ${step}. ${text} — ${healthy ? 'ok' : 'check'}`);

/* ------------------------------------------------------------------ *
 * 4. startAudioInput
 * ------------------------------------------------------------------ */

const starts = { total: 0, sinceStop: 0, at: 0, byDevice: {} };

// What was handed to startAudioInput: a deviceId, a Voice Focus device wrapping one, or a
// MediaStream (the MP3 box passes one of those, and it takes the meeting input over)
const describeAudioDevice = (device) => {
  if (typeof device === 'string') {
    return `device ${device.slice(0, 8)}`;
  }
  if (device && typeof device.getInnerDevice === 'function') {
    const inner = device.getInnerDevice();
    return `${typeof inner === 'string' ? `device ${inner.slice(0, 8)}` : 'device'} (voice focus)`;
  }
  if (typeof MediaStream !== 'undefined' && device instanceof MediaStream) {
    return `stream ${device.id.slice(0, 8)}`;
  }
  return 'device (unknown kind)';
};

/**
 * Record one `audioVideo.startAudioInput()` call.
 * The gap since the previous one is what tells a deliberate device switch apart from the
 * restart loop the iOS route watcher can fall into: that one restarts every 2s, and each
 * restart reopens the capture, which is audible.
 */
export const countStartAudioInput = (device) => {
  const name = describeAudioDevice(device);
  const now = Date.now();
  const gap = starts.at ? `${now - starts.at}ms after #${starts.total}` : 'first';
  starts.total += 1;
  starts.sinceStop += 1;
  starts.at = now;
  starts.byDevice[name] = (starts.byDevice[name] || 0) + 1;

  log(`[Audio] startAudioInput #${starts.total} ${name} · ${gap}`);
  // More than one start with no stop in between means the previous capture was replaced
  // rather than released — the SDK does free it, but only once the new one is open
  pinned(
    4,
    `startAudioInput ${times(starts.total)} · ${describeCounts(starts.byDevice)}` +
      (starts.sinceStop > 1 ? ` · ${starts.sinceStop} since the last stop` : ''),
    starts.sinceStop <= 1
  );
};

/** Record one `audioVideo.stopAudioInput()` call, which closes the run of starts. */
export const countStopAudioInput = () => {
  log(`[Audio] stopAudioInput after ${starts.sinceStop} start(s)`);
  starts.sinceStop = 0;
};

/* ------------------------------------------------------------------ *
 * 5. Live capture streams
 * ------------------------------------------------------------------ */

const liveTracks = new Set();

const reportLiveTracks = () => {
  // A track stopped by something that is not the wrapper below still shows up here until it
  // is swept, so the readyState is what decides
  for (const entry of liveTracks) {
    if (entry.track.readyState === 'ended') {
      liveTracks.delete(entry);
    }
  }
  const byLabel = {};
  for (const entry of liveTracks) {
    byLabel[entry.label] = (byLabel[entry.label] || 0) + 1;
  }
  const duplicated = Object.keys(byLabel).some(label => byLabel[label] > 1);
  pinned(
    5,
    `live mic streams ${times(liveTracks.size)}` +
      (liveTracks.size ? ` · ${describeCounts(byLabel)}` : ''),
    !duplicated && liveTracks.size <= 1
  );
};

const forget = (entry) => {
  if (liveTracks.delete(entry)) {
    log(`[Audio] mic stream ended "${entry.label}" (${entry.id})`);
    reportLiveTracks();
  }
};

const remember = (track) => {
  const entry = { track, label: track.label || 'unlabelled', id: track.id.slice(0, 8) };
  liveTracks.add(entry);
  log(`[Audio] mic stream opened "${entry.label}" (${entry.id})`);

  // Two ways a capture goes away, and only one of them fires an event: `ended` covers the
  // OS taking the route (a headset unplugged), while an explicit stop() is silent. The
  // wrapper is put on this track alone, never on the prototype
  track.addEventListener('ended', () => forget(entry));
  const stop = track.stop.bind(track);
  track.stop = () => {
    stop();
    forget(entry);
  };
};

let watching = false;

/**
 * Count the microphone captures the browser has open, by wrapping `getUserMedia`.
 *
 * This is the one that answers "how many streams for one microphone": the SDK reads
 * `navigator.mediaDevices.getUserMedia` at call time
 * (DefaultDeviceController.js:961), so replacing the property here catches every capture it
 * opens, including the fallback-constraints retry it does on iOS. Two live tracks with the
 * same label is the state that makes a listener hear crackling with nobody speaking.
 *
 * Call before the meeting session is created. Installed only when the panel is on, so a
 * deployment is left with the browser's own getUserMedia unless a device asked for `?debug=1`.
 * It never swallows a failure — the original promise is returned as it is.
 */
export const watchAudioInputStreams = () => {
  if (watching || !isDebugLogEnabled() || !navigator?.mediaDevices?.getUserMedia) {
    return;
  }
  watching = true;
  const original = navigator.mediaDevices.getUserMedia;
  const getUserMedia = original.bind(navigator.mediaDevices);
  const wrapper = async (constraints) => {
    const stream = await getUserMedia(constraints);
    stream.getAudioTracks().forEach(remember);
    reportLiveTracks();
    return stream;
  };
  navigator.mediaDevices.getUserMedia = wrapper;

  // Shadowing a prototype method with an own property is not guaranteed to take — a frozen
  // object or an accessor without a setter would swallow it silently, and then step 5 would
  // read zero forever and look like an answer instead of a broken probe
  if (navigator.mediaDevices.getUserMedia !== wrapper) {
    log('[Audio] 5. capture counter could not be installed — this step means nothing — check');
    return;
  }
  reportLiveTracks();
};

/* ------------------------------------------------------------------ *
 * 6. bindAudioElement
 * ------------------------------------------------------------------ */

const binds = { total: 0, byElement: {} };

/**
 * Record one `audioVideo.bindAudioElement()` call.
 * The healthy path binds once per page: a second bind means the session was initialised
 * twice, and the meeting audio is then playing through two elements at once.
 */
export const countBindAudioElement = (element) => {
  const name = element?.id || element?.tagName?.toLowerCase() || 'audio element';
  binds.total += 1;
  binds.byElement[name] = (binds.byElement[name] || 0) + 1;
  log(`[Audio] bindAudioElement #${binds.total} ${name}`);
  pinned(6, `bindAudioElement ${times(binds.total)} · ${describeCounts(binds.byElement)}`, binds.total <= 1);
};
