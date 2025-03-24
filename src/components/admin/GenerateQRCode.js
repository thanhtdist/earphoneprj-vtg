import React, { useState, useRef } from 'react';
import { 
    //QRCodeSVG, 
    QRCodeCanvas } from 'qrcode.react';
import Config from '../../utils/config'; // Adjust the import path as needed
import { FaRegCopy } from "react-icons/fa"; // Copy & double tick icons
import { LiaCheckDoubleSolid } from "react-icons/lia";
import { PiDownloadSimpleLight } from "react-icons/pi";

const GenerateQRCode = ({ meetingId, channelId, userId = null, chatSetting = null }) => {
    const qrRef = useRef();
    const [copied, setCopied] = useState(false);
    const urlToCopy = `${Config.appSpeakerURL}?meetingId=${meetingId}&channelId=${channelId}&chatSetting=${chatSetting}`;
    // Copy URL to clipboard
    const handleCopy = () => {
        navigator.clipboard.writeText(urlToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 sec
        });
    };

    // Download QR code as SVG
    // const handleDownloadQRCode = () => {
    //     const svgData = new XMLSerializer().serializeToString(qrRef.current);
    //     const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    //     const url = URL.createObjectURL(blob);
    //     const link = document.createElement("a");
    //     link.href = url;
    //     link.download = "qrcode.svg";
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    // };

    const handleDownloadQRCode = () => {
        const url = qrRef.current.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = "qrcode.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

    return (
        <div className="form-group row mb-3">
            <div className="col-sm-3">
                <div className="qrCodeContent mb-3" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    {/* <QRCodeSVG
                        ref={qrRef}
                        value={`${Config.appSpeakerURL}?meetingId=${meetingId}&channelId=${channelId}&chatSetting=${chatSetting}`}
                        size={256}
                        level="H" /> */}
                    
                    <QRCodeCanvas
                        ref={qrRef}
                        value={`${Config.appSpeakerURL}?meetingId=${meetingId}&channelId=${channelId}&chatSetting=${chatSetting}`}
                        size={256}
                        level="H"
                    />
                </div>
                <span
                    onClick={handleDownloadQRCode}
                    style={{ cursor: "pointer", border: "none", background: "none", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <PiDownloadSimpleLight size={20} color="rgb(13, 110, 253)" />
                    <span style={{ marginLeft: "5px", color: "rgb(13, 110, 253)" }}>
                        ダウンロード
                    </span>
                </span>
            </div>
            <div className="col-sm-9">
                <div className="mb-2">
                    <span style={{ "marginRight": "50px" }}>共有用URL</span>
                    <span
                        onClick={handleCopy}
                        style={{ cursor: "pointer", border: "none", background: "none" }}
                    >
                        {copied ? <LiaCheckDoubleSolid size={20} color="rgb(13, 110, 253)" /> : <FaRegCopy size={20} color="rgb(13, 110, 253)" />}
                        <span style={{ marginLeft: "5px", color: "rgb(13, 110, 253)" }}>
                            {copied ? "コピーしました" : "コピー"} {/* Change text dynamically */}
                        </span>
                    </span>
                </div>

                <textarea
                    className="form-control"
                    rows="2"
                    value={`${Config.appSpeakerURL}?meetingId=${meetingId}&channelId=${channelId}&chatSetting=${chatSetting}`}
                    readOnly
                />
            </div>
        </div>
    );
};

export default GenerateQRCode;