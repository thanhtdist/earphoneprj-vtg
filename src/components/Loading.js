import React from 'react';
import '../styles/Loading.css'; // Import the CSS file

const Loading = () => {
  return (
    <div className="loading-overlay">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
};

export default Loading;