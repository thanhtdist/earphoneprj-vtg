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
//import LocalStorageUtils from '../utils/localStorage';
/**
 * Component to join a meeting as a viewer and listen to the audio
 */
function LiveViewer() {
  // Get the meeting ID and channel ID from the URL query parameters
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const meetingId = queryParams.get('meetingId');
  const channelId = queryParams.get('channelId');

  // State variables to store the channel ARN and user ARN
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
      if (!meetingId || !channelId) {
        alert('Meeting ID and Channel ID are required');
        return;
      }

      // Generate a unique user ID and name for the host
      const userID = uuidv4(); // Generate unique user ID
      //const channelInfo = JSON.parse(LocalStorageUtils.getWithExpiry("channelInfo"));
      const channelInfo = JSON.parse(localStorage.getItem("channelInfo"));
      let numberOfParticipants = 1;
      console.log('channelInfo:', channelInfo);
      if (channelInfo && channelInfo.channelId !== channelId) {
        // remove the old channel info
        //LocalStorageUtils.remove("channelInfo");
        localStorage.removeItem("channelInfo"); // Remove if expired
        localStorage.setItem("channelInfo", JSON.stringify({
          channelId: channelId,
          numberOfParticipants: numberOfParticipants,
        }));
      } else {
        numberOfParticipants = channelInfo ? channelInfo.numberOfParticipants + 1 : 1;
        localStorage.setItem("channelInfo", JSON.stringify({
          channelId: channelId,
          numberOfParticipants: numberOfParticipants,
        }));
      }

      const userName = `User${numberOfParticipants}`;

      // Create userArn and join channel
      const userArn = await createAppInstanceUsers(userID, userName);
      const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;
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
  }, [meetingId, channelId, initializeMeetingSession]);

  // Use effect to join the meeting
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
