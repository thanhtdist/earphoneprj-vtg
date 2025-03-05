import React, { useState } from 'react';
import { AiFillMessage } from "react-icons/ai";
import '../styles/MessageBox.css';
import '../styles/Header.css';
import ChatMessage from './ChatMessage';
import { useTranslation } from 'react-i18next';

const MessageBox = ({ userArn, sessionId, channelArn, userType, statusChat}) => {
    const { t } = useTranslation();
    const [openChatBox, setOpenChatBox] = useState(false);
    // const [titleChat, setTitleChat] = useState('');
    const setStatusChat =()=>{
        if(statusChat === "allChat"){
              return t('chatSettingOptions.allChat')
        }
        else if (statusChat === "guideOnly") {
             return t('chatSettingOptions.onlyGuideChat')
        }
        else if (statusChat === "nochat") {
             return t('chatSettingOptions.noChat')
        }
    }
    console.log('pppppp',statusChat);
    
    const openChat = () => {
        setOpenChatBox(true);
    }
    const closeChat = () => {
        setOpenChatBox(false);
    }
    const style =()=>{
        if(userType === "Guide"){
            return {
                color: 'red'
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
}}
    return (
        <>
            <div className='messageBox' onClick={openChat} style={style()}>
                <AiFillMessage className='icon' size={35} />
            </div>
            {
                openChatBox === true && (
                    <div className="popup">
                        <div className="popup-chat-content">
                            <span className="close-btn" onClick={closeChat}>&times;</span>                           
                            <div className='contentChat'>
                                <div>
                                    <h3>チャット</h3>                                   
                                </div>
                                <div className='status-chat'>
                                    <span>ステータス : {setStatusChat()}</span>
                                </div>
                                <ChatMessage userArn={userArn} sessionId={sessionId} channelArn={channelArn} userType={userType}></ChatMessage>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default MessageBox;