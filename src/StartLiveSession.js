import React, { useState, useEffect } from 'react';
import {
  createMeeting,
  createAttendee,
  createAppInstanceUsers,
  createChannel,
  addChannelMembership,
} from './api';
import {
  DefaultDeviceController,
  DefaultMeetingSession,
  ConsoleLogger,
  LogLevel,
  MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';
import './StartLiveSession.css'; // Importing the CSS file for responsiveness
import ChatMessage from './ChatMessage';
import Config from './Config';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import appConfig from './Config';
import { FiSend } from 'react-icons/fi'; // Importing send icon from react-icons

function StartLiveSession() {
  const [channelArn, setChannelArn] = useState('');
  const [channelID, setChannelID] = useState('');
  const [meetingSession, setMeetingSession] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [userArn, setUserArn] = useState('');

  useEffect(() => {
    const getAudioInputDevices = async () => {
      if (meetingSession) {
        const devices = await meetingSession.audioVideo.listAudioInputDevices();
        setAudioInputDevices(devices);
        if (devices.length > 0) {
          setSelectedAudioInput(devices[0].deviceId);
        }
      }
    };
    getAudioInputDevices();
  }, [meetingSession]);

  const startMeeting = async () => {
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
    }
  };

  const initializeMeetingSession = (meeting, attendee) => {
    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfiguration = new MeetingSessionConfiguration(meeting, attendee);
    const session = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);
    setMeetingSession(session);
  };

  const startLive = async () => {
    if (meetingSession) {
      try {
        await meetingSession.audioVideo.startAudioInput(selectedAudioInput);
        meetingSession.audioVideo.start();
        console.log('Audio video session started');
      } catch (error) {
        console.error('Failed to start audio video session:', error);
      }
    }
  };

  const stopMeeting = () => {
    if (meetingSession) {
      meetingSession.audioVideo.stop();
      console.log('Audio video session stopped');
    }
  };

  return (
    <div className="container">
      {!meeting ? (
        <button onClick={startMeeting}>Start Live Session</button>
      ) : (
        <>
          {/* <p>Meeting ID: {meeting.MeetingId}</p>
          <p>Channel ID: {channelID}</p> */}
          <h3>Select Audio Input Device (Microphone)</h3>
          <select value={selectedAudioInput} onChange={(e) => setSelectedAudioInput(e.target.value)}>
            {audioInputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
          {selectedAudioInput && (
            <>
              <button onClick={startLive} className="start-button">
                <FiSend /> Start
              </button>
              <button onClick={stopMeeting}>Stop</button>
            </>
          )}
          {meeting && channelArn && (
            <>
              <QRCodeSVG value={`${appConfig.AppURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}`} size={256} level="H" />
              <a target="_blank" rel="noopener noreferrer" style={{ color: 'green' }} href={`${appConfig.AppURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}`}>
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
