import { IoMicCircle, IoMicOffCircleSharp } from "react-icons/io5";
import { getUserStyle } from "../../utils/getUserStyle";

export default function AudioMicControl({ isMicOn, toggleMicrophone, userType, t }) {

  // This function should return a color based on the userType
  const pageColor = getUserStyle(userType);

  return (
    <>
      <div className="controls">
        <div className={`mic-button ${isMicOn ? 'mic-button-off' : 'mic-button-on'}`}  style={{ '--page-color': pageColor }} onClick={toggleMicrophone}>
          {isMicOn ? (
            <IoMicOffCircleSharp size={30} />
          ) : (
            <IoMicCircle size={30} />
          )}
          <span className="mic-text">{isMicOn ? t('broadcastBox.stopBtn') : t('broadcastBox.startBtn')}</span>
        </div>
      </div>
      {/* Tells the guide that picking a microphone is not enough to go on air */}
      <p className="broadcast-hint" style={{ color: isMicOn ? '#1B8A5A' : pageColor }}>
        {isMicOn ? t('broadcastBox.liveHint') : t('broadcastBox.hint')}
      </p>
    </>
  );
}
