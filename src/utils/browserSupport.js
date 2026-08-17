// What the Chime SDK thinks of the browser it is running in.
//
// `DefaultBrowserBehavior` carries its own support table
// (build/browserbehavior/DefaultBrowserBehavior.js:26) and answers `isSupported()` by looking
// the browser up in it — no feature detection, just a name and a major version. Everything
// below is read off that same object, so what is logged is exactly what the SDK will act on.
//
// This is a different question from the one `VoiceFocusDeviceTransformer.isSupported()`
// answers: that one asks whether Voice Focus can run (AudioWorklet, WebAssembly SIMD), and it
// can say no in a browser that is fully supported here.
//
// See docs/report/chime-sdk-browser-support.md.

import { DefaultBrowserBehavior } from 'amazon-chime-sdk-js';
import { isDebugLogEnabled } from './debugLog';

// Anything read off a user agent can be missing or malformed, and a debug line is never
// worth an exception
const optional = (read) => {
  try {
    const value = read();
    return value && !`${value}`.includes('NaN') && !`${value}`.includes('undefined')
      ? value
      : null;
  } catch (error) {
    return null;
  }
};

/**
 * Who is running this page: browser and version, OS and version.
 *
 * Two sources are crossed here because neither is right on its own. `detect-browser`, which
 * the SDK uses, reports the Safari `Version/` token for the `ios` key — and on iOS that
 * token *is* the OS version. `ua-parser-js`, which the SDK also carries, reports the
 * `CPU iPhone OS 18_x` token, which Apple has frozen on modern iOS the same way it froze
 * `AppleWebKit/605.1.15` in 2017. So on an iPhone the second one lies and the first one does
 * not; anywhere else the second one is the only one that names the OS at all.
 *
 * When the two disagree, both are printed rather than one being picked silently.
 */
export const describeBrowserIdentity = () => {
  const behavior = new DefaultBrowserBehavior();
  // `uaParserResult` is an internal field of DefaultBrowserBehavior, but the SDK's own
  // engine()/osMajorVersion() already read it, so it is no more fragile than those
  const parsed = optional(() => behavior.uaParserResult);

  const browser = optional(() => parsed.browser.name) || behavior.name();
  const browserVersion = behavior.version();

  const osName = optional(() => parsed.os.name) || 'unknown OS';
  const uaOsVersion = optional(() => parsed.os.version);
  // On Safari for iOS the browser version and the OS version are the same release
  const osVersion = behavior.name() === 'ios' ? behavior.version() : uaOsVersion;
  const disagrees = uaOsVersion && osVersion && osVersion !== uaOsVersion;

  return `${browser} ${browserVersion} on ${osName} ${osVersion || '?'}` +
    (disagrees ? ` (UA claims ${uaOsVersion})` : '');
};

/**
 * What the SDK makes of it: the key its support table is written in terms of, plus the two
 * capabilities the audio path depends on.
 *
 * The key matters on its own — 'ios' is Safari on iPhone and 'crios' is Chrome on iPhone,
 * and the SDK applies different minimum versions to each.
 */
export const describeBrowserCapabilities = () => {
  const behavior = new DefaultBrowserBehavior();
  return [
    `sdk key "${behavior.name()}"`,
    optional(() => `${behavior.engine()} ${behavior.engineMajorVersion()}`),
    `setSinkId ${behavior.supportsSetSinkId() ? 'yes' : 'no'}`,
    `simulcast ${behavior.isSimulcastSupported() ? 'yes' : 'no'}`,
  ].filter(Boolean).join(' · ');
};

// Whether the SDK will run here at all, ending in the verdict the panel colours the line by
export const describeBrowserSupport = () => {
  const behavior = new DefaultBrowserBehavior();
  const supported = behavior.isSupported();
  // supportString() lists the minimum versions, phrased for the platform it runs on — only
  // useful when the answer was no
  return supported
    ? 'chime supported: true'
    : `chime supported: false — needs ${behavior.supportString()}`;
};

// Three pinned lines in DebugLogPanel, ahead of the [VoiceFocus] steps: who is running the
// page, what the SDK makes of it, and the raw string both of those were derived from.
// Silent unless the panel is on — see utils/debugLog
export const logBrowserSupport = () => {
  if (!isDebugLogEnabled()) {
    return;
  }
  try {
    console.log(`[Browser] 0. ${describeBrowserIdentity()} · ${describeBrowserSupport()}`);
    console.log(`[Browser] 0a. ${describeBrowserCapabilities()}`);
    // Pinned as well, because the parsed numbers above come from tokens Apple freezes for
    // compatibility. Only the raw string settles an argument about what the device really is
    console.log(`[Browser] 0b. UA: ${navigator?.userAgent || 'unavailable'}`);
  } catch (error) {
    console.error('[Browser] 0. could not read the SDK browser support:', error);
  }
};
