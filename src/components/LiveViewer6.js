import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  createAttendee,
  //createAppInstanceUsers,
  //addChannelMembership,
  //listAttendee,
  getMeetingByTourId,
  getMeeting, // Uncomment this if needed
} from '../apis/api';
import {
  DefaultDeviceController,
  DefaultMeetingSession,
  ConsoleLogger,
  LogLevel,
  MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';
import '../styles/LiveViewer.css';
// import Config from '../utils/config';
// import JSONCookieUtils from '../utils/JSONCookieUtils';
//import { checkAvailableMeeting } from '../utils/MeetingUtils';
// import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import { LISTEN_VOICE_LANGUAGES, JA_LISTEN_VOICE_LANGUAGES } from '../utils/constant';
import Header from './Header';
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoVolumeMute } from "react-icons/io5";
//import MessageBox from './MessageBox';
import { useParams } from "react-router-dom";
import NotFound from './NotFound';
import TourTitle from './TourTitle';
import { FaPause, FaPlay } from "react-icons/fa";
import { GUIDE_NOT_START } from '../utils/messages';

function LiveViewer6() {
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

  const debugAudioElement = (audioElement, prefix = '') => {
    if (!audioElement) return;

    // Gather all properties in an object
    const props = {
      // Basic properties
      autoplay: audioElement.autoplay,
      controls: audioElement.controls,
      crossOrigin: audioElement.crossOrigin,
      currentSrc: audioElement.currentSrc,
      currentTime: audioElement.currentTime,
      defaultMuted: audioElement.defaultMuted,
      defaultPlaybackRate: audioElement.defaultPlaybackRate,
      duration: audioElement.duration,
      ended: audioElement.ended,
      error: audioElement.error,
      loop: audioElement.loop,
      muted: audioElement.muted,
      networkState: audioElement.networkState,
      paused: audioElement.paused,
      playbackRate: audioElement.playbackRate,
      played: audioElement.played && audioElement.played.length,
      preload: audioElement.preload,
      readyState: audioElement.readyState,
      seekable: audioElement.seekable && audioElement.seekable.length,
      seeking: audioElement.seeking,
      src: audioElement.src,
      srcObject: audioElement.srcObject ? 'MediaStream object' : null,
      volume: audioElement.volume
    };

    // Create a formatted string with all properties
    let message = `${prefix} Audio Element Properties:\n`;
    Object.entries(props).forEach(([key, value]) => {
      message += `${key}: ${value}\n`;
    });

    // Log to console for more detailed view
    console.log(`${prefix} Audio Element:`, audioElement);
    console.log(`${prefix} Audio Properties:`, props);

    // Show alert with all properties
    alert(message);
  };

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
    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.DEBUG);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfig = new MeetingSessionConfiguration(meetingData, attendeeData);
    const session = new DefaultMeetingSession(meetingSessionConfig, logger, deviceController);
    setMeetingSession(session);
    const audioElement = audioElementRef.current;
    debugAudioElement(audioElement, 'Before binding');

    if (audioElement) {
      try {
        // Configure audio settings for better voice quality if supported
        if (deviceController.supportsSampleRateConstraint()) {
          await deviceController.setSampleRate(48000); // Higher sample rate for better quality
        }
        
        // Bind audio element to the session
        await session.audioVideo.bindAudioElement(audioElement);
        console.log('Successfully bound audio element to session');
        
        // Start the audio-video connection
        session.audioVideo.start();
        console.log('Audio-video session started');
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    } else {
      console.error('Audio element not found');
    }
    
    debugAudioElement(audioElement, 'After binding');
  }, []);


  // Function to apply noise filtering to audio stream focusing on human voice
  const applyNoiseFilter = useCallback((mediaStream) => {
    if (!mediaStream) {
      console.error('No media stream available for noise filtering');
      return null;
    }

    try {
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create source from the media stream
      const source = audioContext.createMediaStreamSource(mediaStream);
      
      // Create a gain node to control volume
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.2; // Slightly boost volume
      
      // Create a high-pass filter to remove low frequency noise (below 100Hz)
      const highPassFilter = audioContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 100; // Human voice typically starts around 85Hz
      highPassFilter.Q.value = 0.7; // Quality factor
      
      // Create a low-pass filter to remove high frequency noise (above 8kHz)
      const lowPassFilter = audioContext.createBiquadFilter();
      lowPassFilter.type = 'lowpass';
      lowPassFilter.frequency.value = 8000; // Human voice rarely exceeds 8kHz
      lowPassFilter.Q.value = 0.7; // Quality factor
      
      // Create a peaking filter to enhance voice frequencies (around 2-3kHz)
      const voiceEnhancer = audioContext.createBiquadFilter();
      voiceEnhancer.type = 'peaking';
      voiceEnhancer.frequency.value = 2500; // Center frequency for voice clarity
      voiceEnhancer.gain.value = 6; // Boost by 6dB
      voiceEnhancer.Q.value = 1; // Moderate width
      
      // Create a compressor to even out volume levels and reduce peaks
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -30;
      compressor.knee.value = 12;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      
      // Connect the audio processing chain:
      // source -> highPass -> lowPass -> voiceEnhancer -> compressor -> gain -> destination
      source.connect(highPassFilter);
      highPassFilter.connect(lowPassFilter);
      lowPassFilter.connect(voiceEnhancer);
      voiceEnhancer.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      console.log('✅ Voice-focused noise filtering applied to audio stream');
      
      // Return a cleanup function
      return () => {
        source.disconnect();
        highPassFilter.disconnect();
        lowPassFilter.disconnect();
        voiceEnhancer.disconnect();
        compressor.disconnect();
        gainNode.disconnect();
        audioContext.close();
      };
    } catch (error) {
      console.error('Failed to apply noise filtering:', error);
      return null;
    }
  }, []);

  // Function to apply noise reduction to the current audio stream
  const applyNoiseReduction = useCallback(() => {
    if (!meetingSession) {
      console.warn('No active meeting session for noise reduction');
      return;
    }
    
    const audioElement = audioElementRef.current;
    if (audioElement && audioElement.srcObject instanceof MediaStream) {
      console.log('Applying noise reduction to audio stream');
      return applyNoiseFilter(audioElement.srcObject);
    } else {
      console.warn('No MediaStream found in audio element');
    }
  }, [meetingSession, applyNoiseFilter]);

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
    const audioElement = audioElementRef.current;
    
    if (isPlay === false) {
      setIsPlay(true);
      // Apply noise reduction when starting playback
      const cleanupNoiseFilter = applyNoiseReduction();
      audioElement.play().then(() => {
        console.log('Audio playback started with noise reduction');
      }).catch(error => {
        console.error('Error starting audio playback:', error);
      });
      
      // Store cleanup function to be called when stopping
      audioElement._noiseFilterCleanup = cleanupNoiseFilter;
    } else {
      setIsPlay(false);
      audioElement.pause();
      
      // Clean up noise filter if it exists
      if (audioElement._noiseFilterCleanup && typeof audioElement._noiseFilterCleanup === 'function') {
        audioElement._noiseFilterCleanup();
        audioElement._noiseFilterCleanup = null;
        console.log('Noise reduction filter removed');
      }
    }
  }

  // Function to handle play/pause button click
  // const handlePlay = () => {
  //   const audioElement = audioElementRef.current;
  //   console.log('Audio srcObject:', audioElement.srcObject);

  //   if (audioElement.srcObject instanceof MediaStream) {
  //     console.log('✅ MediaStream is bound to audioElement');
  //     // Check audio tracks
  //     const audioTracks = audioElement.srcObject.getAudioTracks();
  //     if (audioTracks.length === 0) {
  //       console.warn('❌ No audio tracks found in the MediaStream');
  //       alert('No audio available. The stream may be empty.');
  //       return;
  //     } else {
  //       setIsPlay(!isPlay);

  //       if (!isPlay) {
  //         // Start playback with noise filtering
  //         //alert('Noise filtering is enabled');
  //         applyNoiseFilter(audioElement.srcObject);
  //         audioElement.play();
  //       } else {
  //         audioElement.pause();
  //       }
  //     }
  //   } else {
  //     console.warn('❌ No MediaStream found');
  //   }
  // };

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
      alert(`Supported Constraints:\n${JSON.stringify(constraints, null, 2)}`);
    } else {
      console.warn('getSupportedConstraints is not supported in this browser');
    }
  }, [meetingSession]);

  // Apply noise filtering when meeting session is established
  useEffect(() => {
    if (meetingSession && isPlay) {
      // Apply noise reduction to enhance voice clarity
      console.log('Meeting session established, applying noise reduction');
      const cleanupNoiseFilter = applyNoiseReduction();
      
      // Store cleanup function to be called on unmount
      return () => {
        if (cleanupNoiseFilter && typeof cleanupNoiseFilter === 'function') {
          cleanupNoiseFilter();
        }
      };
    }
  }, [meetingSession, isPlay, applyNoiseReduction]);

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

export default LiveViewer6;