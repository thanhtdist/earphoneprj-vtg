import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  createAttendee,
  createAppInstanceUsers,
  addChannelMembership,
  listAttendee,
  getMeetingByTourId,
  getMeeting,
} from '../../apis/api';
import {
  DefaultDeviceController,
  DefaultMeetingSession,
  ConsoleLogger,
  MultiLogger,
  LogLevel,
  MeetingSessionConfiguration,
  VoiceFocusDeviceTransformer,
} from 'amazon-chime-sdk-js';
import '../../styles/LiveSubSpeaker.css';
import Config from '../../utils/config';
import metricReport from '../../utils/MetricReport';
import { getPOSTLogger } from '../../utils/MeetingLogger';
import { checkAvailableMeeting } from '../../utils/MeetingUtils';
import JSONCookieUtils from '../../utils/JSONCookieUtils';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import Header from '../common/Header';
import MessageBox from '../chat/MessageBox';
import { useParams } from "react-router-dom";
import NotFound from '../NotFound';
import TourTitle from '../common/TourTitle';
import AudioMicControl from '../common/AudioMicControl';
import AudioListenToggle from '../common/AudioListenToggle';
import BroadcastStatusBar from '../common/BroadcastStatusBar';
import { getUserStyle } from '../../utils/getUserStyle';
import { audioInputFingerprint, audioInputIds, listAudioInputs, pickPreferredAudioInput } from '../../utils/audioInput';
import { logBrowserSupport } from '../../utils/browserSupport';
import {
  countBindAudioElement,
  countStartAudioInput,
  countStopAudioInput,
  watchAudioInputStreams,
} from '../../utils/audioDiagnostics';
import { isVoiceFocusDisabled, watchOutgoingAudio } from '../../utils/audioFlow';
import DebugLogPanel from '../common/DebugLogPanel';
import useWakeLock from '../../hooks/useWakeLock';
import useConnectWebSocket from '../../hooks/useConnectWebSocket';
import useWebSocketVisibilityHandler from '../../hooks/useWebSocketVisibilityHandler';
/**
 *  Component to start a live audio session for the sub speaker
 * The sub speaker can talk & listen to the audio from the main speaker
 * The sub speaker can also chat with the main speaker and other listeners
 */
function LiveSubSpeaker() {
  // Create a WebSocket reference
  const wsRef = useRef(null);
  // Get the params from the URL
  const { tourId } = useParams(); // Extracts 'tourId' from the URL
  console.log('tourId:', tourId);
  // Use translation
  const { t, i18n } = useTranslation();
  console.log('i18n', i18n);
  console.log('t', t);

  // State variables to store the channel ARN and user ARN
  const [tour, setTour] = useState(undefined);
  const [meetingSession, setMeetingSession] = useState(null);
  const [chatRestriction, setChatRestriction] = useState(null);
  // const [meeting, setMetting] = useState(null);
  // const [attendee, setAttendee] = useState(null);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [channelArn, setChannelArn] = useState('');
  const [userArn, setUserArn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false); // State for microphone status
  const [transformVFD, setTransformVFD] = useState(null);
  const [microChecking, setMicroChecking] = useState(t('microChecking'));
  const [noMicroMsg, setNoMicoMsg] = useState(t('noMicroMsg'));
  //const [logger, setLogger] = useState(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const audioRef = useRef(null);
  // Single state for the audio coming from the main guide, it replaces the
  // play and mute pair that both acted on the same audio element
  const [isListening, setIsListening] = useState(false);
  // Keep the Voice Focus device currently in use so the previous microphone can be released
  const vfDeviceRef = useRef(null);
  // Keep a stable reference so the device change observer always calls the latest handler
  const audioInputsChangedRef = useRef(null);
  // Identity of the microphones seen at the previous check, and a guard so two signals
  // arriving together cannot restart the input twice
  const audioInputFingerprintRef = useRef('');
  const isSwitchingAudioInputRef = useRef(false);
  // Microphones already known, so a headset that has just been plugged back in can be told
  // apart from the ones that were there all along. Null until the first list is read
  const knownAudioInputIdsRef = useRef(null);

  // Add these references and callback:
  // const wakeLockRef = useRef(null);
  // const requestWakeLock = useCallback(async () => {
  //   try {
  //     if ('wakeLock' in navigator) {
  //       console.log('Requesting Wake Lock...');
  //       wakeLockRef.current = await navigator.wakeLock.request('screen');
  //       wakeLockRef.current.addEventListener('release', () => {
  //         console.log('Wake Lock was released.');
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Failed to request Wake Lock:', error);
  //   }
  // }, []);

  // Function to transform the audio input device to Voice Focus Device/Echo Reduction
  const transformVoiceFocusDevice = async (meeting, attendee, logger) => {
    let transformer = null;
    let isVoiceFocusSupported = false;
    // Returning false here also switches off Web Audio for the whole session, because the
    // caller passes this straight into `enableWebAudio` — so ?vf=0 gives a genuinely raw
    // microphone, not a raw microphone still routed through an audio graph
    if (isVoiceFocusDisabled()) {
      console.log('[VoiceFocus] 1. disabled by ?vf=0, using the raw microphone');
      return false;
    }
    try {
      const spec = {
        // Noise suppression with Echo Reduction, as before. `es` is what makes
        // observeMeetingAudio below do anything: without it that call returns early.
        // 'default' and 'ns_es' are the only names the library accepts
        // (libs/voicefocus/voicefocus.js:153) — anything else throws and falls back to raw.
        // ?vf=0 remains the way to compare against a raw microphone on the same device
        name: 'ns_es',
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
    //setLogger(logger);
    // Check if the Voice Focus Device is supported on the client
    const isVoiceFocusSupported = await transformVoiceFocusDevice(meeting, attendee, logger);
    logger.info('Sub-Guide deviceController isVoiceFocusSupported' + isVoiceFocusSupported);
    // Initialize the meeting session
    const deviceController = new DefaultDeviceController(logger, { enableWebAudio: isVoiceFocusSupported });
    logger.info('Sub-Guide deviceController' + JSON.stringify(deviceController));
    const meetingSession = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);
    setMeetingSession(meetingSession);
    // EXPERIMENT: audio output is left to the OS — see the commented-out selectSpeaker below.
    // Was awaited because it acts on the same audio element as bindAudioElement further down,
    // and running the two in parallel made the outcome depend on which finished first
    // await selectSpeaker(meetingSession);
    console.log('Sub-Guide audio output left to the OS (selectSpeaker disabled)');
    console.log('Sub Speaker - initializeMeetingSession--> Start');
    metricReport(meetingSession);
    // The other end of the listener's step 7: whether the microphone carries signal at all
    watchOutgoingAudio(meetingSession);
    console.log('Sub Speaker - initializeMeetingSession--> End');
    // Bind the audio element to the meeting session
    const audioElement = document.getElementById('audioElementSub');
    if (audioElement) {
      try {
        countBindAudioElement(audioElement);
        await meetingSession.audioVideo.bindAudioElement(audioElement);
        console.log('Meeting audio element bound');
      } catch (error) {
        // Must not abort this function: the session still has to be started, otherwise
        // the microphone is never broadcast
        console.error('Failed to bind the meeting audio element:', error);
      }
      // iOS Safari cannot start (nor resume) a MediaStream element that was never
      // allowed to play, and tearing it down takes the microphone capture with it,
      // so the element is started muted instead of being kept paused. It is unmuted
      // by the listen toggle, inside the user gesture
      audioElement.muted = true;
      audioElement.autoplay = true;
    } else {
      console.error('Audio element not found');
    }

    const observer = {
      audioInputsChanged: freshAudioInputDeviceList => {
        // A microphone was plugged in or removed, refresh the list and the device in use
        console.log('Sub-Guide audio inputs updated:', freshAudioInputDeviceList);
        audioInputsChangedRef.current?.(freshAudioInputDeviceList);
      },
    };

    meetingSession.audioVideo.addDeviceChangeObserver(observer);

    // Start audio video session
    meetingSession.audioVideo.start();
  }, []);

  // EXPERIMENT: audio output selection is switched off, here and at the call site.
  // It only ever picked audioOutputDevices[0], which is the default the OS gives us anyway,
  // and there is no UI for choosing a speaker — while the cost is that the SDK then keeps an
  // output device and retries setSinkId on the playing element at every bindAudioMix.
  // Uncomment both this and the call in initializeMeetingSession to restore it.
  //
  // Async function to select audio output device
  // const selectSpeaker = async (meetingSession) => {
  //   try {
  //     const audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();
  //
  //     if (audioOutputDevices.length > 0) {
  //       await meetingSession.audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
  //     } else {
  //       console.log('No speaker devices found');
  //     }
  //   } catch (error) {
  //     // iOS exposes setSinkId but refuses it outside a user gesture ("A user gesture is
  //     // required"). The SDK stores the device before that failure, so every later
  //     // bindAudioElement() retries setSinkId and throws again — which would abort the
  //     // session before it is started. Clearing the selection falls back to the default
  //     // speaker, which is the one this code was asking for anyway
  //     console.error('Error selecting speaker:', error);
  //     try {
  //       await meetingSession.audioVideo.chooseAudioOutput(null);
  //     } catch (resetError) {
  //       console.error('Failed to fall back to the default speaker:', resetError);
  //     }
  //   }
  // };

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
    console.log('subGuide username:', userName);
    // Create userArn and join channel

    const userArn = await createAppInstanceUsers(userID, userName);
    await addChannelMembership(channelArn, userArn);

    return {
      channelArn,
      userArn,
    };
  }, []);
  const userType = 'Sub-Guide';
  // Function to join the meeting
  const joinMeeting = useCallback(async (meetingData, channelId) => {
    setIsLoading(true);
    try {
      // if (!meetingId || !channelId || !hostId) {
      //   alert('Meeting ID, Channel ID, and hostId are required');
      //   return;
      // }

      // Get host user ID from the host ID
      // const hostUserArn = `${Config.appInstanceArn}/user/${hostId}`;
      // console.log('hostUserArn:', hostUserArn);

      // Generate a unique user ID and name for the host
      // Generate unique user ID
      // User type

      const userID = uuidv4();
      // Join the meeting from the meeting ID the host has created
      //const meeting = await getMeeting(meetingId);
      // const meeting = await checkAvailableMeeting(meetingId, "Sub-Guide");
      // if (!meeting) return;
      // console.log('Meeting:', meeting);
      const attendee = await createAttendee(meetingData.MeetingId, `${userType}|${Date.now()}`);
      console.log('Attendee created:', attendee);
      initializeMeetingSession(meetingData, attendee);
      const createAppUserAndJoinChannelResponse = await createAppUserAndJoinChannel(meetingData.MeetingId, attendee.AttendeeId, userID, userType, channelId);
      console.log('createAppUserAndJoinChannelResponse:', createAppUserAndJoinChannelResponse);
      // setMetting(meeting);
      //setAttendee(attendee);
      setChannelArn(createAppUserAndJoinChannelResponse.channelArn);
      setUserArn(createAppUserAndJoinChannelResponse.userArn);

      // Storage the Sub-Guide information in the cookies
      // Define your data
      const subGuide = {
        meeting: meetingData,
        attendee: attendee,
        userArn: createAppUserAndJoinChannelResponse.userArn,
        channelArn: createAppUserAndJoinChannelResponse.channelArn,
      };

      // Set the JSON cookie for 1 day
      JSONCookieUtils.setJSONCookie("Sub-Guide" + tourId, subGuide, 1);
      console.log("Cookie set for 1 day!");

    } catch (error) {
      console.error('Error joining the meeting:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initializeMeetingSession, createAppUserAndJoinChannel, tourId]);


  // Function to build the Voice Focus device for the given microphone
  // The Voice Focus node is reused when only the inner microphone changes,
  // so the audio of the previous microphone is not kept in the meeting
  const createVoiceFocusDevice = useCallback(async (deviceId) => {
    if (!transformVFD) {
      console.log('Sub-Guide createVoiceFocusDevice Voice Focus is not supported, use the raw device');
      return null;
    }
    if (vfDeviceRef.current) {
      return await vfDeviceRef.current.chooseNewInnerDevice(deviceId);
    }
    // Create a new transform device if Voice Focus is supported
    const vfDevice = await transformVFD.createTransformDevice(deviceId);
    console.log('Sub-Guide createVoiceFocusDevice vfDevice', vfDevice);
    if (vfDevice) {
      // Enable Echo Reduction on this client.
      // Contained on purpose: this is an enhancement on top of a transform device that
      // already works without it, so a failure here must not reach toggleMicrophone —
      // there it would land in the catch that alerts, and the microphone would never start
      try {
        await vfDevice.observeMeetingAudio(meetingSession.audioVideo);
        console.log('[VoiceFocus] echo reduction: ON');
      } catch (error) {
        console.error('[VoiceFocus] echo reduction could not be enabled:', error);
      }
    }
    return vfDevice;
  }, [transformVFD, meetingSession]);

  // Function to start the audio input with the given microphone
  // Calling it again with another microphone switches the device,
  // the stream of the previous microphone is released by the SDK
  const startAudioInputDevice = useCallback(async (deviceId) => {
    if (!meetingSession || !deviceId) {
      return;
    }
    const vfDevice = await createVoiceFocusDevice(deviceId);
    vfDeviceRef.current = vfDevice;
    const deviceToUse = vfDevice || deviceId;
    console.log('Sub-Guide startAudioInputDevice deviceToUse', deviceToUse);
    countStartAudioInput(deviceToUse);
    const startAudioInput = await meetingSession.audioVideo.startAudioInput(deviceToUse);
    console.log('Sub-Guide startAudioInputDevice startAudioInput', startAudioInput);
  }, [meetingSession, createVoiceFocusDevice]);

  // Function to stop the audio input device
  // The Voice Focus device must be stopped as well, otherwise the microphone
  // that was in use keeps streaming into the meeting
  const stopAudioInputDevice = useCallback(async () => {
    if (!meetingSession) {
      return;
    }
    countStopAudioInput();
    const stopAudioInput = await meetingSession.audioVideo.stopAudioInput(); // Stops the audio input device
    console.log('Sub-Guide stopAudioInputDevice stopAudioInput', stopAudioInput);
    if (vfDeviceRef.current) {
      await vfDeviceRef.current.stop();
      vfDeviceRef.current = null;
      console.log('Sub-Guide stopAudioInputDevice Voice Focus device stopped');
    }
  }, [meetingSession]);

  // Function to toggle microphone on/off
  const toggleMicrophone = async () => {
    if (meetingSession) {
      try {
        if (isMicOn) {
          // Mute the microphone
          const realtimeMuteLocalAudio = meetingSession.audioVideo.realtimeMuteLocalAudio();
          // logger.info('Sub-Guide toggleMicrophone realtimeMuteLocalAudio ' + JSON.stringify(realtimeMuteLocalAudio));
          console.log('Sub-Guide toggleMicrophone realtimeMuteLocalAudio', realtimeMuteLocalAudio);
          await stopAudioInputDevice();

        } else {
          // Start the audio input device with the selected microphone
          await startAudioInputDevice(selectedAudioInput);
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
      const devices = await meetingSession.audioVideo.listAudioInputDevices(true);
      console.log('List Audio Input Devices:', devices);
      setAudioInputDevices(null);
      setAudioInputDevices(devices);
      knownAudioInputIdsRef.current = audioInputIds(devices);
      setMicroChecking('microChecking');

      // Check if there are no devices or if any device label is empty
      if (devices.length === 0 || devices.some(device => !device.label.trim())) {
        // if (devices.length === 0) {
        console.log('No audio input devices found');
        // Display a message after 5 seconds
        setTimeout(() => {
          setMicroChecking(null);
          setNoMicoMsg('noMicroMsg');
        }, 5000);
      } else {
        // If devices are available, select the first device as the default
        setSelectedAudioInput(devices[0].deviceId);
        setNoMicoMsg(null);
      }
    }
  }, [meetingSession]);

  // Function to apply the microphone selected in the list
  // The device must be applied right away, otherwise the previous microphone is still used
  const handleAudioInputChange = async (deviceId) => {
    setSelectedAudioInput(deviceId);
    if (!isMicOn) {
      return;
    }
    try {
      await startAudioInputDevice(deviceId);
    } catch (error) {
      console.error('Sub-Guide handleAudioInputChange error', error);
      alert(error);
    }
  };

  // Function to handle a microphone being plugged in or removed
  const handleAudioInputsChanged = useCallback(async (freshAudioInputDeviceList) => {
    const devices = freshAudioInputDeviceList || [];
    console.log('Sub-Guide handleAudioInputsChanged devices', devices);
    setAudioInputDevices(devices);
    if (devices.length === 0) {
      knownAudioInputIdsRef.current = audioInputIds(devices);
      return;
    }
    // A headset that has just been plugged back in takes over the capture, otherwise the
    // current selection is kept — see pickPreferredAudioInput for what iOS does here
    const nextDeviceId = pickPreferredAudioInput(devices, selectedAudioInput, knownAudioInputIdsRef.current);
    knownAudioInputIdsRef.current = audioInputIds(devices);
    if (nextDeviceId !== selectedAudioInput) {
      setSelectedAudioInput(nextDeviceId);
    }
    // The input is restarted even when the identifier has not changed: on iOS the entry
    // keeps its deviceId across a headset being plugged in or out, and the SDK switches
    // the meeting to a null device when the previous track ends. Only a restart reopens
    // the route that is now in use
    if (!isMicOn || isSwitchingAudioInputRef.current) {
      return;
    }
    isSwitchingAudioInputRef.current = true;
    try {
      await startAudioInputDevice(nextDeviceId);
    } catch (error) {
      console.error('Sub-Guide handleAudioInputsChanged error', error);
    } finally {
      isSwitchingAudioInputRef.current = false;
    }
  }, [selectedAudioInput, isMicOn, startAudioInputDevice]);

  // Watch the microphones while broadcasting.
  // iOS never reports a headset being plugged in or out — the device list keeps the same
  // entry and only its label moves — so `audioInputsChanged` never fires and the capture
  // stays on the previous route until the page is reloaded. The labels are polled here,
  // and only while the microphone is on, so nothing runs when it is off
  useEffect(() => {
    if (!isMicOn) {
      return;
    }
    let cancelled = false;
    const checkAudioInputs = async () => {
      try {
        const devices = await listAudioInputs();
        // Labels are empty until the permission is granted, they carry no information yet
        if (cancelled || devices.length === 0 || devices.every(device => !device.label)) {
          return;
        }
        const fingerprint = audioInputFingerprint(devices);
        const previous = audioInputFingerprintRef.current;
        audioInputFingerprintRef.current = fingerprint;
        // The first read only records the baseline, it is not a change
        if (!previous || previous === fingerprint) {
          knownAudioInputIdsRef.current = audioInputIds(devices);
          return;
        }
        console.log('Sub-Guide audio input route changed:', previous, '->', fingerprint);
        await audioInputsChangedRef.current?.(devices);
      } catch (error) {
        console.error('Failed to read the audio inputs:', error);
      }
    };
    checkAudioInputs();
    const timer = setInterval(checkAudioInputs, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isMicOn]);

  useEffect(() => {
    audioInputsChangedRef.current = handleAudioInputsChanged;
  }, [handleAudioInputsChanged]);

  // What the SDK makes of this browser, and the capture counters — both have to be in place
  // before the session is created
  useEffect(() => {
    logBrowserSupport();
    watchAudioInputStreams();
  }, []);

  // Release the microphone when leaving the page
  useEffect(() => {
    return () => {
      if (vfDeviceRef.current) {
        vfDeviceRef.current.stop().catch(error => console.error('Failed to stop the Voice Focus device:', error));
        vfDeviceRef.current = null;
      }
    };
  }, []);

  // Function to get the meeting and attendee information from the cookies
  const getMeetingAttendeeInfoFromCookies = useCallback((retrievedSubGuide) => {
    setIsLoading(true);
    console.log("Retrieved cookie:", retrievedSubGuide);
    initializeMeetingSession(retrievedSubGuide.meeting, retrievedSubGuide.attendee);
    // setMetting(retrievedSubGuide.meeting);
    // setAttendee(retrievedSubGuide.attendee);
    setUserArn(retrievedSubGuide.userArn);
    setChannelArn(retrievedSubGuide.channelArn);
    setIsLoading(false);
  }, [initializeMeetingSession]);

  // Use effect to join the meeting
  // useEffect(() => {
  //   if (meetingId && channelId) {
  //     const retrievedSubGuide = JSONCookieUtils.getJSONCookie("Sub-Guide");
  //     console.log("Meeting IDxxx:", meetingId);
  //     console.log("Channel IDxxx:", channelId);
  //     console.log("Retrieved cookie:", retrievedSubGuide);

  //     if (retrievedSubGuide) {
  //       getMeetingAttendeeInfoFromCookies(retrievedSubGuide);
  //     } else {
  //       joinMeeting();
  //     }
  //   }
  // }, [joinMeeting, meetingId, channelId, hostId, getMeetingAttendeeInfoFromCookies]);
  const joinAudioSession2 = useCallback(
    async (meeting, channelId) => {
      try {
        // Retrieve and parse the "Sub-Guide" cookie
        const retrievedSubGuide = JSONCookieUtils.getJSONCookie("Sub-Guide" + tourId);
        console.log("Retrieved cookie:", retrievedSubGuide);
        if (retrievedSubGuide) {
          // Validate the retrieved cookie structure
          const isMeetingMatched = retrievedSubGuide.meeting.MeetingId === meeting.MeetingId;
          const isChannelMatched = retrievedSubGuide.channelArn === `${Config.appInstanceArn}/channel/${channelId}`;
          const isMatched = isMeetingMatched && isChannelMatched;
          if (isMatched) {
            console.log("Sub-Guide cookie matched the current meeting and channel");
            // Call checkMatchedMeeting only once and store the result
            const meetingData = await checkAvailableMeeting(retrievedSubGuide.meeting.MeetingId, "Sub-Guide");
            console.log('getMeetingResponse:', meetingData);
            if (meetingData) {
              getMeetingAttendeeInfoFromCookies(retrievedSubGuide);
              return;
            }
          }
        }
        joinMeeting(meeting, channelId);

      } catch (error) {
        console.error("Error processing the Sub-Guide cookie:", error);
      }
    },
    [
      getMeetingAttendeeInfoFromCookies,
      joinMeeting,
      tourId
    ]
  );
  // Function to join the audio session
  // This function is called when the component mounts and when the tourId changes
  const joinAudioSession = useCallback(async () => {

    const getMeetingByTourIdResponse = await getMeetingByTourId(tourId);
    console.log('getMeetingByTourIdResponse', getMeetingByTourIdResponse);
    if (getMeetingByTourIdResponse?.statusCode === 200) {
      setChatRestriction(getMeetingByTourIdResponse.data.chatRestriction);
      setTour(getMeetingByTourIdResponse.data);
      console.log('Meeting found:', getMeetingByTourIdResponse.data.meetingId);

      if (getMeetingByTourIdResponse.data.meetingId) {
        console.log("Meeting Existed in Tour");
        const checkAvailableMeetingResponse = await getMeeting(getMeetingByTourIdResponse.data.meetingId);
        console.log('checkAvailableMeeting:', checkAvailableMeetingResponse);
        console.log('checkAvailableMeeting statusCode:', checkAvailableMeetingResponse.statusCode);
        if (checkAvailableMeetingResponse.statusCode === 404) {
          //toast.info('Guide does not start, please wait...');
          alert('Guide does not start, please wait...');
        } else if (checkAvailableMeetingResponse.statusCode === 200) {
          // Join the meeting again and set the meeting session in the state
          console.log('Meeting not expired:', checkAvailableMeetingResponse);
          console.log('Check checkAvailableMeetingResponse:', checkAvailableMeetingResponse.data);
          joinAudioSession2(checkAvailableMeetingResponse.data, getMeetingByTourIdResponse.data.channelId);

        } else {
          console.log('Meeting error:', checkAvailableMeetingResponse);
        }
      } else {
        alert('Guide does not start, please wait...');
      }
    } else {
      // alert('Tour not found, please check the tour ID.');
      console.log('Tour not found, please check the tour ID.');
      //toast.error('Tour not found, please check the tour ID.');
      setTour(null);
    }
  }, [joinAudioSession2, tourId]);

  // Get the tour ID from the URL query parameters
  useEffect(() => {
    joinAudioSession(); // Call the async function
    // Execute the async function
  }, [joinMeeting, getMeetingAttendeeInfoFromCookies, joinAudioSession, tourId]);

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
      //setParticipantsCount(attendeeSet.size);
    };

    meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(callback);
  }, [meetingSession]);


  // Start or stop listening to the audio of the meeting.
  // The element is updated with the new value, reading the state here would
  // apply the previous one and leave the button one step behind.
  const toggleListening = () => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }
    const nextIsListening = !isListening;
    setIsListening(nextIsListening);
    // Stopping mutes instead of pausing: on iOS a paused MediaStream element cannot be
    // resumed, and tearing it down drops the microphone capture of the broadcast
    audioElement.muted = !nextIsListening;
    if (nextIsListening) {
      audioElement.play().catch(error => console.error('Failed to play the meeting audio:', error));
    }
  }

  // Call requestWakeLock once the meeting session is set:
  // useEffect(() => {
  //   if (meetingSession) {
  //     requestWakeLock();
  //   }
  // }, [meetingSession, requestWakeLock]);
  useWakeLock(meetingSession);


  //  Function to connect to WebSocket
  // const connectWebSocket = useCallback(() => {
  //   // If a WebSocket connection already exists, skip creating a new one
  //   if (wsRef.current) {
  //     console.log('🔁 WebSocket already connected.');
  //     return;
  //   }

  //   // Create a new WebSocket instance
  //   const ws = new WebSocket(Config.webSocketURL);

  //   // Variables to track connection timestamp and ping interval
  //   let connectTimestamp = null;
  //   let pingInterval = null;

  //   // When the WebSocket successfully connects
  //   ws.onopen = () => {
  //     connectTimestamp = Date.now();
  //     console.log('✅ WebSocket Connected at:', new Date(connectTimestamp).toLocaleTimeString());

  //     // ✅ Send "connectState" message after connecting
  //     const connectStatePayload = {
  //       action: 'connectState',
  //       tourId: tourId,
  //       languageCode: 'ja-JP',
  //       userType: 'Sub-Guide',
  //     };
  //     ws.send(JSON.stringify(connectStatePayload));
  //     console.log('📤 WebSocket Sent connectState:', connectStatePayload);

  //     // ✅ Start pinging every 4 minutes to keep the connection alive
  //     pingInterval = setInterval(() => {
  //       if (ws.readyState === WebSocket.OPEN) {
  //         console.log('📡 WebSocket Sending ping...');
  //         ws.send(JSON.stringify({ action: 'ping' }));
  //       }
  //     }, 4 * 60 * 1000); // 4 minutes
  //   };

  //   // ✅ Handle incoming messages
  //   ws.onmessage = (event) => {
  //     try {
  //       const message = JSON.parse(event.data);

  //       // Handle "connectionUpdate"
  //       if (message.type === 'connectionUpdate') {
  //         console.log('🔁 WebSocket Received connectionUpdate connectState:', message);
  //         console.log('🔁 WebSocket Received message.connectionCount connectState:', message.connectionCount);

  //         // Optional: Update your UI or state here
  //         //setConnectionCount(message.connectionCount);
  //         setParticipantsCount(message.connectionCount);
  //       } else {
  //         console.log('📨 WebSocket Received message:', message);
  //       }
  //     } catch (error) {
  //       console.error('❌ Error parsing WebSocket message:', error);
  //     }
  //   };

  //   // When the WebSocket connection is closed
  //   ws.onclose = () => {
  //     const disconnectTimestamp = Date.now();
  //     const duration = connectTimestamp
  //       ? ((disconnectTimestamp - connectTimestamp) / 1000).toFixed(1)
  //       : 'unknown';

  //     console.log('❌ WebSocket Disconnected at:', new Date(disconnectTimestamp).toLocaleTimeString());
  //     console.log(`🔌 WebSocket Connection lasted: ${duration} seconds`);

  //     // Stop the ping interval if it was running
  //     if (pingInterval) {
  //       clearInterval(pingInterval);
  //     }

  //     // Clear the reference so future reconnects are allowed
  //     wsRef.current = null;
  //   };

  //   // Handle WebSocket error events
  //   ws.onerror = (error) => {
  //     console.error('⚠️ WebSocket error:', error);

  //     // Stop the ping interval on error
  //     if (pingInterval) {
  //       clearInterval(pingInterval);
  //     }

  //     // Clear the reference
  //     wsRef.current = null;
  //   };

  //   // Store the WebSocket instance in a ref so it's accessible globally
  //   wsRef.current = ws;
  // }, [tourId]);

  // // Connect WebSocket
  // useEffect(() => {
  //   console.log('WebSocket Tour connected:', tour);
  //   if (!tour) return;
  //   connectWebSocket();
  // }, [connectWebSocket, tour]);
  const connectWebSocket = useConnectWebSocket({
    wsRef,
    tourId: tourId,
    languageCode: 'ja-JP',
    userType: userType,
    onConnectionUpdate: (message) => setParticipantsCount({
      total: message.connectionCount,
      guide: message.guideCount,
      subGuide: message.subGuideCount,
      user: message.userCount,
    }),
  });

  useWebSocketVisibilityHandler({
    tour,
    connectWebSocket,
    wsRef,
  });

  // Check if the tour exists, if not, show a not found page
  if (tour === null) {
    return <NotFound />;
  }

  const pageColor = getUserStyle(userType);

  return (
    <>
      {/* <Participants count={participantsCount} /> */}
      <Header count={participantsCount} tourId={tourId} userType={userType} />
      <BroadcastStatusBar isMicOn={isMicOn} userType={userType} t={t} />
      <div className="live-sub-container">
        <p className='titleSubLive'>
          {t('pageTitles.subGuide')}
        </p>
        {/* <div className='title-sub-live-upload'>
          <div className='time'>
            <p >2025/01/01</p>
          </div>
          <h3 className='nameTour'>浅草寺ツアー</h3>
        </div> */}
        <TourTitle tour={tour} />
        <audio id='audioElementSub' ref={audioRef} >
        </audio>
        {(isLoading) ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>{t('loading')}</p>
          </div>
        ) : (
          <>
            {(noMicroMsg) ? (
              <>
                {!microChecking ? (
                  <p style={{ color: "red" }}>{t('noMicroMsg')}</p>
                ) : (
                  <div className="loading">
                    <div className="spinner"></div>
                    {microChecking && <p>{t('microChecking')}</p>}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className='box-start-live-session box-broadcast' style={{ '--page-color': pageColor }}>
                  <h3 className='title-box'>{t('broadcastBox.title')}</h3>
                  <p className='box-sub-label'>{t('broadcastBox.micLabel')}</p>
                  {(audioInputDevices && audioInputDevices.length > 0) && (
                    <div className="select-container">
                      <select className='selectFile' style={{ border: "1px solid #E57A00" }} value={selectedAudioInput} onChange={(e) => handleAudioInputChange(e.target.value)}>
                        {audioInputDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <AudioMicControl
                    isMicOn={isMicOn}
                    toggleMicrophone={toggleMicrophone}
                    userType={userType}
                    t={t}
                  />
                </div>
              </>
            )}
            <AudioListenToggle
              isListening={isListening}
              toggleListening={toggleListening}
              userType={userType}
              t={t}
            />
            <br />

            {(chatRestriction !== "nochat" && channelArn) && (<>
              <MessageBox userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} userType={userType} statusChat={chatRestriction} chatLanguage="ja" />
              {/* <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} chatSetting={chatSetting} /> */}
            </>)}
            {/* {channelArn && <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} chatSetting={chatSetting} />} */}

          </>
        )}
      </div>
      <DebugLogPanel />
    </>
  );
}

export default LiveSubSpeaker;
