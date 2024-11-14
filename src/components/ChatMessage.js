import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChimeSDKMessagingClient } from '@aws-sdk/client-chime-sdk-messaging';
import { sendMessage } from '../apis/api';
import { uploadFileToS3 } from '../services/S3Service';
import {
  ConsoleLogger,
  DefaultMessagingSession,
  LogLevel,
  MessagingSessionConfiguration,
  PrefetchOn,
  PrefetchSortBy,
} from 'amazon-chime-sdk-js';
import { FiSend, FiUpload, FiX } from 'react-icons/fi';
// import { VscAccount } from "react-icons/vsc";
import '../styles/ChatMessage.css';
import Config from '../utils/config';
import ChatAttachment from './ChatAttachment';
import { useTranslation } from 'react-i18next';
/**
 * Component to display chat messages and send messages to a channel
 * @param {string} userArn - The ARN of the user
 * @param {string} channelArn - The ARN of the channel
 * @param {string} sessionId - The session ID for the messaging session 
 */
function ChatMessage({ userArn, channelArn, sessionId, chatSetting = null }) {
  const subGuideCount = localStorage.getItem('subGuideJoinCount') || 0;
  console.log('subGuideJoinCount:', subGuideCount);
  // State variables to store messages and input message
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  // Persist to the messaging session in the lifetime of the component chat message
  const [messageSession, setMessageSession] = useState(null);
  console.log('messageSession:', messageSession);
  const messagingSessionRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef();
  const inputRef = useRef(null);

  useEffect(() => {
    if(!inputMessage) {
      inputRef.current.focus();
    }
  }, [inputMessage]);
  const { t, i18n } = useTranslation();
  console.log('i18n', i18n);
  console.log('t', t);

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
    const messagingSession = new DefaultMessagingSession(configuration, logger);
    setMessageSession(messagingSession);
    messagingSessionRef.current = messagingSession;

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

        // when participants join the channel and show the message history
        if (messageData.ChannelMessages?.length) {
          const newMessages = messageData.ChannelMessages.reverse().map((msg) => ({
            type: msg.Type,
            content: msg.Content,
            senderArn: msg?.Sender?.Arn,
            senderName: msg?.Sender?.Name,
            timestamp: msg.CreatedTimestamp,
            attachments: msg?.Metadata ? JSON.parse(msg.Metadata).attachments : null
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
            attachments: messageData?.Metadata ? JSON.parse(messageData.Metadata).attachments : null
          };
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        }
      },
    };

    messagingSession.addObserver(observer);

    try {
      // Start the messaging session
      await messagingSession.start();
    } catch (error) {
      console.log('Error starting session:', error);
    }
  }, [userArn, sessionId]);

  // Function to send a message to the channel
  const sendMessageClick = useCallback(async () => {
    console.log('sendMessageClick:', inputMessage, selectedFile);
    if (!inputMessage && !selectedFile) return;

    let options = null;

    // Store the attachment file in S3 and send the message with the attachment
    if (selectedFile) {
      console.log('Sending message inputMessage', inputMessage);
      console.log('Sending message selectedFile:', selectedFile);
      let inputMessageAttachment = inputMessage;
      if (!inputMessage) inputMessageAttachment = ' ';

      // store attachment into S3
      const response = await uploadFileToS3(selectedFile);

      console.log('File uploaded successfully:', response);

      // Metadata for the attachment file to be sent with the message
      options = JSON.stringify({
        attachments: [
          {
            fileKey: response.Key,
            url: response.Location,
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
          },
        ],
      });
      console.log('options:', options);
      setSelectedFile(null);
      try {
        const response = await sendMessage(channelArn, userArn, inputMessageAttachment, options);
        console.log('Message sent successfully:', response);
        setInputMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      // Send the message without the attachment
      try {
        const response = await sendMessage(channelArn, userArn, inputMessage, options);
        console.log('Message sent successfully:', response);
        setInputMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }


  }, [inputMessage, channelArn, userArn, selectedFile]);

  // Function to handle input change
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  // Function to handle input key down
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessageClick();
      e.preventDefault(); // Prevent newline on Enter
    }
  };

  // Function to handle file upload icon click
  const handleFileUploadClick = () => {
    fileInputRef.current.click();
  };

  // Function to handle file change from the file input
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    //Files must be less than 200 MB in size
    console.log('handleFileChange:', file);
    if (file) {
      setSelectedFile(file);
    }
  };

  // Function to clear the selected file
  const clearFile = () => {
    setSelectedFile(null);
  };

  // Display user name based on multiple languages
  const displayUserName = (userName) => {
    console.log('userName:', userName);
    if (userName.startsWith("User")) {
      return userName.replace('User', t('userNameDisplay.listener'));
    } else if (userName.startsWith("Sub-Guide")) {
      return userName.replace('Sub-Guide', t('userNameDisplay.subGuide'));
    }
    return t('userNameDisplay.mainGuide');
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
                {/* <VscAccount color={!message.senderName.startsWith("User") ? "blue" : ""} size={24}/> */}
                {message.senderName.startsWith("Guide") && (
                  <img
                    src={`${process.env.PUBLIC_URL}/images/main-speaker.png`}
                    alt="Guide"
                    style={{ width: '24px', height: '24px' }} // Icon size
                  />
                )}
                {message.senderName.startsWith("Sub-Guide") && (
                  <img
                    src={`${process.env.PUBLIC_URL}/images/sub-speaker.png`}
                    alt="Sub-Guide"
                    style={{ width: '24px', height: '24px' }} // Icon size
                  />
                )}
                {message.senderName.startsWith("User") && (
                  <img
                    src={`${process.env.PUBLIC_URL}/images/user.png`}
                    alt="User"
                    style={{ width: '24px', height: '24px' }} // Icon size
                  />
                )}
                <strong>{message.senderArn === userArn ? t('userNameDisplay.myself') : displayUserName(message.senderName)}</strong>
              </div>
              <div className="timestamp">{formatTimestamp(message.timestamp)}</div>
              {message.content !== ' ' && (
                <div className={`message-content ${message.senderArn === userArn ? 'my-message' : 'other-message'}`}>
                  <span>{message.content}</span>
                </div>
              )}
              {message.attachments && message.attachments.length > 0 && (
                <>
                  <ChatAttachment
                    url={message.attachments[0].url}
                    fileKey={message.attachments[0].fileKey}
                    name={message.attachments[0].name}
                    type={message.attachments[0].type}
                    size={message.attachments[0].size} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Render chat input based on chatSetting */}
      {chatSetting !== 'guideOnly' && (
        <div className="chat-input">
          <div className="input-container">
            <div className="input-like-div">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                placeholder={t('messagePlaceholder')}
              />
              {selectedFile && (
                <>
                  <div className="file-attachment">
                    <span className="file-name" title={selectedFile.name}>{selectedFile.name}</span>
                    <FiX className="clear-file-icon" onClick={clearFile} />
                  </div>
                </>
              )}
            </div>
            <FiUpload className="upload-icon" onClick={handleFileUploadClick} />
            <input
              type="file"
              accept=".jpg, .jpeg, .png, .gif, .pdf"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
          <button
            className="send-button"
            onClick={sendMessageClick}
            disabled={!inputMessage && !selectedFile}
            style={{
              backgroundColor: (!inputMessage && !selectedFile) ? '#d3d3d3' : '#4CAF50', // Adjust colors as needed
              color: 'white',
              cursor: (!inputMessage && !selectedFile) ? 'not-allowed' : 'pointer',
              opacity: (!inputMessage && !selectedFile) ? 0.6 : 1,
            }}>
            <FiSend size={24} />
          </button>
        </div>

      )}
    </div>
  );
};

export default ChatMessage;