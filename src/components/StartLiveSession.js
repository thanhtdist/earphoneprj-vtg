import React, { useState, useEffect, useCallback } from 'react';
import {
  createMeeting,
  createAttendee,
  createAppInstanceUsers,
  createChannel,
  addChannelMembership,
  listAttendee,
} from '../apis/api';
import {
  DefaultDeviceController,
  DefaultMeetingSession,
  ConsoleLogger,
  LogLevel,
  MeetingSessionConfiguration,
  VoiceFocusDeviceTransformer,
} from 'amazon-chime-sdk-js';
import '../styles/StartLiveSession.css';
import ChatMessage from './ChatMessage';
import Config from '../utils/config';
import metricReport from '../utils/MetricReport';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrophone, faMicrophoneSlash,
} from '@fortawesome/free-solid-svg-icons';
import { MdRefresh } from "react-icons/md";
import { useTranslation } from 'react-i18next';

/**
 * Component to start a live audio session for the main speaker
 * The main speaker can start a live audio session and share the QR code with the sub-speaker or listener
 * The main speaker can talk & listen from the sub-speaker
 * The main speaker can also chat with the sub-speaker or listener
 */
function StartLiveSession() {
  // Use translation
  const { t, i18n } = useTranslation();
  console.log('i18n', i18n);
  console.log('t', t);

  // States to manage the meeting session
  const [channelArn, setChannelArn] = useState('');
  const [channelID, setChannelID] = useState('');
  const [meetingSession, setMeetingSession] = useState(null);
  const [meeting, setMetting] = useState(null);
  const [attendee, setAttendee] = useState(null);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [userArn, setUserArn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [chatSetting, setChatSetting] = useState('guideOnly'); // State to manage chat setting
  const [selectedQR, setSelectedQR] = useState('listener'); // State to manage selected QR type
  const [isMicOn, setIsMicOn] = useState(false); // State for microphone status
  const [transformVFD, setTransformVFD] = useState(null);
  const [microChecking, setMicroChecking] = useState(t('microChecking'));
  const [noMicroMsg, setNoMicoMsg] = useState(null);
  const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);

  // Function to start a live audio session
  // when clicked on the "Start Live Audio Session" button
  const startLiveAduioSession = async () => {
    setIsLoading(true);
    try {
      const userID = uuidv4();
      setUserId(userID);
      const userType = `Guide`;
      const userName = `Guide`;
      const meeting = await createMeeting();
      console.log('Meeting created:', meeting);
      setMetting(meeting);
      const attendee = await createAttendee(meeting.MeetingId, `${userType}-${userID}`);
      console.log('Attendee created:', attendee);
      setAttendee(attendee);
      // Check if the Voice Focus Device is supported on the client
      const isVoiceFocusSupported = await transformVoiceFocusDevice(meeting, attendee);
      console.log('isVoiceFocusSupported', isVoiceFocusSupported);
      // Initialize the meeting session such as meeting session
      initializeMeetingSession(meeting, attendee, isVoiceFocusSupported);

      // Create App User and Channel for chat
      const listAttendeeResponse = await listAttendee(meeting.MeetingId);
      console.log('listAttendeeResponse:', listAttendeeResponse);
      createAppUserAndChannel(userID, userName);
    } catch (error) {
      console.error('Error starting meeting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createAppUserAndChannel = async (userID, userName) => {
    const userArn = await createAppInstanceUsers(userID, userName);
    console.log('Guide created:', userArn);
    const channelArn = await createChannel(userArn);
    const channelID = channelArn.split('/').pop();
    await addChannelMembership(channelArn, userArn);
    setUserArn(userArn);
    setChannelArn(channelArn);
    setChannelID(channelID);
  }

  // Function to transform the audio input device to Voice Focus Device/Echo Reduction
  const transformVoiceFocusDevice = async (meeting, attendee) => {
    let transformer = null;
    let isVoiceFocusSupported = false;
    try {
      const spec = {
        name: 'ns_es', // use Voice Focus with Echo Reduction
      };
      const options = {
        preload: false,
        logger,
      };
      const config = await VoiceFocusDeviceTransformer.configure(spec, options);
      console.log('transformVoiceFocusDevice config', config);
      transformer = await VoiceFocusDeviceTransformer.create(spec, options, config, { Meeting: meeting }, { Attendee: attendee });
      console.log('transformVoiceFocusDevice transformer', transformer);
      setTransformVFD(transformer);
      isVoiceFocusSupported = transformer.isSupported();
      console.log('transformVoiceFocusDevice isVoiceFocusSupported', isVoiceFocusSupported);
    } catch (e) {
      // Will only occur due to invalid input or transient errors (e.g., network).
      console.error('Failed to create VoiceFocusDeviceTransformer:', e);
      isVoiceFocusSupported = false;
    }
    return isVoiceFocusSupported;
  }

  // Function to initialize the meeting session from the meeting that the host has created
  const initializeMeetingSession = async (meeting, attendee, isVoiceFocusSupported) => {
    // const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const meetingSessionConfiguration = new MeetingSessionConfiguration(meeting, attendee);
    const deviceController = new DefaultDeviceController(logger, { enableWebAudio: isVoiceFocusSupported });
    console.log('deviceController', deviceController);
    const meetingSession = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);
    setMeetingSession(meetingSession);
    selectSpeaker(meetingSession);
    console.log('Main Speaker - initializeMeetingSession--> Start');
    metricReport(meetingSession);
    console.log('Main Speaker - initializeMeetingSession--> End');
    // Bind the audio element to the meeting session
    const audioElement = document.getElementById('audioElementMain');
    if (audioElement) {
      await meetingSession.audioVideo.bindAudioElement(audioElement);
    } else {
      console.error('Audio element not found');
    }
    // Start audio video session
    meetingSession.audioVideo.start();
  };

  // Function to toggle microphone on/off
  const toggleMicrophone = async () => {
    console.log('Toggling Microphone', isMicOn);

    if (meetingSession) {
      try {
        if (isMicOn) {
          // Mute the microphone
          const realtimeMuteLocalAudio = meetingSession.audioVideo.realtimeMuteLocalAudio();
          console.log('Microphone is muted.', realtimeMuteLocalAudio);
          const stopAudioInput = await meetingSession.audioVideo.stopAudioInput(); // Stops the audio input device
          console.log('stopAudioInput', stopAudioInput);

        } else {
          // Start the audio input device
          console.log('toggleMicrophone Audio Input:', selectedAudioInput);
          console.log('transformVFD:', transformVFD);
          // Create a new transform device if Voice Focus is supported
          const vfDevice = await transformVFD.createTransformDevice(selectedAudioInput);
          console.log('vfDevice:', vfDevice);
          // Enable Echo Reduction on this client
          const observeMeetingAudio = await vfDevice.observeMeetingAudio(meetingSession.audioVideo);
          console.log('observeMeetingAudio:', observeMeetingAudio);
          const deviceToUse = vfDevice || selectedAudioInput;
          console.log('deviceToUse:', deviceToUse);
          const startAudioInput = await meetingSession.audioVideo.startAudioInput(deviceToUse);
          console.log('startAudioInput', startAudioInput);
          if (vfDevice) {
            console.log('Amazon Voice Focus enabled');
          }
          // Unmute the microphone
          const realtimeUnmuteLocalAudio = meetingSession.audioVideo.realtimeUnmuteLocalAudio();
          console.log('Microphone is unmuted.', realtimeUnmuteLocalAudio);
        }

        setIsMicOn(!isMicOn); // Toggle mic status

      } catch (error) {
        console.error('Failed to toggle microphone:', error);
      }
    }
  };

  // Async function to select audio output device
  const selectSpeaker = async (meetingSession) => {
    const audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();

    if (audioOutputDevices.length > 0) {
      await meetingSession.audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
    } else {
      console.log('No speaker devices found');
    }
  };

  // Function to get the list of audio input devices
  const getAudioInputDevices = useCallback(async () => {
    if (meetingSession) {
      const devices = await meetingSession.audioVideo.listAudioInputDevices();
      console.log('List Audio Input Devices:', devices);
      setAudioInputDevices(devices);
      if (devices.length > 0) {
        setSelectedAudioInput(devices[0].deviceId);
      } else {
        setMicroChecking('microChecking');
        setNoMicoMsg(null);
        setTimeout(() => {
          setMicroChecking(null);
          setNoMicoMsg('noMicroMsg');
        }, 5000);
      }
    }
  }, [meetingSession]);

  useEffect(() => {
    getAudioInputDevices();
  }, [getAudioInputDevices]);


  // useEffect(() => {

  //   if (!meetingSession) {
  //     return;
  //   }
  //   const subGuideSet = new Set(); // List of sub-guides
  //   const userSet = new Set(); // List of listeners
  //   const callback = (presentAttendeeId, present, externalUserId) => {
  //     console.log(`Attendee ID: ${presentAttendeeId} Present: ${present} externalUserId: ${externalUserId}`);
  //     console.log('subGuideJoinCountLocalStorage', localStorage.getItem('subGuideJoinCount'));
  //     if (present) {
  //       if(externalUserId.startsWith('Sub-Guide')) {
  //         subGuideSet.add(presentAttendeeId);
  //       }
  //       if(externalUserId.startsWith('User')) {
  //         userSet.add(presentAttendeeId);
  //       }
  //     }

  //     // Update the attendee count in the state
  //     localStorage.setItem('subGuideJoinCount', subGuideSet.size);
  //     localStorage.setItem('userJoinCount', userSet.size);
  //   };

  //   meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(callback);
  // }, [meetingSession]);

  // Function to handle the chat setting change
  const handleChatSettingChange = (e) => {
    setChatSetting(e.target.value);
  };

  // Function to handle the QR code generation selection
  const handleQRSelectionChange = (e) => {
    setSelectedQR(e.target.value);
  };

  // Function to refresh the audio input devices
  const handleRefresh = () => {
    getAudioInputDevices();
  }
  return (
    <div className="container">
      <audio id="audioElementMain" controls autoPlay className="audio-player" style={{ display: (meeting && attendee) ? 'block' : 'none' }} />
      {(!meeting && !attendee) ? (
        <>
          {(isLoading) ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>{t('loading')}</p>
            </div>
          ) : (
            <button onClick={startLiveAduioSession}>{t('startLiveBtn')}</button>
          )}
        </>
      ) : (
        <>
          {(audioInputDevices.length <= 0) ? (
            <>
              {noMicroMsg ? (
                <p>{t('noMicroMsg')} <button onClick={handleRefresh}><MdRefresh size={24} /></button></p>
              ) : (
                <div className="loading">
                  <div className="spinner"></div>
                  {microChecking && <p>{t('microChecking')}</p>}
                </div>
              )}
            </>
          ) : (
            <>
              <h3>{t('microSelectionLbl')}</h3>
              <select value={selectedAudioInput} onChange={(e) => setSelectedAudioInput(e.target.value)}>
                {audioInputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
              <div className="controls">
                <button onClick={toggleMicrophone} className="toggle-mic-button">
                  <FontAwesomeIcon icon={isMicOn ? faMicrophone : faMicrophoneSlash} size="2x" color={isMicOn ? "green" : "gray"} />
                </button>
              </div>
            </>
          )}
          <h3>{t('chatSettingLbl')}</h3>
          <select value={chatSetting} onChange={handleChatSettingChange}>
            <option value="allChat">{t('chatSettingOptions.allChat')}</option>
            <option value="guideOnly">{t('chatSettingOptions.onlyGuideChat')}</option>
            <option value="nochat">{t('chatSettingOptions.noChat')}</option>
          </select>

          <h3>{t('generateQRCodeLbl')}</h3>
          <select value={selectedQR} onChange={handleQRSelectionChange}>
            <option value="subSpeaker">{t('generateQRCodeOptions.subGuide')}</option>
            <option value="listener">{t('generateQRCodeOptions.listener')}</option>
          </select>

          {meeting && channelArn && (
            <>
              {selectedQR === 'subSpeaker' ? (
                <>
                  <QRCodeSVG value={`${Config.appSubSpeakerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`} size={256} level="H" />
                  <a target="_blank" rel="noopener noreferrer" style={{ color: 'green' }} href={`${Config.appSubSpeakerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`}>
                    {t('scanQRCodeTxt.subGuide')}
                  </a>
                </>
              ) : (
                <>
                  <QRCodeSVG value={`${Config.appViewerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`} size={256} level="H" />
                  <a target="_blank" rel="noopener noreferrer" style={{ color: 'green' }} href={`${Config.appViewerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`}>
                    {t('scanQRCodeTxt.listener')}
                  </a>
                </>
              )}
            </>
          )}

          {chatSetting !== "nochat" && (
            <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} />
          )}
        </>
      )}
    </div>
  );
}

export default StartLiveSession;
