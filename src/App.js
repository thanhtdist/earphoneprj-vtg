import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LiveViewer from './components/LiveViewer'; 
import StartLiveSession from './components/StartLiveSession';
import './styles/App.css';  // Importing the updated CSS for responsiveness
import '@aws-amplify/ui-react/styles.css';
function App() {
  return (
    <>
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<StartLiveSession />} /> 
          <Route path="/viewer" element={<LiveViewer />} /> 
        </Routes>
      </div>
    </Router>
    </>
    
  );
};

export default App;
