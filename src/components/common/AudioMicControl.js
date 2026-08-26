import { IoMicCircle, IoMicOffCircleSharp } from "react-icons/io5";
import { getUserStyle } from "../../utils/getUserStyle";

// `disabled` greys the button out and takes the click away. No caller passes it today -
// every guide device is free to start its own microphone - kept for a screen that needs it
export default function AudioMicControl({ isMicOn, toggleMicrophone, userType, t, disabled = false }) {

  // This function should return a color based on the userType
  const pageColor = getUserStyle(userType);

  return (
    <>
      <div className="controls">
        <div className={`mic-button ${isMicOn ? 'mic-button-off' : 'mic-button-on'}${disabled ? ' mic-button-disabled' : ''}`}  style={{ '--page-color': pageColor }} onClick={disabled ? undefined : toggleMicrophone}>
          {isMicOn ? (
            <IoMicOffCircleSharp size={30} />
          ) : (
            <IoMicCircle size={30} />
          )}
          <span className="mic-text">{isMicOn ? t('broadcastBox.stopBtn') : t('broadcastBox.startBtn')}</span>
        </div>
      </div>
      {/* Tells the guide that picking a microphone is not enough to go on air */}
      <p className="broadcast-hint" style={{ color: disabled ? '#8A8A8A' : (isMicOn ? '#1B8A5A' : pageColor) }}>
        {isMicOn ? t('broadcastBox.liveHint') : t('broadcastBox.hint')}
      </p>
    </>
  );
}
