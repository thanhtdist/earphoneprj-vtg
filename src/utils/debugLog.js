// The one switch behind every piece of on-screen debugging: the log panel, the counters it
// pins, and the getUserMedia wrapper that feeds them.
//
// On under `npm start`, off in a build — and in a build it can still be turned on for one
// device, which is the only way to read anything from an iPhone on a deployed environment:
//
//   ?debug=1   turn it on, and remember it
//   ?debug=0   turn it off again
//
// The choice is kept in localStorage so it survives a reload and follows the user from the
// guide page to the listener page, both of which need it at once to compare the two sides.
// Nothing is remembered unless a `debug` parameter was actually passed, so production stays
// clean for everyone who never asks for it.

const STORAGE_KEY = 'debugLog';
const ON = 'on';

// localStorage is not always readable — Safari throws on access in private browsing rather
// than returning null, and that must not take the page down
const readChoice = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    // No storage, so no remembered choice
    return null;
  }
};

const rememberChoice = (value) => {
  try {
    if (value === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  } catch (error) {
    // Then it lasts for this page only, which is still enough to read the panel
  }
};

const resolve = () => {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  const parameter = new URLSearchParams(window.location.search).get('debug');
  if (parameter === '1') {
    rememberChoice(ON);
    return true;
  }
  if (parameter === '0') {
    rememberChoice(null);
    return false;
  }
  return readChoice() === ON;
};

// Resolved once, at import: the answer cannot change without a navigation, and every caller
// has to agree on it — a panel that renders while the console is not being captured, or the
// other way round, would be worse than either state
const enabled = resolve();

export const isDebugLogEnabled = () => enabled;
