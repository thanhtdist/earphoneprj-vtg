import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getMeeting,
  createMeeting,
  createAttendee,
  createAppInstanceUsers,
  createChannel,
  addChannelMembership,
  startMeetingTranscription,
  getMeetingByTourId,
  updateMeetingByTourId,
} from '../../apis/api';
import {
  DefaultDeviceController,
  DefaultMeetingSession,
  ConsoleLogger,
  //MultiLogger,
  LogLevel,
  MeetingSessionConfiguration,
  VoiceFocusDeviceTransformer,
} from 'amazon-chime-sdk-js';
import '../../styles/StartLiveSession.css';
import AudioUploadBox from './AudioUploadBox';
import Config from '../../utils/config';
import metricReport from '../../utils/MetricReport';
//import { getPOSTLogger } from '../utils/MeetingLogger';
//import { checkAvailableMeeting } from '../utils/MeetingUtils';
import JSONCookieUtils from '../../utils/JSONCookieUtils';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import { SPEAK_VOICE_LANGUAGES_KEY } from '../../utils/constant';
import Header from '../common/Header';
import MessageBox from '../chat/MessageBox';
//import { useLocation } from 'react-router-dom';
//import { useNavigate } from "react-router-dom";
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
// import { uploadFileToS3 } from '../services/S3Service';
//import { playAudioFromBase64 } from '../../utils/webAudio'; // Import the utility function to play audio from base64

/**
 * Component to start a live audio session for the main speaker
 * The main speaker can start a live audio session and share the QR code with the sub-speaker or listener
 * The main speaker can talk & listen from the sub-speaker
 * The main speaker can also chat with the sub-speaker or listener
 */
function StartLiveSession() {
  // Create a WebSocket reference
  const wsRef = useRef(null);
  // Get the params from the URL
  const { tourId } = useParams(); // Extracts 'tourId' from the URL
  // Use translation
  const { t, i18n } = useTranslation();
  console.log('i18n', i18n);
  console.log('t', t);
  // Use navigate to add params for meeting and channel
  //const navigate = useNavigate();

  // States to manage the meeting session
  const [channelArn, setChannelArn] = useState('');
  //const [channelID, setChannelID] = useState('');
  const [meetingSession, setMeetingSession] = useState(null);
  const [meeting, setMetting] = useState(null);
  const [attendee, setAttendee] = useState(null);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [userArn, setUserArn] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  //const [userId, setUserId] = useState('');
  const [isMicOn, setIsMicOn] = useState(false); // State for microphone status
  const [transformVFD, setTransformVFD] = useState(null);
  const [microChecking, setMicroChecking] = useState(t('microChecking'));
  const [noMicroMsg, setNoMicoMsg] = useState(t('noMicroMsg'));
  const [logger, setLogger] = useState(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [transcripts, setTranscriptions] = useState([]);
  const [chatRestriction, setChatRestriction] = useState(null);
  const [tour, setTour] = useState(undefined);
  // Replace local variables with refs
  //const transcriptListRef = useRef([]);
  //get value chatSetting from ChatSetting.js
  /// const location = useLocation();
  // const { state } = location;
  // const valueChatSetting = state?.chatSetting
  //const queryParams = new URLSearchParams(location.search);
  // const valueChatSetting = queryParams.get('chatSetting');
  // Single state for the audio coming from the sub-guides, it replaces the
  // play and mute pair that both acted on the same audio element
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef(null);
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
  const userType = `Guide`;
  //const audioData = useRef([]); // Ref to store audio data

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

  const createAppUserAndChannel = async (userID, userName) => {
    const userArn = await createAppInstanceUsers(userID, userName);
    console.log('Guide created:', userArn);
    const channelArn = await createChannel(userArn);
    const channelID = channelArn.split('/').pop();
    await addChannelMembership(channelArn, userArn);
    return {
      userArn,
      channelArn,
      channelID,
    };
  }

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
      // Can this browser run Voice Focus at all? Checked before anything is fetched, so a
      // false here is the device itself (AudioWorklet / WebAssembly), not the network.
      // Narrower than the [Browser] 0. line above: a browser the SDK fully supports can
      // still answer false here.
      const canRunVoiceFocus = await VoiceFocusDeviceTransformer.isSupported(spec, options);
      console.log(`[VoiceFocus] 1. browser can run voice focus: ${canRunVoiceFocus} (spec "${spec.name}")`);

      const config = await VoiceFocusDeviceTransformer.configure(spec, options);
      //logger.info('transformVoiceFocusDevice config', JSON.stringify(config));
      transformer = await VoiceFocusDeviceTransformer.create(spec, options, config, { Meeting: meeting }, { Attendee: attendee });
      console.log('transformVoiceFocusDevice transformer', transformer);
      setTransformVFD(transformer);
      isVoiceFocusSupported = transformer.isSupported();
      // The transformer is created even when unsupported; it then passes devices through
      console.log(`[VoiceFocus] 2. transformer support: ${isVoiceFocusSupported}`);
    } catch (e) {
      // Will only occur due to invalid input or transient errors (e.g., network).
      console.error('[VoiceFocus] 2. transformer could not be created:', e);
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

    console.log('Main Speaker - initializeMeetingSession--> Start');
    console.log('Meeting:', meeting);
    console.log('Attendee:', attendee);

    const consoleLogger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);

    const meetingSessionConfiguration = new MeetingSessionConfiguration(meeting, attendee);

    // const meetingSessionPOSTLogger = getPOSTLogger(meetingSessionConfiguration, 'SDK', `${Config.cloudWatchLogRestApiVTGRestApi}cloud-watch-logs`, LogLevel.INFO);
    // console.log('meetingSessionPOSTLogger', meetingSessionPOSTLogger);
    // const logger = new MultiLogger(
    //   consoleLogger,
    //   meetingSessionPOSTLogger,
    // );
    const logger = consoleLogger;
    console.log('logger', logger);
    setLogger(logger);
    // Check if the Voice Focus Device is supported on the client
    const isVoiceFocusSupported = await transformVoiceFocusDevice(meeting, attendee, logger);
    //logger.info('deviceController isVoiceFocusSupported' + isVoiceFocusSupported);
    // Initialize the meeting session
    const deviceController = new DefaultDeviceController(logger, { enableWebAudio: isVoiceFocusSupported });
    //logger.info('deviceController' + JSON.stringify(deviceController));
    const meetingSession = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);
    setMeetingSession(meetingSession);
    // EXPERIMENT: audio output is left to the OS — see the commented-out selectSpeaker below.
    // Was awaited because it acts on the same audio element as bindAudioElement further down,
    // and running the two in parallel made the outcome depend on which finished first
    // await selectSpeaker(meetingSession);
    console.log('Audio output left to the OS (selectSpeaker disabled)');
    console.log('Main Speaker - initializeMeetingSession--> Start');
    metricReport(meetingSession);
    // The other end of the listener's step 7: whether the microphone carries signal at all
    watchOutgoingAudio(meetingSession);
    console.log('Main Speaker - initializeMeetingSession--> End');
    // Bind the audio element to the meeting session
    const audioElement = document.getElementById('audioElementMain');
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
        // An array of MediaDeviceInfo objects
        freshAudioInputDeviceList.forEach(mediaDeviceInfo => {
          console.log(`Device ID xxx: ${mediaDeviceInfo.deviceId} Microphone: ${mediaDeviceInfo.label}`);
        });
        // A microphone was plugged in or removed, refresh the list and the device in use
        audioInputsChangedRef.current?.(freshAudioInputDeviceList);
      },

      audioOutputsChanged: freshAudioOutputDeviceList => {
        console.log('Audio outputs updated xxx: ', freshAudioOutputDeviceList);
      },

      videoInputsChanged: freshVideoInputDeviceList => {
        console.log('Video inputs updated xxx: ', freshVideoInputDeviceList);
      },

      audioInputMuteStateChanged: (device, muted) => {
        // console.log('Device xxx', device, muted ? 'is muted in hardware' : 'is not muted');
        console.log('Device yyy:', device);
        console.log('Status yyy:', muted ? 'is muted in hardware' : 'is not muted');
      },
    };

    meetingSession.audioVideo.addDeviceChangeObserver(observer);

    // Start audio video session
    meetingSession.audioVideo.start();

  }, []);

  // Function to update MeetingId, Channel Id
  const updateMeetingIdAndChannelId = async (data) => {
    try {
      const response = await updateMeetingByTourId(data);
      console.log('updateMeetingByTourId response:', response);
      if (response.statusCode === 200) {
        console.log('Meeting updated successfully:', response.data);
      } else {
        console.error('Error updating meeting:', response.statusCode, response.data);
      }
    } catch (error) {
      console.error('Error updating meeting:', error);
    }
  };

  // Function to start a live audio session
  const startLiveAduioSession = useCallback(async () => {
    setIsLoading(true);
    // Delete the cookie
    JSONCookieUtils.deleteCookie("Main-Guide" + tourId);
    console.log("Cookie deleted successfully!");
    try {
      const userID = uuidv4();
      const userName = `Guide`;
      const meeting = await createMeeting();
      console.log('Meeting created:', meeting);
      const attendee = await createAttendee(meeting.MeetingId, `${userType}|${Date.now()}`);
      console.log('Attendee created:', attendee);

      // Initialize the meeting session such as meeting session
      initializeMeetingSession(meeting, attendee);
      const createAppUserAndChannelResponse = await createAppUserAndChannel(userID, userName);
      console.log('ChannelID created:', createAppUserAndChannelResponse.channelID);
      // Update table tour with the meetingId and channelId
      const data = {
        tourId: tourId,
        meetingId: meeting.MeetingId,
        channelId: createAppUserAndChannelResponse.channelID,
      };
      await updateMeetingIdAndChannelId(data);
      //setUserId(userID);
      setMetting(meeting);
      setAttendee(attendee);
      setUserArn(createAppUserAndChannelResponse.userArn);
      setChannelArn(createAppUserAndChannelResponse.channelArn);
      //setChannelID(createAppUserAndChannelResponse.channelID);

      // Storage the Guide information in the cookies
      // Define your data
      const mainGuide = {
        meeting: meeting,
        attendee: attendee,
        userArn: createAppUserAndChannelResponse.userArn,
        channelArn: createAppUserAndChannelResponse.channelArn,
      };

      // Set the JSON cookie for 1 day
      JSONCookieUtils.setJSONCookie("Main-Guide" + tourId, mainGuide, 1);
      console.log("Cookie set Main-Guide for 1 day!");

    } catch (error) {
      console.error('Error starting meeting:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initializeMeetingSession, userType, tourId]);

  // Function to rejoin a live audio session after the meeting has expired
  const rejoinLiveAduioSession = useCallback(async () => {
    console.log('rejoinLiveAduioSession tourId:', tourId);
    setIsLoading(true);
    // // Delete the cookie
    // JSONCookieUtils.deleteCookie("Main-Guide");
    //console.log("Cookie deleted successfully!");
    // get the meeting and attendee information from the cookies
    // const retrievedMainGuide = JSONCookieUtils.getJSONCookie("Main-Guide");
    // console.log("Retrieved cookie:", retrievedMainGuide);
    // if (!retrievedMainGuide) {
    try {
      const retrievedMainGuide = JSONCookieUtils.getJSONCookie("Main-Guide" + tourId);
      console.log("Retrieved cookie:", retrievedMainGuide);

      if (!retrievedMainGuide) {
        console.log("No cookie found, creating a new meeting...");
        startLiveAduioSession();
        return;
      }
      //const userID = retrievedMainGuide.userArn.split('/').pop();
      //const userName = `Guide`;
      const meeting = await createMeeting();
      console.log('Meeting created:', meeting);
      const attendee = await createAttendee(meeting.MeetingId, `${userType}|${Date.now()}`);
      console.log('attendee', attendee);
      //const attendee = retrievedMainGuide.attendee;
      console.log('Attendee created:', attendee);

      // Initialize the meeting session such as meeting session
      initializeMeetingSession(meeting, attendee);
      // const createAppUserAndChannelResponse = await createAppUserAndChannel(userID, userName);
      // console.log('ChannelID created:', createAppUserAndChannelResponse.channelID);
      // Update table tour with the meetingId and channelId
      console.log('rejoinLiveAduioSession.ChannelId', retrievedMainGuide.channelArn.split('/').pop());
      console.log('rejoinLiveAduioSession.MeetingId', meeting.MeetingId);
      const data = {
        tourId: tourId,
        meetingId: meeting.MeetingId,
        channelId: retrievedMainGuide.channelArn.split('/').pop(),
      };
      await updateMeetingIdAndChannelId(data);
      // setUserId(userID);
      setMetting(meeting);
      setAttendee(attendee);
      setUserArn(retrievedMainGuide.userArn);
      setChannelArn(retrievedMainGuide.channelArn);
      //setChannelID(retrievedMainGuide.channelArn.split('/').pop());

      // Storage the Guide information in the cookies
      // Define your data
      const mainGuide = {
        meeting: meeting,
        attendee: attendee,
        userArn: retrievedMainGuide.userArn,
        channelArn: retrievedMainGuide.channelArn,
      };

      // Delete the cookie
      JSONCookieUtils.deleteCookie("Main-Guide" + tourId);
      console.log("rejoinLiveAduioSession Cookie deleted successfully!");

      // Set the JSON cookie for 1 day
      JSONCookieUtils.setJSONCookie("Main-Guide" + tourId, mainGuide, 1);
      console.log("rejoinLiveAduioSession Cookie set Main-Guide for 1 day!");

    } catch (error) {
      console.error('Error starting meeting:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initializeMeetingSession, startLiveAduioSession, userType, tourId]);

  // useEffect(() => {
  //   if (meeting && channelID) {
  //     navigate(`/guide?chatSetting=${valueChatSetting}&meetingId=${meeting.MeetingId}&channelId=${channelID}`);
  //   }
  // }, [meeting, channelID, valueChatSetting, navigate]);


  // Function to build the Voice Focus device for the given microphone
  // The Voice Focus node is reused when only the inner microphone changes,
  // so the audio of the previous microphone is not kept in the meeting
  const createVoiceFocusDevice = useCallback(async (deviceId) => {
    if (!transformVFD) {
      console.log('[VoiceFocus] 3. in use: NO (no transformer, raw microphone)');
      return null;
    }
    if (vfDeviceRef.current) {
      console.log('[VoiceFocus] 3. in use: YES (reusing the node, only the inner mic changed)');
      return await vfDeviceRef.current.chooseNewInnerDevice(deviceId);
    }
    // Create a new transform device if Voice Focus is supported
    const vfDevice = await transformVFD.createTransformDevice(deviceId);
    // This is the line that says what the microphone is actually going through: an
    // unsupported transformer returns undefined here and the raw device is used instead
    console.log(`[VoiceFocus] 3. in use: ${vfDevice ? 'YES' : 'NO (raw microphone)'}`);
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
    console.log('startAudioInputDevice deviceToUse', deviceToUse);
    countStartAudioInput(deviceToUse);
    const startAudioInput = await meetingSession.audioVideo.startAudioInput(deviceToUse);
    console.log('startAudioInputDevice startAudioInput', startAudioInput);
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
    console.log('stopAudioInputDevice stopAudioInput', stopAudioInput);
    if (vfDeviceRef.current) {
      await vfDeviceRef.current.stop();
      vfDeviceRef.current = null;
      console.log('stopAudioInputDevice Voice Focus device stopped');
    }
  }, [meetingSession]);

  // Function to toggle microphone on/off
  const toggleMicrophone = async () => {
    if (meetingSession) {
      try {
        if (isMicOn) {
          // Mute the microphone
          const realtimeMuteLocalAudio = meetingSession.audioVideo.realtimeMuteLocalAudio();
          //logger.info('toggleMicrophone realtimeMuteLocalAudio ' + JSON.stringify(realtimeMuteLocalAudio));
          console.log('toggleMicrophone realtimeMuteLocalAudio', realtimeMuteLocalAudio);
          await stopAudioInputDevice();

        } else {
          // Start the audio input device with the selected microphone
          await startAudioInputDevice(selectedAudioInput);
          // Unmute the microphone
          const realtimeUnmuteLocalAudio = meetingSession.audioVideo.realtimeUnmuteLocalAudio();
          //logger.info('toggleMicrophone realtimeUnmuteLocalAudio ' + JSON.stringify(realtimeUnmuteLocalAudio));
          console.log('toggleMicrophone realtimeUnmuteLocalAudio', realtimeUnmuteLocalAudio);
        }

        setIsMicOn(!isMicOn); // Toggle mic status

      } catch (error) {
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
      console.error('handleAudioInputChange error', error);
      alert(error);
    }
  };

  // Function to handle a microphone being plugged in or removed
  const handleAudioInputsChanged = useCallback(async (freshAudioInputDeviceList) => {
    const devices = freshAudioInputDeviceList || [];
    console.log('handleAudioInputsChanged devices', devices);
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
      console.error('handleAudioInputsChanged error', error);
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
        console.log('Audio input route changed:', previous, '->', fingerprint);
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

  // What the SDK makes of this browser, before anything asks it to capture audio.
  // The getUserMedia wrapper has to be in place before the session is created, otherwise the
  // first capture is opened without being counted
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
  const getMeetingAttendeeInfoFromCookies = useCallback(async () => {
    const retrievedMainGuide = JSONCookieUtils.getJSONCookie("Main-Guide" + tourId);
    console.log("Retrieved cookie:", retrievedMainGuide);
    if (!retrievedMainGuide) {
      startLiveAduioSession();
      return;
    }
    // const meeting = await checkAvailableMeeting(retrievedMainGuide.meeting.MeetingId, "Main-Guide");
    // console.log('getMeetingResponse:', meeting);
    // if (!meeting) return;
    initializeMeetingSession(retrievedMainGuide.meeting, retrievedMainGuide.attendee);
    setMetting(retrievedMainGuide.meeting);
    setAttendee(retrievedMainGuide.attendee);
    setUserArn(retrievedMainGuide.userArn);
    //setUserId(retrievedMainGuide.userArn.split('/').pop());
    setChannelArn(retrievedMainGuide.channelArn);
    //setChannelID(retrievedMainGuide.channelArn.split('/').pop());
    setIsLoading(false);
  }, [initializeMeetingSession, startLiveAduioSession, tourId]);

  useEffect(() => {
    getAudioInputDevices();
  }, [getAudioInputDevices]);


  useEffect(() => {

    if (selectedAudioInput) {
      console.log('Selected Audio Input:', selectedAudioInput);
    }

  }, [selectedAudioInput]);

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
  //       userType: 'Guide',
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
  const connectWebSocket = useConnectWebSocket({
    wsRef,
    tourId: tourId,
    languageCode: 'ja-JP',
    userType: userType,
    onConnectionUpdate: setParticipantsCount,
  });

  useWebSocketVisibilityHandler({
    tour,
    connectWebSocket,
    wsRef,
  });

  // Handle sending text to the WebSocket server
  const handleTranslateAudio = useCallback((text) => {
    console.log('Sending text to WebSocket', wsRef.current?.readyState);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const payload = {
        action: 'translateAudio',
        inputText: text,
        sourceLanguageCode: 'ja-JP',
        tourId: tourId
      };
      wsRef.current.send(JSON.stringify(payload));
      console.log('📤 Sent to WebSocket:', payload);
    } else {
      console.warn('❌ WebSocket is not open');
    }
  }, [tourId, wsRef]);


  useEffect(() => {

    if (!meetingSession) {
      return;
    }
    // // ✅ Connect WebSocket when host joins
    // connectWebSocket();

    const attendeeSet = new Set(); // List of sub-guides, listeners
    const callback = (presentAttendeeId, present, externalUserId) => {
      console.log(`Attendee ID: ${presentAttendeeId} Present: ${present} externalUserId: ${externalUserId}`);
      if (present) {
        attendeeSet.add(presentAttendeeId);
      } else {
        attendeeSet.delete(presentAttendeeId);
      }

      // Update the attendee count in the states
      //setParticipantsCount(attendeeSet.size);
    };

    meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(callback);

    // Subscribe to transcription events
    meetingSession.audioVideo.transcriptionController?.subscribeToTranscriptEvent(
      (transcriptEvent) => {
        console.log('Check transcriptEvent:', transcriptEvent);
        setTranscriptions(transcriptEvent);
      }
    );

  }, [meetingSession]);

  // Add the transcript to the list
  useEffect(() => {
    if (transcripts?.results?.[0]?.alternatives?.[0]?.transcript &&
      !transcripts.results[0].isPartial
    ) {
      const currentText = transcripts.results[0].alternatives[0].transcript;
      console.log('Transcript received:', currentText);
      //transcriptListRef.current.push(currentText);

      // ✅ Send the text to the WebSocket server
      handleTranslateAudio(currentText);
    }
  }, [transcripts, handleTranslateAudio]);

  // Send the language code to the listener
  useEffect(() => {
    if (!meetingSession) {
      return;
    }
    //console.log("enableMeetingTranscription selectedVoiceLanguage", selectedVoiceLanguage);
    console.log("enableMeetingTranscription meetingSession", meetingSession);
    const enableMeetingTranscription = async (meetingId, languageCode) => {
      console.log("enableLiveTranscription languageCode", languageCode);
      const startMeetingTranscriptionResponse = await startMeetingTranscription(meetingId, languageCode);
      console.log("enableLiveTranscription startMeetingTranscriptionResponse", startMeetingTranscriptionResponse);
    };
    enableMeetingTranscription(meetingSession.configuration.meetingId, SPEAK_VOICE_LANGUAGES_KEY);

    // const socket = new WebSocket("wss://0vfx6925gk.execute-api.us-east-1.amazonaws.com/prod");

    // console.log("WebSocketxxx URL:", "wss://0vfx6925gk.execute-api.us-east-1.amazonaws.com/prod");
    // console.log("WebSocketxxx socket:", socket);

    // socket.onopen = () => {
    //   console.log("WebSocketxxx connected");
    //   // Host can send a message
    //   socket.send(JSON.stringify({
    //     action: "sendMessage",
    //     inputText: "メールアドレスを入力してください。",
    //     //inputText: "さらに、真水が使えないという問題も、家康が井の頭池から神田上水を通して水を引くことで解決しました。1603年、家康が江戸に幕府を開くと、江戸の繁栄は確実なものとなり、1609年には15万人が住む大都市へと発展しました。小さな漁村であった江戸は、1721年には100万人の人口を抱えるまでに成長したのです。",
    //     sourceLanguageCode: "ja-JP",
    //     targetLanguageCode: "en-US",
    //     engine: "standard",
    //   }));
    // };
    // socket.onmessage = async (event) => {
    //   console.log("WebSocketxxx Message from server:", event.data);
    //   const data = JSON.parse(event.data);
    //   console.log("WebSocketxxx Received data:", data);
    //   // if (data.type === "speechComplete") {
    //   //   console.log("WebSocketxxx Received translatedText:", data.translatedText);
    //   //   console.log("WebSocketxxx Received audioData:", data.audioData);
    //   //   // You can handle the received message here, e.g., display it in the UI
    //   //   // Call it
    //   //   //await playAudioFromBase64(data.audioData);
    //   //   audioData.current.push(data.audioData); // Store audio data in the ref
    //   // } else {
    //   //   console.warn("WebSocketxxx Unknown action:", data.action);
    //   // }
    // };
    // socket.onerror = (err) => {
    //   console.error("WebSocketxxx error:", err);
    // };

    // socket.onclose = (event) => {
    //   console.warn("WebSocketxxx closed:", event);
    // };
  }, [meetingSession]);


  // Connect WebSocket
  // useEffect(() => {
  //   console.log('WebSocket Tour connected:', tour);
  //   if (!tour) return;
  //   connectWebSocket();
  // }, [connectWebSocket, tour]);

  // Send the text to the WebSocket server
  // useEffect(() => {
  //   console.log('Sending text to WebSocket', wsRef.current?.readyState);
  //   if (wsRef.current?.readyState === WebSocket.OPEN) {
  //     const payload = {
  //       action: 'translateAudio',
  //       inputText: 'おやすみなさい！またね！',
  //       sourceLanguageCode: 'ja',
  //     };
  //     wsRef.current.send(JSON.stringify(payload));
  //     console.log('📤 Sent to WebSocket:', payload);
  //   } else {
  //     console.warn('❌ WebSocket is not open');
  //   }
  // }, [wsRef]);


  // Meeting exired
  useEffect(() => {

    // Step 1: Check if the meeting is existed in tour
    // call getMeetingByTourId API to check if the meeting is existed in tour
    // Step 2: If the meeting is existed, set the meeting and attendee in the state
    // Join meeting and set the meeting session in the state

    // Step 3: Else Create a new meeting and set the meeting and attendee in the state
    // Step 3-1: Update the tour with the meetingId: updateMeetingByTourId APIdât
    // Step 3-2: Set the meeting and attendee in the state
    try {

      console.log("tourId", tourId);

      const callGetMeetingByTourId = async (tourId) => {
        const getMeetingByTourIdResponse = await getMeetingByTourId(tourId);
        console.log('getMeetingByTourIdResponse', getMeetingByTourIdResponse);
        if (getMeetingByTourIdResponse?.statusCode === 200) {
          setChatRestriction(getMeetingByTourIdResponse.data.chatRestriction);
          setTour(getMeetingByTourIdResponse.data);
          console.log('Meeting ID response:', getMeetingByTourIdResponse.data.meetingId);
          if (getMeetingByTourIdResponse.data.meetingId) {
            // const meeting = await checkAvailableMeeting(getMeetingByTourIdResponse.data.meetingId, "Main-Guide");
            // console.log('checkAvailableMeeting:', meeting);
            // if (!meeting) return;
            // const attendee = await createAttendee(meeting.MeetingId, `${userType}|${Date.now()}`);
            // console.log('Attendee created:', attendee);
            // initializeMeetingSession(meeting, attendee);
            // setMetting(meeting);
            // setAttendee(attendee);
            console.log("Meeting Existed in Tour");
            const checkAvailableMeetingResponse = await getMeeting(getMeetingByTourIdResponse.data.meetingId);
            console.log('checkAvailableMeeting:', checkAvailableMeetingResponse);
            console.log('checkAvailableMeeting statusCode:', checkAvailableMeetingResponse.statusCode);
            if (checkAvailableMeetingResponse.statusCode === 404) {
              console.log("Meeting expired in AWS Chime, creating a new meeting, attendee and use same channel...");
              //startLiveAduioSession();
              rejoinLiveAduioSession();
            } else if (checkAvailableMeetingResponse.statusCode === 200) {
              // Join the meeting again and set the meeting session in the state
              // const attendee = await createAttendee(getMeetingByTourIdResponse.data.meetingId, `${userType}|${Date.now()}`)
              console.log('Meeting not expired, get cookie, continue meeting:', checkAvailableMeetingResponse);
              // console.log('State Attendee:', attendee);
              // console.log('State Meeting:', meeting);
              // initializeMeetingSession(meeting, attendee);
              getMeetingAttendeeInfoFromCookies();
            } else {
              console.log('Meeting error:', checkAvailableMeetingResponse);
            }
          } else {
            console.log('Meeting not found in Tours, creating a new one...');
            startLiveAduioSession();
          }
        } else {
          // alert('Tour not found, please check the tour ID.');
          console.log('Tour not found, please check the tour ID.');
          //toast.error('Tour not found, please check the tour ID.');
          setTour(null);
        }
      }
      callGetMeetingByTourId(tourId);
    } catch (error) {
      console.error('Error checking meeting:', error);
    }

  }, [tourId, initializeMeetingSession, startLiveAduioSession, getMeetingAttendeeInfoFromCookies, rejoinLiveAduioSession]);

  // Call requestWakeLock once the meeting session is set:
  // useEffect(() => {
  //   if (meetingSession) {
  //     requestWakeLock();
  //   }
  // }, [meetingSession, requestWakeLock]);
  useWakeLock(meetingSession);

  console.log("chatRestriction", chatRestriction);
  //console.log("audioData", audioData.current);
  // Check if the tour exists, if not, show a not found page
  if (tour === null) {
    return <NotFound />;
  }

  const pageColor = getUserStyle(userType);

  return (
    <>
      {tour && (<Header tourId={tourId} count={participantsCount} userType={userType} subGuideFunctionAvailable={tour.subGuideFunctionAvailable} />)}
      <BroadcastStatusBar isMicOn={isMicOn} userType={userType} t={t} />
      <div className="container">
        {/* {audioData.current.length > 0 &&
          (<><button onClick={async () => {
            await playAudioFromBase64(audioData.current[0]);
          }}>
            Play Audio
          </button></>)} */}
        <p className='titleLiveSession'>
          {t('pageTitles.guide')}
        </p>
        {/* <div className='titleFileUpload'>
          <div className='time'>
            <span>{tour?.departureDate}</span>
          </div>
          <div className='nameTour'>
            <span>{tour?.tourName}</span>
          </div>
        </div> */}
        <TourTitle tour={tour} />
        {/* {meetingSession && (
          <>
            <button onClick={() => handleTranslateAudio('おやすみなさい')}>Send Transcripts</button>
            <br />
          </>
        )} */}
        <audio id='audioElementMain' ref={audioRef} >
        </audio>
        {(!meeting && !attendee) ? (
          <>
            {isLoading === true && (
              <div className="loading">
                <div className="spinner"></div>
                <p>{t('loading')}</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Broadcasting comes first, it is the reason the guide opens this page */}
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
                      <select className='selectFile' style={{ border: "1px solid #C60226" }} value={selectedAudioInput} onChange={(e) => handleAudioInputChange(e.target.value)}>
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
            {meetingSession && (<AudioUploadBox meetingSession={meetingSession} logger={logger} />)}
            <AudioListenToggle
              isListening={isListening}
              toggleListening={toggleListening}
              userType={userType}
              t={t}
            />
          </>
        )}
        {chatRestriction !== "nochat" && (
          <MessageBox userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} userType={userType} statusChat={chatRestriction} />
        )}
      </div>
      {/* Reads the console on the device itself, `npm start` only */}
      <DebugLogPanel />
    </>
  );
}

export default StartLiveSession;
