import React, { useState } from 'react';
import Participants from './Participants';
import { BsQrCode } from "react-icons/bs";
import { QRCodeSVG } from 'qrcode.react';
import SettingMenu from './SettingMenu';
import '../styles/Header.css';
function  Header  ({count,Config,meeting,channelID,userId,chatSetting})  {
    const [openQRCode, setOpenQRCode] = useState(false);
    const openPopup = () => {
        setOpenQRCode(true);
        console.log('configggggg',Config);
    }
    const closePopup = () => { 
        setOpenQRCode(false);
    }
    return (       
            <div className='containerHeader'>
                
                    <Participants count={count}></Participants>                               
                    <div className='rightMenu'>
                        <div className='qrCode' onClick={openPopup}>
                            <BsQrCode className='icon' size={24} />
                            <span>QRコード</span>
                        </div>
                        <div className='selectLanguage'>
                            {/* <GrLanguage className='icon' size={24} /> */}
                            <SettingMenu></SettingMenu>
                            <span>言語設定</span>
                        </div>
                    </div>
                    {openQRCode == true && meeting &&
                        <div className="popup">
                            <div className="popup-content">
                                <span className="close-btn" onClick={closePopup}>&times;</span>
                                {/* {Config} */}
                                <div className='contentQR'>
                                    <h3>QRコードを共有</h3>
                                    <p>再生する音声ファイル</p>
                                    <QRCodeSVG value={`${Config}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`} size={256} level="H" />
                                    
                                    <a className='link' target="_blank" rel="noopener noreferrer"  href={`${Config}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`}>
                                    xxxxxxxxx
                                    </a>
                                                    
                                </div>
                            </div>
                        </div>
                    }</div>
            

        
    );
};

export default Header;