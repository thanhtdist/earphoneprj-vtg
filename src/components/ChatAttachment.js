import React from 'react';
import { GrDocumentPdf } from "react-icons/gr";
import '../styles/ChatAttachment.css';

/**
 * Component to display the chat attachment
 * @param {string} url - S3 URL of the attachment 
 * @param {string} fileKey - S3 file key of the attachment
 * @param {string} name - Name of the attachment
 * @param {string} type - Type of the attachment
 * @param {number} size - Size of the attachment
 * @returns 
 */
export const ChatAttachment = ({ url, fileKey, name, type, size = 0 }) => {
    console.log('Attachment details:', { url, fileKey, name, type, size });

    const isImage = type.startsWith('image/');
    const isPDF = type === 'application/pdf';

    return (
        <div className="attachment-container">
            {isImage && (
                <a href={url} target="_blank" rel="noopener noreferrer" download className="attachment-link">
                    <img
                        src={url}
                        alt={name}
                        className="attachment-image"
                    />
                </a>
            )}
            {isPDF && (
                <a href={url} target="_blank" rel="noopener noreferrer" download className="attachment-link">
                    <GrDocumentPdf size={24} className="attachment-icon pdf-icon" />
                    <span className="attachment-name">{name}</span>
                </a>
            )}
        </div>
    );
};

export default ChatAttachment;
