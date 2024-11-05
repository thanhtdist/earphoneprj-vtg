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
  VoiceFocusDeviceTransformer,
} from 'amazon-chime-sdk-js';
import '../styles/LiveViewer.css';
import ChatMessage from './ChatMessage';
import Config from '../utils/config';
import metricReport from '../utils/MetricReport';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrophone, faMicrophoneSlash,
} from '@fortawesome/free-solid-svg-icons';
/**
 *  Component to start a live audio session for the sub speaker
 * The sub speaker can talk & listen to the audio from the main speaker
 * The sub speaker can also chat with the main speaker and other listeners
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
  const [isLoading, setIsLoading] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false); // State for microphone status
  const [transformVFD, setTransformVFD] = useState(null);

  // Function to transform the audio input device to Voice Focus Device/Echo Reduction
  const transformVoiceFocusDevice = async (logger, meeting, attendee) => {
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
  const initializeMeetingSession = useCallback(async (meeting, attendee) => {
    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    if (!meeting || !attendee) {
      console.error('Invalid meeting or attendee information');
      return;
    }
    // Check if the Voice Focus Device is supported on the client
    const isVoiceFocusSupported = await transformVoiceFocusDevice(logger, meeting, attendee);
    console.log('isVoiceFocusSupported', isVoiceFocusSupported);
    // deviceController with Voice Focus Device
    const deviceController = new DefaultDeviceController(logger, { enableWebAudio: isVoiceFocusSupported });
    console.log('deviceController', deviceController);
    const meetingSessionConfig = new MeetingSessionConfiguration(meeting, attendee);
    const meetingSession = new DefaultMeetingSession(meetingSessionConfig, logger, deviceController);
    setMeetingSession(meetingSession);
    selectSpeaker(meetingSession);
    console.log('Sub Speaker - initializeMeetingSession--> Start');
    metricReport(meetingSession);
    console.log('Sub Speaker - initializeMeetingSession--> End');
    // Bind the audio element to the audio session
    const audioElement = document.getElementById('audioElementSub');
    await meetingSession.audioVideo.bindAudioElement(audioElement);
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
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, channelId, hostId, initializeMeetingSession]);

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

  // Use effect to join the meeting
  useEffect(() => {
    if (meetingId && channelId) {
      joinMeeting();
    }
  }, [joinMeeting, meetingId, channelId, hostId]);

  useEffect(() => {
    const getAudioInputDevices = async () => {
      if (meetingSession) {
        console.log('List Audio Input Devices:meetingSession', meetingSession);
        const devices = await meetingSession.audioVideo.listAudioInputDevices();
        console.log('List Audio Input Devices:', devices);
        setAudioInputDevices(devices);
        if (devices.length > 0) {
          setSelectedAudioInput(devices[0].deviceId);
        } else {
          alert("No microphone was found. Please check your device and ensure a microphone is connected.");
        }
      }
    };
    getAudioInputDevices();
  }, [meetingSession]);

  return (
    <div className="live-viewer-container">
      <audio id="audioElementSub" controls autoPlay className="audio-player" />
      {(isLoading) ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Please wait...</p>
        </div>
      ) : (
        <>
          {(audioInputDevices.length <= 0) ? (<div className="loading">
            <div className="spinner"></div>
            <p>Checking for microphone... Please wait.</p>
          </div>) : (
            <>
              <h3>Select Audio Input Device (Microphone)</h3>
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
          <br />
          {channelArn && <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} chatSetting={chatSetting} />}
        </>
      )}
    </div>
  );
}

export default LiveSubSpeaker;
