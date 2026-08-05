import { useEffect, useState } from 'react';
import '../../styles/BroadcastStatusBar.css';
import { getUserStyle } from '../../utils/getUserStyle';

// Format the elapsed time of the broadcast as hh:mm:ss
const formatElapsed = (totalSeconds) => {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Bar pinned under the header telling whether the microphone is on air.
 * It only reports the state and holds no button, so the screen never ends up
 * with a second control that reads as "start".
 */
export default function BroadcastStatusBar({ isMicOn, userType, t }) {
  // This function should return a color based on the userType
  const pageColor = getUserStyle(userType);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isMicOn) {
      setElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isMicOn]);

  return (
    <div
      className={`broadcast-status ${isMicOn ? 'broadcast-status-live' : ''}`}
      style={{ '--page-color': pageColor }}
    >
      <span className="broadcast-status-dot"></span>
      <span className="broadcast-status-text">
        {isMicOn ? t('broadcastStatus.live') : t('broadcastStatus.idle')}
      </span>
      {isMicOn && <span className="broadcast-status-time">{formatElapsed(elapsedSeconds)}</span>}
    </div>
  );
}
