import React, { useState } from 'react';
import Participants from './Participants';
import { BsQrCode } from "react-icons/bs";
import { QRCodeSVG } from 'qrcode.react';
import SettingMenu from './SettingMenu';
import '../styles/Header.css';
import { useTranslation } from 'react-i18next';
function Header({ count, Config, meeting, channelID, userId, chatSetting }) {
    const { t } = useTranslation();
    const [openQRCode, setOpenQRCode] = useState(false);
    const [selectedQR, setSelectedQR] = useState('listener');
    const openPopup = () => {
        setOpenQRCode(true);
        console.log('configggggg', Config);
    }
    const closePopup = () => {
        setOpenQRCode(false);
    }
    const handleQRSelectionChange = (e) => {
        setSelectedQR(e.target.value);
    };
    return (
        <div className='containerHeader'>

            <Participants count={count}></Participants>
            <div className='rightMenu'>
                <div className='qrCode' onClick={openPopup}>
                    <BsQrCode className='icon' size={35} />
                    <span>QRコード</span>
                </div>
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
                                    <div>
                                        <QRCodeSVG value={`${Config}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`} size={256} level="H" />
                                        <a className='link' target="_blank" rel="noopener noreferrer" style={{ color: 'red' }} href={`${Config}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`}>
                                            {t('scanQRCodeTxt.subGuide')}
                                        </a>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <QRCodeSVG value={`${Config}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`} size={256} level="H" />
                                        <a className='link' target="_blank" rel="noopener noreferrer" style={{ color: 'red' }} href={`${Config}?meetingId=${meeting.MeetingId}&channelId=${channelID}&hostId=${userId}&chatSetting=${chatSetting}`}>
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