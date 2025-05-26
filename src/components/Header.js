import React, { useState } from 'react';
import Participants from './Participants';
import { BsQrCode } from "react-icons/bs";
import { QRCodeSVG } from 'qrcode.react';
import SettingMenu from './SettingMenu';
import '../styles/Header.css';
import { useTranslation } from 'react-i18next';
import Config from '../utils/config';
import { getUserStyle } from "../utils/get-user-style";

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
    // This function should return a color based on the userType
    const pageColor = getUserStyle(userType);
    
    return (
        // <div className='containerHeader' style={style()}>
        <div className={`${count !== null ? 'container-header' : 'container-header-startguide'}`} style={{ 'color': pageColor }} >
            {count !== null && <Participants count={count}></Participants>}

            <div className='rightMenu'>
                {userType === "Guide" && (
                    <div className='qrCode' onClick={openPopup}>
                        <BsQrCode className='icon' size={30} />
                        {/* <span>{t('headerSettings.qrCode')}</span> */}
                        {/* <div className='qrText'>
                            <span>お客様用</span>
                            <span>QRコードを表示</span>
                        </div> */}
                        <div className='qrText' style={{ textAlign: "center" }}>
                            <span dangerouslySetInnerHTML={{ __html: t('headerSettings.qrCode') }} />
                        </div>
                    </div>
                )}

                <div className='selectLanguage'>
                    {/* <GrLanguage className='icon' size={24} /> */}
                    <SettingMenu></SettingMenu>
                    {/* <span>{t('headerSettings.language')}</span> */}
                    <span>Language</span>
                </div>
            </div>
            {openQRCode === true && tourId &&
                <div className="popup">
                    <div className="popup-content">
                        <span className="close-btn" style={{ border: '2px solid #C60226', backgroundColor: '#C60226' }} onClick={closePopup}>&times;</span>
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
                                            <QRCodeSVG value={`${Config.appSubGuideURL}/${tourId}`} size={256} level="H" />
                                        </div>
                                        <div style={{ textAlign: "center", fontWeight: "bold" }}>
                                            <a style={{ display: "unset" }} className='link' target="_blank" rel="noopener noreferrer"
                                                href={`${Config.appSubGuideURL}/${tourId}`}
                                            >
                                                {/* {t('scanQRCodeTxt.subGuide')} */}
                                                {/* <span>QRコードをサブガイドのスマートフォンで</span>
                                                <span>読み取ってください</span> */}
                                                <span dangerouslySetInnerHTML={{ __html: t('scanQRCodeTxt.subGuide') }} />
                                            </a>
                                        </div>

                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className='qrCodeContainer'>
                                        <div className="qrCodeContent">
                                            <QRCodeSVG value={`${Config.appViewerURL}/${tourId}`} size={256} level="H" />
                                        </div>
                                        <div style={{ textAlign: "center", fontWeight: "bold" }}>
                                            <a style={{ display: "unset" }} className='link' target="_blank" rel="noopener noreferrer"
                                                href={`${Config.appViewerURL}/${tourId}`}
                                            >
                                                {/* {t('scanQRCodeTxt.listener')} */}
                                                <span dangerouslySetInnerHTML={{ __html: t('scanQRCodeTxt.listener') }} />
                                                {/* <span>QRコードをリスナーのスマートフォンで</span>
                                            <span>読み取ってください</span> */}
                                            </a>
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