import React, { useState, useRef } from "react";
import { FaUpload, FaPlay, FaPause, FaTimes, FaFileAudio } from "react-icons/fa"; 
import "../styles/AudioUploadBox.css";

const AudioUploadBox = () => {
    const [voiceFileType, setVoiceFileType] = useState("instruction"); // Tracks the current voice type
    const [audioFiles, setAudioFiles] = useState({
        instruction: null,
        closingSpeech: null,
    }); // Tracks the audio file for each type
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    const handleVoiceFileTypeChange = (e) => {
        setVoiceFileType(e.target.value);
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith("audio")) {
            const fileURL = URL.createObjectURL(file);
            setAudioFiles((prevState) => ({
                ...prevState,
                [voiceFileType]: { name: file.name, url: fileURL },
            }));
        }
    };

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleRemoveFile = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setAudioFiles((prevState) => ({
            ...prevState,
            [voiceFileType]: null,
        }));
        setIsPlaying(false);
    };

    const currentAudioFile = audioFiles[voiceFileType];

    return (
        <>
            <h3>Play the voice file for</h3>
            <select value={voiceFileType} onChange={handleVoiceFileTypeChange}>
                <option value="instruction">Instruction</option>
                <option value="closingSpeech">Closing Speech</option>
            </select>
            <div className="audio-upload-container">
                {!currentAudioFile ? (
                    <label className="upload-box">
                        <FaUpload size={40} />
                        <input
                            type="file"
                            accept="audio/*"
                            onChange={handleFileUpload}
                            className="hidden-input"
                        />
                    </label>
                ) : (
                    <div className="audio-box">
                        <div className="icon-wrapper" onClick={handleRemoveFile}>
                            <FaTimes size={16} />
                        </div>
                        <div className="audio-content" onClick={handlePlayPause}>
                            <FaFileAudio size={40} className="audio-icon" />
                            <div className="play-pause-icon">
                                {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
                            </div>
                        </div>
                        <audio
                            ref={audioRef}
                            src={currentAudioFile.url}
                            onEnded={() => setIsPlaying(false)}
                        />
                    </div>
                )}
            </div>
        </>
    );
};

export default AudioUploadBox;
