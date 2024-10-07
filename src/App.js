import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LiveViewer from './LiveViewer'; 
import StartLiveSession from './StartLiveSession';
import './App.css';  // Importing the updated CSS for responsiveness
import '@aws-amplify/ui-react/styles.css';
function App() {
  return (
    <>
    <Router>
      <div className="App">
        <nav>
          <ul>
            <li>
              <a href="/host" target="_blank" rel="noopener noreferrer">
                Start as Host
              </a>
            </li>
            <li>
              <a href="/viewer" target="_blank" rel="noopener noreferrer">
                Join as Listener
              </a>
            </li>
          </ul>
        </nav>
        <Routes>
          <Route path="/host" element={<StartLiveSession />} /> 
          <Route path="/viewer" element={<LiveViewer />} /> 
        </Routes>
      </div>
    </Router>
    </>
    
  );
};

export default App;
