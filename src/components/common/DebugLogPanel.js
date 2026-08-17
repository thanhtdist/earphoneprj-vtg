import { useState, useEffect, useRef } from 'react';
import { isDebugLogEnabled } from '../../utils/debugLog';

/**
 * On-screen console, for debugging on a device that cannot be inspected from here:
 * Safari on iPhone needs a Mac, and Chrome on iOS cannot be remote-debugged at all.
 *
 * Rendered under `npm start`, and in a build only for a device that asked for it with
 * `?debug=1` — see utils/debugLog. Otherwise this returns null and the console is left alone.
 */
const MAX_ENTRIES = 300;

// Lines worth reading at a glance are kept out of the scrolling list: the SDK logs at
// INFO and would push them past MAX_ENTRIES long before the panel is opened.
// The capture group is the step number, so each step keeps only its latest result. The steps
// are numbered across all three tags — [Browser] is 0, the [VoiceFocus] ones follow — so they
// stay in the order they happen once sorted. A step may carry a letter ("0a"): sorted as text
// it lands right after its own number and before the next one.
const PINNED_PATTERN = /^\[(?:Browser|VoiceFocus|Audio)\]\s*(\d+[a-z]?)\./;

// Turn console arguments into one readable line without ever throwing on a cyclic object
const formatArgument = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};

// Whether the panel starts out of the way. Remembered, because the phone being debugged is
// reloaded constantly and having to fold the panel again after every reload is its own tax.
const MINIMISED_KEY = 'debugLogMinimised';

const readMinimised = () => {
  try {
    return window.localStorage.getItem(MINIMISED_KEY) === 'yes';
  } catch (error) {
    // No storage, so start open
    return false;
  }
};

const rememberMinimised = (minimised) => {
  try {
    window.localStorage.setItem(MINIMISED_KEY, minimised ? 'yes' : 'no');
  } catch (error) {
    // Then the choice lasts for this page only
  }
};

export default function DebugLogPanel() {
  const [entries, setEntries] = useState([]);
  const [pinned, setPinned] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimised, setIsMinimised] = useState(readMinimised);
  const listRef = useRef(null);

  useEffect(() => {
    if (!isDebugLogEnabled()) {
      return;
    }
    const original = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    const append = (level, args) => {
      const time = new Date().toTimeString().slice(0, 8);
      const text = Array.from(args).map(formatArgument).join(' ');
      const step = text.match(PINNED_PATTERN);
      if (step) {
        setPinned(previous => ({ ...previous, [step[1]]: { text, time } }));
      }
      setEntries(previous => {
        const next = previous.concat({ level, time, text, key: `${Date.now()}-${previous.length}` });
        return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
      });
    };

    // The original is always called first, so nothing is lost for a real inspector
    console.log = (...args) => { original.log(...args); append('log', args); };
    console.info = (...args) => { original.info(...args); append('info', args); };
    console.warn = (...args) => { original.warn(...args); append('warn', args); };
    console.error = (...args) => { original.error(...args); append('error', args); };

    // The failures that never reach console.error — this is what the red overlay shows
    const onError = (event) => append('error', [`window.onerror: ${event.message}`]);
    const onRejection = (event) => append('error', [`unhandledrejection: ${formatArgument(event.reason)}`]);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      console.log = original.log;
      console.info = original.info;
      console.warn = original.warn;
      console.error = original.error;
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  // Follow the newest line while the panel is open
  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries, isOpen]);

  if (!isDebugLogEnabled()) {
    return null;
  }

  const errorCount = entries.filter(entry => entry.level === 'error').length;
  const colorOf = { error: '#ff6b6b', warn: '#ffb454', info: '#8ab4f8', log: '#cccccc' };

  // A pinned line always ends in its own verdict, so the answer is read off the text.
  // The [Audio] counters end in "— ok" / "— check" instead: their verdict is a threshold on
  // a number, not a boolean the SDK handed back
  const colorOfPinned = (text) => {
    if (/—\s*ok$/.test(text) || /:\s*(true|YES)/.test(text)) {
      return '#5ddb7a';
    }
    if (/—\s*check$/.test(text) || /:\s*(false|NO)|could not/.test(text)) {
      return '#ff6b6b';
    }
    return '#cccccc';
  };

  const pinnedSteps = Object.keys(pinned).sort();

  const copyAll = async () => {
    // The pinned lines go first: they survive trimming, the entry they came from may not
    const text = Object.keys(pinned).sort()
      .map(step => `${pinned[step].time} ${pinned[step].text}`)
      .concat(entries.map(entry => `${entry.time} [${entry.level}] ${entry.text}`))
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // clipboard needs a secure context and a gesture; the textarea fallback always works
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const fold = (minimised) => {
    setIsMinimised(minimised);
    rememberMinimised(minimised);
    if (minimised) {
      setIsOpen(false);
    }
  };

  // Folded away: one small tab in the corner, so the page underneath is usable. The error
  // count stays on it — that is the reason to unfold, and it should not need a tap to see.
  // Parked against the right edge above the middle of the screen rather than at the bottom:
  // Safari on iPhone draws its address bar over the bottom of the viewport, and a tab this
  // small disappears underneath it
  if (isMinimised) {
    return (
      <div style={{
        position: 'fixed', right: 0, bottom: '45vh', zIndex: 9999,
        fontFamily: 'monospace', fontSize: '11px',
      }}>
        <button
          onClick={() => fold(false)}
          style={{
            ...buttonStyle,
            borderRadius: '4px 0 0 4px',
            background: errorCount > 0 ? '#5a1f1f' : '#333',
            opacity: 0.85,
          }}
        >
          log {errorCount > 0 ? `(${errorCount} error)` : `(${entries.length})`}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9999,
      fontFamily: 'monospace', fontSize: '11px', pointerEvents: 'none',
    }}>
      {isOpen && (
        <div
          ref={listRef}
          style={{
            pointerEvents: 'auto', maxHeight: '45vh', overflowY: 'auto',
            background: 'rgba(0,0,0,0.92)', color: '#cccccc',
            padding: '6px 8px', borderTop: '1px solid #444',
          }}
        >
          {entries.length === 0 && <div style={{ color: '#777' }}>no log yet</div>}
          {entries.map(entry => (
            <div key={entry.key} style={{ color: colorOf[entry.level], marginBottom: '2px', wordBreak: 'break-word' }}>
              <span style={{ color: '#666' }}>{entry.time} </span>{entry.text}
            </div>
          ))}
        </div>
      )}
      {pinnedSteps.length > 0 && (
        // Capped and scrollable: there are nine steps now and the user agent alone wraps to
        // three lines on a phone, which would otherwise cover the page being debugged
        <div style={{
          pointerEvents: 'auto', background: 'rgba(0,0,0,0.92)',
          maxHeight: '40vh', overflowY: 'auto',
          padding: '5px 8px', borderTop: '1px solid #444',
        }}>
          {pinnedSteps.map(step => (
            <div key={step} style={{ color: colorOfPinned(pinned[step].text), wordBreak: 'break-word' }}>
              <span style={{ color: '#666' }}>{pinned[step].time} </span>{pinned[step].text}
            </div>
          ))}
        </div>
      )}
      {/* The bar carries the safe-area inset so its buttons clear the home indicator */}
      <div style={{
        pointerEvents: 'auto', display: 'flex', gap: '6px', alignItems: 'center',
        background: 'rgba(0,0,0,0.92)', borderTop: '1px solid #444',
        padding: '5px 8px', paddingBottom: 'calc(5px + env(safe-area-inset-bottom, 0px))',
      }}>
        <button onClick={() => setIsOpen(!isOpen)} style={buttonStyle}>
          {isOpen ? '▼' : '▲'} log ({entries.length})
        </button>
        {errorCount > 0 && <span style={{ color: '#ff6b6b' }}>{errorCount} error</span>}
        <span style={{ flex: 1 }} />
        <button onClick={copyAll} style={buttonStyle}>copy</button>
        <button onClick={() => { setEntries([]); setPinned({}); }} style={buttonStyle}>clear</button>
        <button onClick={() => fold(true)} style={buttonStyle} aria-label="hide the debug panel">✕</button>
      </div>
    </div>
  );
}

const buttonStyle = {
  background: '#333', color: '#eee', border: '1px solid #555',
  borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontFamily: 'monospace',
};
