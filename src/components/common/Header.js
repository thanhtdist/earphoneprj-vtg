import React, { useState } from 'react';
import Participants from './Participants';
import { BsQrCode } from "react-icons/bs";
import { QRCodeSVG } from 'qrcode.react';
import SettingMenu from './SettingMenu';
import '../../styles/Header.css';
import { useTranslation } from 'react-i18next';
import Config from '../../utils/config';
import { getUserStyle } from "../../utils/getUserStyle";
import { Link } from 'react-router-dom';

function Header({ tourId, count = null, userType = null, subGuideFunctionAvailable = null }) {
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
    // This function should return a color based on the userType
    const pageColor = getUserStyle(userType);
    const appUrl = {
        guide: Config.appGuideURL(),
        subGuide: Config.appSubGuideURL(),
        viewer: Config.appViewerURL()
    }
    console.log("Viewer App URL: ", appUrl);

    return (
        <div className={`${count !== null ? 'container-header' : 'container-header-startguide'}`} style={{ 'color': pageColor, paddingTop: "10px" }} >
            {count !== null && <Participants count={count}></Participants>}

            <div className='rightMenu'>
                {userType === "Guide" && (
                    <div className='qrCode' onClick={openPopup}>
                        <BsQrCode className='icon' size={30} />
                        <div className='qrText' style={{ textAlign: "center" }}>
                            <span dangerouslySetInnerHTML={{ __html: t('headerSettings.qrCode') }} />
                        </div>
                    </div>
                )}

                <div className='selectLanguage'>
                    <SettingMenu></SettingMenu>
                    <span>Language</span>
                </div>
            </div>
            {openQRCode === true && tourId &&
                <div className="popup">
                    <div className="popup-content">
                        <span className="close-btn" style={{ border: '2px solid #C60226', backgroundColor: '#C60226' }} onClick={closePopup}>&times;</span>
                        <div className='contentQR'>
                            <h3>{t('generateQRCodeLbl')}</h3>
                            {subGuideFunctionAvailable && (
                                <div className="select-container">
                                    <select className='selectFile' style={{ border: "1px solid #C60226" }} value={selectedQR} onChange={handleQRSelectionChange}>
                                        <option value="subSpeaker">{t('generateQRCodeOptions.subGuide')}</option>
                                        <option value="listener">{t('generateQRCodeOptions.listener')}</option>
                                    </select>
                                </div>
                            )}

                            {selectedQR === 'subSpeaker' ? (
                                <>
                                    <div className='qrCodeContainer'>
                                        <div className="qrCodeContent">
                                            <QRCodeSVG value={`${appUrl.subGuide}/${tourId}`} size={256} level="H" />
                                        </div>                                        <div style={{ textAlign: "center", fontWeight: "bold" }}>
                                            <Link style={{ display: "unset" }} className='link' target="_blank" rel="noopener noreferrer"
                                                to={`${appUrl.subGuide}/${tourId}`}
                                            >
                                                <span dangerouslySetInnerHTML={{ __html: t('scanQRCodeTxt.subGuide') }} />
                                            </Link>
                                        </div>

                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className='qrCodeContainer'>
                                        <div className="qrCodeContent">
                                            <QRCodeSVG value={`${appUrl.viewer}/${tourId}`} size={256} level="H" />
                                        </div>                                        <div style={{ textAlign: "center", fontWeight: "bold" }}>
                                            <Link style={{ display: "unset" }} className='link' target="_blank" rel="noopener noreferrer"
                                                to={`${appUrl.viewer}/${tourId}`}
                                            >
                                                <span dangerouslySetInnerHTML={{ __html: t('scanQRCodeTxt.listener') }} />
                                            </Link>
                                        </div>

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