import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LiveViewer from './components/LiveViewer';
import LiveSubSpeaker from './components/LiveSubSpeaker';
import StartLiveSession from './components/StartLiveSession';
import StartMainGuide from './components/StartMainGuide';
import TourCreation from './components/admin/TourCreation';
import ListTour from './components/admin/ListTour';
import EditTour from './components/admin/EditTour';
import './styles/App.css';  // Importing the updated CSS for responsiveness
import '@aws-amplify/ui-react/styles.css';
import RegisterAdmin from './components/admin/RegisterAdmin';
import DownloadQRCode from './components/admin/DownloadQRCode';
function App() {
  return (
    <>
      <Router>
        <div className="App">
          {/* <SettingMenu></SettingMenu> */}
          <Routes>
            {/* <Route path="/" element={<StartLiveSession />} /> */}
            <Route path="/export_qrcode" element={<DownloadQRCode />} />
            <Route path="/register_admin" element={<RegisterAdmin />} />
            <Route path="/tour_detail" element={<EditTour />} />
            <Route path="/tour_list" element={<ListTour />} />
            <Route path="/tour_register" element={<TourCreation />} />
            <Route path="/" element={<StartMainGuide />} />
            <Route path="/guide" element={<StartLiveSession />} />
            <Route path="/sub-speaker" element={<LiveSubSpeaker />} />
            <Route path="/viewer" element={<LiveViewer />} />
          </Routes>
        </div>
      </Router>
    </>

  );
};

export default App;
