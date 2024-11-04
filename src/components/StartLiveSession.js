import React, { useState, useEffect } from 'react';
import {
  createMeeting,
  createAttendee,
  createAppInstanceUsers,
  createChannel,
  addChannelMembership,
} from '../apis/api';
import {
  DefaultDeviceController,
  DefaultMeetingSession,
  ConsoleLogger,
  LogLevel,
  //MultiLogger,
  MeetingSessionConfiguration,
  VoiceFocusDeviceTransformer,
} from 'amazon-chime-sdk-js';
import '../styles/StartLiveSession.css';
import ChatMessage from './ChatMessage';
import Config from '../utils/config';
import metricReport from '../utils/metricReport';
//import { getPOSTLogger } from '../utils/MeetingLogger';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash, faVolumeMute, faVolumeUp } from '@fortawesome/free-solid-svg-icons';

function StartLiveSession() {
  const [channelArn, setChannelArn] = useState('');
  const [channelID, setChannelID] = useState('');
  const [meetingSession, setMeetingSession] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [userArn, setUserArn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [chatSetting, setChatSetting] = useState('guideOnly'); // State to manage chat setting
  const [selectedQR, setSelectedQR] = useState('listener'); // State to manage selected QR type
  const [isAudioMuted, setIsAudioMuted] = useState(false); // State for audio mute status
  const [isMicOn, setIsMicOn] = useState(false); // State for microphone status
  const [transformVFD, setTransformVFD] = useState(null);
  const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);

  // Function to start a live audio session
  // when clicked on the "Start Live Audio Session" button
  const startLiveAduioSession = async () => {
    setIsLoading(true);
    try {
      const userID = uuidv4();
      setUserId(userID);
      const userName = `Guide`;

      const userArn = await createAppInstanceUsers(userID, userName);
      console.log('Guide created:', userArn);
      const channelArn = await createChannel(userArn);
      const channelID = channelArn.split('/').pop();
      await addChannelMembership(channelArn, userArn);
      setUserArn(userArn);
      setChannelArn(channelArn);
      setChannelID(channelID);

      const meeting = await createMeeting();
      console.log('Meeting created:', meeting);
      setMeeting(meeting);
      const attendee = await createAttendee(meeting.MeetingId, userID);

      // Check if the Voice Focus Device is supported on the client
      const isVoiceFocusSupported = await transformVoiceFocusDevice(meeting, attendee);
      console.log('isVoiceFocusSupported', isVoiceFocusSupported);
      // Initialize the meeting session such as meeting session
      initializeMeetingSession(meeting, attendee, isVoiceFocusSupported);

    } catch (error) {
      console.error('Error starting meeting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to transform the audio input device to Voice Focus Device/Echo Reduction
  const transformVoiceFocusDevice = async (meeting, attendee) => {
    let transformer = null;
    let isVoiceFocusSupported = false;
    try {
      const spec = {
        name: 'ns_es',
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

    // const meetingSessionPOSTLogger = getPOSTLogger(meetingSessionConfiguration, 'SDK', `${Config.appBaseURL}logs`, LogLevel.INFO);
    // const logger = new MultiLogger(
    //   consoleLogger,
    //   meetingSessionPOSTLogger,
    // );
    // console.log('logger', logger);
    // logger.info('MeetingSessionConfiguration-xxxxxxxxxxxxxx', meetingSessionConfiguration);

    const deviceController = new DefaultDeviceController(logger, { enableWebAudio: isVoiceFocusSupported });
    console.log('deviceController', deviceController);
    const meetingSession = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);
    setMeetingSession(meetingSession);
    selectSpeaker(meetingSession);

    // Allow audio listen
    await bindAudioListen(meetingSession, true);

    console.log('Main Speaker - initializeMeetingSession--> Start');
    metricReport(meetingSession);
    console.log('Main Speaker - initializeMeetingSession--> End');

    // Start audio video session
    meetingSession.audioVideo.start();

  };

  // Set audio listen
  const bindAudioListen = async (meetingSession, listen) => {
    const audioElement = document.getElementById('audioElementMain');
    if (listen) {
      try {
        const bindAudioElement = await meetingSession.audioVideo.bindAudioElement(audioElement);
        console.log('BindAudioElement', bindAudioElement);
      } catch (e) {
        console.log('Failed to bindAudioElement', e);
      }
    } else {
      const unbindAudioElement = meetingSession.audioVideo.unbindAudioElement();
      console.log('UnbindAudioElement', unbindAudioElement);
    }
  };

  // Function to toggle mute/unmute audio
  const toggleMuteAudio = async () => {
    console.log('toggleMuteAudio', isAudioMuted);
    console.log('toggleMuteAudio', meetingSession);
    if (isAudioMuted) {
      await bindAudioListen(meetingSession, true);
    } else {
      await bindAudioListen(meetingSession, false);
    }
    setIsAudioMuted(!isAudioMuted);
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

  useEffect(() => {
    const getAudioInputDevices = async () => {
      if (meetingSession) {
        const devices = await meetingSession.audioVideo.listAudioInputDevices();
        console.log('List Audio Input Devices:', devices);
        setAudioInputDevices(devices);
        if (devices.length > 0) {
          setSelectedAudioInput(devices[0].deviceId);
        } else {
          alert("No audio input devices were found. Please check your device.");
        }
      }
    };
    getAudioInputDevices();
  }, [meetingSession]);

  const handleChatSettingChange = (e) => {
    setChatSetting(e.target.value);
  };

  const handleQRSelectionChange = (e) => {
    setSelectedQR(e.target.value);
  };

  return (
    <div className="container">
      {!meeting ? (
        <>
          {isLoading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Please wait...</p>
            </div>
          ) : (
            <button onClick={startLiveAduioSession}>Start Live Audio Session</button>
          )}
        </>
      ) : (
        <>
          <audio id="audioElementMain" className="audio-player" />
          <button onClick={toggleMuteAudio} className="toggle-mute-button">
            <FontAwesomeIcon icon={isAudioMuted ? faVolumeMute : faVolumeUp} size="2x" />
          </button>
          <h3>Select Audio Input Device (Microphone)</h3>
          <select value={selectedAudioInput} onChange={(e) => setSelectedAudioInput(e.target.value)}>
            {audioInputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
          {selectedAudioInput.length > 0 && (
            <div className="controls">
              <button onClick={toggleMicrophone} className="toggle-mic-button">
                <FontAwesomeIcon icon={isMicOn ? faMicrophone : faMicrophoneSlash} size="2x" color={isMicOn ? "green" : "gray"} />
              </button>
            </div>
          )}
          <h3>Chat Settings:</h3>
          <select value={chatSetting} onChange={handleChatSettingChange}>
            <option value="allChat">All the Guide and Listener chat</option>
            <option value="guideOnly">Only the Guide chat</option>
            <option value="nochat">No chat</option>
          </select>

          <h3>Select QR Code:</h3>
          <select value={selectedQR} onChange={handleQRSelectionChange}>
            <option value="subSpeaker">QR for Sub-Guide</option>
            <option value="listener">QR for Listener</option>
          </select>

          {meeting && channelArn && (
            <>
              {selectedQR === 'subSpeaker' ? (
                <>
                  <QRCodeSVG value={`${Config.appSubSpeakerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`} size={256} level="H" />
                  <a target="_blank" rel="noopener noreferrer" style={{ color: 'green' }} href={`${Config.appSubSpeakerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`}>
                    Join as Sub-Guide
                  </a>
                </>
              ) : (
                <>
                  <QRCodeSVG value={`${Config.appViewerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`} size={256} level="H" />
                  <a target="_blank" rel="noopener noreferrer" style={{ color: 'green' }} href={`${Config.appViewerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`}>
                    Join as Listener
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
