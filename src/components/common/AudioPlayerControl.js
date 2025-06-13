import { FaPause, FaPlay } from "react-icons/fa";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoVolumeMute } from "react-icons/io5";
import { getUserStyle } from "../../utils/getUserStyle";

export default function AudioPlayerControl({ isPlay, handlePlay, isMuted, handleMuteUnmute, userType, t }) {

  // This function should return a color based on the userType
  const pageColor = getUserStyle(userType);

  return (
    <div className='audioViewer'>
      {!!isPlay ? (
        <div>
          <div className='pauseButtonViewer' style={{ '--page-color': pageColor }} onClick={handlePlay}>
            <FaPause size={20} />
            <span className="startText">{t('stopBtn')}</span>
          </div>
        </div>
      ) : (
        <div>
          <div className='playButtonViewer' style={{ '--page-color': pageColor }} onClick={handlePlay}>
            <FaPlay size={20} />
            <span className="startText">{t('startBtn')}</span>
          </div>
        </div>
      )}
      <div className='soundButton' style={{ '--page-color': pageColor }} onClick={handleMuteUnmute}>
        {isMuted ? <HiMiniSpeakerWave size={30} /> : <IoVolumeMute size={30} />}
      </div>
    </div>
  );
}