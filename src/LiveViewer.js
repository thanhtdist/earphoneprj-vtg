import React, { useState } from 'react';
import {
  getMeeting,
  createAttendee,
  createAppInstanceUsers,
  listUsers,
  addUserToChannel,
} from './api';
import {
  DefaultDeviceController,
  DefaultMeetingSession,
  ConsoleLogger,
  LogLevel,
  MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';
//import Modal from './Modal'; // Import the Modal component
import './LiveViewer.css';
import ChatMessage from './ChatMessage';
import Config from './Config';
import { Authenticator } from '@aws-amplify/ui-react';
import { getCurrentUser } from 'aws-amplify/auth';

function LiveViewer() {
  const [channelArn, setChannelArn] = useState('');
  // const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  // const [selectedAudioOutput, setSelectedAudioOutput] = useState('');
  // const [isModalOpen, setIsModalOpen] = useState(false); // State to manage modal visibility

  //const userArn = 'arn:aws:chime:us-east-1:647755634525:app-instance/dec63f1a-bff4-48f9-a75e-2575ca8036a9/user/a4c894e8-c021-7097-8ff0-f639dca1f3fb'; // Example ARN
  //arn:aws:chime:us-east-1:647755634525:app-instance/dec63f1a-bff4-48f9-a75e-2575ca8036a9/user/user002
  const [userArn, setUserArn] = useState('');

  const joinMeeting = async () => {

    const listUsersResponse = await listUsers();
    console.log("List app users", listUsersResponse);
    const meetingId = prompt("Enter meeting ID:");
    if (!meetingId) {
      alert("Meeting ID is required");
      return;
    }
    const channelId = prompt("Enter channel ID:");
    if (!channelId) {
      alert("Channel ID is required");
      return;
    }

    const { username, userId, signInDetails } = await getCurrentUser();

    console.log("Listener username", username);
    console.log("Listener user id", userId);
    console.log("Listener sign-in details", signInDetails);
    // Create userArn/ channelArn
    //const userID = "a4c894e8-c021-7097-8ff0-f639dca1f3fb";
    //const userArn = `arn:aws:chime:us-east-1:647755634525:app-instance/dec63f1a-bff4-48f9-a75e-2575ca8036a9/user/${userID}`;
    //const userArn = await createAppInstanceUsers(userId, username);
    const userArn = createAppInstanceUsers(Config.ListenerIDTest);
    console.log("Listener createAppInstanceUsers", userArn);
    //arn:aws:chime:us-east-1:647755634525:app-instance/dec63f1a-bff4-48f9-a75e-2575ca8036a9/channel/daa5f379-c02c-4c34-96ed-14bdfa193712
    const channelArn = `arn:aws:chime:us-east-1:647755634525:app-instance/dec63f1a-bff4-48f9-a75e-2575ca8036a9/channel/${channelId}`;
    await addUserToChannel(channelArn, userArn);
    //setUserArn(userArn.AppInstanceUserArn);
    setUserArn(userArn);
    setChannelArn(channelArn);

    const meeting = await getMeeting(meetingId);
    const attendee = await createAttendee(meetingId, `listener-${Date.now()}`);
    initializeMeetingSession(meeting, attendee);
  };

  const initializeMeetingSession = (meeting, attendee) => {
    if (!meeting || !attendee) {
      console.error("Invalid meeting or attendee information");
      return;
    }

    const logger = new ConsoleLogger('ChimeMeetingLogs', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const meetingSessionConfiguration = new MeetingSessionConfiguration(meeting, attendee);
    const meetingSession = new DefaultMeetingSession(meetingSessionConfiguration, logger, deviceController);

    selectSpeaker(meetingSession);
    const audioElement = document.getElementById('audioElementListener');
    if (audioElement) {
      meetingSession.audioVideo.bindAudioElement(audioElement);
    } else {
      console.error("Audio element not found");
    }

    meetingSession.audioVideo.start();
  };

  const selectSpeaker = async (meetingSession) => {
    const audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();
    //setAudioOutputDevices(audioOutputDevices);
    //setSelectedAudioOutput(audioOutputDevices[0]?.deviceId || ''); // Set initial audio output device

    if (audioOutputDevices.length > 0) {
      await meetingSession.audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
    } else {
      console.log('No speaker devices found');
    }
  };

  // const handleAudioOutputChange = async (event) => {
  //   const deviceId = event.target.value;
  //   setSelectedAudioOutput(deviceId);
  //   console.log("Selected speaker device:", deviceId);

  //   const meetingSession = new DefaultMeetingSession(); // Retrieve the current session
  //   await meetingSession.audioVideo.chooseAudioOutput(deviceId);
  // };

  return (
    <Authenticator>
      {({ signOut, user }) => {
        console.log(user);
        return (
          <main>
            <h1>Hello {user?.username}</h1>
            <button onClick={signOut}>Sign out</button>
            <div className="live-viewer-container">
              <audio id="audioElementListener" controls autoPlay className="audio-player" />
              <br />
              {/* Add ChatComponent here */}
              {channelArn && <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} />}
              {/* <ChatMessage userArn={userArn} sessionId={Config.sessionId} channelArn={channelArn} /> */}
              <button className="join-btn" onClick={() => {
                joinMeeting(); // Join the meeting
                //setIsModalOpen(true); // Open modal after joining
              }}>
                Join
              </button>
              {/* <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)} // Close modal
        audioOutputDevices={audioOutputDevices}
        selectedAudioOutput={selectedAudioOutput}
        handleAudioOutputChange={handleAudioOutputChange}
      /> */}
            </div>
          </main>
        );
      }}
    </Authenticator>
  );
}

export default LiveViewer;
