import React, { useState, useEffect, useCallback } from 'react';
import {
  getMeeting,
  createAttendee,
  createAppInstanceUsers,
  addChannelMembership,
  listChannelMembership,
} from '../apis/api';
import {
  DefaultDeviceController,
  DefaultMeetingSession,
  ConsoleLogger,
  LogLevel,
  MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';
import '../styles/LiveViewer.css';
import ChatMessage from './ChatMessage';
import Config from '../utils/config';
import metricReport from '../utils/metricReport';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash, faVolumeMute, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
/**
 * Component to join a meeting as a viewer and listen to the audio
 */
function LiveSubSpeaker() {
  // Get the meeting ID and channel ID from the URL query parameters
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  // Use for audio voice
  const meetingId = queryParams.get('meetingId');
  // Use for chat
  const channelId = queryParams.get('channelId');
  // Use for list channel membership
  const hostId = queryParams.get('hostId');

  // Hidden chat input based on chatSetting with chatSetting = 'guideOnly'
  const chatSetting = queryParams.get('chatSetting');


  // State variables to store the channel ARN and user ARN
  const [meetingSession, setMeetingSession] = useState(null);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [channelArn, setChannelArn] = useState('');
  const [userArn, setUserArn] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false); // State for audio mute status
  const [isMicOn, setIsMicOn] = useState(false); // State for microphone status

  // Function to initialize the meeting session from the meeting that the host has created
  const initializeMeetingSession = useCallback((meeting, attendee) => {
    if (!meeting || !attendee) {
      console.error('Invalid meeting or attendee information');
      return;
    }

    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfig = new MeetingSessionConfiguration(meeting, attendee);
    const meetingSession = new DefaultMeetingSession(meetingSessionConfig, logger, deviceController);
    setMeetingSession(meetingSession);
    selectSpeaker(meetingSession);

    // Allow audio listen
    bindAudioListen(meetingSession, true);

    console.log('Sub Speaker - initializeMeetingSession--> Start');
    metricReport(meetingSession);
    console.log('Sub Speaker - initializeMeetingSession--> End');

    // Start audio video session
    meetingSession.audioVideo.start();



  }, []);

  // Async function to select audio output device
  const selectSpeaker = async (meetingSession) => {
    const audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();

    if (audioOutputDevices.length > 0) {
      await meetingSession.audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
    } else {
      console.log('No speaker devices found');
    }
  };

  // Function to join the meeting
  const joinMeeting = useCallback(async () => {
    try {
      if (!meetingId || !channelId || !hostId) {
        alert('Meeting ID, Channel ID, and hostId are required');
        return;
      }

      // Get host user ID from the host ID
      const hostUserArn = `${Config.appInstanceArn}/user/${hostId}`;
      console.log('hostUserArn:', hostUserArn);

      //Get the channel ARN from the channel ID
      const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;
      console.log('channelArn:', hostUserArn);

      // List the channel members to check if the user has already joined the channel
      const channelMembersCount = await listChannelMembership(channelArn, hostUserArn);
      console.log('channelMembersCount:', channelMembersCount);

      // Generate a unique user ID and name for the host
      const userID = uuidv4(); // Generate unique user ID
      // Create a unique user name for the listener
      // Always 1 member is the host, so listeners will start from the number of participants currently in the channel
      const userName = `User${channelMembersCount}`;

      // Create userArn and join channel
      const userArn = await createAppInstanceUsers(userID, userName);
      await addChannelMembership(channelArn, userArn);
      setUserArn(userArn);
      setChannelArn(channelArn);

      // Join the meeting from the meeting ID the host has created
      const meeting = await getMeeting(meetingId);
      const attendee = await createAttendee(meetingId, userID);
      initializeMeetingSession(meeting, attendee);
    } catch (error) {
      console.error('Error joining the meeting:', error);
    }
  }, [meetingId, channelId, hostId, initializeMeetingSession]);

  // Set audio listen
  const bindAudioListen = async (meetingSession, listen) => {
    const audioElement = document.getElementById('audioElementSub');
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
          const startAudioInput = await meetingSession.audioVideo.startAudioInput(selectedAudioInput);
          console.log('startAudioInput', startAudioInput);
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

  // Use effect to join the meeting
  useEffect(() => {
    if (meetingId && channelId) {
      joinMeeting();
    }
  }, [joinMeeting, meetingId, channelId, hostId]);

  useEffect(() => {
    const getAudioInputDevices = async () => {
      if (meetingSession) {
        const devices = await meetingSession.audioVideo.listAudioInputDevices();
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

  return (
    <div className="live-viewer-container">
      <audio id="audioElementSub" className="audio-player" />
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
      {selectedAudioInput && (
        <div className="controls">
          <button onClick={toggleMicrophone} className="toggle-mic-button">
            <FontAwesomeIcon icon={isMicOn ? faMicrophone : faMicrophoneSlash} size="2x" color={isMicOn ? "green" : "gray"} />
          </button>
        </div>
      )}
      <br />
      {channelArn && <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} chatSetting={chatSetting} />}
    </div>
  );
}

export default LiveSubSpeaker;
