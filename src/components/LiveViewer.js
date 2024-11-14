import React, { useState, useEffect, useCallback } from 'react';
import {
  getMeeting,
  createAttendee,
  createAppInstanceUsers,
  addChannelMembership,
  //listChannelMembership,
  listAttendee,
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
import { useTranslation } from 'react-i18next';
/**
 * Component to join a meeting as a viewer and listen to the audio from the main & sub-speakers
 */
function LiveViewer() {
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

  // Use translation
  const { t, i18n } = useTranslation();
  console.log('i18n', i18n);
  console.log('t', t);

  // State variables to store the channel ARN and user ARN
  const [meetingSession, setMeetingSession] = useState(null);
  const [meeting, setMetting] = useState(null);
  const [attendee, setAttendee] = useState(null);
  const [channelArn, setChannelArn] = useState('');
  const [userArn, setUserArn] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Function to initialize the meeting session from the meeting that the host has created
  const initializeMeetingSession = useCallback(async (meeting, attendee) => {
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
      await meetingSession.audioVideo.bindAudioElement(audioElement);
    } else {
      console.error('Audio element not found');
    }

    console.log('Listeners - initializeMeetingSession--> Start');
    metricReport(meetingSession);
    console.log('Listeners - initializeMeetingSession--> End');

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

  // // Function to check if the user name already exists in the channel
  // const checkUserNameExists = useCallback(async (hostUserArn, channelArn, userName) => {
  //   const channelMembersResponse = await listChannelMembership(channelArn, hostUserArn);
  //   console.log('channelMembersResponse:', channelMembersResponse);

  //   //Count members starting with "User"
  //   const memberships = channelMembersResponse.memberships || [];
  //   console.log('memberships:', memberships);
  //   const userExists = memberships?.some(member => member.Member.Name === userName) || false;
  //   console.log('userExists:', userExists);
  //   return userExists || false;
  // }, []);


  // Function to create a new user and channel
  const createAppUserAndJoinChannel = useCallback(async (meetingId, attendeeId, userID, userType, channelId) => {

    //Get the channel ARN from the channel ID
    const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;
    console.log('channelArn:', channelArn);

    // Create a new user and join the channel
    const listAttendeeResponse = await listAttendee(meetingId);
    console.log('listAttendeeResponse:', listAttendeeResponse);

    // Count members starting with "Sub-Guide"
    const attendees = listAttendeeResponse.attendees || [];
    console.log('attendees:', attendees);
    const subGuideList = attendees.filter(member => member.ExternalUserId && member.ExternalUserId.startsWith(userType)) || [];
    console.log('user List:', subGuideList);

    // Sorting the attendees by the Created Date in ascending order
    subGuideList.sort((a, b) => {
      // Extract the Created Date from the ExternalUserId and convert it to integer (timestamp)
      const dateA = parseInt(a.ExternalUserId.split('|')[1]);
      const dateB = parseInt(b.ExternalUserId.split('|')[1]);

      // Compare the timestamps
      return dateA - dateB;
    });

    console.log('user sort date:', subGuideList);
    console.log('user attendee ID:', attendeeId);

    const subGuideCount = subGuideList.length || 0;
    console.log('user count:', subGuideCount);

    const index = subGuideList.findIndex(attendee => attendee.AttendeeId === attendeeId);

    console.log('user attendee index:', index);

    // Create a unique user name for the listener
    // Always 1 member is the host, so listeners will start from the number of participants currently in the channel
    let userName = `${userType}${index + 1}`;
    // console.log('userName:', userName);
    // let suffix = subGuideCount;
    // while (await checkUserNameExists(hostUserArn, channelArn, userName)) {
    //   userName = `${userType}${suffix}`;
    //   suffix++;
    // }

    console.log('user username:', userName);
    // Create userArn and join channel

    const userArn = await createAppInstanceUsers(userID, userName);
    await addChannelMembership(channelArn, userArn);

    return {
      channelArn,
      userArn,
    };
  }, []);

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
      // const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;
      // console.log('channelArn:', hostUserArn);

      // List the channel members to check if the user has already joined the channel
      // const channelMembersResponse = await listChannelMembership(channelArn, hostUserArn);
      // console.log('channelMembersResponse:', channelMembersResponse);

      // Count members starting with "User"
      // const memberships = channelMembersResponse.memberships || [];
      // console.log('memberships:', memberships);
      // const userCount = memberships.filter(member => member.Member.Name && member.Member.Name.startsWith("User")).length || 0;
      // console.log('userCount:', userCount);
      // Generate a unique user ID and name for the host
      const userID = uuidv4(); // Generate unique user ID
      const userType = 'User';
      // Create a unique user name for the listener
      // Always 1 member is the host, so listeners will start from the number of participants currently in the channel
      // const userName = `User${userCount + 1}`;

      // // Create userArn and join channel
      // const userArn = await createAppInstanceUsers(userID, userName);
      // await addChannelMembership(channelArn, userArn);
      // setUserArn(userArn);
      // setChannelArn(channelArn);

      // Join the meeting from the meeting ID the host has created
      const meeting = await getMeeting(meetingId);
      console.log('Meeting:', meeting);
      setMetting(meeting);
      //const attendee = await createAttendee(meetingId, userID);
      const attendee = await createAttendee(meeting.MeetingId, `${userType}|${Date.now()}`);
      console.log('Attendee:', attendee);

      setAttendee(attendee);
      initializeMeetingSession(meeting, attendee);
      // Create a new user and join the channel
      const createAppUserAndJoinChannelResponse = await createAppUserAndJoinChannel(meeting.MeetingId, attendee.AttendeeId, userID, userType, channelId);
      console.log('createAppUserAndJoinChannelResponse:', createAppUserAndJoinChannelResponse);
      setChannelArn(createAppUserAndJoinChannelResponse.channelArn);
      setUserArn(createAppUserAndJoinChannelResponse.userArn);
    } catch (error) {
      console.error('Error joining the meeting:', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, channelId, hostId, initializeMeetingSession, createAppUserAndJoinChannel]);

  // Use effect to join the meeting
  useEffect(() => {
    if (meetingId && channelId) {
      joinMeeting();
    }
  }, [joinMeeting, meetingId, channelId, hostId]);


  useEffect(() => {

    if (!meetingSession) {
      return;
    }
    //const subGuideSet = new Set(); // List of sub-guides
    const orderedElements = [];
    //const userSet = new Set(); // List of listeners
    const callback = (presentAttendeeId, present, externalUserId) => {
      console.log('Attendee:', attendee);
      console.log(`Attendee ID: ${presentAttendeeId} Present: ${present} externalUserId: ${externalUserId}`);
      if (present) {
        // if(externalUserId.startsWith('Sub-Guide')) {
        //   subGuideSet.add(presentAttendeeId);
        // }
        if (externalUserId.startsWith('User')) {
          orderedElements.push(presentAttendeeId);
          //   if (!userSet.has(presentAttendeeId)) {
          //     orderedElements.push(presentAttendeeId); 
          //     userSet.add(presentAttendeeId);        
          // }

          // userSet.add(presentAttendeeId);
        }
      }

      // Update the attendee count in the state
      // localStorage.setItem('subGuideJoinCount', subGuideSet.size);
      // localStorage.setItem('userJoinCount', userSet.size);
    };

    meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(callback);
    console.log('Listener is present orderedElements', orderedElements);
    // console.log('Listener is present', userSet);
    // console.log('Listener is present count', userSet.size);
    //console.log('Listener is present count', userSet);
  }, [meetingSession, attendee]);

  return (
    <div className="live-viewer-container">
      <audio id="audioElementListener" controls autoPlay className="audio-player" style={{ display: (meeting && attendee) ? 'block' : 'none' }} />
      {(isLoading) ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>{t('loading')}</p>
        </div>
      ) : (
        <>
          <br />
          {channelArn && <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} chatSetting={chatSetting} />}
        </>
      )}
    </div>
  );
}

export default LiveViewer;