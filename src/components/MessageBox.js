import React, { useState } from 'react';
import { AiFillMessage } from "react-icons/ai";
import '../styles/MessageBox.css';
import '../styles/Header.css';
import ChatMessage from './ChatMessage';

const MessageBox = ({ userArn, sessionId, channelArn,chatSetting,action }) => {
    const [openChatBox, setOpenChatBox] = useState(false);
    const openChat = () => {
        setOpenChatBox(true);
    }
    const closeChat = () => {
        setOpenChatBox(false);
    }
    return (
        <>
            <div className='messageBox' onClick={openChat}>
                <AiFillMessage className='icon' size={35} />
            </div>
            {
                openChatBox === true && (
                    <div className="popup">
                        <div className="popup-content">
                            <span className="close-btn" onClick={closeChat}>&times;</span>                           
                            <div className='contentChat'>
                                <div>
                                    <h3>チャット</h3>                                   
                                </div>
                                <ChatMessage userArn={userArn} sessionId={sessionId} channelArn={channelArn}></ChatMessage>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default MessageBox;