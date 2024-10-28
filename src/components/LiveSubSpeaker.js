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
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
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
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [channelArn, setChannelArn] = useState('');
  const [userArn, setUserArn] = useState('');

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

    const audioElement = document.getElementById('audioElementListener');
    if (audioElement) {
      meetingSession.audioVideo.bindAudioElement(audioElement);
    } else {
      console.error('Audio element not found');
    }

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

  const toggleLiveSession = async () => {
    if (isMeetingActive) {
      if (meetingSession) {
        meetingSession.audioVideo.stop();
        console.log('Audio video session stopped');
        setIsMeetingActive(false);
      }
    } else {
      if (meetingSession) {
        try {
          await meetingSession.audioVideo.startAudioInput(selectedAudioInput);
          meetingSession.audioVideo.start();
          console.log('Audio video session started');
          setIsMeetingActive(true);
        } catch (error) {
          console.error('Failed to start audio video session:', error);
        }
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
      <audio id="audioElementListener" controls autoPlay className="audio-player" />
      <h3>Select Audio Input Device (Microphone)</h3>
          <select value={selectedAudioInput} onChange={(e) => setSelectedAudioInput(e.target.value)}>
            {audioInputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
          {selectedAudioInput && (
            <button onClick={toggleLiveSession} className="toggle-button">
              {isMeetingActive ? (
                <FontAwesomeIcon icon={faStop} size="2x" color="red" />
              ) : (
                <FontAwesomeIcon icon={faPlay} size="2x" color="green" />
              )}
            </button>
          )}
      <br />
      {channelArn && <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} chatSetting={chatSetting}/>}
    </div>
  );
}

export default LiveSubSpeaker;
