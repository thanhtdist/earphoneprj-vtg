import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChimeSDKMessagingClient } from '@aws-sdk/client-chime-sdk-messaging';
import { sendMessage } from './api';
import {
  ConsoleLogger,
  DefaultMessagingSession,
  LogLevel,
  MessagingSessionConfiguration,
  PrefetchOn,
  PrefetchSortBy,
} from 'amazon-chime-sdk-js';
import { FiSend } from 'react-icons/fi';
import './ChatMessage.css';
import Config from './Config';

const ChatMessage = ({ userArn, channelArn, sessionId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagingSessionRef = useRef(null);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const initializeMessagingSession = useCallback(async () => {
    const logger = new ConsoleLogger('SDK', LogLevel.INFO);
    const chime = new ChimeSDKMessagingClient({
      region: Config.region,
      credentials: {
        accessKeyId: Config.accessKeyId,
        secretAccessKey: Config.secretAccessKey,
      },
    });

    const configuration = new MessagingSessionConfiguration(userArn, sessionId, undefined, chime);
    configuration.prefetchOn = PrefetchOn.Connect;
    configuration.prefetchSortBy = PrefetchSortBy.Unread;

    const session = new DefaultMessagingSession(configuration, logger);
    messagingSessionRef.current = session;

    const observer = {
      messagingSessionDidStart: () => console.log('Messaging session started'),
      messagingSessionDidStartConnecting: (reconnecting) =>
        console.log(reconnecting ? 'Reconnecting...' : 'Connecting...'),
      messagingSessionDidStop: (event) => console.log(`Session stopped: ${event.code} ${event.reason}`),
      messagingSessionDidReceiveMessage: (message) => {
        if (!message.payload) return;
        const messageData = JSON.parse(message.payload);

        if (messageData.Content) {
          const newMessage = {
            type: message.type,
            content: messageData.Content,
            senderArn: messageData?.Sender?.Arn,
            senderName: messageData?.Sender?.Name,
            timestamp: new Date().toISOString(),
          };
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        }

        if (messageData.ChannelMessages?.length) {
          const newMessages = messageData.ChannelMessages.reverse().map((msg) => ({
            type: msg.Type,
            content: msg.Content,
            senderArn: msg?.Sender?.Arn,
            senderName: msg?.Sender?.Name,
            timestamp: msg.CreatedTimestamp,
          }));
          setMessages((prevMessages) => [...prevMessages, ...newMessages]);
        }
      },
    };

    session.addObserver(observer);

    try {
      await session.start();
    } catch (error) {
      console.log('Error starting session:', error);
    }
  }, [userArn, sessionId]);

  useEffect(() => {
    initializeMessagingSession();

    return () => {
      if (messagingSessionRef.current) {
        messagingSessionRef.current.stop();
      }
    };
  }, [initializeMessagingSession, channelArn, userArn, sessionId]);

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

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  return (
    <div className="chat-container">
      {messages.length > 0 && (
        <div className="chat-window">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.senderArn === userArn ? 'my-message' : 'other-message'}`}
            >
              <strong>{message.senderArn === userArn ? 'You' : message.senderName}</strong>: {message.content}
              <div className="timestamp">{formatTimestamp(message.timestamp)}</div>
            </div>
          ))}
        </div>
      )}
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
    </div>
  );
};

export default ChatMessage;
