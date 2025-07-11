import React, { useState, useRef } from 'react';
import {
    //QRCodeSVG, 
    QRCodeCanvas
} from 'qrcode.react';
import Config from '../../../utils/config'; // Adjust the import path as needed
import { FaRegCopy } from "react-icons/fa"; // Copy & double tick icons
import { LiaCheckDoubleSolid } from "react-icons/lia";
import { PiDownloadSimpleLight } from "react-icons/pi";

const GenerateQRCode = ({ tourId, channelId = null, userId = null, chatRestriction = null }) => {
    const qrRef = useRef();
    const [copied, setCopied] = useState(false);
    const appGuideURL = Config.appGuideURL(); // Assuming this is the base URL for your app
    const urlToCopy = `${appGuideURL}/${tourId}`; // Adjusted URL for QR code
    // Copy URL to clipboard
    const handleCopy = () => {
        navigator.clipboard.writeText(urlToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 sec
        });
    };

    // Download QR code as image(png)
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
                <div className="qrCodeContent mb-3" style={{ display: "flex", justifyContent: "start", alignItems: "start" }}>
                    <QRCodeCanvas
                        ref={qrRef}
                        value={`${appGuideURL}/${tourId}`}
                        size={128}
                        level="H"
                    />
                </div>
                <span
                    onClick={handleDownloadQRCode}
                    style={{ cursor: "pointer", border: "none", background: "none", display: "flex", justifyContent: "start", alignItems: "start" }}>
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
                    value={`${appGuideURL}/${tourId}`}
                    readOnly
                />
            </div>
        </div>
    );
};

export default GenerateQRCode;