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
import JSONCookieUtils from '../../utils/JSONCookieUtils';
import { checkAvailableMeeting } from '../../utils/MeetingUtils';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import Header from '../common/Header';
import MessageBox from '../chat/MessageBox';
import { useParams } from "react-router-dom";
import NotFound from '../NotFound';
import TourTitle from '../common/TourTitle';
import AudioPlayerControl from '../common/AudioPlayerControl';
import { messages } from '../../messages';
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
import DebugLogPanel from '../common/DebugLogPanel';
//import Loading from '../Loading';

function JapaneseAudio() {
  //const [connectionCount, setConnectionCount] = useState(0);
  const currentTranslatedAudioRef = useRef(null);
  const wsRef = useRef(null);
  const audioQueueRef = useRef([]);
  // Get the params from the URL
  const { tourId } = useParams(); // Extracts 'tourId' from the URL
  console.log('tourId:', tourId);
  const { t } = useTranslation();
  const [isJoinAudio, setIsJoinAudio] = useState(true)
  const [tour, setTour] = useState(undefined);
  const [meetingSession, setMeetingSession] = useState(null);
  // const [meeting, setMeeting] = useState(null);
  // const [attendee, setAttendee] = useState(null);
  const [channelArn, setChannelArn] = useState('');
  const [userArn, setUserArn] = useState('');
  //const [isLoading, setIsLoading] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);
  const userID = uuidv4();
  const userType = 'User';
  // Ref for the audio element  
  const audioElementRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlay, setIsPlay] = useState(false);

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
    metricReport(session);
    // Whether this session is connected to a meeting that exists, and who else is in it.
    // Subscribed before start(), otherwise a session that fails immediately - a stale
    // meeting id is rejected within milliseconds - would stop before anything is watching
    watchMeetingConnection(session);
    watchMeetingAttendees(session);

    // Subscribed before start(), so the very first stats tick is counted
    watchIncomingAudio(session, () => audioElementRef.current);
    session.audioVideo.start();
  }, []);

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
    (retrievedUser) => {
      //setIsLoading(true);
      initializeMeetingSession(retrievedUser.meeting, retrievedUser.attendee, 'cookie');
      //setMeeting(retrievedUser.meeting);
      //setAttendee(retrievedUser.attendee);
      setUserArn(retrievedUser.userArn);
      setChannelArn(retrievedUser.channelArn);
      //setIsLoading(false);
    },
    [initializeMeetingSession]
  );

  const joinMeeting = useCallback(
    async (meetingData, channelId) => {
      //setIsLoading(true);
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

        // setMeeting(meetingData);
        // setAttendee(attendeeData);
        setChannelArn(channelArn);
        setUserArn(userArn);
        console.log('Cookie set for 1 day!');
        //setIsJoinAudio(true);
        const user = {
          meeting: meetingData,
          attendee: attendeeData,
          userArn,
          channelArn,
        };

        JSONCookieUtils.setJSONCookie('User' + tourId, user, 1);

      } catch (error) {
        console.error('Error joining the meeting:', error);
      } finally {
        //setIsLoading(false);
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
        const retrievedUser = JSONCookieUtils.getJSONCookie('User' + tourId);
        console.log('Check retrievedUser:', retrievedUser);
        console.log('Check retrievedUser meeting:', retrievedUser?.meeting);
        console.log('Check retrievedUser channel:', retrievedUser?.channelArn);
        console.log('Check Input channelId:', channelId);
        console.log('Check Input meeting:', meeting.MeetingId);
        console.log('Check retrievedUser meetingId:', retrievedUser?.meeting.MeetingId);
        console.log('Check retrievedUser channelId:', retrievedUser?.channelArn.split('/').pop());
        console.log('Check retrievedUser channelId:', `${Config.appInstanceArn}/channel/${channelId}`);
        const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;
        if (retrievedUser) {
          const isMeetingMatched =
            retrievedUser.meeting.MeetingId === meeting.MeetingId;
          const isChannelMatched =
            retrievedUser.channelArn === channelArn;

          if (isMeetingMatched && isChannelMatched) {
            const meetingData = await checkAvailableMeeting(
              retrievedUser.meeting.MeetingId,
              'User'
            );
            if (meetingData) {
              logMeetingTransition(retrievedUser.meeting.MeetingId, meeting.MeetingId, 'cookie meeting+channel match the tour, reusing it');
              logChannelTransition(retrievedUser.channelArn, channelArn, 'cookie meeting+channel match the tour, reusing it');
              getMeetingAttendeeInfoFromCookies(retrievedUser);
              return;
            }
            logMeetingTransition(retrievedUser.meeting.MeetingId, meeting.MeetingId, 'cookie matched, but that meeting is no longer available - joining the tour\'s instead');
            logChannelTransition(retrievedUser.channelArn, channelArn, 'cookie\'s meeting is no longer available, using the tour\'s channel');
          } else if (!isMeetingMatched) {
            logMeetingTransition(retrievedUser.meeting.MeetingId, meeting.MeetingId, "cookie's meeting differs from the tour's, joining the tour's instead");
            logChannelTransition(retrievedUser.channelArn, channelArn, "cookie's meeting was wrong, using the tour's channel");
          } else {
            logMeetingTransition(retrievedUser.meeting.MeetingId, meeting.MeetingId, 'cookie meeting matches, but its channel does not - joining the tour\'s channel instead');
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

  //     // ✅ Send "connectState" message after connecting
  //     const connectStatePayload = {
  //       action: 'connectState',
  //       tourId: tourId,
  //       languageCode: 'ja-JP',
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

  const handleMuteUnmute = () => {
    setIsMuted(!isMuted);
    audioElementRef.current.muted = isMuted;
  };

  // Function to handle play/pause button click
  const handlePlay = () => {
    if (isPlay === false) {
      setIsPlay(true)
      logListenStartTiming(meetingSession);
      audioElementRef.current.play(); // This is for Chime session (ja-JP only)
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

  // Call requestWakeLock once the meeting session is set:
  // useEffect(() => {
  //   if (meetingSession) {
  //     requestWakeLock();
  //     document.addEventListener('visibilitychange', async () => {
  //       if (wakeLockRef.current && document.visibilityState === 'visible') {
  //         await requestWakeLock();
  //       }
  //     });
  //   }
  // }, [meetingSession, requestWakeLock]);
  useWakeLock(meetingSession);


  // Function to join the tour
  const joinTour = useCallback(async () => {
    const tourResponse = await getMeetingByTourId(tourId);
    console.log('tourResponse', tourResponse);
    if (tourResponse?.statusCode === 200) {
      setTour(tourResponse.data);
    } else {
      setTour(null);
    }
  }, [tourId]);

  // Call joinAudioSession when the component mounts
  useEffect(() => {
    joinTour();
  }, [joinTour]);

  // What the SDK makes of this browser. No capture counter here: a listener never opens a
  // microphone, so the only count that can go wrong on this side is the element binding
  useEffect(() => {
    logBrowserSupport();
  }, []);

  const processTour = useCallback(async () => {
    console.log("Processing Tour:", tour);
    try {
      if (tour.meetingId) {
        // What the tour points at right now - step 10 compares the cookie against it
        noteTourMeetingId(tour.meetingId);
        console.log("Meeting Exists in Tour");

        // Check if the meeting is available in Chime Meeting
        const meetingResponse = await getMeeting(tour.meetingId);
        console.log('Meeting response:', meetingResponse);

        if (meetingResponse.statusCode === 404) {
          // Using console.error instead of alert for server-side issues
          alert(messages.guide.notStart);
          // Consider using a toast notification library or setting an error state
        } else if (meetingResponse.statusCode === 200) {
          // Join the meeting again and set the meeting session in the state
          console.log('Meeting available:', meetingResponse.data);
          rejoinAudioSession(meetingResponse.data, tour.channelId);
        } else {
          console.error('Meeting error:', meetingResponse);
        }
      } else {
        alert(messages.guide.notStart);
      }
    } catch (error) {
      console.error('Error processing tour:', error);
    }
  }, [tour, rejoinAudioSession]);

  // Process the tour when it changes
  useEffect(() => {
    // Skip if tour is undefined
    if (!tour) return;
    if (isJoinAudio) {
      processTour();
      setIsJoinAudio(false);
    }
    //setIsLoading(true);

  }, [tour, processTour, isJoinAudio]);

  // if (tour === undefined) {
  //   return (
  //     <>{isLoading && (
  //       // <div className="loading">
  //       //   <div className="spinner"></div>
  //       //   <p>{t('loading')}</p>
  //       // </div>
  //       <Loading />
  //     )}</>
  //   );
  // }

  if (tour === null) {
    return <NotFound />;
  }

  return (
    <>
      {/* {meetingSession ? (
        <>
          <Header count={participantsCount} tourId={tourId} userType={userType} />
          <div className='live-viewer-container'>
            <audio
              id="audioElementListener"
              ref={audioElementRef}
              style={{ display: 'none' }}
            />
            <TourTitle tour={tour} />
            <AudioPlayerControl
              isPlay={isPlay}
              handlePlay={handlePlay}
              isMuted={isMuted}
              handleMuteUnmute={handleMuteUnmute}
              userType={userType}
              t={t}
            />
            {tour && tour.chatRestriction !== "nochat" && (<MessageBox userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} userType={userType} statusChat={tour.chatRestriction} chatLanguage="ja" />)}
          </div>
        </>) : (<>
          {isLoading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>{t('loading')}</p>
            </div>
          )}
        </>)} */}
      <Header count={participantsCount} tourId={tourId} userType={userType} />
      <div className='live-viewer-container'>
        {/* <p>Connection Count: {connectionCount}</p> */}
        <audio
          id="audioElementListener"
          ref={audioElementRef}
          style={{ display: 'none' }}
        />
        <TourTitle tour={tour} />
        <AudioPlayerControl
          isPlay={isPlay}
          handlePlay={handlePlay}
          isMuted={isMuted}
          handleMuteUnmute={handleMuteUnmute}
          userType={userType}
          t={t}
        />
        {tour && tour.chatRestriction !== "nochat" && (<MessageBox userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} userType={userType} statusChat={tour.chatRestriction} chatLanguage="ja" />)}
      </div>
      <DebugLogPanel />
    </>
  );
}

export default JapaneseAudio;