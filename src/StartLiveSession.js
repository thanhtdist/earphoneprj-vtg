import React, { useState } from 'react';
import {
  createMeeting,
  createAttendee,
  //createRecording,
  //stopRecording,
  //getMeeting,
  createAppInstanceUsers,
  createChannel,
  addChannelMembership,
} from './api';
import {
  DefaultDeviceController,
  DefaultMeetingSession,
  ConsoleLogger,
  LogLevel,
  MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';
import './StartLiveSession.css';  // Importing the new CSS file for responsiveness
import { Authenticator } from '@aws-amplify/ui-react';
import ChatMessage from './ChatMessage';
import Config from './Config';
import { getCurrentUser } from 'aws-amplify/auth';

function StartLiveSession() {
  const [channelArn, setChannelArn] = useState('');
  const [channelID, setChannelID] = useState('');
  const [meetingSession, setMeetingSession] = useState(null);
  const [meeting, setMeeting] = useState('');
  //const [mediaPipelineId, setMediaPipelineId] = useState('');
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [userArn, setUserArn] = useState('');

  const startMeeting = async () => {
    // Get current login user
    const { username, userId, signInDetails } = await getCurrentUser();
    console.log("Host username", username);
    console.log("Host user id", userId);
    console.log("Host sign-in details", signInDetails);
    // Get App Instance ARN from Config
    console.log("App instance", Config.appInstanceArn);
    // create app instance user
    const userArn = await createAppInstanceUsers(userId, username);
    console.log("Create App Instance User Response", userArn.AppInstanceUserArn);
    // create channel
    const channelArn = await createChannel(userArn.AppInstanceUserArn);
    console.log("Channel", channelArn);
    const channel_splits = channelArn.split('/');
    console.log("Channel ID", channel_splits[channel_splits.length - 1]);
    setChannelID(channel_splits[channel_splits.length - 1]);
    // add member to channel
    await addChannelMembership(channelArn, userArn.AppInstanceUserArn);
    setUserArn(userArn.AppInstanceUserArn);
    setChannelArn(channelArn);

    // Create meeting
    const meeting = await createMeeting();  // Create a new meeting
    setMeeting(meeting);
    console.log(`Meeting: ${meeting.MeetingId}`);
    // const getMeetingResult = await getMeeting(meeting.MeetingId);
    // console.log("getMeetingResult", getMeetingResult);
    // Create host attendee
    //const attendee = await createAttendee(meeting.MeetingId, `host-${Date.now()}`);
    const attendee = await createAttendee(meeting.MeetingId, userId);
    console.log(`Attendee: ${attendee.AttendeeId}`);
    // Initialize host session to broadcast audio
    initializeMeetingSession(meeting, attendee);
  };

  const stopMeeting = async () => {
    console.log("Audio video session stopped before", meetingSession.audioVideo);
    meetingSession.audioVideo.stop();
    console.log("Audio video session stopped after", meetingSession.audioVideo);
    // const pipelineConcat = await stopRecording(mediaPipelineId);
    // console.log("Stop Recording", pipelineConcat.MediaPipelineId);
  };

  const initializeMeetingSession = (meeting, attendee) => {
    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfiguration = new MeetingSessionConfiguration(meeting, attendee);
    const meetingSession = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);
    setMeetingSession(meetingSession);
    selectMicrophone(meetingSession);
  };

  const selectMicrophone = async (meetingSession) => {
    const audioInputDevices = await meetingSession.audioVideo.listAudioInputDevices();
    console.log("audioInputDevices", audioInputDevices);
    if (!audioInputDevices || audioInputDevices.length === 0) {
      alert("No audio input devices were found. Please check your device.");
      return;
    }
    setAudioInputDevices(audioInputDevices);
    setSelectedAudioInput(audioInputDevices[0].deviceId);
  };

  const startLive = async () => {
    console.log("Selected audio input device", selectedAudioInput);
    await meetingSession.audioVideo.startAudioInput(selectedAudioInput);
    const muted = meetingSession.audioVideo.realtimeIsLocalAudioMuted();
    if (muted) {
      console.log('You are muted');
    } else {
      console.log('Other attendees can hear your audio');
    }

    try {
      const observer = {
        audioVideoDidStart: () => {
          console.log('Started');
        }
      };
      meetingSession.audioVideo.addObserver(observer);
      meetingSession.audioVideo.start();
      console.log("Audio video session started");
      collectStats(meetingSession);
    } catch (error) {
      console.error("Failed to start audio video session", error);
    }
  };

  const collectStats = async (meetingSession) => {
    const audioVideo = meetingSession.audioVideo;

    const reportStats = async () => {
      try {
        const stats = await audioVideo.getRTCPeerConnectionStats();
        if (!stats || stats.length === 0) {
          console.warn("No stats available");
          return;
        }
        stats.forEach(report => {
          console.log(`Report type: ${report.type}`);
          console.log(`Timestamp: ${report.timestamp}`);
          console.log(`ID: ${report.id}`);
          for (const [key, value] of Object.entries(report)) {
            console.log(`${key}: ${value}`);
          }
        });
      } catch (error) {
        console.error("Error fetching RTC stats:", error);
      }

      setTimeout(reportStats, 5000);
    };

    setTimeout(reportStats, 1000);
  };

  const handleAudioInputChange = (event) => {
    const deviceId = event.target.value;
    console.log("Device ID:", deviceId);
    setSelectedAudioInput(deviceId);
  };

  return (
    <Authenticator>
      {({ signOut, user }) => {
        return (
          <main>
            <h1>Hello {user?.username}</h1>
            <button onClick={signOut}>Sign out</button>
            <div className="container">
              {!meeting && (
                <button onClick={startMeeting}>Start Live Session</button>
              )}
              {meeting && (
                <>
                  <p>Meeting ID: {meeting.MeetingId}</p>
                  <p>Channel ID: {channelID}</p>
                  <h3>Select Audio Input Device (Microphone)</h3>
                  <select value={selectedAudioInput} onChange={handleAudioInputChange}>
                    {audioInputDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>
                  {selectedAudioInput && (<button onClick={startLive}>Start</button>)}
                  {selectedAudioInput && (<button onClick={stopMeeting}>Stop</button>)}
                  {/* <button onClick={stopMeeting}>Stop</button> */}
                  {/* Add ChatComponent here */}
                  <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} />
                </>
              )}
            </div>
          </main>
        );
      }}
    </Authenticator>
  );
}

export default StartLiveSession;
