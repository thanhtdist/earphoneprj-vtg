import { useState } from 'react';
import { AiFillMessage } from "react-icons/ai";
import '../../styles/MessageBox.css';
// import '../styles/Header.css';
import ChatMessage from './ChatMessage';
import { useTranslation } from 'react-i18next';

const MessageBox = ({ userArn, sessionId, channelArn, userType, statusChat }) => {
    const { t } = useTranslation();
    const [openChatBox, setOpenChatBox] = useState(false);
    // const [titleChat, setTitleChat] = useState('');
    const setStatusChat = () => {
        if (statusChat === "allChat") {
            return t('chatSettingOptions.allChat')
        }
        else if (statusChat === "guideOnly") {
            return t('chatSettingOptions.onlyGuideChat')
        }
        else if (statusChat === "nochat") {
            return t('chatSettingOptions.noChat')
        }
    }
    const openChat = () => {
        setOpenChatBox(true);
    }
    const closeChat = () => {
        setOpenChatBox(false);
    }
    const styleIcon = () => {
        if (userType === "Guide") {
            return {
                color: '#C60226'
            }
        }
        else if (userType === "User") {
            return {
                color: '#16A085'
            }
        }
        else if (userType === "Sub-Guide") {
            return {
                color: '#E57A00'
            }
        }
    }
    const styleCloseButton = () => {
        if (userType === "Guide") {
            return {
                border: '2px solid #C60226',
                backgroundColor: '#C60226'
            }
        }
        else if (userType === "User") {
            return {               
                border: '2px solid #16A085',
                backgroundColor: '#16A085'
            }
        }
        else if (userType === "Sub-Guide") {
            return {
                border: '2px solid #E57A00',
                backgroundColor: '#E57A00'
            }
        }
    }
    return (
        <>
            <div className='messageBox' onClick={openChat} style={styleIcon()}>
                <AiFillMessage className='icon' size={35} />
            </div>
            {
                openChatBox === true && (
                    <div className="popup">
                        <div className="popup-chat-content">
                            <span className="close-btn" style={styleCloseButton()} onClick={closeChat}>&times;</span>
                            <div className='contentChat'>
                                <div className='title-chat'>
                                    <h3>{t('chatPopup.title')}</h3>
                                </div>
                                <div className='status-chat'>
                                    <span>{t('chatPopup.statuslbl')} : {setStatusChat()}</span>
                                </div>
                                <ChatMessage userArn={userArn} sessionId={sessionId} channelArn={channelArn}  userType={userType} chatSetting={statusChat}></ChatMessage>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default MessageBox;