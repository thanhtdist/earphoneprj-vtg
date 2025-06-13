import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  createAttendee,
  //createAppInstanceUsers,
  //addChannelMembership,
  //listAttendee,
  getMeetingByTourId,
  getMeeting, // Uncomment this if needed
} from '../../apis/api';
import {
  DefaultDeviceController,
  DefaultMeetingSession,
  ConsoleLogger,
  LogLevel,
  MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';
import '../../styles/LiveViewer.css';
// import Config from '../utils/config';
// import JSONCookieUtils from '../utils/JSONCookieUtils';
//import { checkAvailableMeeting } from '../utils/MeetingUtils';
// import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import { LISTEN_VOICE_LANGUAGES, JA_LISTEN_VOICE_LANGUAGES } from '../../utils/constant';
import Header from '../common/Header';
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoVolumeMute } from "react-icons/io5";
//import MessageBox from './MessageBox';
import { useParams } from "react-router-dom";
import NotFound from '../NotFound';
import TourTitle from '../common/TourTitle';
import { FaPause, FaPlay } from "react-icons/fa";
import { GUIDE_NOT_START } from '../../utils/messages';

function LiveViewerJa() {
  // Get the params from the URL
  const { tourId } = useParams(); // Extracts 'tourId' from the URL
  console.log('tourId:', tourId);
  const { t, i18n } = useTranslation();
  const [tour, setTour] = useState(undefined);
  const [meetingSession, setMeetingSession] = useState(null);
  // const [meeting, setMeeting] = useState(null);
  // const [attendee, setAttendee] = useState(null);
  //const [channelArn, setChannelArn] = useState('');
  //const [userArn, setUserArn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [selectedVoiceLanguage, setSelectedVoiceLanguage] = useState(
    LISTEN_VOICE_LANGUAGES.find((lang) => lang.key.startsWith(i18n.language))?.key || 'ja-JP'
  );
  // const [chatRestriction, setChatRestriction] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlay, setIsPlay] = useState(false);
  // const userID = uuidv4();
  const userType = 'User';
  // Ref for the audio element  
  const audioElementRef = useRef(null);
  // Add these references and callback:
  const wakeLockRef = useRef(null);

  // Replace your current alerts with this function in initializeMeetingSession

  // const debugAudioElement = (audioElement, prefix = '') => {
  //   if (!audioElement) return;

  //   // Gather all properties in an object
  //   const props = {
  //     // Basic properties
  //     autoplay: audioElement.autoplay,
  //     controls: audioElement.controls,
  //     crossOrigin: audioElement.crossOrigin,
  //     currentSrc: audioElement.currentSrc,
  //     currentTime: audioElement.currentTime,
  //     defaultMuted: audioElement.defaultMuted,
  //     defaultPlaybackRate: audioElement.defaultPlaybackRate,
  //     duration: audioElement.duration,
  //     ended: audioElement.ended,
  //     error: audioElement.error,
  //     loop: audioElement.loop,
  //     muted: audioElement.muted,
  //     networkState: audioElement.networkState,
  //     paused: audioElement.paused,
  //     playbackRate: audioElement.playbackRate,
  //     played: audioElement.played && audioElement.played.length,
  //     preload: audioElement.preload,
  //     readyState: audioElement.readyState,
  //     seekable: audioElement.seekable && audioElement.seekable.length,
  //     seeking: audioElement.seeking,
  //     src: audioElement.src,
  //     srcObject: audioElement.srcObject ? 'MediaStream object' : null,
  //     volume: audioElement.volume
  //   };

  //   // Create a formatted string with all properties
  //   let message = `${prefix} Audio Element Properties:\n`;
  //   Object.entries(props).forEach(([key, value]) => {
  //     message += `${key}: ${value}\n`;
  //   });

  //   // Log to console for more detailed view
  //   console.log(`${prefix} Audio Element:`, audioElement);
  //   console.log(`${prefix} Audio Properties:`, props);

  //   // Show alert with all properties
  //   alert(message);
  // };

  // Function to keep wake lock
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

  // Function intialize Meeting Session
  const initializeMeetingSession = useCallback(async (meetingData, attendeeData) => {
    if (!meetingData || !attendeeData) {
      console.error('Invalid meeting or attendee information');
      return;
    }
    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.OFF);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfig = new MeetingSessionConfiguration(meetingData, attendeeData);
    const session = new DefaultMeetingSession(meetingSessionConfig, logger, deviceController);
    setMeetingSession(session);
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
    session.audioVideo.start();
  }, [selectedVoiceLanguage]);

  // Event for handling selected voice language change
  const handleSelectedVoiceLanguageChange = (event) => {
    setSelectedVoiceLanguage(event.target.value);
  };

  // Event for handling mute/unmute button click
  const handleMuteUnmute = () => {
    setIsMuted(!isMuted);
    audioElementRef.current.muted = isMuted;
  };

// Function to handle play/pause button click
  const handlePlay = () => {
    console.log('xCheck audioElement:', audioElementRef.current);
    if (isPlay === false) {
      setIsPlay(true)
      audioElementRef.current.play();
    } else {
      setIsPlay(false);
      audioElementRef.current.pause();
    }
  }

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

  // Function to join the meeting session
  const joinMeeting = useCallback(async (meetingData, channelId) => {
    try {
      console.log('meeting:', meetingData);
      console.log('channelId:', channelId);
      const attendeeData = await createAttendee(
        meetingData.MeetingId,
        `${userType}|${Date.now()}`
      );
      await initializeMeetingSession(meetingData, attendeeData);
      // setMeeting(meetingData);
      // setAttendee(attendeeData);

    } catch (error) {
      console.error('Error joining the meeting:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initializeMeetingSession]);
  // Process the tour when it changes
  useEffect(() => {
    // Skip if tour is undefined
    if (!tour) return;

    const processTour = async () => {
      try {
        if (tour.meetingId) {
          console.log("Meeting Exists in Tour");

          // Check if the meeting is available in Chime Meeting
          const meetingResponse = await getMeeting(tour.meetingId);
          console.log('Meeting response:', meetingResponse);

          if (meetingResponse.statusCode === 404) {
            // Using console.error instead of alert for server-side issues
            alert(GUIDE_NOT_START);
            // Consider using a toast notification library or setting an error state
          } else if (meetingResponse.statusCode === 200) {
            // Join the meeting again and set the meeting session in the state
            console.log('Meeting available:', meetingResponse.data);
            joinMeeting(meetingResponse.data, tour.channelId);
          } else {
            console.error('Meeting error:', meetingResponse);
          }
        } else {
          alert(GUIDE_NOT_START);
        }
      } catch (error) {
        console.error('Error processing tour:', error);
      }
    };
    setIsLoading(true);
    processTour();
  }, [tour, joinMeeting]);

  // Check if the meeting session is available
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

    // Cleanup on unmount
    return () => {
      meetingSession.audioVideo.realtimeUnsubscribeFromAttendeeIdPresence(presenceCallback);
    };
  }, [meetingSession]);

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

  useEffect(() => {
    if (!meetingSession) return;
    if (navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints) {
      const constraints = navigator.mediaDevices.getSupportedConstraints();
      console.log('Supported Constraints:', constraints);
      //alert(`Supported Constraints:\n${JSON.stringify(constraints, null, 2)}`);
    } else {
      console.warn('getSupportedConstraints is not supported in this browser');
    }
  }, [meetingSession]);

  // Check if the tour exists, if not, show a not found page
  if (tour === null) {
    return <NotFound />;
  }

  return (
    <>
      <Header count={participantsCount} tourId={tourId} userType={userType} />
      <audio
        id="audioElementListener"
        ref={audioElementRef}
        style={{ display: 'none' }}
      />
      <div className={` ${tour ? 'live-viewer-container' : 'live-viewer-container-center'}`}>
        {!tour ? (
          isLoading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>{t('loading')}</p>
            </div>
          ) : (
            <>
              <div className="box-selected-language">
                <h3 className='title-box'>
                  {t('voiceLanguageLbl.listening')}
                </h3>
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
              <div className='btn' onClick={joinTour}>
                <button className='btn-join'>{t('joinBtn')}</button>
              </div>
            </>
          )
        ) : (
          <>
            {isLoading ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>{t('loading')}</p>
              </div>
            ) : (<>
              <TourTitle tour={tour} />
              <div className='audioViewer'>
                {!!isPlay ? <div>
                  <div className='pauseButtonViewer' onClick={handlePlay}>
                    <FaPause size={20} />
                    <span className="startText">{t('stopBtn')}</span>
                  </div>
                </div>
                  : <div>
                    <div className='playButtonViewer' onClick={handlePlay}>
                      <FaPlay size={20} />
                      <span className="startText">{t('startBtn')}</span>
                    </div>
                  </div>}
                <div className='soundButton' onClick={handleMuteUnmute}>
                  {isMuted ? <HiMiniSpeakerWave size={30} /> : <IoVolumeMute size={30} />
                  }
                </div>
              </div>
              {/* {chatRestriction !== "nochat" && (<MessageBox userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} userType={userType} statusChat={chatRestriction} />)} */}
            </>)}

          </>
        )}
      </div>

    </>
  );
}

export default LiveViewerJa;