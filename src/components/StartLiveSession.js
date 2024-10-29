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
import '../styles/StartLiveSession.css';
import ChatMessage from './ChatMessage';
import Config from '../utils/config';
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
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [chatSetting, setChatSetting] = useState('allChat'); // State to manage chat setting

  const startMeeting = async () => {
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

      initializeMeetingSession(meeting, attendee);
    } catch (error) {
      console.error('Error starting meeting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMeetingSession = (meeting, attendee) => {
    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfiguration = new MeetingSessionConfiguration(meeting, attendee);
    const session = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);
    setMeetingSession(session);
    // Bind audio element for the host to listen to the session
    const audioElement = document.getElementById('audioElementHost');
    if (audioElement) {
      console.log('Audio element found');
      session.audioVideo.bindAudioElement(audioElement);
    } else {
      console.error('Audio element not found');
    }
    session.audioVideo.start();
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

  // Function to handle chat setting change
  const handleChatSettingChange = (e) => {
    setChatSetting(e.target.value);
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
            <button onClick={startMeeting}>Start Live Session</button>
          )}
        </>
      ) : (
        <>
          <audio id="audioElementHost" controls autoPlay className="audio-player" />
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
          <h3>Chat Settings:</h3>
          <select
            value={chatSetting}
            onChange={handleChatSettingChange}
          >
            <option value="allChat">All the Guide and Listener chat</option>
            <option value="guideOnly">Only the Guide chat</option>
            <option value="nochat">No chat</option>
          </select>
          {meeting && channelArn && (
            <>
              <QRCodeSVG value={`${Config.appSubSpeakerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`} size={256} level="H" />
              <a target="_blank" rel="noopener noreferrer" style={{ color: 'green' }} href={`${Config.appSubSpeakerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}`}>
                Join as Sub-Speaker
              </a>
              <br />
              <QRCodeSVG value={`${Config.appViewerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`} size={256} level="H" />
              <a target="_blank" rel="noopener noreferrer" style={{ color: 'green' }} href={`${Config.appViewerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`}>
                Join as Listener
              </a>
            </>
          )}

          {/* Conditionally render ChatMessage based on chatSetting */}
          {chatSetting !== "nochat" && (
            <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} />
          )}
        </>
      )}
    </div>
  );
}

export default StartLiveSession;
