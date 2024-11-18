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
  MultiLogger,
  LogLevel,
  MeetingSessionConfiguration,
  VoiceFocusDeviceTransformer,
} from 'amazon-chime-sdk-js';
import '../styles/LiveViewer.css';
import ChatMessage from './ChatMessage';
import Participants from './Participants';
import Config from '../utils/config';
import metricReport from '../utils/MetricReport';
import { getPOSTLogger } from '../utils/MeetingLogger';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { MdRefresh } from "react-icons/md";
import {
  faMicrophone, faMicrophoneSlash,
} from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
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

  // Use translation
  const { t, i18n } = useTranslation();
  console.log('i18n', i18n);
  console.log('t', t);

  // State variables to store the channel ARN and user ARN
  const [meetingSession, setMeetingSession] = useState(null);
  const [meeting, setMetting] = useState(null);
  const [attendee, setAttendee] = useState(null);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [channelArn, setChannelArn] = useState('');
  const [userArn, setUserArn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false); // State for microphone status
  const [transformVFD, setTransformVFD] = useState(null);
  const [microChecking, setMicroChecking] = useState(t('microChecking'));
  const [noMicroMsg, setNoMicoMsg] = useState(null);
  const [logger, setLogger] = useState(null);
  const [participantsCount, setParticipantsCount] = useState(0);

  // Function to transform the audio input device to Voice Focus Device/Echo Reduction
  const transformVoiceFocusDevice = async (meeting, attendee, logger) => {
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
    if (!meeting || !attendee) {
      console.error('Invalid meeting or attendee information');
      return;
    }

    const consoleLogger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);

    const meetingSessionConfiguration = new MeetingSessionConfiguration(meeting, attendee);

    const meetingSessionPOSTLogger = getPOSTLogger(meetingSessionConfiguration, 'SDK', `${Config.cloudWatchLogRestApiVTGRestApi}cloud-watch-logs`, LogLevel.INFO);
    console.log('meetingSessionPOSTLogger', meetingSessionPOSTLogger);
    const logger = new MultiLogger(
      consoleLogger,
      meetingSessionPOSTLogger,
    );
    setLogger(logger);
    // Check if the Voice Focus Device is supported on the client
    const isVoiceFocusSupported = await transformVoiceFocusDevice(meeting, attendee, logger);
    logger.info('Sub-Guide deviceController isVoiceFocusSupported' + isVoiceFocusSupported);
    // Initialize the meeting session
    const deviceController = new DefaultDeviceController(logger, { enableWebAudio: isVoiceFocusSupported });
    logger.info('Sub-Guide deviceController' + JSON.stringify(deviceController));
    const meetingSession = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);
    setMeetingSession(meetingSession);
    selectSpeaker(meetingSession);
    console.log('Sub Speaker - initializeMeetingSession--> Start');
    metricReport(meetingSession);
    console.log('Sub Speaker - initializeMeetingSession--> End');
    // Bind the audio element to the meeting session
    const audioElement = document.getElementById('audioElementSub');
    if (audioElement) {
      await meetingSession.audioVideo.bindAudioElement(audioElement);
    } else {
      console.error('Audio element not found');
    }
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
    const subGuideList = attendees.filter(member => member.ExternalUserId && member.ExternalUserId.startsWith(userType));
    console.log('subGuide List:', subGuideList);

    // Sorting the attendees by the Created Date in ascending order
    subGuideList.sort((a, b) => {
      // Extract the Created Date from the ExternalUserId and convert it to integer (timestamp)
      const dateA = parseInt(a.ExternalUserId.split('|')[1]);
      const dateB = parseInt(b.ExternalUserId.split('|')[1]);

      // Compare the timestamps
      return dateA - dateB;
    });

    console.log('subGuide sort date:', subGuideList);
    console.log('subGuide attendee ID:', attendeeId);

    const subGuideCount = subGuideList.length || 0;
    console.log('subGuide count:', subGuideCount);

    const index = subGuideList.findIndex(attendee => attendee.AttendeeId === attendeeId);

    console.log('subGuide attendee index:', index);

    // Create a unique user name for the listener
    // Always 1 member is the host, so listeners will start from the number of participants currently in the channel
    let userName = `${userType}${index + 1}`;
    // console.log('userName:', userName);
    // let suffix = subGuideCount;
    // while (await checkUserNameExists(hostUserArn, channelArn, userName)) {
    //   userName = `${userType}${suffix}`;
    //   suffix++;
    // }

    console.log('subGuide username:', userName);
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

      // //Get the channel ARN from the channel ID
      // const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;
      // console.log('channelArn:', hostUserArn);

      // // List the channel members to check if the user has already joined the channel
      // const channelMembersResponse = await listChannelMembership(channelArn, hostUserArn);
      // console.log('channelMembersResponse:', channelMembersResponse);

      // // Count members starting with "Sub-Guide"
      // const memberships = channelMembersResponse.memberships || [];
      // console.log('memberships:', memberships);
      // const subGuideCount = memberships.filter(member => member.Member.Name && member.Member.Name.startsWith("Sub-Guide")).length || 0;
      // console.log('subGuideCount:', subGuideCount);

      // // Create a unique user name for the listener
      // // Always 1 member is the host, so listeners will start from the number of participants currently in the channel
      // const userName = `Sub-Guide${subGuideCount + 1}`;

      // Generate a unique user ID and name for the host
      const userID = uuidv4(); // Generate unique user ID
      const userType = 'Sub-Guide'; // User type

      // Join the meeting from the meeting ID the host has created
      const meeting = await getMeeting(meetingId);
      console.log('Meeting:', meeting);
      setMetting(meeting);
      //const attendee = await createAttendee(meetingId, userID);
      const attendee = await createAttendee(meeting.MeetingId, `${userType}|${Date.now()}`);
      console.log('Attendee created:', attendee);
      setAttendee(attendee);
      initializeMeetingSession(meeting, attendee);
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


  // Function to toggle microphone on/off
  const toggleMicrophone = async () => {
    if (meetingSession) {
      try {
        if (isMicOn) {
          // Mute the microphone
          const realtimeMuteLocalAudio = meetingSession.audioVideo.realtimeMuteLocalAudio();
          // logger.info('Sub-Guide toggleMicrophone realtimeMuteLocalAudio ' + JSON.stringify(realtimeMuteLocalAudio));
          console.log('Sub-Guide toggleMicrophone realtimeMuteLocalAudio', realtimeMuteLocalAudio);
          const stopAudioInput = await meetingSession.audioVideo.stopAudioInput(); // Stops the audio input device
          //logger.info('Sub-Guide toggleMicrophone stopAudioInput ' + JSON.stringify(stopAudioInput));
          console.log('Sub-Guide toggleMicrophone stopAudioInput', stopAudioInput);

        } else {
          // Start the audio input device
          // Create a new transform device if Voice Focus is supported
          const vfDevice = await transformVFD.createTransformDevice(selectedAudioInput);
          //logger.info('Sub-Guide toggleMicrophone vfDevice ' + JSON.stringify(vfDevice));
          console.log('Sub-Guide toggleMicrophone vfDevice', vfDevice);
          // Enable Echo Reduction on this client
          const observeMeetingAudio = await vfDevice.observeMeetingAudio(meetingSession.audioVideo);
          //logger.info('Sub-Guide toggleMicrophone Echo Reduction ' + JSON.stringify(observeMeetingAudio));
          console.log('Sub-Guide toggleMicrophone Echo Reduction', observeMeetingAudio);
          const deviceToUse = vfDevice || selectedAudioInput;
          //logger.info('Sub-Guide toggleMicrophone deviceToUse ' + JSON.stringify(deviceToUse));
          console.log('Sub-Guide toggleMicrophone deviceToUse', deviceToUse);
          const startAudioInput = await meetingSession.audioVideo.startAudioInput(deviceToUse);
          //logger.info('Sub-Guide toggleMicrophone startAudioInput ' + JSON.stringify(startAudioInput));
          console.log('Sub-Guide toggleMicrophone startAudioInput', startAudioInput);
          if (vfDevice) {
            //logger.info('Sub-Guide Amazon Voice Focus enabled ');
            console.log('Sub-Guide Amazon Voice Focus enabled');
          }
          // Unmute the microphone
          const realtimeUnmuteLocalAudio = meetingSession.audioVideo.realtimeUnmuteLocalAudio();
          //logger.info('Sub-Guide toggleMicrophone realtimeUnmuteLocalAudio ' + JSON.stringify(realtimeUnmuteLocalAudio));
          console.log('Sub-Guide toggleMicrophone realtimeUnmuteLocalAudio', realtimeUnmuteLocalAudio);
        }

        setIsMicOn(!isMicOn); // Toggle mic status

      } catch (error) {
        //console.error('Sub-Guide toggleMicrophone error', error);
        //logger.error('Sub-Guide toggleMicrophone error' + error);
        //logger.error('toggleMicrophone error ' + error);
        console.error('toggleMicrophone error', error);
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          // Handle permission denial
          alert(error);
          console.error("Permission denied by browser. Please allow access to continue.");
          //alert("Permission denied by browser. Please allow access to continue.");
        } else {
          // Handle other errors
          alert(error);
          console.error("Error accessing media devices:", error);
        }
      }
    }
  };

  // Function to get the list of audio input devices
  const getAudioInputDevices = useCallback(async () => {
    if (meetingSession) {
      // const devices = await meetingSession.audioVideo.listAudioInputDevices();
      const devices = await meetingSession.audioVideo.listAudioInputDevices(true);
      console.log('List Audio Input Devices:', devices);
      logger.info('Sub-Guide List Audio Input Devices' + JSON.stringify(devices));
      setAudioInputDevices(null);
      setAudioInputDevices(devices);
      if (devices.length > 0) {
        setSelectedAudioInput(devices[0].deviceId);
      } else {
        setMicroChecking('microChecking');
        setNoMicoMsg(null);
        setTimeout(() => {
          setMicroChecking(null);
          setNoMicoMsg('noMicroMsg');
        }, 5000);
      }
    }
  }, [meetingSession, logger]);

  // Use effect to join the meeting
  useEffect(() => {
    if (meetingId && channelId) {
      joinMeeting();
    }
  }, [joinMeeting, meetingId, channelId, hostId]);

  useEffect(() => {
    getAudioInputDevices();
  }, [getAudioInputDevices]);

  useEffect(() => {

    if (!meetingSession) {
      return;
    }
    const attendeeSet = new Set(); // List of sub-guides, listeners
    const callback = (presentAttendeeId, present, externalUserId) => {
      console.log(`Attendee ID: ${presentAttendeeId} Present: ${present} externalUserId: ${externalUserId}`);
      if (present) {
        attendeeSet.add(presentAttendeeId);
      } else {
        attendeeSet.delete(presentAttendeeId);
      }

      // Update the attendee count in the state
      setParticipantsCount(attendeeSet.size);
    };

    meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(callback);
  }, [meetingSession]);

  // Function to refresh the audio input devices
  const handleRefresh = () => {
    getAudioInputDevices();
  }

  return (
    <>
      <Participants count={participantsCount} />
      <div className="live-viewer-container">
        <audio id="audioElementSub" controls autoPlay className="audio-player" style={{ display: (meeting && attendee) ? 'block' : 'none' }} />
        {(isLoading) ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>{t('loading')}</p>
          </div>
        ) : (
          <>
            {(audioInputDevices.length <= 0) ? (
              <>
                {noMicroMsg ? (
                  <p>{t('noMicroMsg')} <button onClick={handleRefresh}><MdRefresh size={24} /></button></p>
                ) : (
                  <div className="loading">
                    <div className="spinner"></div>
                    {microChecking && <p>{t('microChecking')}</p>}
                  </div>
                )}
              </>
            ) : (
              <>
                <h3>{t('microSelectionLbl')}</h3>
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
    </>
  );
}

export default LiveSubSpeaker;
