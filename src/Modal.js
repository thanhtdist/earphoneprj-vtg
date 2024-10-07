import React from 'react';
import './Modal.css'; // Import the CSS for modal styling

const Modal = ({ isOpen, onClose, audioOutputDevices, selectedAudioOutput, handleAudioOutputChange }) => {
  if (!isOpen) return null; // Don't render anything if the modal is not open

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Select Speaker Output</h2>
        <div className="speaker-selection">
          <label>Select Speaker:</label>
          <select value={selectedAudioOutput} onChange={handleAudioOutputChange}>
            {audioOutputDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
        <button className="close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default Modal;
