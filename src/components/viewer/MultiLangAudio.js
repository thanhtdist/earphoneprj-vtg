import { useState, useEffect, useCallback, useRef } from 'react';
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
  LogLevel,
  MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';
import '../../styles/LiveViewer.css';
import Config from '../../utils/config';
import metricReport from '../../utils/MetricReport';
import TourSessionStore from '../../utils/tourSessionStore';
import { checkAvailableMeeting } from '../../utils/MeetingUtils';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import { getBaseLanguage, getVoiceLanguages, getDefaultListenVoiceLanguageKey, getLanguageCode, DEFAULT_GUIDE_LANGUAGE_CODE } from '../../utils/constant';
import Header from '../common/Header';
import MessageBox from '../chat/MessageBox';
import { useParams } from "react-router-dom";
import NotFound from '../NotFound';
import TourTitle from '../common/TourTitle';
import AudioPlayerControl from '../common/AudioPlayerControl';
import useWakeLock from '../../hooks/useWakeLock';
import useConnectWebSocket from '../../hooks/useConnectWebSocket';
import useWebSocketVisibilityHandler from '../../hooks/useWebSocketVisibilityHandler';
import { logBrowserSupport } from '../../utils/browserSupport';
import { countBindAudioElement } from '../../utils/audioDiagnostics';
import { watchIncomingAudio } from '../../utils/audioFlow';
import {
  noteTourMeetingId,
  logMeetingIdentity,
  watchMeetingConnection,
  watchMeetingAttendees,
  logListenStartTiming,
  logMeetingTransition,
} from '../../utils/meetingHealth';
import { logChannelTransition } from '../../utils/chatHealth';
import { watchGuidePresence } from '../../utils/guidePresence';
import DebugLogPanel from '../common/DebugLogPanel';

function MultiLangAudio() {
  // const [connectionCount, setConnectionCount] = useState(0);
  // 👉 Manage currently playing translated audio
  // const audioContextRef = useRef(null);
  const currentTranslatedAudioRef = useRef(null);
  const wsRef = useRef(null);
  const audioQueueRef = useRef([]);
  //const isPlayingRef = useRef(false);
  // Refs for the translated and original text boxes
  const translatedBoxRef = useRef(null);
  const originalBoxRef = useRef(null);
  // State variables
  // const [messages, setMessages] = useState([]);
  // const [originalText, setOriginText] = useState([]);
  const [translatedAudioData, setTranslatedAudioData] = useState({ messages: [], originals: [] });
  // Get the params from the URL
  const { tourId } = useParams(); // Extracts 'tourId' from the URL
  console.log('tourId:', tourId);
  const { t, i18n } = useTranslation();
  const [tour, setTour] = useState(undefined);
  const [meetingSession, setMeetingSession] = useState(null);
  // Set only once initializeMeetingSession's bind + audioVideo.start() have both actually
  // finished, not the instant meetingSession itself is created - see JapaneseAudio.js's
  // isSessionReady for why gating the Play control on meetingSession would reopen a window
  // where it is visible but not actually wired to anything yet
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [channelArn, setChannelArn] = useState('');
  const [userArn, setUserArn] = useState('');
  // Set synchronously in the Join button's own onClick - the loading spinner below keys off
  // this, not off a separate isLoading flag (removed) that was only ever set true once inside
  // getMeetingAttendeeInfoFromCookies/joinMeeting, both reached only after an earlier await
  // elsewhere in rejoinAudioSession. That gap let the Join button flash back up for a moment
  // after the overlay closed, instead of the loading spinner staying up throughout
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [selectedVoiceLanguage, setSelectedVoiceLanguage] = useState(
    getDefaultListenVoiceLanguageKey(i18n.language)
  );
  // The language the Guide speaks (guideLanguage from the server), Japanese until the server says otherwise
  const [guideLanguage, setGuideLanguage] = useState(DEFAULT_GUIDE_LANGUAGE_CODE);
  // Read by initializeMeetingSession, which must not be recreated when it changes
  const isLiveAudioRef = useRef(true);
  const [chatRestriction, setChatRestriction] = useState(null);
  const userID = uuidv4();
  const userType = 'User';
  // Ref for the audio element  
  const audioElementRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlay, setIsPlay] = useState(false);
  // Non-blocking replacement for alert('Guide does not start...') - see the overlay rendered
  // near the bottom of this component and the waiting-for-guide poll below
  const [showWaitingForGuide, setShowWaitingForGuide] = useState(false);

  // Sheet 3, extended: even once the meeting itself is confirmed live (the case the poll
  // above handles), the Guide meant to be broadcasting into it may not actually be there yet -
  // see guidePresence.js. A short grace period avoids flashing the overlay for the sub-second
  // gap between this page joining and the Guide's already-live attendee being reported, and
  // for a brief Guide reconnect blip
  const guideAbsentTimeoutRef = useRef(null);
  const handleGuidePresenceChange = useCallback((isGuidePresent) => {
    if (guideAbsentTimeoutRef.current) {
      clearTimeout(guideAbsentTimeoutRef.current);
      guideAbsentTimeoutRef.current = null;
    }
    if (isGuidePresent) {
      setShowWaitingForGuide(false);
      return;
    }
    guideAbsentTimeoutRef.current = setTimeout(() => {
      guideAbsentTimeoutRef.current = null;
      setShowWaitingForGuide(true);
    }, 3000);
  }, []);

  useEffect(() => () => {
    if (guideAbsentTimeoutRef.current) {
      clearTimeout(guideAbsentTimeoutRef.current);
    }
  }, []);

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

  // `source` says where the meeting id came from ('api' or 'cookie'). It is only used by the
  // debug panel, which compares it against the meeting the tour points at
  const initializeMeetingSession = useCallback(async (meetingData, attendeeData, source) => {
    if (!meetingData || !attendeeData) {
      console.error('Invalid meeting or attendee information');
      return;
    }

    logMeetingIdentity(meetingData.MeetingId, source);

    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfig = new MeetingSessionConfiguration(meetingData, attendeeData);
    const session = new DefaultMeetingSession(meetingSessionConfig, logger, deviceController);
    setMeetingSession(session);

    // EXPERIMENT: audio output is left to the OS — see the commented-out selectSpeaker below
    // await selectSpeaker(session);
    console.log('Audio output left to the OS (selectSpeaker disabled)');
    if (isLiveAudioRef.current) {
      console.log('The listener language is the one the Guide speaks, live audio:', selectedVoiceLanguage);
      //const audioElement = document.getElementById('audioElementListener');
      const audioElement = audioElementRef.current;
      console.log('Check audioElement:', audioElement);
      if (audioElement) {
        countBindAudioElement(audioElement);
        await session.audioVideo.bindAudioElement(audioElement);
        // Disable autoplay for the audio element
        audioElement.autoplay = false;
      } else {
        console.error('Audio element not found');
      }
    }
    metricReport(session);
    // Whether this session is connected to a meeting that exists, and who else is in it.
    // Subscribed before start(), otherwise a session that fails immediately - a stale
    // meeting id is rejected within milliseconds - would stop before anything is watching
    watchMeetingConnection(session);
    watchMeetingAttendees(session);

    // Subscribed before start(), so the very first stats tick is counted
    watchIncomingAudio(session, () => audioElementRef.current);
    session.audioVideo.start();
    watchGuidePresence(session, handleGuidePresenceChange);
    // Only now is the session actually usable - see isSessionReady's declaration
    setIsSessionReady(true);
  }, [selectedVoiceLanguage, handleGuidePresenceChange]);

  // EXPERIMENT: audio output selection is switched off, here and at the call site.
  // It only ever picked audioOutputDevices[0], which is the default the OS gives us anyway,
  // and there is no UI for choosing a speaker — while the cost is that the SDK then keeps an
  // output device and retries setSinkId on the playing element at every bindAudioMix.
  // Uncomment both this and the call in initializeMeetingSession to restore it.
  //
  // const selectSpeaker = async (session) => {
  //   try {
  //     const audioOutputDevices = await session.audioVideo.listAudioOutputDevices();
  //     if (audioOutputDevices.length > 0) {
  //       await session.audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
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
  //       await session.audioVideo.chooseAudioOutput(null);
  //     } catch (resetError) {
  //       console.error('Failed to fall back to the default speaker:', resetError);
  //     }
  //   }
  // };

  const createAppUserAndJoinChannel = useCallback(
    async (meetingId, attendeeId, userID, userType, channelId) => {
      try {
        const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;
        const listAttendeeResponse = await listAttendee(meetingId);
        const attendees = listAttendeeResponse.attendees || [];
        const subGuideList = attendees.filter(
          (member) => member.ExternalUserId && member.ExternalUserId.startsWith(userType)
        );

        subGuideList.sort(
          (a, b) =>
            parseInt(a.ExternalUserId.split('|')[1]) - parseInt(b.ExternalUserId.split('|')[1])
        );

        const index = subGuideList.findIndex((att) => att.AttendeeId === attendeeId);
        const userName = `${userType}${index + 1}`;

        const newUserArn = await createAppInstanceUsers(userID, userName);
        await addChannelMembership(channelArn, newUserArn);

        return { channelArn, userArn: newUserArn };
      } catch (error) {
        console.error('Error creating user and joining channel:', error);
        throw error;
      }
    },
    []
  );

  const getMeetingAttendeeInfoFromCookies = useCallback(
    async (retrievedUser, liveMeeting) => {
      // Awaited - isSessionReady is set inside initializeMeetingSession itself, once bind +
      // start() actually finish, not the instant this call is fired off
      // Only the attendee comes from storage; the meeting is the live one its id was matched to
      await initializeMeetingSession(liveMeeting, retrievedUser.attendee, 'cookie');
      setUserArn(retrievedUser.userArn);
      setChannelArn(retrievedUser.channelArn);
    },
    [initializeMeetingSession]
  );

  const joinMeeting = useCallback(
    async (meetingData, channelId) => {
      try {
        // if (!meetingId || !channelId || !hostId) {
        //   alert('Meeting ID, Channel ID, and Host ID are required');
        //   return;
        // }

        console.log('meeting:', meetingData);
        console.log('channelId:', channelId);

        // const meetingData = await checkAvailableMeeting(meetingId, userType);
        // console.log('meetingData:', meetingData);
        // if (!meetingData) return;

        const attendeeData = await createAttendee(
          meetingData.MeetingId,
          `${userType}|${Date.now()}`
        );
        await initializeMeetingSession(meetingData, attendeeData, 'api');

        const { channelArn, userArn } = await createAppUserAndJoinChannel(
          meetingData.MeetingId,
          attendeeData.AttendeeId,
          userID,
          userType,
          channelId
        );

        setChannelArn(channelArn);
        setUserArn(userArn);
        console.log('User session saved for 1 day');
        //setIsJoinAudio(true);
        const user = {
          meeting: meetingData,
          attendee: attendeeData,
          userArn,
          channelArn,
        };

        TourSessionStore.saveTourSession(tourId, 'User', user);

      } catch (error) {
        console.error('Error joining the meeting:', error);
      }
    },
    [
      userID,
      initializeMeetingSession,
      createAppUserAndJoinChannel,
      tourId
    ]
  );

  const rejoinAudioSession = useCallback(
    async (meeting, channelId) => {
      try {
        const retrievedUser = TourSessionStore.loadTourSession(tourId, 'User');
        console.log('Check retrievedUser:', retrievedUser);
        console.log('Check retrievedUser channel:', retrievedUser?.channelArn);
        console.log('Check Input channelId:', channelId);
        console.log('Check Input meeting:', meeting.MeetingId);
        console.log('Check retrievedUser meetingId:', retrievedUser?.meetingId);
        console.log('Check retrievedUser channelId:', retrievedUser?.channelArn.split('/').pop());
        console.log('Check retrievedUser channelId:', `${Config.appInstanceArn}/channel/${channelId}`);
        const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;
        if (retrievedUser) {
          const isMeetingMatched =
            retrievedUser.meetingId === meeting.MeetingId;
          const isChannelMatched =
            retrievedUser.channelArn === channelArn;

          if (isMeetingMatched && isChannelMatched) {
            const meetingData = await checkAvailableMeeting(
              retrievedUser.meetingId,
              'User'
            );
            if (meetingData) {
              logMeetingTransition(retrievedUser.meetingId, meeting.MeetingId, 'cookie meeting+channel match the tour, reusing it');
              logChannelTransition(retrievedUser.channelArn, channelArn, 'cookie meeting+channel match the tour, reusing it');
              getMeetingAttendeeInfoFromCookies(retrievedUser, meeting);
              return;
            }
            logMeetingTransition(retrievedUser.meetingId, meeting.MeetingId, 'cookie matched, but that meeting is no longer available - joining the tour\'s instead');
            logChannelTransition(retrievedUser.channelArn, channelArn, 'cookie\'s meeting is no longer available, using the tour\'s channel');
          } else if (!isMeetingMatched) {
            logMeetingTransition(retrievedUser.meetingId, meeting.MeetingId, "cookie's meeting differs from the tour's, joining the tour's instead");
            logChannelTransition(retrievedUser.channelArn, channelArn, "cookie's meeting was wrong, using the tour's channel");
          } else {
            logMeetingTransition(retrievedUser.meetingId, meeting.MeetingId, 'cookie meeting matches, but its channel does not - joining the tour\'s channel instead');
            logChannelTransition(retrievedUser.channelArn, channelArn, "cookie's channel differs from the tour's");
          }
        } else {
          logMeetingTransition(null, meeting.MeetingId, "no cookie on this browser, joining the tour's live meeting");
          logChannelTransition(null, channelArn, "no cookie on this browser, using the tour's channel");
        }
        joinMeeting(meeting, channelId);
      } catch (error) {
        console.error('Error processing the User cookie:', error);
      }
    },
    [
      getMeetingAttendeeInfoFromCookies,
      joinMeeting,
      tourId
    ]
  );

  // useEffect(() => {
  //   if (!audioContextRef.current) {
  //     audioContextRef.current = new (window.AudioContext)();
  //   }
  // }, []);

  // useEffect(() => {
  //   return () => {
  //     if (audioContextRef.current) {
  //       audioContextRef.current.close();
  //     }
  //   };
  // }, []);

  useEffect(() => {
    if (!meetingSession) return;

    const attendeeSet = new Set();
    const presenceCallback = (attendeeId, present) => {
      if (present) {
        attendeeSet.add(attendeeId);
      } else {
        attendeeSet.delete(attendeeId);
      }
      //setParticipantsCount(attendeeSet.size);
    };

    // Subscribe to attendee presence
    meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(presenceCallback);

    // Subscribe to transcription events
    // meetingSession.audioVideo.transcriptionController?.subscribeToTranscriptEvent(
    //   (transcriptEvent) => {
    //     console.log('Check transcriptEvent:', transcriptEvent);
    //     if (transcriptEvent?.type === 'started') {
    //       const transcriptionConfig = JSON.parse(transcriptEvent.transcriptionConfiguration);
    //       setSourceLanguageCode(transcriptionConfig.EngineTranscribeSettings.LanguageCode);
    //     }
    //     setTranscriptions(transcriptEvent);
    //   }
    // );
    // splitUrl()
    // Cleanup on unmount
    // return () => {
    //   meetingSession.audioVideo.realtimeUnsubscribeFromAttendeeIdPresence(presenceCallback);
    // };
  }, [meetingSession]);

  // Function to connect to WebSocket
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

  //     // // Send selected language to backend (required by your system)
  //     const targetLanguageCode = getNormalizedLanguageCode(selectedVoiceLanguage);
  //     // ws.send(JSON.stringify({
  //     //   action: 'selectLanguage',
  //     //   languageCode: targetLanguageCode, // <-- this should come from state or props
  //     // }));

  //     // ✅ Send "connectState" message after connecting
  //     const connectStatePayload = {
  //       action: 'connectState',
  //       tourId: tourId,
  //       languageCode: targetLanguageCode,
  //       userType: 'User',
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
  // }, [tourId, selectedVoiceLanguage]);
  // Amazon Translate code of the listener language. The Guide registers and sends its source language
  // with the same codes, so they can be compared
  const targetLanguageCode = getLanguageCode(selectedVoiceLanguage);
  console.log("targetLanguageCode", targetLanguageCode);
  // A listener of the Guide's language hears the Guide live (nothing is translated into it), the others the translation
  const isLiveAudio = targetLanguageCode === guideLanguage;
  isLiveAudioRef.current = isLiveAudio;
  const handleConnectionUpdate = useCallback((message) => {
    setParticipantsCount({
      total: message.connectionCount,
      guide: message.guideCount,
      subGuide: message.subGuideCount,
      user: message.userCount,
    });
    // Kept while no Guide is connected (null), e.g. while the Guide reloads the page
    if (message.guideLanguage) {
      setGuideLanguage(message.guideLanguage);
    }
  }, []);
  const connectWebSocket = useConnectWebSocket({
    wsRef,
    tourId: tourId,
    languageCode: targetLanguageCode,
    userType: userType,
    onConnectionUpdate: handleConnectionUpdate,
  });

  useWebSocketVisibilityHandler({
    tour,
    connectWebSocket,
    wsRef,
  });

  // The socket only sends languageCode once, in connectState on open (useConnectWebSocket.js)
  // - connectWebSocket() itself no-ops while a socket is already open, so switching languages
  // after joining would otherwise never reach the server. Skip the first run: connectState
  // already carried this same value when the socket opened
  const isFirstLanguageSelectionRef = useRef(true);
  useEffect(() => {
    if (isFirstLanguageSelectionRef.current) {
      isFirstLanguageSelectionRef.current = false;
      return;
    }
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const selectLanguagePayload = { action: 'selectLanguage', languageCode: targetLanguageCode };
      ws.send(JSON.stringify(selectLanguagePayload));
      console.log('📤 WebSocket Sent selectLanguage:', selectLanguagePayload);
    }
  }, [targetLanguageCode]);


  // Function to play the next translated audio in the queue
  // This uses the HTMLAudioElement for playback
  const playNextAudio = useCallback(async () => {
    console.log('🔊 Playing audio in queue audioQueueRef:', audioQueueRef.current);
    console.log('🔊 Playing audio in queue currentTranslatedAudioRef:', currentTranslatedAudioRef.current);
    console.log('🔊 Playing audio in queue isPlay:', isPlay);
    if (currentTranslatedAudioRef.current || audioQueueRef.current.length === 0 || !isPlay) {
      return;
    }

    //const audio = new Audio(nextAudio.blobUrl);
    // audioElementRef
    const audio = audioElementRef.current;
    // When Japanese is selected the audio element is bound to the meeting stream.
    // Resetting src/currentTime on it stops the live audio of the guide, so the
    // translated audio must never be played on this element
    if (!audio || audio.srcObject) {
      console.log('🔇 Skipped translated audio: the audio element is bound to the meeting stream');
      audioQueueRef.current.forEach(({ blobUrl }) => URL.revokeObjectURL(blobUrl));
      audioQueueRef.current = [];
      return;
    }

    const nextAudio = audioQueueRef.current.shift();
    console.log('🔊 Playing audio in queue nextAudio:', nextAudio);
    if (!nextAudio) return;

    // Reset the audio element
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
    // Set the new audio source
    audio.src = nextAudio.blobUrl;
    currentTranslatedAudioRef.current = audio; // 👉 Store current translated audio
    //isPlayingRef.current = true;

    try {
      console.log('🔊 Playing audio blob volume:', audio.volume);
      console.log('🔊 Playing audio blob muted:', audio.muted);
      // Load and play the audio
      audio.load();
      await audio.play();
      console.log('✅ Audio played');
      audio.onended = () => {
        //isPlayingRef.current = false;
        currentTranslatedAudioRef.current = null; // ✅ Clear ref
        URL.revokeObjectURL(nextAudio.blobUrl); // clean up
        audio.src = ''; // clear src to free memory
        // Only play next if still playing
        if (isPlay) {
          playNextAudio(); // play next
        }
      };
    } catch (err) {
      console.error('🔈 Failed to play audio:', err);
      //isPlayingRef.current = false;
      currentTranslatedAudioRef.current = null; // ✅ Clear ref on error
      // Only skip if still playing
      if (isPlay) {
        playNextAudio(); // Skip on error
      }
    }
  }, [isPlay]);


  // Function to play the next translated audio in the queue
  // This uses Web Audio API for better control over playback
  // const playNextAudio = useCallback(async () => {
  //   if (currentTranslatedAudioRef.current || audioQueueRef.current.length === 0 || !isPlay) {
  //     console.log('🔊 Skipped audio playback (current audio is playing or queue is empty or isPlay is false)');
  //     return;
  //   }

  //   const nextAudio = audioQueueRef.current.shift();
  //   if (!nextAudio) return;

  //   const audioContext = audioContextRef.current;
  //   if (!audioContext) {
  //     console.warn('AudioContext not initialized');
  //     return;
  //   }

  //   try {
  //     // 🔄 Resume context if suspended (especially on iOS Safari)
  //     if (audioContext.state === 'suspended') {
  //       await audioContext.resume();
  //     }

  //     // 🔊 Fetch and decode audio
  //     const response = await fetch(nextAudio.blobUrl);
  //     const arrayBuffer = await response.arrayBuffer();
  //     const decodedData = await audioContext.decodeAudioData(arrayBuffer);

  //     // 🎧 Create buffer source
  //     const source = audioContext.createBufferSource();
  //     source.buffer = decodedData;
  //     source.connect(audioContext.destination);
  //     currentTranslatedAudioRef.current = source;

  //     // 🔁 When playback ends
  //     source.onended = () => {
  //       currentTranslatedAudioRef.current = null;
  //       URL.revokeObjectURL(nextAudio.blobUrl);
  //       if (isPlay) {
  //         playNextAudio(); // 👉 play next in queue
  //       }
  //     };

  //     // ▶️ Start playback
  //     source.start(0);
  //   } catch (err) {
  //     console.error('❌ Web Audio API playback error:', err);
  //     currentTranslatedAudioRef.current = null;
  //     if (isPlay) {
  //       playNextAudio(); // skip on error
  //     }
  //   }
  // }, [isPlay]);


  // Scroll to the bottom of the translated and original text boxes when new data arrives
  const scrollToBottom = () => {
    if (translatedBoxRef.current) {
      translatedBoxRef.current.scrollTop = translatedBoxRef.current.scrollHeight;
    }
    if (originalBoxRef.current) {
      originalBoxRef.current.scrollTop = originalBoxRef.current.scrollHeight;
    }
  };


  // Connect WebSocket
  // useEffect(() => {
  //   console.log('WebSocket Tour connected:', tour);
  //   if (!tour) return;
  //   //connectWebSocket();
  //   if (isActive) {
  //     connectWebSocket();
  //   } else {
  //     if (wsRef.current) {
  //       console.log('🛑 Tab hidden, closing WebSocket connection.');
  //       wsRef.current.close(); // Optional: Close connection when tab is hidden
  //     }
  //   }
  // }, [connectWebSocket, tour, isActive]);


  // What the SDK makes of this browser. No capture counter here: a listener never opens a
  // microphone, so the only count that can go wrong on this side is the element binding
  useEffect(() => {
    logBrowserSupport();
  }, []);

  useEffect(() => {
    const ws = wsRef.current;
    console.log('WebSocket current in useEffect:', ws);

    if (ws) {
      ws.onmessage = async (event) => {
        const data = event.data;

        console.log('📥 Received WebSocket message:', data);

        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            console.log('📥 Parsed WebSocket message:', parsed);

            // This handler replaces the one of useConnectWebSocket, so it reads this message too
            if (parsed.type === 'connectionUpdate') {
              handleConnectionUpdate(parsed);
              return;
            }

            if (parsed.type === 'translationWithAudio') {
              console.log('📝 Translation:', parsed.translatedText);
              // setMessages((prevMessages) => [...prevMessages, parsed.translatedText]);
              // setOriginText((prevOriginalText) => [...prevOriginalText, parsed.originalText]);
              setTranslatedAudioData((prevData) => {
                const newState = {
                  messages: [...prevData.messages, parsed.translatedText],
                  originals: [...prevData.originals, parsed.originalText],
                };
                // Delay scroll
                setTimeout(scrollToBottom, 0);
                return newState;
              });

              // ✅ Broadcast audio when isPlay = true
              if (!isPlay) {
                console.log('⏸️ Skipped audio playback (isPlay = false)');
                return;
              }

              // Listeners of the Guide's language hear the Guide live through the meeting session,
              // the translated audio must not be queued on the same audio element
              if (isLiveAudio) {
                console.log('🔇 Skipped translated audio: the Guide is heard live from the meeting session');
                return;
              }

              console.log('🔊 Playing audio for lang:', parsed.language);
              console.log('🔊 Playing audio for audioQueueRef current:', audioQueueRef.current);

              const byteCharacters = atob(parsed.audioBase64);
              const byteArray = new Uint8Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteArray[i] = byteCharacters.charCodeAt(i);
              }

              const blob = new Blob([byteArray], { type: 'audio/mpeg' });
              const blobUrl = URL.createObjectURL(blob);
              audioQueueRef.current.push({ blobUrl });
              console.log('🔊 Playing audio for audioQueueRef after:', audioQueueRef.current);
              playNextAudio(isPlay);

            } else {
              console.warn('⚠️ Unhandled WebSocket type:', parsed.type);
            }
          } catch (err) {
            console.error('❌ Failed to parse WebSocket string data:', err, data);
          }
        } else {
          console.warn('❓ Received non-string data:', data);
        }
      };
    }
  }, [isPlay, playNextAudio, isLiveAudio, handleConnectionUpdate]);

  // Switch between the live audio and the translated audio when the Guide or the listener changes language
  // (the first bind is done when the session is initialized)
  useEffect(() => {
    const audioElement = audioElementRef.current;
    if (!meetingSession || !isSessionReady || !audioElement) {
      return;
    }
    const isBound = Boolean(audioElement.srcObject);
    if (isLiveAudio && !isBound) {
      // The translated audio uses the same element: stop it and drop what is queued first
      audioElement.pause();
      audioElement.src = '';
      currentTranslatedAudioRef.current = null;
      audioQueueRef.current.forEach(({ blobUrl }) => URL.revokeObjectURL(blobUrl));
      audioQueueRef.current = [];
      meetingSession.audioVideo.bindAudioElement(audioElement)
        .then(() => {
          audioElement.autoplay = false;
          if (isPlay) {
            audioElement.play()?.catch((error) => console.error('[Listen] Failed to resume the live audio:', error));
          }
        })
        .catch((error) => console.error('[Listen] Failed to bind the live audio:', error));
    } else if (!isLiveAudio && isBound) {
      meetingSession.audioVideo.unbindAudioElement();
    }
  }, [meetingSession, isSessionReady, isLiveAudio, isPlay]);

  const handleSelectedVoiceLanguageChange = (event) => {
    setSelectedVoiceLanguage(event.target.value);
  };

  const handleMuteUnmute = () => {
    setIsMuted(!isMuted);
    audioElementRef.current.muted = isMuted;
  };

  // Function to handle play/pause button click
  const handlePlay = () => {
    if (isPlay === false) {
      setIsPlay(true)
      logListenStartTiming(meetingSession);
      // play() returns a promise; left unawaited/uncaught it throws "Uncaught (in promise)
      // AbortError: the operation was aborted" whenever a pause()/reload() lands before it
      // resolves (e.g. tapping stop right after start, or a rebind of the same element) - see
      // docs/report/issue-14-japanese-audio-not-audible.md root cause #3
      audioElementRef.current.play()?.catch((error) => {
        if (error?.name === 'AbortError') {
          console.log('[Listen] play() aborted by a later pause/reload - ignoring', error);
          return;
        }
        console.error('[Listen] Failed to start playback:', error);
      });
    } else {
      setIsPlay(false);
      // ⛔ Immediately stop translated audio
      if (currentTranslatedAudioRef.current) {
        // ✅ new Audio() or audioElementRef.current (HTMLAudioElement)
        currentTranslatedAudioRef.current.pause();
        currentTranslatedAudioRef.current.src = '';
        // ✅ Web Audio API stop
        // currentTranslatedAudioRef.current.stop();
        // ✅ Clear the reference
        currentTranslatedAudioRef.current = null;
      }

      // ⛔ Stop Chime-bound audio (if needed)
      audioElementRef.current.pause();

      // 🧹 Clear translated audio queue
      audioQueueRef.current = [];
    }
  }

  // Sheet 3 of "VTG - investigation report - no-japansese-audio.xlsx" (Solution 2, recommended):
  // the Listener used to be stuck forever once told "Guide does not start" via a blocking
  // alert() - only a manual Join click retried. The overlay rendered near the bottom of this
  // component replaces that alert with a non-blocking one, so a background poll can start
  // immediately (no click required to dismiss anything first) and auto-close it the moment the
  // Guide's meeting is live - no further action needed from the Listener. Deliberately not
  // dismissible: closing it early would leave the Listener with no status at all while the poll
  // keeps running silently, which is worse than the overlay just sitting there. guidePollTimerRef
  // holds the interval id so a second Join click (or a second failed attempt) never stacks a
  // duplicate poll
  const guidePollTimerRef = useRef(null);
  const joinAudioSessionRef = useRef(null);
  // Guards against two joinAudioSession calls running at once - the 7s poll tick fires on a
  // timer regardless of whether the previous tick's awaited getMeetingByTourId/getMeeting calls
  // have resolved yet, so a slow request can otherwise let two ticks both observe statusCode
  // 200 right as the Guide goes live and both rejoin, creating two attendees/sessions
  const isJoiningRef = useRef(false);

  const stopWaitingForGuide = useCallback(() => {
    setShowWaitingForGuide(false);
    if (guidePollTimerRef.current) {
      clearInterval(guidePollTimerRef.current);
      guidePollTimerRef.current = null;
    }
  }, []);

  const startWaitingForGuide = useCallback(() => {
    setShowWaitingForGuide(true);
    if (guidePollTimerRef.current) {
      return; // already polling
    }
    console.log('[Auto-join] Guide not live yet - polling in the background every 7s');
    guidePollTimerRef.current = setInterval(() => {
      joinAudioSessionRef.current?.();
    }, 7000);
  }, []);

  // Stop polling if the Listener navigates away mid-wait
  useEffect(() => stopWaitingForGuide, [stopWaitingForGuide]);

  // Function to join the audio session
  const joinAudioSession = useCallback(async () => {
    if (isJoiningRef.current) {
      return; // a previous click or poll tick is still in flight - see isJoiningRef
    }
    isJoiningRef.current = true;
    try {
      const getMeetingByTourIdResponse = await getMeetingByTourId(tourId);
      console.log('getMeetingByTourIdResponse', getMeetingByTourIdResponse);
      if (getMeetingByTourIdResponse?.statusCode === 200) {
        setChatRestriction(getMeetingByTourIdResponse.data.chatRestriction);
        setTour(getMeetingByTourIdResponse.data);
        console.log('Meeting found:', getMeetingByTourIdResponse.data.meetingId);
        // What the tour points at right now - step 10 compares the cookie against it
        noteTourMeetingId(getMeetingByTourIdResponse.data.meetingId);

        if (getMeetingByTourIdResponse.data.meetingId) {
          console.log("Meeting Existed in Tour");
          const checkAvailableMeetingResponse = await getMeeting(getMeetingByTourIdResponse.data.meetingId);
          console.log('checkAvailableMeeting:', checkAvailableMeetingResponse);
          console.log('checkAvailableMeeting statusCode:', checkAvailableMeetingResponse.statusCode);
          if (checkAvailableMeetingResponse.statusCode === 404) {
            startWaitingForGuide();
          } else if (checkAvailableMeetingResponse.statusCode === 200) {
            // Join the meeting again and set the meeting session in the state
            console.log('Meeting not expired:', checkAvailableMeetingResponse);
            console.log('Check checkAvailableMeetingResponse:', checkAvailableMeetingResponse.data);
            stopWaitingForGuide();
            await rejoinAudioSession(checkAvailableMeetingResponse.data, getMeetingByTourIdResponse.data.channelId);

          } else {
            console.log('Meeting error:', checkAvailableMeetingResponse);
          }
        } else {
          startWaitingForGuide();
        }
      } else {
        // alert('Tour not found, please check the tour ID.');
        console.log('Tour not found, please check the tour ID.');
        // toast.error('Tour not found, please check the tour ID.');
        setTour(null);
      }
    } finally {
      isJoiningRef.current = false;
    }
  }, [rejoinAudioSession, tourId, startWaitingForGuide, stopWaitingForGuide]);

  useEffect(() => {
    joinAudioSessionRef.current = joinAudioSession;
  }, [joinAudioSession]);

  // Call requestWakeLock once the meeting session is set:
  // useEffect(() => {
  //   if (meetingSession) {
  //     requestWakeLock();
  //     // document.addEventListener('visibilitychange', async () => {
  //     //   if (wakeLockRef.current && document.visibilityState === 'visible') {
  //     //     await requestWakeLock();
  //     //   }
  //     // });
  //   }
  // }, [meetingSession, requestWakeLock]);
  useWakeLock(meetingSession);

  // Check if the tour exists, if not, show a not found page
  if (tour === null) {
    return <NotFound />;
  }

  return (
    <>
      {showWaitingForGuide && (
        <div className="waiting-for-guide-overlay">
          <div className="waiting-for-guide-card">
            <p>{t('guideNotStarted')}</p>
            <div className="spinner"></div>
          </div>
        </div>
      )}
      <Header count={participantsCount} tourId={tourId} userType={userType} />
      {/* <div className="live-viewer-container"> */}
      <div className={` ${isSessionReady ? 'live-viewer-container' : 'live-viewer-container-center'}`}>
        <TourTitle tour={tour} />
        {!isSessionReady && (
          <div className="box-selected-language">
            <h3 className='title-box'>
              {t('voiceLanguageLbl.listening')}
            </h3>
            <div className="select-container">
              {/* The labels are already written in the language of the UI. `translate="no"` keeps
                  the built-in translator of the browser (Chrome on Android translates a page
                  automatically) from rewriting the options: its edits collide with the re-render
                  of React and leave duplicated entries such as 【日本語・日本語・中国語】 behind */}
              <select
                className='selected-language notranslate'
                id="selectedVoiceLanguage"
                lang={getBaseLanguage(i18n.language)}
                translate="no"
                value={selectedVoiceLanguage}
                onChange={handleSelectedVoiceLanguageChange}
              >
                {getVoiceLanguages(i18n.language).map((language) => (
                  // The UI language is part of the key, so switching the label set remounts the
                  // option instead of patching a text node the translator may have replaced
                  <option key={`${getBaseLanguage(i18n.language)}-${language.key}`} value={language.key}>
                    {language.label}
                  </option>
                ))}

              </select>
            </div>
          </div>
        )}
        {/* <p>Connection Count: {connectionCount}</p> */}
        <audio
          id="audioElementListener"
          ref={audioElementRef}
          style={{ display: 'none' }}
        />

        {/* <ul>
          {messages.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul> */}

        {!isSessionReady ? (
          hasAttemptedJoin ? (
            // Covers the whole gap between clicking Join and isSessionReady, including the
            // moments before getMeetingAttendeeInfoFromCookies/joinMeeting even start running
            // (e.g. the await inside rejoinAudioSession that precedes them) - the overlay above
            // covers the screen instead whenever it is showing
            !showWaitingForGuide && (
              <div className="loading">
                <div className="spinner"></div>
                <p>{t('loading')}</p>
              </div>
            )
          ) : (
            <div className='btn' onClick={() => { setHasAttemptedJoin(true); joinAudioSession(); }}>
              <button className='btn-join'>{t('joinBtn')}</button>
            </div>
          )
        ) : (
          <>
            <AudioPlayerControl
              isPlay={isPlay}
              handlePlay={handlePlay}
              isMuted={isMuted}
              handleMuteUnmute={handleMuteUnmute}
              userType={userType}
              t={t}
            />
            {translatedAudioData.messages?.length > 0 && translatedAudioData.originals?.length > 0 && (
              <>
                <div className='trans-box'>
                  <div style={{ textAlign: 'center', fontWeight: '700' }}>
                    <p>{t('captureTranslations')}</p>
                  </div>
                  <div className='trans-text-box'>
                    <span className='trans-text'>
                      {t('translations')}:
                    </span>
                    <div className='trans-messages' ref={translatedBoxRef}>
                      {translatedAudioData.messages.map((msg, idx) => (
                        <div key={idx} className='trans-message-item'>
                          {msg}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='trans-text-box'>
                    <span className='trans-text'>
                      {t('transcriptions')}:
                    </span>
                    <div className='trans-messages' ref={originalBoxRef}>
                      {translatedAudioData.originals.map((msg, idx) => (
                        <div key={idx} className='trans-message-item'>
                          {msg}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            {chatRestriction !== "nochat" && (<MessageBox userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} userType={userType} statusChat={chatRestriction} chatLanguage={getLanguageCode(selectedVoiceLanguage)} />)}
          </>
        )}
      </div>
      <DebugLogPanel />
    </>
  );
}

export default MultiLangAudio;