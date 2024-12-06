import React, { useState, useEffect, useCallback } from 'react';
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

  const createAppUserAndJoinChannel = useCallback(async (meetingId, attendeeId, userID, userType, channelId) => {
    try {
      const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;
      const listAttendeeResponse = await listAttendee(meetingId);
      const attendees = listAttendeeResponse.attendees || [];
      const subGuideList = attendees.filter(
        (member) => member.ExternalUserId && member.ExternalUserId.startsWith(userType)
      );

      subGuideList.sort((a, b) => parseInt(a.ExternalUserId.split('|')[1]) - parseInt(b.ExternalUserId.split('|')[1]));

      const index = subGuideList.findIndex((att) => att.AttendeeId === attendeeId);
      const userName = `${userType}${index + 1}`;

      const newUserArn = await createAppInstanceUsers(userID, userName);
      await addChannelMembership(channelArn, newUserArn);

      return { channelArn, userArn: newUserArn };
    } catch (error) {
      console.error('Error creating user and joining channel:', error);
      throw error;
    }
  }, []);

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

  const joinMeeting = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!meetingId || !channelId || !hostId) {
        alert('Meeting ID, Channel ID, and Host ID are required');
        return;
      }

      //const hostUserArn = `${Config.appInstanceArn}/user/${hostId}`;
      const userID = uuidv4();
      const userType = 'User';

      const meetingData = await checkAvailableMeeting(meetingId, userType);
      if (!meetingData) return;

      const attendeeData = await createAttendee(meetingData.MeetingId, `${userType}|${Date.now()}`);
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
  }, [meetingId, channelId, hostId, initializeMeetingSession, createAppUserAndJoinChannel]);

  const joinAudioSession = useCallback(async () => {
    try {
      const retrievedUser = JSONCookieUtils.getJSONCookie('User');
      if (retrievedUser) {
        const isMeetingMatched = retrievedUser.meeting.MeetingId === meetingId;
        const isChannelMatched = retrievedUser.channelArn === `${Config.appInstanceArn}/channel/${channelId}`;

        if (isMeetingMatched && isChannelMatched) {
          const meetingData = await checkAvailableMeeting(retrievedUser.meeting.MeetingId, 'User');
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
  }, [meetingId, channelId, getMeetingAttendeeInfoFromCookies, joinMeeting]);

  // useEffect(() => {
  //   if (meetingId && channelId) {
  //     joinAudioSession();
  //   }
  // }, [joinAudioSession, meetingId, channelId]);

  useEffect(() => {
    if (!meetingSession) return;

    const attendeeSet = new Set();
    const presenceCallback = (presentAttendeeId, present) => {
      if (present) {
        attendeeSet.add(presentAttendeeId);
      } else {
        attendeeSet.delete(presentAttendeeId);
      }
      setParticipantsCount(attendeeSet.size);
    };

    meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(presenceCallback);

    meetingSession.audioVideo.transcriptionController?.subscribeToTranscriptEvent((transcriptEvent) => {
      if (transcriptEvent?.type === 'started') {
        const transcriptionConfig = JSON.parse(transcriptEvent.transcriptionConfiguration);
        setSourceLanguageCode(transcriptionConfig.EngineTranscribeSettings.LanguageCode);
      }
      setTranscriptions(transcriptEvent);
    });

    return () => {
      meetingSession.audioVideo.realtimeUnsubscribeFromAttendeeIdPresence(presenceCallback);
    };
  }, [meetingSession]);

  useEffect(() => {
    const audioElement = document.getElementById('audioElementListener');
    if (!audioElement || !meetingSession || !sourceLanguageCode || !selectedVoiceLanguage) return;
    // Reset the audio source
    audioElement.pause();
    audioElement.src = '';
    audioElement.load();
    meetingSession.audioVideo.unbindAudioElement();
    setTranscriptText([]);
    setTranslatedText([]);

    if (sourceLanguageCode !== selectedVoiceLanguage && transcripts?.results?.[0]?.alternatives?.[0]?.transcript && !transcripts.results[0].isPartial) {
      const currentText = transcripts.results[0].alternatives[0].transcript;
      setTranscriptText((prev) => [...prev, currentText]);

      const translateAndPlay = async () => {
        try {
          const response = await translateTextSpeech(currentText, sourceLanguageCode, selectedVoiceLanguage, 'standard');
          setTranslatedText((prev) => [...prev, response.translatedText]);

          if (!response.speech.AudioStream?.data) throw new Error('Invalid AudioStream data');

          const audioBlob = new Blob([Uint8Array.from(response.speech.AudioStream.data)], {
            type: response.speech.ContentType || 'audio/mpeg',
          });
          const audioUrl = URL.createObjectURL(audioBlob);
          audioElement.src = audioUrl;
        } catch (error) {
          console.error('Error translating text to speech:', error);
        }
      };

      translateAndPlay();
    } else {
      if (sourceLanguageCode === selectedVoiceLanguage) {
        meetingSession.audioVideo.bindAudioElement(audioElement);
        audioElement.play();
      }
    }
  }, [meetingSession, transcripts, sourceLanguageCode, selectedVoiceLanguage]);

  const handleSelectedVoiceLanguageChange = (event) => {
    setSelectedVoiceLanguage(event.target.value);
  };

  console.log('transcriptText:', transcriptText.join(' '));
  console.log('translatedText:', translatedText.join(' '));

  return (
    <>
      <Participants count={participantsCount} />
      <div className="live-viewer-container">
        {!meeting && !attendee && (
          <div>
            <label htmlFor="selectedVoiceLanguage">Select a language to listen </label>
            <select id="selectedVoiceLanguage" value={selectedVoiceLanguage} onChange={handleSelectedVoiceLanguageChange}>
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
              The main speaker is speaking in{' '}
              {LISTEN_VOICE_LANGUAGES.find((lang) => lang.key === sourceLanguageCode)?.label}.
            </p>
            <p>
              I am listening in{' '}
              {LISTEN_VOICE_LANGUAGES.find((lang) => lang.key === selectedVoiceLanguage)?.label}.
            </p>
            {transcriptText.slice(-10).map((line, index) => (
              <div key={index}>{line}</div>
            ))}
            {transcriptText.length > 0 && (
              <span>
                Transcripts: <span>{transcriptText.join(' ')}</span>
              </span>
            )}
            <br />
            {translatedText.length > 0 && (
              <span>
                Translations: <span>{translatedText.join(' ')}</span>
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