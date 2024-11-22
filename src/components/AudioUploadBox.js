import React, { useState, useRef } from "react";
import { FaUpload, FaPlay, FaPause, FaTimes, FaFile } from "react-icons/fa";
import "../styles/AudioUploadBox.css";
import { uploadFileToS3 } from '../services/S3Service';

const AudioUploadBox = ({ meetingSession, logger }) => {
    console.log('meetingSession zzz:', meetingSession);
    console.log('logger zzz:', logger);
    const [voiceFileType, setVoiceFileType] = useState("instruction"); // Tracks the current voice type
    const [uploading, setUploading] = useState(false); // Tracks upload state
    const [audioFiles, setAudioFiles] = useState({
        instruction: null,
        closingSpeech: null,
    }); // Tracks the audio file for each type
    const [isPlaying, setIsPlaying] = useState(false);
    const audioElementRef = useRef(null);
    const audioContextRef = useRef(null);
    const mediaElementSourceRef = useRef(null);

    const handleVoiceFileTypeChange = (e) => {
        setVoiceFileType(e.target.value);
        if (audioElementRef.current) {
            audioElementRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith("audio")) {
            setUploading(true); // Start uploading
            // const fileURL = URL.createObjectURL(file);
            try {
                // store attachment into S3
                const uploadFileToS3Response = await uploadFileToS3(file);
                console.log('Voice file uploaded successfully:', uploadFileToS3Response);
                //const fileUrl = uploadFileToS3Response.Location;
                setAudioFiles((prevState) => ({
                    ...prevState,
                    [voiceFileType]: { name: file.name, url: uploadFileToS3Response.Location },
                }));
                setUploading(false); // Stop uploading
            } catch (error) {
                console.error('Error uploading voice file:', error);
                setUploading(false); // Stop uploading
            }

        }
    };

    // const applyAudioTransformations = (audioElement) => {
    //   const audioContext = new AudioContext();

    //   // Create a media element source node from the MP3 file
    //   const mediaElementSource = audioContext.createMediaElementSource(audioElement);

    //   // Apply gain (volume adjustment)
    //   const gainNode = audioContext.createGain();
    //   gainNode.gain.value = 1.2; // Increase volume by 20%

    //   // Connect the nodes (source -> gain -> destination)
    //   mediaElementSource.connect(gainNode).connect(audioContext.destination);

    //   console.log("Audio transformations applied:", gainNode);

    //   return gainNode;
    // };

    const playVoiceAudio = async (fileUrl) => {
        try {
            if (!audioElementRef.current) {
                // Create and configure the audio element
                const audioElement = new Audio(fileUrl);
                audioElement.crossOrigin = "anonymous";

                // Apply transformations
                //applyAudioTransformations(audioElement);

                // Assign to ref
                audioElementRef.current = audioElement;
                // Create AudioContext and connect to media element source
                //const audioContext = new AudioContext();
                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioContext();
                }
                if (!mediaElementSourceRef.current) {

                    mediaElementSourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
                    const destination = audioContextRef.current.createMediaStreamDestination();
                    mediaElementSourceRef.current.connect(destination);

                    // Apply transformations (e.g., gain, filters) to the MP3 stream
                    // Apply gain (volume adjustment)
                    const gainNode = audioContextRef.current.createGain();
                    gainNode.gain.value = 1.2; // Increase volume by 20%
                    // Connect the nodes: source -> gain -> destination
                    mediaElementSourceRef.current.connect(gainNode).connect(audioContextRef.current.destination);

                    // Get the MP3 stream
                    const mp3Stream = destination.stream;
                    console.log("MP3 stream: ", mp3Stream);
                    logger.info("MP3 stream: " + JSON.stringify(mp3Stream));

                    // Start broadcasting the MP3 file to the Chime meeting
                    await meetingSession.audioVideo.startAudioInput(mp3Stream);
                }

            }

            // Play the audio for the users to hear
            await audioElementRef.current.play();
        } catch (error) {
            console.error("Error playing voice audio:", error);
            logger.error("Error playing voice audio:", JSON.stringify(error));
        }
    };


    const handlePlayPause = async () => {
        const currentAudioFile = audioFiles[voiceFileType];
        if (currentAudioFile) {
            if (isPlaying) {
                // Pause the audio
                audioElementRef.current.pause();
                setIsPlaying(false);
            } else {
                // Play the audio
                await playVoiceAudio(currentAudioFile.url);
                setIsPlaying(true);
            }
        }
    };

    const handleRemoveFile = () => {
        console.log('handleRemoveFile');
        // // Pause the audio if it's playing
        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current = null;
        }

        // Reset the audio files state for the current voice type
        setAudioFiles((prevState) => ({
            ...prevState,
            [voiceFileType]: null, // Remove the current audio file
        }));

        // Reset the playing state to false
        setIsPlaying(false);
    };

    const currentAudioFile = audioFiles[voiceFileType];
    console.log('currentAudioFile:', currentAudioFile);

    return (
        <>
            <h3>Play the voice file for</h3>
            <select value={voiceFileType} onChange={handleVoiceFileTypeChange}>
                <option value="instruction">Instruction</option>
                <option value="closingSpeech">Closing Speech</option>
            </select>
            <div className="audio-upload-container">
                {uploading ? (
                    <p>Uploading...</p>
                ) : currentAudioFile ? (
                    <div className="audio-box">
                        <div
                            className="icon-wrapper"
                            onClick={handleRemoveFile} // Ensure the click event is attached here
                        >
                            <FaTimes size={16} />
                        </div>
                        <div className="audio-content">
                            <FaFile size={60} className="audio-icon" />
                            <div
                                className="play-pause-icon"
                                onClick={handlePlayPause}
                                style={{ zIndex: 10 }} // Ensure play/pause icon is above the file icon
                            >
                                {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
                            </div>
                        </div>
                    </div>
                ) : (
                    <label className="upload-box">
                        <FaUpload size={60} />
                        <input
                            type="file"
                            accept="audio/mp3, audio/*"
                            onChange={handleFileUpload}
                            className="hidden-input"
                        />
                    </label>
                )}
            </div>
            {currentAudioFile && (<p><a target="_blank" rel="noopener noreferrer" href={currentAudioFile.url} style={{ color: "green" }}>{currentAudioFile.name}</a></p>)}
        </>
    );
};

export default AudioUploadBox;
