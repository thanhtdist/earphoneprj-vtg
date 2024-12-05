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
  const [participantsCount, setParticipantsCount] = useState(0);
  const [transcripts, setTranscriptions] = useState([]);
  const [transcriptText, setTranscriptText] = useState(null);
  const [translatedText, setTranslatedText] = useState(null);
  const [sourceLanguageCode, setSourceLanguageCode] = useState(null);
  //const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const [selectedVoiceLanguage, setSelectedVoiceLanguage] = useState(LISTEN_VOICE_LANGUAGES.find((lang) => lang.key.startsWith(i18n.language)).key);
  //const [selectedTTSEngine, setSelectedTTSEngine] = useState("standard");
  //const [audioUrl, setAudioUrl] = useState(null);

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

    // const audioElement = document.getElementById('audioElementListener');
    // if (audioElement) {
    //   await meetingSession.audioVideo.bindAudioElement(audioElement);
    // } else {
    //   console.error('Audio element not found');
    // }

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

  // Function to create a new user and channel
  const createAppUserAndJoinChannel = useCallback(async (meetingId, attendeeId, userID, userType, channelId) => {

    //Get the channel ARN from the channel ID
    const channelArn = `${Config.appInstanceArn}/channel/${channelId}`;
    console.log('channelArn:', channelArn);

    // Create a new user and join the channel
    const listAttendeeResponse = await listAttendee(meetingId);
    console.log('listAttendeeResponse:', listAttendeeResponse);

    // Count members starting with "User"
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
    console.log('user username:', userName);
    // Create userArn and join channel

    const userArn = await createAppInstanceUsers(userID, userName);
    await addChannelMembership(channelArn, userArn);

    return {
      channelArn,
      userArn,
    };
  }, []);

  // Function to get the meeting and attendee information from the cookies
  const getMeetingAttendeeInfoFromCookies = useCallback((retrievedUser) => {
    setIsLoading(true);
    console.log("Retrieved cookie:", retrievedUser);
    initializeMeetingSession(retrievedUser.meeting, retrievedUser.attendee);
    setMetting(retrievedUser.meeting);
    setAttendee(retrievedUser.attendee);
    setUserArn(retrievedUser.userArn);
    setChannelArn(retrievedUser.channelArn);
    setIsLoading(false);
  }, [initializeMeetingSession]);

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
      // Generate a unique user ID and name for the host
      const userID = uuidv4(); // Generate unique user ID
      const userType = 'User';
      // Join the meeting from the meeting ID the host has created
      //const meeting = await getMeeting(meetingId);
      const meeting = await checkAvailableMeeting(meetingId, "User");
      if (!meeting) return;
      console.log('Meeting:', meeting);
      const attendee = await createAttendee(meeting.MeetingId, `${userType}|${Date.now()}`);
      console.log('Attendee:', attendee);
      initializeMeetingSession(meeting, attendee);
      // Create a new user and join the channel
      const createAppUserAndJoinChannelResponse = await createAppUserAndJoinChannel(meeting.MeetingId, attendee.AttendeeId, userID, userType, channelId);
      console.log('createAppUserAndJoinChannelResponse:', createAppUserAndJoinChannelResponse);
      setMetting(meeting);
      setAttendee(attendee);
      setChannelArn(createAppUserAndJoinChannelResponse.channelArn);
      setUserArn(createAppUserAndJoinChannelResponse.userArn);
      // Storage the User information in the cookies
      // Define your data
      const user = {
        meeting: meeting,
        attendee: attendee,
        userArn: createAppUserAndJoinChannelResponse.userArn,
        channelArn: createAppUserAndJoinChannelResponse.channelArn,
      };

      // Set the JSON cookie for 1 day
      JSONCookieUtils.setJSONCookie("User", user, 1);
      console.log("Cookie set for 1 day!");
    } catch (error) {
      console.error('Error joining the meeting:', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, channelId, hostId, initializeMeetingSession, createAppUserAndJoinChannel]);

  // Use effect to join the meeting
  // useEffect(() => {
  //   if (meetingId && channelId) {
  //     const retrievedUser = JSONCookieUtils.getJSONCookie("User");
  //     console.log("Retrieved cookie:", retrievedUser);
  //     if (retrievedUser) {
  //       getMeetingAttendeeInfoFromCookies(retrievedUser);
  //     } else {
  //       joinMeeting();
  //     }
  //   }
  // }, [joinMeeting, meetingId, channelId, hostId, getMeetingAttendeeInfoFromCookies]);
  // useEffect(() => {
  //   const checkMatch = async () => {
  //     try {
  //       // Retrieve and parse the "User" cookie
  //       const retrievedUser = JSONCookieUtils.getJSONCookie("User");
  //       console.log("Retrieved cookie:", retrievedUser);
  //       if (!retrievedUser) {
  //         console.log("User cookie not found");
  //         joinMeeting();
  //         return;
  //       }
  //       // Validate the retrieved cookie structure
  //       const isMeetingMatched = retrievedUser.meeting.MeetingId === meetingId;
  //       const isChannelMatched = retrievedUser.channelArn === `${Config.appInstanceArn}/channel/${channelId}`;
  //       const isMatched = isMeetingMatched && isChannelMatched;

  //       if (isMatched) {
  //         console.log("User cookie matched the current meeting and channel");
  //         // Call checkMatchedMeeting only once and store the result
  //         const meeting = await checkAvailableMeeting(retrievedUser.meeting.MeetingId, "User");
  //         console.log('getMeetingResponse:', meeting);
  //         if (!meeting) return;
  //         getMeetingAttendeeInfoFromCookies(retrievedUser);
  //       } else {
  //         console.log("User cookie did not match the current meeting and channel");
  //         joinMeeting();
  //       }
  //     } catch (error) {
  //       console.error("Error processing the User cookie:", error);
  //     }
  //   };

  //   checkMatch(); // Execute the async function
  // }, [joinMeeting, hostId, meetingId, channelId, getMeetingAttendeeInfoFromCookies]);


  // Function to join the audio session
  const joinAduioSession = async () => {
    try {
      // Retrieve and parse the "User" cookie
      const retrievedUser = JSONCookieUtils.getJSONCookie("User");
      console.log("Retrieved cookie:", retrievedUser);
      if (!retrievedUser) {
        console.log("User cookie not found");
        joinMeeting();
        return;
      }
      // Validate the retrieved cookie structure
      const isMeetingMatched = retrievedUser.meeting.MeetingId === meetingId;
      const isChannelMatched = retrievedUser.channelArn === `${Config.appInstanceArn}/channel/${channelId}`;
      const isMatched = isMeetingMatched && isChannelMatched;

      if (isMatched) {
        console.log("User cookie matched the current meeting and channel");
        // Call checkMatchedMeeting only once and store the result
        const meeting = await checkAvailableMeeting(retrievedUser.meeting.MeetingId, "User");
        console.log('getMeetingResponse:', meeting);
        if (!meeting) return;
        getMeetingAttendeeInfoFromCookies(retrievedUser);
      } else {
        console.log("User cookie did not match the current meeting and channel");
        joinMeeting();
      }
    } catch (error) {
      console.error("Error processing the User cookie:", error);
    }
  }


  // Subscribe to the attendee presence event, transcript language, and receive data message
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

    // meetingSession.audioVideo.realtimeSubscribeToReceiveDataMessage(
    //   'TranscriptLanguage',
    //   (data) => {
    //     const transcriptLanguage = JSON.parse(data.text());
    //     console.log('xxxxx lang', transcriptLanguage.data);
    //     setSourceLanguageCode(transcriptLanguage.data);
    //   }
    // );

    meetingSession.audioVideo.transcriptionController?.subscribeToTranscriptEvent(
      (transcriptEvent) => {
        console.log('enableLiveTranscription Received transcription:', transcriptEvent);
        if (transcriptEvent) {
          if (transcriptEvent.type === "started") {
            const transcriptionConfiguration = JSON.parse(transcriptEvent.transcriptionConfiguration)
            console.log('transcriptionConfiguration:', transcriptionConfiguration);
            setSourceLanguageCode(transcriptionConfiguration.EngineTranscribeSettings.LanguageCode);
          }
        }
        setTranscriptions(transcriptEvent);
      },
    );

  }, [meetingSession]);

  // Subscribe to the transcription event
  useEffect(() => {
    const audioElement = document.getElementById('audioElementListener');
    console.log('translateTextSpeechData sourceLanguageCode:', sourceLanguageCode);
    console.log('translateTextSpeechData selectedVoiceLanguage:', selectedVoiceLanguage);

    if (meetingSession && meetingSession.audioVideo) {
      meetingSession.audioVideo.unbindAudioElement();
      setTranscriptText(null);
      setTranslatedText(null);
    }

    let transcriptedText = '';

    if (audioElement) {

      if (!sourceLanguageCode) return;
      if (!selectedVoiceLanguage) return;

      if (sourceLanguageCode !== selectedVoiceLanguage) {

        // Check if there are transcripts to process
        if (transcripts && transcripts.results && transcripts.results[0]) {
          const transcriptResult = transcripts.results[0];

          // Ensure that we are not processing partial results
          if (!transcriptResult.isPartial) {
            transcriptedText = `${transcriptResult.alternatives[0].transcript}`;
            setTranscriptText(transcriptedText);
          }
        }

        // Function to translate text to speech and play audio
        const translateTextSpeechData = async () => {
          try {
            if (!transcriptedText) return; // If no lines to translate, return early

            // Translate the text to speech

            //console.log('translateTextSpeechData selectedTTSEngine:', selectedTTSEngine);
            console.log('translateTextSpeechData transcriptText:', transcriptedText);
            const translateTextSpeechResponse = await translateTextSpeech(
              transcriptedText,
              sourceLanguageCode,
              selectedVoiceLanguage,
              //selectedTTSEngine
              "standard"
            );
            console.log('translateTextSpeechData response:', translateTextSpeechResponse);
            setTranslatedText(translateTextSpeechResponse.translatedText); // Set translated text

            // Check if the response contains valid AudioStream data
            if (!translateTextSpeechResponse.speech.AudioStream?.data) {
              throw new Error('Invalid AudioStream data');
            }

            // Convert the AudioStream buffer to a Blob
            const audioBlob = new Blob(
              [Uint8Array.from(translateTextSpeechResponse.speech.AudioStream.data)],
              {
                type: translateTextSpeechResponse.speech.ContentType || 'audio/mpeg', // Default to MP3 format
              }
            );

            // Generate a Blob URL
            const audioUrl = URL.createObjectURL(audioBlob);

            // Bind the Blob URL to the <audio> element
            audioElement.src = audioUrl; // Assign the Blob URL to the audio element
          } catch (error) {
            console.error('Error translating text to speech:', error);
          }
        };

        translateTextSpeechData(); // Call the translation and playback function
      } else {
        // If the source language and selected voice language match, bind the audio element
        const bindAudioElement = async () => {
          if (meetingSession && meetingSession.audioVideo) {
            await meetingSession.audioVideo.bindAudioElement(audioElement);
          }
        };

        bindAudioElement(); // Bind the meeting session's audio to the element
      }
      audioElement.play(); // Play the audio
    }
  }, [
    meetingSession,
    transcripts,
    sourceLanguageCode,
    selectedVoiceLanguage,
    //selectedTTSEngine,
    //isTranslationEnabled
  ]);


  // useEffect(() => {
  //   const translateTextSpeechData = async () => {
  //     console.log('translateTextSpeechData lines:', lines);
  //     console.log("current language", i18n.language);
  //     try {
  //       if (!lines) return;
  //       // Translate the text to speech
  //       //const sourceLanguageCode = 'en-US';
  //       console.log('translateTextSpeechData sourceLanguageCode:', sourceLanguageCode);
  //       const targetLanguageCode = i18n.language === 'ja' ? "ja-JP" : "en-US";
  //       if (sourceLanguageCode !== targetLanguageCode) {
  //         // console.log('current language targetLanguageCode:', targetLanguageCode);
  //         const translateTextSpeechResponse = await translateTextSpeech(lines, sourceLanguageCode, targetLanguageCode);
  //         console.log('translateTextSpeechData response:', translateTextSpeechResponse);
  //         setTranslatedText(translateTextSpeechResponse.translatedText);

  //         // Check if the response contains AudioStream data
  //         if (!translateTextSpeechResponse.speech.AudioStream || !translateTextSpeechResponse.speech.AudioStream.data) {
  //           throw new Error("Invalid AudioStream data");
  //         }

  //         // Convert the AudioStream buffer to a Blob
  //         const audioBlob = new Blob([Uint8Array.from(translateTextSpeechResponse.speech.AudioStream.data)], {
  //           type: translateTextSpeechResponse.speech.ContentType || "audio/mpeg", // Default to MP3 format
  //         });

  //         // Generate a Blob URL
  //         const audioUrl = URL.createObjectURL(audioBlob);

  //         // Bind the Blob URL to the <audio> element
  //         const audioElement = document.getElementById("audioElementListener");
  //         if (!audioElement) {
  //           throw new Error("Audio element not found");
  //         }

  //         audioElement.src = audioUrl; // Assign the Blob URL to the audio element
  //         audioElement.play();        // Play the audio
  //       }
  //     } catch (error) {
  //       console.error('Error translating text to speech:', error);
  //     }

  //   };
  //   translateTextSpeechData();

  // }, [lines, sourceLanguageCode, i18n.language]);

  // Function to toggle checkbox the voice language select dropdown
  // const handleCheckboxChange = (e) => {
  //   setIsTranslationEnabled(e.target.checked);
  //   setSelectedVoiceLanguage(LISTEN_VOICE_LANGUAGES.find((lang) => lang.key.startsWith(i18n.language)).key);
  // };

  // Function to handle the selected voice language change
  const handleSelectedVoiceLanguageChange = (event) => {
    setSelectedVoiceLanguage(event.target.value);
    console.log("Selected voice language:", event.target.value);
  };

  // Function to handle the selected TTS engine change
  // const handleSelectedTTSEngineChange = (event) => {
  //   setSelectedTTSEngine(event.target.value);
  //   console.log("Selected voice language:", event.target.value);
  // };


  return (
    <>
      <Participants count={participantsCount} />
      <div className="live-viewer-container">
        {/* <label>
          <input type="checkbox" id="translateCheckbox" onClick={handleCheckboxChange} />
          I want the voice to be translated into
        </label> */}
        <div style={{ display: (!meeting && !attendee) ? 'block' : 'none' }}>
          <label htmlFor="selectedVoiceLanguage">Select a language to listen: </label>
          <select
            //disabled={!isTranslationEnabled}
            id="selectedVoiceLanguage"
            value={selectedVoiceLanguage}
            onChange={handleSelectedVoiceLanguageChange}
          >
            {/* <option value="" disabled>
            -- Choose a language --
          </option> */}
            {LISTEN_VOICE_LANGUAGES.map((language) => (
              <option key={language.key} value={language.key}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
        {/* <label htmlFor="tts-select">Select Text to Speech Engine: </label>
        <select
          disabled={!isTranslationEnabled}
          id="tts-select"
          value={selectedTTSEngine}
          onChange={handleSelectedTTSEngineChange}
        >
          {TTS_ENGINE.map((engine) => (
            <option key={engine.key} value={engine.key}>
              {engine.label}
            </option>
          ))}
        </select> */}

        <audio id="audioElementListener" controls autoPlay
          className="audio-player" style={{ display: (meeting && attendee) ? 'block' : 'none' }}
        // src={audioUrl} // Set the source to the generated audio URL
        />
        {(!meeting && !attendee) ? (
          <>
            {(isLoading) ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>{t('loading')}</p>
              </div>
            ) : (
              <button onClick={joinAduioSession}>Join</button>
            )}
          </>
        ) : (
          <>
            {/* {lines.slice(Math.max(lines.length - 10, 0)).map((line, index) => (
              <div key={index}>
                {line}
                <br />
              </div>
            ))} */}
            The main speaker is speaking in {LISTEN_VOICE_LANGUAGES.find((lang) => lang.key === sourceLanguageCode)?.label}.
            <br />
            I am listening in {LISTEN_VOICE_LANGUAGES.find((lang) => lang.key === selectedVoiceLanguage)?.label}.
            <br />
            {transcriptText && <p>
              Transcripted Text:
              {transcriptText}
            </p>}
            {translatedText &&
              <p>
                Translated Text:
                {translatedText}
              </p>}
            <br />
            {channelArn && <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} chatSetting={chatSetting} />}
          </>
        )}
      </div>
    </>

  );
}

export default LiveViewer;
