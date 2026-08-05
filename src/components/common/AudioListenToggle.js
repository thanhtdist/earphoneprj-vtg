import { FaHeadphones } from "react-icons/fa";
import '../../styles/AudioListenToggle.css';
import { getUserStyle } from "../../utils/getUserStyle";

/**
 * Single control for the audio coming from the other speakers.
 * The guide pages used to carry a play button and a mute button side by side,
 * both acting on the same audio, which read as two ways of doing one thing.
 */
export default function AudioListenToggle({ isListening, toggleListening, userType, t }) {

  // This function should return a color based on the userType
  const pageColor = getUserStyle(userType);
  // The guide hears the sub-guides, the sub-guide hears the main guide
  const title = userType === 'Sub-Guide' ? t('listenBox.titleSubGuide') : t('listenBox.titleGuide');

  return (
    <div className='box-start-live-session box-listen'>
      {/* The whole box is the control, the title carries the switch instead of
          repeating itself on a second line */}
      <button
        type='button'
        className='listen-row'
        onClick={toggleListening}
        aria-pressed={isListening}
      >
        <FaHeadphones size={18} className='listen-icon' />
        <span className='listen-label'>{title}</span>
        <span className='listen-state' style={{ color: isListening ? pageColor : '#999999' }}>
          {isListening ? t('listenBox.on') : t('listenBox.off')}
        </span>
        <span
          className={`listen-switch ${isListening ? 'listen-switch-on' : ''}`}
          style={{ '--page-color': pageColor }}
        >
          <span className='listen-knob'></span>
        </span>
      </button>
    </div>
  );
}
