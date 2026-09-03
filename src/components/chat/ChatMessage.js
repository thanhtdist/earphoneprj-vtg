import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChimeSDKMessagingClient } from '@aws-sdk/client-chime-sdk-messaging';
import useAutoRefreshCredentials from '../../hooks/useAutoRefreshCredentials';
import { sendMessage, loginAndGetCredentials, translateText } from '../../apis/api';
import { getBaseLanguage, CHAT_TRANSLATION_LANGUAGES } from '../../utils/constant';
import {
  generatePresignedUrl,
  //uploadFileToS3
} from '../../services/S3Service';
import {
  ConsoleLogger,
  DefaultMessagingSession,
  LogLevel,
  MessagingSessionConfiguration,
  PrefetchOn,
  PrefetchSortBy,
} from 'amazon-chime-sdk-js';
import { FiSend, FiX } from 'react-icons/fi';
// import { VscAccount } from "react-icons/vsc";
import '../../styles/ChatMessage.css';
import Config from '../../utils/config';
import ChatAttachment from './ChatAttachment';
import { useTranslation } from 'react-i18next';
import { MdAttachFile } from "react-icons/md";
// import { loginCognito } from "../../utils/cognitoAuth";
// import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
// Chat message Metadata carries attachments and, since task #13, per-language translations of the
// text: { attachments: [...], translations: { en: "...", ja: "..." }, sourceLang: "ja" }.
// The field was already free-form JSON, so old messages (attachments only, or no metadata) parse
// fine and simply have no translations.
const parseChatMetadata = (raw) => {
  if (!raw) return { attachments: null, translations: null, sourceLang: null };
  try {
    const meta = JSON.parse(raw);
    return {
      attachments: meta.attachments ?? null,
      translations: meta.translations ?? null,
      sourceLang: meta.sourceLang ?? null,
    };
  } catch (error) {
    console.log('Failed to parse chat metadata:', error, raw);
    return { attachments: null, translations: null, sourceLang: null };
  }
};

// Build the Metadata string for a message, or null when there is nothing to store (keeps parity
// with the previous behaviour of passing no metadata).
const buildChatMetadata = ({ attachments, translations, sourceLang }) => {
  const meta = {};
  if (attachments?.length) meta.attachments = attachments;
  if (translations && Object.keys(translations).length) {
    meta.translations = translations;
    if (sourceLang) meta.sourceLang = sourceLang;
  }
  return Object.keys(meta).length ? JSON.stringify(meta) : null;
};

/**
 * Renders one message's text: the translation for the reader's chat language when there is one,
 * with a toggle to reveal the original. A reader's own messages are always shown as typed.
 * `chatLanguage` is an Amazon Translate code ("th", "ja", "en"...) - the listening language for
 * a viewer, the UI language for a guide / sub-guide.
 */
function MessageContent({ message, isMine, chatLanguage, t }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const original = message.content;
  const myLang = chatLanguage;
  // Don't translate my own messages, and skip when the message was written in my language.
  const translated =
    !isMine && message.translations && message.sourceLang !== myLang
      ? message.translations[myLang]
      : null;
  const hasTranslation = !!translated && translated !== original;
  const display = hasTranslation && !showOriginal ? translated : original;

  return (
    <>
      <span className="text-message">{display}</span>
      {hasTranslation && (
        <button
          type="button"
          className="toggle-original"
          onClick={() => setShowOriginal((prev) => !prev)}
        >
          {showOriginal ? t('chat.hideOriginal') : t('chat.showOriginal')}
        </button>
      )}
    </>
  );
}

/**
 * Component to display chat messages and send messages to a channel
 * @param {string} userArn - The ARN of the user
 * @param {string} channelArn - The ARN of the channel
 * @param {string} sessionId - The session ID for the messaging session
 */
function ChatMessage({ userArn, channelArn, sessionId, chatSetting = null, userType, chatLanguage }) {
  const [credentialsExpiration, setCredentialsExpiration] = useState(null);
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
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef();
  const inputRef = useRef(null);
  const { t, i18n } = useTranslation();
  console.log('i18n', i18n);
  console.log('t', t);
  // The language this participant reads and writes chat in (Amazon Translate code): the listening
  // language for a viewer, the UI language for a guide / sub-guide. Falls back to the UI language.
  const myChatLanguage = chatLanguage || getBaseLanguage(i18n.language);

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
    try {
      const credentials = await loginAndGetCredentials();
      console.log('Credentials:', credentials);
      if (credentials?.data?.expiration) {
        const expirationTime = new Date(credentials.data.expiration).getTime();
        console.log('Credentials expiration time:', expirationTime);
        setCredentialsExpiration(expirationTime);
      }
      const chime = new ChimeSDKMessagingClient({
        region: Config.region,
        credentials: {
          accessKeyId: credentials.data.accessKeyId,
          secretAccessKey: credentials.data.secretAccessKey,
          sessionToken: credentials.data.sessionToken,
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
            const newMessages = messageData.ChannelMessages.reverse().map((msg) => {
              const meta = parseChatMetadata(msg?.Metadata);
              return {
                type: msg.Type,
                content: msg.Content,
                senderArn: msg?.Sender?.Arn,
                senderName: msg?.Sender?.Name,
                timestamp: msg.CreatedTimestamp,
                attachments: meta.attachments,
                translations: meta.translations,
                sourceLang: meta.sourceLang,
              };
            });
            setMessages((prevMessages) => [...prevMessages, ...newMessages]);
          }

          // when participants start the input message
          if (messageData.Content) {
            const meta = parseChatMetadata(messageData?.Metadata);
            const newMessage = {
              type: message.type,
              content: messageData.Content,
              senderArn: messageData?.Sender?.Arn,
              senderName: messageData?.Sender?.Name,
              timestamp: new Date().toISOString(),
              attachments: meta.attachments,
              translations: meta.translations,
              sourceLang: meta.sourceLang,
            };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
          }
        },
      };

      messagingSession.addObserver(observer);
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

    try {

      // Disable the button by setting sending to true
      setSending(true);

      // Store the attachment file in S3 first, if any
      let attachments = null;
      if (selectedFile) {
        // const uploadFileToS3Response = await uploadFileToS3(selectedFile);
        // console.log('File uploaded successfully:', uploadFileToS3Response);
        const uploadFileToS3Response = await generatePresignedUrl(selectedFile);
        console.log('File uploaded successfully:', uploadFileToS3Response);
        attachments = [
          {
            fileKey: uploadFileToS3Response.key,
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
          },
        ];
      }

      // A message sent with only an attachment carries ' ' as its content (never rendered,
      // never translated). Everything else is translated once, now, into the other chat
      // languages so every reader - including late joiners and readers who switch language -
      // gets the translation from the stored Metadata without re-calling Translate (task #13).
      const contentToSend = attachments ? (inputMessage || ' ') : inputMessage;
      const textToTranslate = (inputMessage || '').trim();

      let translations = null;
      let sourceLang = null;
      if (textToTranslate) {
        // Source language is auto-detected rather than assumed from the sender's chat language -
        // a listener can type in a different language than the one they picked to listen in.
        // Every chat language is requested; which target ends up equal to the detected source
        // isn't known until the responses come back, so it's dropped afterwards instead of
        // skipped upfront.
        const results = await Promise.all(
          CHAT_TRANSLATION_LANGUAGES.map(async (lang) => [lang, await translateText(textToTranslate, 'auto', lang)])
        );
        sourceLang = results.find(([, result]) => result?.sourceLanguageCode)?.[1].sourceLanguageCode || myChatLanguage;
        const entries = results
          .filter(([lang, result]) => lang !== sourceLang && !!result?.translatedText)
          .map(([lang, result]) => [lang, result.translatedText]);
        // If Translate failed, send anyway with no translations - readers fall back to the original.
        if (entries.length) translations = Object.fromEntries(entries);
      }

      const options = buildChatMetadata({ attachments, translations, sourceLang });
      const sendMessageResponse = await sendMessage(channelArn, userArn, contentToSend, options);
      console.log('Message sent successfully:', sendMessageResponse);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setInputMessage('');
      setSelectedFile(null);
      setSending(false);
    }
  }, [inputMessage, channelArn, userArn, selectedFile, myChatLanguage]);

  // Function to handle input change
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  // Function to handle key down event for the input
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.target.disabled) return; // Prevent additional execution if input is disabled
      sendMessageClick();
      e.target.disabled = true; // Disable the input temporarily
      setTimeout(() => {
        e.target.disabled = false; // Re-enable after delay
      }, 300); // Adjust delay
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
    // Reset the file input value to allow re-uploading the same file
    fileInputRef.current.value = null;
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

  // Effect to refresh the messaging session credentials
  useAutoRefreshCredentials(credentialsExpiration, async () => {
    if (messagingSessionRef.current) {
      messagingSessionRef.current.stop();
    }
    await initializeMessagingSession();
  });


  // Function to set the status of the chat based on chatSetting
  const styleButton = () => {
    if (userType === "Guide") {
      return '#C60226'
    }
    else if (userType === "User") {
      return '#16A085'
    }
    else if (userType === "Sub-Guide") {
      return '#E57A00'
    }
  }
  return (
    // style={{ display: ((chatSetting === 'guideOnly' && messages.length <= 0) || chatSetting === 'nochat') ? 'none' : 'block' }}

    <div className="chat-container" >
      {messages.length > 0 && (
        <div className="chat-window">
          {messages.map((message, index) => (
            <div key={index} className="message">
              <div className="message-header">
                {/* <VscAccount color={!message.senderName.startsWith("User") ? "blue" : ""} size={24}/> */}

                {message.senderName.startsWith("Guide") && (
                  <div className={message.senderArn === userArn ? "myself-chat" : "sender-chat"}>
                    <div className="timestamp">{formatTimestamp(message.timestamp)}</div>
                    <strong>{message.senderArn === userArn ? t('userNameDisplay.myself') : displayUserName(message.senderName)}</strong>
                    <img
                      src={`${process.env.PUBLIC_URL}/images/main-guide-person.png`}
                      alt="Guide"
                      // style={{ width: '24px', height: '24px', }} // Icon size
                      className="image-person-chat"
                    />
                  </div>
                )}
                {message.senderName.startsWith("Sub-Guide") && (
                  <div className={message.senderArn === userArn ? "myself-chat" : "sender-chat"}>
                    <img
                      src={`${process.env.PUBLIC_URL}/images/sub-guide-person.png`}
                      alt="Sub-Guide"
                      // style={{ width: '24px', height: '24px' }} // Icon size
                      className="image-person-chat"
                    />
                    <div className="timestamp">{formatTimestamp(message.timestamp)}</div>
                    <strong>{message.senderArn === userArn ? t('userNameDisplay.myself') : displayUserName(message.senderName)}</strong>
                  </div>
                )}
                {message.senderName.startsWith("User") && (
                  <div className={message.senderArn === userArn ? "myself-chat" : "sender-chat"}>
                    <img
                      src={`${process.env.PUBLIC_URL}/images/user.png`}
                      alt="User"
                      // style={{ width: '24px', height: '24px' }} // Icon size
                      className="image-person-chat"
                    />
                    <div className="timestamp">{formatTimestamp(message.timestamp)}</div>
                    <strong>{message.senderArn === userArn ? t('userNameDisplay.myself') : displayUserName(message.senderName)}</strong>
                  </div>
                )}

              </div>

              {message.content !== ' ' && (
                <div className={`message-content ${message.senderArn === userArn ? 'my-message' : 'other-message'}`}>
                  <MessageContent
                    message={message}
                    isMine={message.senderArn === userArn}
                    chatLanguage={myChatLanguage}
                    t={t}
                  />
                </div>
              )}
              {message.attachments?.length > 0 &&
                (<div className={`${message.senderArn === userArn ? 'my-message' : 'other-message'}`}>
                  <ChatAttachment {...message.attachments[0]} />
                </div>)}
              {/* {message.attachments && message.attachments.length > 0 && (
                <>
                  <ChatAttachment
                    url={message.attachments[0].url}
                    fileKey={message.attachments[0].fileKey}
                    name={message.attachments[0].name}
                    type={message.attachments[0].type}
                    size={message.attachments[0].size} />
                </>
              )} */}
              {/* {message.senderArn} */}

              {/* {message.attachments?.length > 0 && <ChatAttachment {...message.attachments[0]} userType={message.senderArn} />} */}
            </div>
          ))}
        </div>
      )}
      {/* Render chat input based on chatSetting */}
      {(chatSetting === 'allChat' || (chatSetting === "guideOnly" && userType === "Guide")) && (
        <div className="chat-input">
          <div className='attachment-container'>

            <MdAttachFile size={24} className="upload-icon" onClick={handleFileUploadClick} />
          </div>
          <input
            type="file"
            accept=".jpg, .jpeg, .png, .gif, .pdf"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
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
            <button
              className="send-button"
              onClick={sendMessageClick}
              disabled={sending || (!inputMessage && !selectedFile)}
              style={{
                // backgroundColor: (sending || (!inputMessage && !selectedFile)) ? '#d3d3d3' : '#4CAF50', // Adjust colors as needed
                color: styleButton(),
                // color: (sending || (!inputMessage && !selectedFile)) ? 'black' : "red",
                cursor: (sending || (!inputMessage && !selectedFile)) ? 'not-allowed' : 'pointer',
                opacity: (sending || (!inputMessage && !selectedFile)) ? 0.6 : 1,
              }}>
              <FiSend size={24} />
            </button>
          </div>


        </div>
      )}
      {/* {chatSetting !== 'guideOnly' && (
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
            disabled={sending || (!inputMessage && !selectedFile)}
            style={{
              backgroundColor: (sending || (!inputMessage && !selectedFile)) ? '#d3d3d3' : '#4CAF50', // Adjust colors as needed
              color: 'white',
              cursor: (sending || (!inputMessage && !selectedFile)) ? 'not-allowed' : 'pointer',
              opacity: (sending || (!inputMessage && !selectedFile)) ? 0.6 : 1,
            }}>
            <FiSend size={24} />
          </button>
        </div>

      )} */}

    </div>
  );
};

export default ChatMessage;