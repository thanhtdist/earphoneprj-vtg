import React, { useState } from 'react';
import Participants from './Participants';
import { BsQrCode } from "react-icons/bs";
import { QRCodeSVG } from 'qrcode.react';
import SettingMenu from './SettingMenu';
import '../styles/Header.css';
import { useTranslation } from 'react-i18next';
import Config from '../utils/config';

function Header({ count, meeting, channelID, userId, chatSetting, userType }) {
    const { t } = useTranslation();
    const [openQRCode, setOpenQRCode] = useState(false);
    const [selectedQR, setSelectedQR] = useState('listener');
    const openPopup = () => {
        setOpenQRCode(true);
    }
    const closePopup = () => {
        setOpenQRCode(false);
    }
    const handleQRSelectionChange = (e) => {
        setSelectedQR(e.target.value);
    };
    const style =()=>{
        if (userType === "Guide") {
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
        }
       
    }
    return (
        <div className='containerHeader' style={style()}>

            <Participants count={count}></Participants>
            {/* {userId} */}
            <div className='rightMenu'>
                {userType === "Guide" && (
                    <div className='qrCode' onClick={openPopup}>
                        <BsQrCode className='icon' size={35} />
                        <span>QRコード</span>
                    </div>
                 )} 

                <div className='selectLanguage'>
                    {/* <GrLanguage className='icon' size={24} /> */}
                    <SettingMenu></SettingMenu>
                    <span>言語設定</span>
                </div>
            </div>
            {openQRCode === true && meeting &&
                <div className="popup">
                    <div className="popup-content">
                        <span className="close-btn" onClick={closePopup}>&times;</span>
                        <div className='contentQR'>
                            <h3>QRコードを共有</h3>
                            <select className='selectFile' value={selectedQR} onChange={handleQRSelectionChange}>
                                <option value="subSpeaker">{t('generateQRCodeOptions.subGuide')}</option>
                                <option value="listener">{t('generateQRCodeOptions.listener')}</option>
                            </select>
                            {selectedQR === 'subSpeaker' ? (
                                <>
                                    <div className='qrCodeContainer'>
                                        <div className="qrCodeContent">
                                            <QRCodeSVG value={`${Config.appSubSpeakerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`} size={256} level="H" />
                                        </div>
                                        <a className='link' target="_blank" rel="noopener noreferrer" style={{ color: 'red' }} href={`${Config.appSubSpeakerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`}>
                                            {t('scanQRCodeTxt.subGuide')}
                                        </a>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className='qrCodeContainer'>
                                        <div className="qrCodeContent">
                                            <QRCodeSVG value={`${Config.appViewerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`} size={256} level="H" />
                                        </div>
                                        <a className='link' target="_blank" rel="noopener noreferrer" style={{ color: 'red' }} href={`${Config.appViewerURL}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`}>
                                            {t('scanQRCodeTxt.listener')}
                                        </a>
                                    </div>
                                </>
                            )}

                        </div>
                    </div>
                </div>
            }</div>



    );
};

export default Header;