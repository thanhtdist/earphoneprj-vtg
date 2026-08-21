import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    QRCodeCanvas
} from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Config from '../../../utils/config'; // Adjust the import path as needed
import { FaRegCopy } from "react-icons/fa"; // Copy & double tick icons
import { LiaCheckDoubleSolid } from "react-icons/lia";
import { PiDownloadSimpleLight, PiPrinterLight } from "react-icons/pi";

const GenerateQRCode = ({ tourId, tourNumber = null, courseName = null, channelId = null, userId = null, chatRestriction = null }) => {
    const qrRef = useRef();
    const printSectionRef = useRef();
    const templateQrRef = useRef();
    const [copied, setCopied] = useState(false);
    const [templateQrImage, setTemplateQrImage] = useState(null);
    const appGuideURL = Config.appGuideURL(); // Assuming this is the base URL for your app
    const urlToCopy = `${appGuideURL}/${tourId}`; // Adjusted URL for QR code

    // Snapshot the high-res template QR canvas to a PNG once it's mounted/updated.
    // The print/PDF sheet uses this <img> instead of the live <canvas> directly,
    // because html2canvas ignores the CSS-imposed size on <canvas> elements and
    // captures them at their native pixel resolution, blowing up the QR in the PDF.
    useEffect(() => {
        if (templateQrRef.current) {
            setTemplateQrImage(templateQrRef.current.toDataURL("image/png"));
        }
    }, [urlToCopy]);
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

    // Download QR code as PDF. Captures the same .qr-print-section sheet used
    // for printing (via html2canvas, so Japanese text renders with the browser's
    // font) so the PDF and the printed sheet always share one layout.
    const handleDownloadPDF = async () => {
        const canvas = await html2canvas(printSectionRef.current, { scale: 2, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        // Fixed physical width (not stretched to the page) so the QR code inside
        // ends up roughly the same ~40mm size as the printed sheet, instead of
        // being blown up to fill most of the page.
        const imgWidth = 100;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, "PNG", (pageWidth - imgWidth) / 2, 20, imgWidth, imgHeight);
        doc.save("qrcode.pdf");
    };

    // Print via the browser's native print dialog (which also offers "Save as PDF").
    // Toggles a body class so the print stylesheet in App.css can hide everything
    // else on the admin page and show only the .qr-print-section sheet.
    const handlePrint = () => {
        document.body.classList.add("printing-qr");
        const cleanup = () => {
            document.body.classList.remove("printing-qr");
            window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
        window.print();
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
                <div className="mb-3" style={{ display: "flex", flexWrap: "nowrap", alignItems: "center" }}>
                    <div className="dropdown qr-save-dropdown d-inline-block me-3" style={{ flexShrink: 0 }}>
                        <button
                            type="button"
                            className="dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            style={{ cursor: "pointer", border: "none", background: "none", padding: 0, display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", color: "rgb(13, 110, 253)" }}
                        >
                            <PiDownloadSimpleLight size={18} style={{ marginRight: "5px" }} />
                            保存
                        </button>
                        <ul className="dropdown-menu">
                            <li>
                                <button type="button" className="dropdown-item" onClick={handleDownloadQRCode}>
                                    PNGとして保存
                                </button>
                            </li>
                            <li>
                                <button type="button" className="dropdown-item" onClick={handleDownloadPDF}>
                                    PDFとして保存
                                </button>
                            </li>
                        </ul>
                    </div>
                    <button
                        type="button"
                        onClick={handlePrint}
                        style={{ cursor: "pointer", border: "none", background: "none", padding: 0, display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flexShrink: 0, color: "rgb(13, 110, 253)" }}
                    >
                        <PiPrinterLight size={18} style={{ marginRight: "5px" }} />
                        印刷
                    </button>
                </div>
                {/* Shared sheet for both Print and PDF, portalled to document.body so
                    it's a direct sibling of the app root rather than nested inside the
                    form. That way "hide everything else" during print only needs to
                    hide the root, without fighting a hidden ancestor further up. */}
                {/* High-res source canvas for the print/PDF sheet, never shown itself. */}
                <QRCodeCanvas
                    ref={templateQrRef}
                    value={urlToCopy}
                    size={512}
                    level="H"
                    style={{ display: "none" }}
                />
                {createPortal(
                    <div ref={printSectionRef} className="qr-print-section">
                        {courseName && <div className="qr-print-title">{courseName}</div>}
                        {tourNumber && <div className="qr-print-tour-number">{`ツアー番号: ${tourNumber}`}</div>}
                        <div className="qr-print-caption">ガイド用QRコード</div>
                        {templateQrImage && (
                            <img src={templateQrImage} alt="QR code" className="qr-print-code" />
                        )}
                        <div className="qr-print-url">{urlToCopy}</div>
                    </div>,
                    document.body
                )}
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
