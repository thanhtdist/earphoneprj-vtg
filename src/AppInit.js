// src/App.js

import React, { useState } from 'react';
import { createMeeting, getMeeting, createAttendee } from './api';
import {
  DefaultDeviceController,
  DefaultMeetingSession,
  ConsoleLogger,
  LogLevel,
  MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';

function AppInit() {
  const [meeting, setMeeting] = useState(null);
  // const [attendee, setAttendee] = useState(null);
  // const [isHost, setIsHost] = useState(false);
  // const [meetingSession, setMeetingSession] = useState(null);

  // Host starts a meeting
  const startMeeting = async () => {
    const meeting = await createMeeting();  // Create a new meeting
    const attendee = await createAttendee(meeting.MeetingId, 'host-id');  // Create host attendee

    setMeeting(meeting);
    //setAttendee(attendee);
    //setIsHost(true);

    initializeMeetingSession(meeting, attendee);  // Initialize host session to broadcast audio
  };

  // Listener joins the meeting
  const joinMeeting = async () => {
    const meetingId = prompt("Enter meeting ID:");
    const meeting = await getMeeting(meetingId)
    const attendee = await createAttendee(meetingId, `listener-${Date.now()}`);  // Create listener attendee
    setMeeting(meeting);
    //setAttendee(attendee);
    initializeMeetingSession2(meeting, attendee);  // Initialize listener session to receive audio
  };

  // Initialize meeting session for host
  const initializeMeetingSession = (meeting, attendee) => {
    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfiguration = new MeetingSessionConfiguration(meeting, attendee);
    const meetingSession = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);

    //setMeetingSession(meetingSession);

    //select microphone for broadcasting
    selectMicrophone(meetingSession);

    const audioElement = document.getElementById('audioElement');
    meetingSession.audioVideo.bindAudioElement(audioElement);

    // Start the meeting session (broadcast/receive audio)
    meetingSession.audioVideo.start();
  };

  // Initialize meeting session for listeners
  const initializeMeetingSession2 = (meeting, attendee) => {
    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfiguration = new MeetingSessionConfiguration(meeting, attendee);
    const meetingSession = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);

    //setMeetingSession(meetingSession);

    // Select speaker as the audio output (listeners receiving)
    selectSpeaker(meetingSession);

    const audioElement = document.getElementById('audioElement');
    meetingSession.audioVideo.bindAudioElement(audioElement);
    // Start the meeting session (broadcast/receive audio)
    meetingSession.audioVideo.start();
  };

  // Select microphone as the audio input (host broadcasting)
  const selectMicrophone = async (meetingSession) => {
    const audioInputDevices = await meetingSession.audioVideo.listAudioInputDevices();
    console.log("audioInputDevices", audioInputDevices);
    await meetingSession.audioVideo.startAudioInput(audioInputDevices[0].deviceId);
  };

  // Select speaker as the audio output (listeners receiving)
  const selectSpeaker = async (meetingSession) => {
    const audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();
    await meetingSession.audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
  };


  return (
    <div>
      <h1>Live Audio Broadcast</h1>
      {meeting && <span>{meeting.MeetingId}</span>}
      {!meeting && <button onClick={startMeeting}>Start as Host</button>}
      {!meeting && <button onClick={joinMeeting}>Join as Listener</button>}
      <br />
      <audio id="audioElement" controls autoPlay />
    </div>
  );
}

export default AppInit;
