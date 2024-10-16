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
  MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';
import '../styles/StartLiveSession.css'; // Importing the CSS file for responsiveness
import ChatMessage from './ChatMessage';
import Config from '../config';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faStop } from '@fortawesome/free-solid-svg-icons';

function StartLiveSession() {
  const [channelArn, setChannelArn] = useState('');
  const [channelID, setChannelID] = useState('');
  const [meetingSession, setMeetingSession] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [userArn, setUserArn] = useState('');
  const [isMeetingActive, setIsMeetingActive] = useState(false); // State to track if meeting is active
  const [isLoading, setIsLoading] = useState(false); // State for loading

  useEffect(() => {
    const getAudioInputDevices = async () => {
      if (meetingSession) {
        const devices = await meetingSession.audioVideo.listAudioInputDevices();
        setAudioInputDevices(devices);
        if (devices.length > 0) {
          setSelectedAudioInput(devices[0].deviceId);
        }else {
          alert("No audio input devices were found. Please check your device.");
        }
      }
    };
    getAudioInputDevices();
  }, [meetingSession]);

  const startMeeting = async () => {
    setIsLoading(true); // Set loading state to true
    try {
      const userID = uuidv4(); // Generate a unique user ID
      const userName = `admin-${Date.now()}`;
      const userArn = await createAppInstanceUsers(userID, userName);
      const channelArn = await createChannel(userArn);
      const channelID = channelArn.split('/').pop();

      await addChannelMembership(channelArn, userArn);
      setUserArn(userArn);
      setChannelArn(channelArn);
      setChannelID(channelID);

      const meeting = await createMeeting(); // Create a new meeting
      setMeeting(meeting);
      const attendee = await createAttendee(meeting.MeetingId, userID);
      initializeMeetingSession(meeting, attendee);
    } catch (error) {
      console.error('Error starting meeting:', error);
    } finally {
      setIsLoading(false); // Set loading state to false
    }
  };

  const initializeMeetingSession = (meeting, attendee) => {
    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfiguration = new MeetingSessionConfiguration(meeting, attendee);
    const session = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);
    setMeetingSession(session);
  };

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

  return (
    <div className="container">
      {!meeting ? (
        <>
          {isLoading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Please wait...</p>
            </div> // Display loading message with animation
          ) : (
            <button onClick={startMeeting}>Start Live Session</button>
          )}
        </>
      ) : (
        <>
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
          {meeting && channelArn && (
            <>
              <QRCodeSVG value={`${Config.AppURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}`} size={256} level="H" />
              <a target="_blank" rel="noopener noreferrer" style={{ color: 'green' }} href={`${Config.AppURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}`}>
                Join as Listener
              </a>
            </>
          )}
          <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} />
        </>
      )}
    </div>
  );
}

export default StartLiveSession;
