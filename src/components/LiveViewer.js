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
import metricReport from '../utils/MetricReport';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';

function LiveViewer() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const meetingId = queryParams.get('meetingId');
  const channelId = queryParams.get('channelId');
  const hostId = queryParams.get('hostId');
  const chatSetting = queryParams.get('chatSetting');

  const [channelArn, setChannelArn] = useState('');
  const [userArn, setUserArn] = useState('');
  const [statusMessage, setStatusMessage] = useState(''); // New state for status message

  const initializeMeetingSession = useCallback((meeting, attendee) => {
    if (!meeting || !attendee) {
      console.error('Invalid meeting or attendee information');
      return;
    }

    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfig = new MeetingSessionConfiguration(meeting, attendee);
    const meetingSession = new DefaultMeetingSession(meetingSessionConfig, logger, deviceController);

    selectSpeaker(meetingSession);

    const audioElement = document.getElementById('audioElementListener');
    if (audioElement) {
      meetingSession.audioVideo.bindAudioElement(audioElement);
    } else {
      console.error('Audio element not found');
    }

    console.log('Listeners - initializeMeetingSession--> Start');
    metricReport(meetingSession);
    console.log('Listeners - initializeMeetingSession--> End');

    meetingSession.audioVideo.start();
  }, []);

  const selectSpeaker = async (meetingSession) => {
    const audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();
    if (audioOutputDevices.length > 0) {
      await meetingSession.audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
    } else {
      console.log('No speaker devices found');
    }
  };

  const joinMeeting = useCallback(async () => {
    try {
      if (!meetingId || !channelId || !hostId) {
        alert('Meeting ID, Channel ID, and hostId are required');
        return;
      }

      const hostUserArn = `${Config.appInstanceArn}/user/${hostId}`;
      const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;

      const channelMembersResponse = await listChannelMembership(channelArn, hostUserArn);
      const memberships = channelMembersResponse.memberships || [];
      const userCount = memberships.filter(member => member.Member.Name && member.Member.Name.startsWith("User")).length || 0;

      const userID = uuidv4();
      const userName = `User${userCount + 1}`;

      const userArn = await createAppInstanceUsers(userID, userName);
      await addChannelMembership(channelArn, userArn);
      setUserArn(userArn);
      setChannelArn(channelArn);

      const meeting = await getMeeting(meetingId);
      const attendee = await createAttendee(meetingId, userID);
      initializeMeetingSession(meeting, attendee);

      setStatusMessage("Join success"); // Display success message
      setTimeout(() => setStatusMessage(""), 2000); // Clear success message after 2 seconds
    } catch (error) {
      console.error('Error joining the meeting:', error);
    }
  }, [meetingId, channelId, hostId, initializeMeetingSession]);

  useEffect(() => {
    if (meetingId && channelId) {
      setStatusMessage("Please wait..."); // Initial message
      const timer = setTimeout(() => {
        setStatusMessage(""); // Clear "Please wait..." message
        joinMeeting(); // Call joinMeeting after 10 seconds
      }, 10000);

      return () => clearTimeout(timer); // Clean up timer on component unmount
    }
  }, [joinMeeting, meetingId, channelId, hostId]);

  return (
    <div className="live-viewer-container">
      <audio id="audioElementListener" controls autoPlay className="audio-player" />
      <br />
      {statusMessage && <div className="status-message">{statusMessage}</div>}
      {channelArn && <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} chatSetting={chatSetting} />}
    </div>
  );
}

export default LiveViewer;
