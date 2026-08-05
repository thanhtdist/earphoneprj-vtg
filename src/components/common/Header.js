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

// Colors used to tell the two QR codes apart, each one matches the color of
// the page the person who scans it lands on
const QR_COLORS = {
    listener: getUserStyle('User'),
    subSpeaker: getUserStyle('Sub-Guide'),
};

function Header({ tourId, count = null, userType = null, subGuideFunctionAvailable = null }) {
    const { t } = useTranslation();
    const [openQRCode, setOpenQRCode] = useState(false);
    const [selectedQR, setSelectedQR] = useState('listener');
    // Open the popup directly on the QR code of the button that was pressed
    const openPopup = (qrType) => {
        setSelectedQR(qrType);
        setOpenQRCode(true);
    }
    const closePopup = () => {
        setOpenQRCode(false);
    }
    // This function should return a color based on the userType
    const pageColor = getUserStyle(userType);
    const appUrl = {
        guide: Config.appGuideURL(),
        subGuide: Config.appSubGuideURL(),
        viewer: Config.appViewerURL()
    }
    console.log("Viewer App URL: ", appUrl);

    const isSubGuideQR = selectedQR === 'subSpeaker';
    const qrColor = isSubGuideQR ? QR_COLORS.subSpeaker : QR_COLORS.listener;
    const qrValue = isSubGuideQR ? `${appUrl.subGuide}/${tourId}` : `${appUrl.viewer}/${tourId}`;

    return (
        <div className={`${count !== null ? 'container-header' : 'container-header-startguide'}`} style={{ 'color': pageColor, paddingTop: "10px" }} >
            {count !== null && <Participants count={count}></Participants>}

            <div className='rightMenu'>
                {userType === "Guide" && (
                    <>
                        <div
                            className='qrCode'
                            style={{ backgroundColor: QR_COLORS.listener, borderColor: QR_COLORS.listener }}
                            onClick={() => openPopup('listener')}
                        >
                            <BsQrCode className='icon' size={26} />
                            <div className='qrText'>
                                <span dangerouslySetInnerHTML={{ __html: t('headerSettings.qrCodeListener') }} />
                            </div>
                        </div>
                        {subGuideFunctionAvailable && (
                            <div
                                className='qrCode'
                                style={{ backgroundColor: QR_COLORS.subSpeaker, borderColor: QR_COLORS.subSpeaker }}
                                onClick={() => openPopup('subSpeaker')}
                            >
                                <BsQrCode className='icon' size={26} />
                                <div className='qrText'>
                                    <span dangerouslySetInnerHTML={{ __html: t('headerSettings.qrCodeSubGuide') }} />
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className='selectLanguage'>
                    <SettingMenu></SettingMenu>
                    <span>Language</span>
                </div>
            </div>
            {openQRCode === true && tourId &&
                <div className="popup">
                    <div className="popup-content">
                        <span className="close-btn" style={{ border: `2px solid ${qrColor}`, backgroundColor: qrColor }} onClick={closePopup}>&times;</span>
                        <div className='contentQR'>
                            <h3 style={{ color: qrColor }}>
                                {isSubGuideQR ? t('generateQRCodeOptions.subGuide') : t('generateQRCodeOptions.listener')}
                            </h3>
                            <div className='qrCodeContainer'>
                                <div className="qrCodeContent">
                                    <QRCodeSVG value={qrValue} size={256} level="H" />
                                </div>
                                <div style={{ textAlign: "center", fontWeight: "bold" }}>
                                    <Link style={{ display: "unset", color: qrColor }} className='link' target="_blank" rel="noopener noreferrer"
                                        to={qrValue}
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: isSubGuideQR ? t('scanQRCodeTxt.subGuide') : t('scanQRCodeTxt.listener') }} />
                                    </Link>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            }</div>



    );
};

export default Header;
