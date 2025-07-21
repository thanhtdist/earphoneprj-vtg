import React, { useEffect, useState } from 'react';
import { GrDocumentPdf } from "react-icons/gr";
import { viewPresignedUrl } from '../../apis/api'; // Assuming this is the correct path to your API function
import '../../styles/ChatAttachment.css';

export const ChatAttachment = ({ fileKey, name, type, size = 0 }) => {
    const [url, setUrl] = useState(null);

    const isImage = type?.startsWith('image/');
    const isPDF = type === 'application/pdf';

    useEffect(() => {
        if (!fileKey) return;
        const fetchSignedUrl = async () => {
            try {
                const viewPresignedUrlResponse = await viewPresignedUrl({
                    fileKey: fileKey
                });
                console.log('Received signed URL:', viewPresignedUrlResponse.data.url);
                setUrl(viewPresignedUrlResponse.data.url); // CloudFront signed URL
            } catch (error) {
                console.error('Failed to fetch signed URL:', error);
            }
        };
        fetchSignedUrl();
    }, [fileKey]);

    if (!url) return <div className="attachment-loading">Loading...</div>;

    return (
        <div className="attachment-container">
            {isImage && (
                <a href={url} target="_blank" rel="noopener noreferrer" download className="attachment-link">
                    <img src={url} alt={name} className="attachment-image" />
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
