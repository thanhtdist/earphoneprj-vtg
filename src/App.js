import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LiveViewer from './components/LiveViewer';
import LiveSubSpeaker from './components/LiveSubSpeaker';
import StartLiveSession from './components/StartLiveSession';
import ChatSetting from './components/ChatSetting';
import './styles/App.css';  // Importing the updated CSS for responsiveness
import '@aws-amplify/ui-react/styles.css';
function App() {
  return (
    <>
      <Router>
        <div className="App">
          {/* <SettingMenu></SettingMenu> */}
          <Routes>
            {/* <Route path="/" element={<StartLiveSession />} /> */}
            <Route path="/" element={<ChatSetting />} />
            <Route path="/main-guild" element={<StartLiveSession />} />
            <Route path="/sub-speaker" element={<LiveSubSpeaker />} />
            <Route path="/viewer" element={<LiveViewer />} />
          </Routes>
        </div>
      </Router>
    </>

  );
};

export default App;
