import React, { useState, useEffect, useCallback } from 'react';
import {
  getMeeting,
  createAttendee,
  createAppInstanceUsers,
  addChannelMembership,
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

function LiveViewer() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const meetingId = queryParams.get('meetingId');
  const channelId = queryParams.get('channelId');

  const [channelArn, setChannelArn] = useState('');
  const [userArn, setUserArn] = useState('');

  // Memoize function to avoid re-creating it on every render
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

  const joinMeeting = useCallback(async () => {
    try {
      if (!meetingId || !channelId) {
        alert('Meeting ID and Channel ID are required');
        return;
      }

      const userID = uuidv4(); // Generate unique user ID
      const userName = `user-${Date.now()}`;

      // Create userArn and join channel
      const userArn = await createAppInstanceUsers(userID, userName);
      const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;

      await addChannelMembership(channelArn, userArn);

      setUserArn(userArn);
      setChannelArn(channelArn);

      // Join the meeting
      const meeting = await getMeeting(meetingId);
      const attendee = await createAttendee(meetingId, userID);
      initializeMeetingSession(meeting, attendee);
    } catch (error) {
      console.error('Error joining the meeting:', error);
    }
  }, [meetingId, channelId, initializeMeetingSession]);

  useEffect(() => {
    if (meetingId && channelId) {
      joinMeeting();
    }
  }, [joinMeeting, meetingId, channelId]);

  return (
    <div className="live-viewer-container">
      <audio id="audioElementListener" controls autoPlay className="audio-player" />
      <br />
      {channelArn && <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} />}
    </div>
  );
}

export default LiveViewer;
