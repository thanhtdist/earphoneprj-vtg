// import React from 'react';
// import { CSVLink } from 'react-csv';

// const ExportCSV = ({ data, filename }) => {
//     const headers = Object.keys(data[0] || {}).map((key) => ({
//         label: key,
//         key: key,
//     }));

//     return (
//         <div>
//             <CSVLink data={data} headers={headers} filename={filename}>
//                 Export to CSV
//             </CSVLink>
//         </div>
//     );
// };

// export default ExportCSV;
import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function DownloadQRCode() {
  const qrRef = useRef();

  const downloadQRCode = () => {
    const url = qrRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <QRCodeCanvas
        ref={qrRef}
        value="https://your-tour-url.com"
        size={256}
        level="H"
      />
      <br />
      <button onClick={downloadQRCode}>Download QR Code</button>
    </div>
  );
}
