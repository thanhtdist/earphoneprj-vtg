import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createAttendee,
  createAppInstanceUsers,
  addChannelMembership,
  listAttendee,
  //translateTextSpeech,
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
import { LISTEN_VOICE_LANGUAGES, JA_LISTEN_VOICE_LANGUAGES } from '../../utils/constant';
import Header from '../common/Header';
import MessageBox from '../chat/MessageBox';
import { useParams } from "react-router-dom";
import NotFound from '../NotFound';
import TourTitle from '../common/TourTitle';
import AudioPlayerControl from '../common/AudioPlayerControl';

function LiveViewer() {
  // Get the params from the URL
  const wsRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  // Refs for the translated and original text boxes
  const translatedBoxRef = useRef(null);
  const originalBoxRef = useRef(null);
  // State variables
  // const [messages, setMessages] = useState([]);
  // const [originalText, setOriginText] = useState([]);
  const [translatedAudioData, setTranslatedAudioData] = useState({ messages: [], originals: [] });
  const { tourId } = useParams(); // Extracts 'tourId' from the URL
  console.log('tourId:', tourId);
  const { t, i18n } = useTranslation();
  const [tour, setTour] = useState(undefined);
  const [meetingSession, setMeetingSession] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [attendee, setAttendee] = useState(null);
  const [channelArn, setChannelArn] = useState('');
  const [userArn, setUserArn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [selectedVoiceLanguage, setSelectedVoiceLanguage] = useState(
    LISTEN_VOICE_LANGUAGES.find((lang) => lang.key.startsWith(i18n.language))?.key || 'ja-JP'
  );
  const [chatRestriction, setChatRestriction] = useState(null);
  const userID = uuidv4();
  const userType = 'User';
  // Ref for the audio element  
  const audioElementRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlay, setIsPlay] = useState(false);

  // Add these references and callback:
  const wakeLockRef = useRef(null);
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        console.log('Requesting Wake Lock...');
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock was released.');
        });
      }
    } catch (error) {
      console.error('Failed to request Wake Lock:', error);
    }
  }, []);

  const initializeMeetingSession = useCallback(async (meetingData, attendeeData) => {
    if (!meetingData || !attendeeData) {
      console.error('Invalid meeting or attendee information');
      return;
    }

    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfig = new MeetingSessionConfiguration(meetingData, attendeeData);
    const session = new DefaultMeetingSession(meetingSessionConfig, logger, deviceController);
    setMeetingSession(session);

    await selectSpeaker(session);
    if (selectedVoiceLanguage === 'ja-JP') {
      console.log('Selected voice language is Japanese', selectedVoiceLanguage);
      //const audioElement = document.getElementById('audioElementListener');
      const audioElement = audioElementRef.current;
      console.log('Check audioElement:', audioElement);
      if (audioElement) {
        await session.audioVideo.bindAudioElement(audioElement);
      } else {
        console.error('Audio element not found');
      }
    }
    metricReport(session);
    session.audioVideo.start();
  }, [selectedVoiceLanguage]);

  const selectSpeaker = async (session) => {
    try {
      const audioOutputDevices = await session.audioVideo.listAudioOutputDevices();
      if (audioOutputDevices.length > 0) {
        await session.audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
      } else {
        console.log('No speaker devices found');
      }
    } catch (error) {
      console.error('Error selecting speaker:', error);
    }
  };

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
      setIsLoading(true);
      initializeMeetingSession(retrievedUser.meeting, retrievedUser.attendee);
      setMeeting(retrievedUser.meeting);
      setAttendee(retrievedUser.attendee);
      setUserArn(retrievedUser.userArn);
      setChannelArn(retrievedUser.channelArn);
      setIsLoading(false);
    },
    [initializeMeetingSession]
  );

  const joinMeeting = useCallback(
    async (meetingData, channelId) => {
      setIsLoading(true);
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
        await initializeMeetingSession(meetingData, attendeeData);

        const { channelArn, userArn } = await createAppUserAndJoinChannel(
          meetingData.MeetingId,
          attendeeData.AttendeeId,
          userID,
          userType,
          channelId
        );

        setMeeting(meetingData);
        setAttendee(attendeeData);
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
        setIsLoading(false);
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
        if (retrievedUser) {
          const isMeetingMatched =
            retrievedUser.meeting.MeetingId === meeting.MeetingId;
          const isChannelMatched =
            retrievedUser.channelArn === `${Config.appInstanceArn}/channel/${channelId}`;

          if (isMeetingMatched && isChannelMatched) {
            const meetingData = await checkAvailableMeeting(
              retrievedUser.meeting.MeetingId,
              'User'
            );
            if (meetingData) {
              getMeetingAttendeeInfoFromCookies(retrievedUser);
              return;
            }
          }
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
      setParticipantsCount(attendeeSet.size);
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
  const connectWebSocket = useCallback(() => {
    // If a WebSocket connection already exists, skip creating a new one
    if (wsRef.current) {
      console.log('🔁 WebSocket already connected.');
      return;
    }

    // Create a new WebSocket instance
    const ws = new WebSocket(Config.webSocketURL);

    // Variables to track connection timestamp and ping interval
    let connectTimestamp = null;
    let pingInterval = null;

    // When the WebSocket successfully connects
    ws.onopen = () => {
      connectTimestamp = Date.now();
      console.log('✅ WebSocket Connected at:', new Date(connectTimestamp).toLocaleTimeString());

      // Send selected language to backend (required by your system)
      ws.send(JSON.stringify({
        action: 'selectLanguage',
        languageCode: selectedVoiceLanguage, // <-- this should come from state or props
      }));

      // ✅ Start pinging every 4 minutes to keep the connection alive
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          console.log('📡 WebSocket Sending ping...');
          ws.send(JSON.stringify({ action: 'ping' }));
        }
      }, 4 * 60 * 1000); // 4 minutes
    };

    // When the WebSocket connection is closed
    ws.onclose = () => {
      const disconnectTimestamp = Date.now();
      const duration = connectTimestamp
        ? ((disconnectTimestamp - connectTimestamp) / 1000).toFixed(1)
        : 'unknown';

      console.log('❌ WebSocket Disconnected at:', new Date(disconnectTimestamp).toLocaleTimeString());
      console.log(`🔌 WebSocket Connection lasted: ${duration} seconds`);

      // Stop the ping interval if it was running
      if (pingInterval) {
        clearInterval(pingInterval);
      }

      // Clear the reference so future reconnects are allowed
      wsRef.current = null;
    };

    // Handle WebSocket error events
    ws.onerror = (error) => {
      console.error('⚠️ WebSocket error:', error);

      // Stop the ping interval on error
      if (pingInterval) {
        clearInterval(pingInterval);
      }

      // Clear the reference
      wsRef.current = null;
    };

    // Store the WebSocket instance in a ref so it's accessible globally
    wsRef.current = ws;
  }, [selectedVoiceLanguage]);


  // Function to play the next audio in the queue
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !isPlay) {
      return;
    }

    const nextAudio = audioQueueRef.current.shift();
    if (!nextAudio) return;

    const audio = new Audio(nextAudio.blobUrl);
    isPlayingRef.current = true;

    try {
      await audio.play();
      console.log('✅ Audio played');
      audio.onended = () => {
        isPlayingRef.current = false;
        URL.revokeObjectURL(nextAudio.blobUrl); // clean up
        // Only play next if still playing
        if (isPlay) {
          playNextAudio(); // play next
        }
      };
    } catch (err) {
      console.error('🔈 Failed to play audio:', err);
      isPlayingRef.current = false;
      // Only skip if still playing
      if (isPlay) {
        playNextAudio(); // Skip on error
      }
    }
  }, [isPlay]);

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
  useEffect(() => {
    console.log('WebSocket Tour connected:', tour);
    if (!tour) return;
    connectWebSocket();
  }, [connectWebSocket, tour]);


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

              console.log('🔊 Playing audio for lang:', parsed.language);

              const byteCharacters = atob(parsed.audioBase64);
              const byteArray = new Uint8Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteArray[i] = byteCharacters.charCodeAt(i);
              }

              const blob = new Blob([byteArray], { type: 'audio/mpeg' });
              const blobUrl = URL.createObjectURL(blob);
              audioQueueRef.current.push({ blobUrl });
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
  }, [isPlay, playNextAudio]);

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
      audioElementRef.current.play();
    } else {
      setIsPlay(false);
      audioElementRef.current.pause();
    }
  }

  // Function to join the audio session
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
          rejoinAudioSession(checkAvailableMeetingResponse.data, getMeetingByTourIdResponse.data.channelId);

        } else {
          console.log('Meeting error:', checkAvailableMeetingResponse);
        }
      } else {
        alert('Guide does not start, please wait...');
      }
    } else {
      // alert('Tour not found, please check the tour ID.');
      console.log('Tour not found, please check the tour ID.');
      // toast.error('Tour not found, please check the tour ID.');
      setTour(null);
    }
  }, [rejoinAudioSession, tourId]);

  // Call requestWakeLock once the meeting session is set:
  useEffect(() => {
    if (meetingSession) {
      requestWakeLock();
      // document.addEventListener('visibilitychange', async () => {
      //   if (wakeLockRef.current && document.visibilityState === 'visible') {
      //     await requestWakeLock();
      //   }
      // });
    }
  }, [meetingSession, requestWakeLock]);

  // Check if the tour exists, if not, show a not found page
  if (tour === null) {
    return <NotFound />;
  }

  return (
    <>
      <Header count={participantsCount} tourId={tourId} userType={userType} />
      {/* <div className="live-viewer-container"> */}
      <div className={` ${meeting && attendee ? 'live-viewer-container' : 'live-viewer-container-center'}`}>
        <TourTitle tour={tour} />
        {!meeting && !attendee && (
          <div className="box-selected-language">
            <h3 className='title-box'>
              {t('voiceLanguageLbl.listening')}
            </h3>
            <div className="select-container">
              <select
                className='selected-language'
                id="selectedVoiceLanguage"
                value={selectedVoiceLanguage}
                onChange={handleSelectedVoiceLanguageChange}
              >
                {(i18n.language === 'ja' ? JA_LISTEN_VOICE_LANGUAGES : LISTEN_VOICE_LANGUAGES).map((language) => (
                  <option key={language.key} value={language.key}>
                    {language.label}
                  </option>
                ))}

              </select>
            </div>
          </div>
        )}
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

        {!meeting && !attendee ? (
          isLoading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>{t('loading')}</p>
            </div>
          ) : (
            <div className='btn' onClick={joinAudioSession}>
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
            {chatRestriction !== "nochat" && (<MessageBox userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} userType={userType} statusChat={chatRestriction} />)}
          </>
        )}
      </div>

    </>
  );
}

export default LiveViewer;