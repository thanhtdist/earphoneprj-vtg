import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import '../styles/StartMainGuide.css';
import Header from './Header';
const StartFindTour = () => {
    const { t } = useTranslation();
    const [chatSetting, setChatSetting] = useState('guideOnly');
    const handleChatSettingChange = (e) => {
        setChatSetting(e.target.value);
      };
    const navigate = useNavigate();
    const handleClick = () => {
        navigate(`/guide?chatSetting=${chatSetting}`);
    }
    return (
        <>
        <Header/>
            <div className='chat-setting-container'>
                <div>
                    <p style={{textAlign:'center', fontWeight:'700',fontSize:'20px'}}>{t('chatSettingLbl')}</p>
                </div>
                <div className='selected'> 
                    <select className='selectFile' style={{border:"1px solid #C60226"}} value={chatSetting} onChange={handleChatSettingChange}>
                        <option value="allChat">{t('chatSettingOptions.allChat')}</option>
                        <option value="guideOnly">{t('chatSettingOptions.onlyGuideChat')}</option>
                        <option value="nochat">{t('chatSettingOptions.noChat')}</option>
                    </select>
                </div>
                <div className='btn-chat-setting'>                
                    <button className="btn-confirm"  onClick={handleClick}>{t('startGuidePage.startBtn')}</button>
                        
               </div>
            </div>

        </>
    );
};

export default StartFindTour;