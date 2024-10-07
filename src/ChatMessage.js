import React, { useState, useEffect, useRef } from 'react';
import {
  ChimeSDKMessagingClient,
} from '@aws-sdk/client-chime-sdk-messaging';
import {
  sendMessage
} from './api';
import {
  ConsoleLogger,
  DefaultMessagingSession,
  LogLevel,
  MessagingSessionConfiguration,
  PrefetchOn,         // Import Prefetch
  PrefetchSortBy    // Import PrefetchSortBy
} from 'amazon-chime-sdk-js';
import './ChatMessage.css';
import Config from './Config';

const ChatMessage = ({ userArn, channelArn, sessionId }) => {
  console.log("Chat userArn", userArn);
  console.log("Chat channelArn", channelArn);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagingSessionRef = useRef(null); // Use a ref for messagingSession

  useEffect(() => {
    const initializeMessagingSession = async () => {
      const logger = new ConsoleLogger('SDK', LogLevel.INFO);
      const chime = new ChimeSDKMessagingClient({
        region: Config.region, 
        credentials: {
          accessKeyId: Config.accessKeyId, // Ensure these are set properly
          secretAccessKey: Config.secretAccessKey,
        },
      });

      const configuration = new MessagingSessionConfiguration(userArn, sessionId, undefined, chime);
      configuration.prefetchOn = PrefetchOn.Connect;
      configuration.prefetchSortBy = PrefetchSortBy.Unread;
      const session = new DefaultMessagingSession(configuration, logger);
      messagingSessionRef.current = session; // Assign session to the ref

      // Observer for messaging session events
      const observer = {
        messagingSessionDidStart: () => {
          console.log('Messaging session started');
        },
        messagingSessionDidStartConnecting: (reconnecting) => {
          console.log(reconnecting ? 'Reconnecting...' : 'Connecting...');
        },
        messagingSessionDidStop: (event) => {
          console.log(`Session stopped: ${event.code} ${event.reason}`);
        },
        messagingSessionDidReceiveMessage: (message) => {
          console.log('Received message:', message);
          if (!message.payload) {
            return;
          }
          const messageData = JSON.parse(message.payload);
          console.log("Received message Data:", messageData);

          if (messageData && messageData.Content) {
            console.log("Received message Content:", messageData.Content);
            const newMessage = {
              type: message.type,
              //content: message.chimeChatContent.message,
              //senderArn: message.chimeChatContent.senderArn,
              content: messageData.Content,
              senderArn: messageData?.Sender?.Arn,
              senderName: messageData?.Sender?.Name,
              timestamp: new Date().toISOString(),
            };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
          }
         
        },
      };

      session.addObserver(observer);
      try {
        await session.start();
      } catch (error) {
        console.log('Error starting session:', error);
      }
     
    };

    initializeMessagingSession();

    // Clean up session on unmount
    return () => {
      if (messagingSessionRef.current) {
        messagingSessionRef.current.stop();
      }
    };
  }, [userArn, sessionId]); // Only depend on userArn and sessionId

  const sendMessageClick = async () => {
    if (inputMessage && messagingSessionRef.current) {
      console.log("messagingSessionRef.current", messagingSessionRef.current);

      try {
        // Use the Chime SDK to send the message
        const response = await sendMessage(channelArn, userArn, inputMessage)

        console.log('Message sent successfully:', response);

        // Update local messages state
        // setMessages((prevMessages) => [...prevMessages, newMessage]);
        setInputMessage(''); // Clear input after sending
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  return (
    <div className="chat-container">
      {messages.length > 0 && (
        <div className="chat-window">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.senderArn === userArn ? 'my-message' : 'other-message'}`}>
              <strong>{message.senderArn === userArn ? 'Me' : message.senderName}</strong>: {message.content}
              <div className="timestamp">{message.timestamp}</div>
            </div>
          ))}
        </div>
      )}
      <div className="chat-input">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessageClick();
            }
          }}
        />
        <button onClick={sendMessageClick}>Send</button>
      </div>
    </div>
  );
};

export default ChatMessage;
