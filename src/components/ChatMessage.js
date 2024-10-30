import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChimeSDKMessagingClient } from '@aws-sdk/client-chime-sdk-messaging';
import { sendMessage } from '../apis/api';
import {
  ConsoleLogger,
  DefaultMessagingSession,
  LogLevel,
  MessagingSessionConfiguration,
  PrefetchOn,
  PrefetchSortBy,
} from 'amazon-chime-sdk-js';
import { FiSend } from 'react-icons/fi';
import { VscAccount } from "react-icons/vsc";
import '../styles/ChatMessage.css';
import Config from '../utils/config';

/**
 * Component to display chat messages and send messages to a channel
 * @param {string} userArn - The ARN of the user
 * @param {string} channelArn - The ARN of the channel
 * @param {string} sessionId - The session ID for the messaging session 
 */
function ChatMessage({ userArn, channelArn, sessionId, chatSetting = null }) {
  // State variables to store messages and input message
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  // Persist to the messaging session in the lifetime of the component chat message
  const messagingSessionRef = useRef(null);

  // Function to format the timestamp from UTC to Tokyo timezone
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Function to initialize the messaging session
  const initializeMessagingSession = useCallback(async () => {
    const logger = new ConsoleLogger('SDK', LogLevel.INFO);
    const chime = new ChimeSDKMessagingClient({
      region: Config.region,
      credentials: {
        accessKeyId: Config.accessKeyId,
        secretAccessKey: Config.secretAccessKey,
      },
    });
    // Create a new messaging session configuration
    const configuration = new MessagingSessionConfiguration(userArn, sessionId, undefined, chime);
    configuration.prefetchOn = PrefetchOn.Connect;
    configuration.prefetchSortBy = PrefetchSortBy.Unread;

    // Create a new messaging session
    const session = new DefaultMessagingSession(configuration, logger);
    messagingSessionRef.current = session;

    // Observer to handle messaging session events
    const observer = {
      messagingSessionDidStart: () => console.log('Messaging session started'),
      messagingSessionDidStartConnecting: (reconnecting) =>
        console.log(reconnecting ? 'Reconnecting...' : 'Connecting...'),
      messagingSessionDidStop: (event) => {
        console.log(`Session stopped event: ${event}`);
        console.log(`Session stopped event code, reason: ${event.code} ${event.reason}`);
        console.log('User left the chat', userArn);
      },
      // Handle incoming messages
      messagingSessionDidReceiveMessage: (message) => {
        console.log('Received message:', message);
        if (!message.payload) return;
        const messageData = JSON.parse(message.payload);
        console.log('Received messageData:', messageData);


        // count the number of participants in the channel
        let numberOfParticipants = 0;
        if (messageData.ChannelMemberships) {
          console.log('Number of participants:', messageData.ChannelMemberships.length);
          numberOfParticipants = messageData.ChannelMemberships.length;
        }

        // when participants join the channel and show the message history
        if (messageData.ChannelMessages?.length) {
          const newMessages = messageData.ChannelMessages.reverse().map((msg) => ({
            type: msg.Type,
            content: msg.Content,
            senderArn: msg?.Sender?.Arn,
            senderName: msg?.Sender?.Name,
            timestamp: msg.CreatedTimestamp,
            // userNameDisplay: `User${numberOfParticipants}`,
          }));
          setMessages((prevMessages) => [...prevMessages, ...newMessages]);
        }

        // when participants start the input message
        if (messageData.Content) {
          const newMessage = {
            type: message.type,
            content: messageData.Content,
            senderArn: messageData?.Sender?.Arn,
            senderName: messageData?.Sender?.Name,
            timestamp: new Date().toISOString(),
            userNameDisplay: `User${numberOfParticipants}`,
          };
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        }
      },
    };

    session.addObserver(observer);

    try {
      // Start the messaging session
      await session.start();
    } catch (error) {
      console.log('Error starting session:', error);
    }
  }, [userArn, sessionId]);

  // Function to send a message to the channel
  const sendMessageClick = useCallback(async () => {
    if (!inputMessage) return;

    try {
      const response = await sendMessage(channelArn, userArn, inputMessage);
      console.log('Message sent successfully:', response);
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [inputMessage, channelArn, userArn]);

  // Function to handle input change
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  // Effect to initialize the messaging session
  useEffect(() => {
    initializeMessagingSession();

    return () => {
      if (messagingSessionRef.current) {
        messagingSessionRef.current.stop();
      }
    };
  }, [initializeMessagingSession, channelArn, userArn, sessionId]);

  return (
    <div className="chat-container" style={{ display: ((chatSetting === 'guideOnly' && messages.length <= 0) || chatSetting === 'nochat') ? 'none' : 'block' }}>
      {messages.length > 0 && (
        <div className="chat-window">
          {messages.map((message, index) => (
            <div key={index} className="message">
              <div className="message-header">
                <VscAccount color={message.senderName === "Guide" ? "blue" : ""} size={24} />
                <strong>{message.senderArn === userArn ? 'You' : message.senderName}</strong>
              </div>
              <div className={`message-content ${message.senderArn === userArn ? 'my-message' : 'other-message'}`}>
                <span>{message.content}</span>
                <div className="timestamp">{formatTimestamp(message.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Render chat input based on chatSetting */}
      {chatSetting !== 'guideOnly' && (
        <div className="chat-input">
          <input
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                sendMessageClick();
              }
            }}
          />
          <button className="send-button" onClick={sendMessageClick}>
            <FiSend size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;