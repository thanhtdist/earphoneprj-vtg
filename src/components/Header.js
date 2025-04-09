import React, { useState } from 'react';
import Participants from './Participants';
import { BsQrCode } from "react-icons/bs";
import { QRCodeSVG } from 'qrcode.react';
import SettingMenu from './SettingMenu';
import '../styles/Header.css';
import { useTranslation } from 'react-i18next';
import Config from '../utils/config';

function Header({ tourId, count = null, userType = null }) {
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
    const style = () => {
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
    return (
        // <div className='containerHeader' style={style()}>
        <div className={`${count !== null ? 'container-header' : 'container-header-startguide'}`} style={style()} >
            {count !== null && <Participants count={count}></Participants>}

            <div className='rightMenu'>
                {userType === "Guide" && (
                    <div className='qrCode' onClick={openPopup}>
                        <BsQrCode className='icon' size={35} />
                        <span>{t('headerSettings.qrCode')}</span>
                    </div>
                )}

                <div className='selectLanguage'>
                    {/* <GrLanguage className='icon' size={24} /> */}
                    <SettingMenu></SettingMenu>
                    <span>{t('headerSettings.language')}</span>
                </div>
            </div>
            {openQRCode === true && tourId &&
                <div className="popup">
                    <div className="popup-content">
                        <span className="close-btn" style={{ border: '2px solid red', backgroundColor: 'red' }} onClick={closePopup}>&times;</span>
                        <div className='contentQR'>
                            <h3>{t('generateQRCodeLbl')}</h3>
                            <div className="select-container">
                            <select className='selectFile' style={{ border: "1px solid #C60226" }} value={selectedQR} onChange={handleQRSelectionChange}>
                                <option value="subSpeaker">{t('generateQRCodeOptions.subGuide')}</option>
                                <option value="listener">{t('generateQRCodeOptions.listener')}</option>
                            </select>
                            </div>
                            {selectedQR === 'subSpeaker' ? (
                                <>
                                    <div className='qrCodeContainer'>
                                        <div className="qrCodeContent">
                                            <QRCodeSVG value={`${Config.appSubSpeakerURL}/${tourId}`} size={256} level="H" />
                                        </div>
                                        <a className='link' target="_blank" rel="noopener noreferrer" style={{ color: 'red' }}
                                            href={`${Config.appSubGuideURL}/${tourId}`}
                                        >
                                            {t('scanQRCodeTxt.subGuide')}
                                        </a>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className='qrCodeContainer'>
                                        <div className="qrCodeContent">
                                            <QRCodeSVG value={`${Config.appViewerURL}/${tourId}`} size={256} level="H" />
                                        </div>
                                        <a className='link' target="_blank" rel="noopener noreferrer" style={{ color: 'red' }}
                                            href={`${Config.appViewerURL}/${tourId}`}
                                        >
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