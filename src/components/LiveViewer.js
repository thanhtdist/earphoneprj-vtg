import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  createAttendee,
  createAppInstanceUsers,
  addChannelMembership,
  listAttendee,
  translateTextSpeech,
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
import Participants from './Participants';
import Config from '../utils/config';
import metricReport from '../utils/MetricReport';
import JSONCookieUtils from '../utils/JSONCookieUtils';
import { checkAvailableMeeting } from '../utils/MeetingUtils';
import { v4 as uuidv4 } from 'uuid';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LISTEN_VOICE_LANGUAGES } from '../utils/constant';

function LiveViewer() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const meetingId = queryParams.get('meetingId');
  const channelId = queryParams.get('channelId');
  const hostId = queryParams.get('hostId');
  const chatSetting = queryParams.get('chatSetting');

  const { t, i18n } = useTranslation();

  const [meetingSession, setMeetingSession] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [attendee, setAttendee] = useState(null);
  const [channelArn, setChannelArn] = useState('');
  const [userArn, setUserArn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [transcripts, setTranscriptions] = useState([]);
  const [transcriptText, setTranscriptText] = useState([]);
  const [translatedText, setTranslatedText] = useState([]);
  const [sourceLanguageCode, setSourceLanguageCode] = useState(null);
  const [selectedVoiceLanguage, setSelectedVoiceLanguage] = useState(
    LISTEN_VOICE_LANGUAGES.find((lang) => lang.key.startsWith(i18n.language))?.key || 'ja-JP'
  );

  // Replace local variables with refs
  const transcriptListRef = useRef([]);
  const transcriptedListRef = useRef([]);
  const translatedListRef = useRef([]);
  const audioQueueRef = useRef([]);

  // Ref for the audio element
  const audioElementRef = useRef(null);

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
    metricReport(session);
    session.audioVideo.start();
  }, []);

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
    async () => {
      setIsLoading(true);
      try {
        if (!meetingId || !channelId || !hostId) {
          alert('Meeting ID, Channel ID, and Host ID are required');
          return;
        }

        const userID = uuidv4();
        const userType = 'User';

        const meetingData = await checkAvailableMeeting(meetingId, userType);
        if (!meetingData) return;

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

        const user = {
          meeting: meetingData,
          attendee: attendeeData,
          userArn,
          channelArn,
        };

        JSONCookieUtils.setJSONCookie('User', user, 1);
        console.log('Cookie set for 1 day!');
      } catch (error) {
        console.error('Error joining the meeting:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      meetingId,
      channelId,
      hostId,
      initializeMeetingSession,
      createAppUserAndJoinChannel,
    ]
  );

  const joinAudioSession = useCallback(
    async () => {
      try {
        const retrievedUser = JSONCookieUtils.getJSONCookie('User');
        if (retrievedUser) {
          const isMeetingMatched =
            retrievedUser.meeting.MeetingId === meetingId;
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
        joinMeeting();
      } catch (error) {
        console.error('Error processing the User cookie:', error);
      }
    },
    [
      meetingId,
      channelId,
      getMeetingAttendeeInfoFromCookies,
      joinMeeting,
    ]
  );

  useEffect(() => {
    if (!meetingSession) return;

    const attendeeSet = new Set();
    const presenceCallback = (present, attendeeId) => {
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
    meetingSession.audioVideo.transcriptionController?.subscribeToTranscriptEvent(
      (transcriptEvent) => {
        console.log('Check transcriptEvent:', transcriptEvent);
        if (transcriptEvent?.type === 'started') {
          const transcriptionConfig = JSON.parse(transcriptEvent.transcriptionConfiguration);
          setSourceLanguageCode(transcriptionConfig.EngineTranscribeSettings.LanguageCode);
        }
        setTranscriptions(transcriptEvent);
      }
    );

    // Cleanup on unmount
    return () => {
      meetingSession.audioVideo.realtimeUnsubscribeFromAttendeeIdPresence(presenceCallback);
    };
  }, [meetingSession]);

  useEffect(() => {
    let timer = null;
    const audioElement = audioElementRef.current;
    if (!audioElement || !meetingSession || !sourceLanguageCode || !selectedVoiceLanguage) return;
    if (
      sourceLanguageCode !== selectedVoiceLanguage &&
      transcripts?.results?.[0]?.alternatives?.[0]?.transcript &&
      !transcripts.results[0].isPartial
    ) {
      // const currentText = transcripts.results[0].alternatives[0].transcript;
      // transcriptListRef.current.push(currentText);
      // setTranscriptText((prev) => [...prev, currentText]);

      // const translateAndPlay = async () => {
      //   try {
      //     const response = await translateTextSpeech(
      //       currentText,
      //       sourceLanguageCode,
      //       selectedVoiceLanguage,
      //       'standard'
      //     );
      //     console.log('Check translateTextSpeech:', translateTextSpeech);
      //     translatedListRef.current.push(response.translatedText);
      //     setTranslatedText((prev) => [...prev, response.translatedText]);

      //     if (!response.speech.AudioStream?.data)
      //       throw new Error('Invalid AudioStream data');

      //     const audioBlob = new Blob(
      //       [Uint8Array.from(response.speech.AudioStream.data)],
      //       {
      //         type: response.speech.ContentType || 'audio/mpeg',
      //       }
      //     );
      //     const audioUrl = URL.createObjectURL(audioBlob);
      //     console.log('Check audioUrl:', audioUrl);
      //     audioElement.src = audioUrl;
      //     audioElement.play();
      //   } catch (error) {
      //     console.error('Error translating text to speech:', error);
      //   }
      // };

      // translateAndPlay();
      const processAudioQueue = async () => {
        if (audioQueueRef.current.length === 0) return;
      
        const nextAudio = audioQueueRef.current.shift();
        try {
          await translateAndPlay(nextAudio);
        } catch (error) {
          console.error('Error processing audio queue:', error);
        }
        setTimeout(processAudioQueue, 0);  // Xử lý tiếp audio tiếp theo trong hàng đợi.
      };
      
      const translateAndPlay = async (currentText) => {
        try {
          const response = await translateTextSpeech(
            currentText,
            sourceLanguageCode,
            selectedVoiceLanguage,
            'standard'
          );
      
          console.log('Translated response:', response);
          
          translatedListRef.current.push(response.translatedText);
          setTranslatedText((prev) => [...prev, response.translatedText]);
      
          if (!response.speech.AudioStream?.data)
            throw new Error('Invalid AudioStream data');
      
          const audioBlob = new Blob(
            [Uint8Array.from(response.speech.AudioStream.data)],
            { type: response.speech.ContentType || 'audio/mpeg' }
          );
      
          const audioUrl = URL.createObjectURL(audioBlob);
      
          const audioElement = audioElementRef.current;
          if (audioElement) {
            audioElement.src = audioUrl;
            audioElement.play();
      
            audioElement.onended = () => {
              processAudioQueue();  // Gọi tiếp audio tiếp theo trong hàng đợi.
            };
          }
        } catch (error) {
          console.error('Failed to translate text to speech:', error);
        }
      };

      // process the audio queue
      const text = transcripts.results[0].alternatives[0].transcript;

      if (text) {
        transcriptListRef.current.push(text);
        transcriptedListRef.current.push(text);

        if (timer) clearTimeout(timer);

        timer = setTimeout(() => {
          const aggregatedText = transcriptListRef.current.join(' ');
          console.log('Aggregated Transcription:', aggregatedText);

          audioQueueRef.current.push(aggregatedText);
          if (audioQueueRef.current.length === 1) {
            processAudioQueue();  // Start processing the queue.
          }
          transcriptListRef.current = [];
        }, 1000);  // Gộp các transcriptions trong vòng 1 giây.
      }

    } else {
      if (sourceLanguageCode === selectedVoiceLanguage) {
        meetingSession.audioVideo.bindAudioElement(audioElement);
        audioElement.play();
      }
    }
  }, [
    meetingSession,
    transcripts,
    sourceLanguageCode,
    selectedVoiceLanguage,
  ]);

  const handleSelectedVoiceLanguageChange = (event) => {
    setSelectedVoiceLanguage(event.target.value);
  };

  console.log('Check transcriptList:', transcriptListRef.current);
  console.log('Check transcriptList string:', transcriptListRef.current.join(' '));

  console.log('Check translatedList:', translatedListRef.current);
  console.log('Check translatedList string:', translatedListRef.current.join(' '));

  console.log('Check transcriptText:', transcriptText);
  console.log('Check transcriptText string:', transcriptText.join(' '));

  console.log('Check translatedText:', translatedText);
  console.log('Check translatedText string:', translatedText.join(' '));

  return (
    <>
      <Participants count={participantsCount} />
      <div className="live-viewer-container">
        {!meeting && !attendee && (
          <div>
            <label htmlFor="selectedVoiceLanguage">Select a language to listen</label>
            <select
              id="selectedVoiceLanguage"
              value={selectedVoiceLanguage}
              onChange={handleSelectedVoiceLanguageChange}
            >
              {LISTEN_VOICE_LANGUAGES.map((language) => (
                <option key={language.key} value={language.key}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <audio
          id="audioElementListener"
          controls
          ref={audioElementRef}
          //autoPlay
          className="audio-player"
          style={{ display: meeting && attendee ? 'block' : 'none' }}
        />
        {!meeting && !attendee ? (
          isLoading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>{t('loading')}</p>
            </div>
          ) : (
            <button onClick={joinAudioSession}>Join</button>
          )
        ) : (
          <div>
            <p>
              The host is speaking in{' '}
              {LISTEN_VOICE_LANGUAGES.find((lang) => lang.key === sourceLanguageCode)?.label}.
            </p>
            <p>
              I am listening in{' '}
              {LISTEN_VOICE_LANGUAGES.find((lang) => lang.key === selectedVoiceLanguage)?.label}.
            </p>
            {transcriptListRef.current.length > 0 && (
              <span>
                Transcripts: <span>{transcriptListRef.current.join(' ')}</span>
              </span>
            )}
            <br />
            {transcriptedListRef.current.length > 0 && (
              <span>
                Transcripts full: <span>{transcriptedListRef.current.join(' ')}</span>
              </span>
            )}
            <br />
            {translatedListRef.current.length > 0 && (
              <span>
                Translations full: <span>{translatedListRef.current.join(' ')}</span>
              </span>
            )}
            <br />
            {channelArn && (
              <ChatMessage
                userArn={userArn}
                sessionId={Config.sessionId}
                channelArn={channelArn}
                chatSetting={chatSetting}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default LiveViewer;