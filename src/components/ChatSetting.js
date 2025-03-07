import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import '../styles/ChatSetting.css';
const ChatSetting = () => {
    const { t } = useTranslation();
    const [chatSetting, setChatSetting] = useState('guideOnly');
    const handleChatSettingChange = (e) => {
        setChatSetting(e.target.value);
      };
    const navigate = useNavigate();
    const handleClick = () => {
        navigate('/guide', { state: { chatSetting:chatSetting } });
    }
    return (
        <>
            <div className='chat-setting-container'>
                <div>
                    <p style={{textAlign:'center', fontWeight:'700'}}>{t('chatSettingLbl')}</p>
                </div>
                <div>
                    <select className='selectFile' value={chatSetting} onChange={handleChatSettingChange}>
                        <option value="allChat">{t('chatSettingOptions.allChat')}</option>
                        <option value="guideOnly">{t('chatSettingOptions.onlyGuideChat')}</option>
                        <option value="nochat">{t('chatSettingOptions.noChat')}</option>
                    </select>
                </div>
                <div className='btn'>                
                    <button className="btn-confirm"  onClick={handleClick}>{t('startGuidePage.startBtn')}</button>
                        
               </div>
            </div>

        </>
    );
};

export default ChatSetting;