import { IoMicCircle, IoMicOffCircleSharp } from "react-icons/io5";
import { getUserStyle } from "../../utils/getUserStyle";

export default function AudioMicControl({ isMicOn, toggleMicrophone, userType, t }) {

  // This function should return a color based on the userType
  const pageColor = getUserStyle(userType);

  return (
    <div className="controls">
      <div className={`mic-button ${isMicOn ? 'mic-button-off' : 'mic-button-on'}`}  style={{ '--page-color': pageColor }} onClick={toggleMicrophone}>
        {isMicOn ? (
          <IoMicOffCircleSharp size={30} />
        ) : (
          <IoMicCircle size={30} />
        )}
        <span className="mic-text">{isMicOn ? t('stopBtn') : t('startBtn')}</span>
      </div>
    </div>
  );
}