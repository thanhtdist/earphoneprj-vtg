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
import ListAdmin from './components/admin/ListAdmin';
import UpdateAdmin from './components/admin/UpdateAdmin';
import Login from './components/admin/Login';
//import ProtectedRoute from './components/admin/auth/ProtectedRoute';
import { AuthProvider } from './components/admin/auth/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <AuthProvider>
        <Router>
          <div className="App">
            {/* <SettingMenu></SettingMenu> */}
            <Routes>
              {/* <Route path="/" element={<StartLiveSession />} /> */}
              <Route path="/admin/login" element={<Login />} />
              <Route path="/update_admin" element={<UpdateAdmin />} />
              {/* <Route path="/update_admin" element={<ProtectedRoute element={<UpdateAdmin />} />} /> */}
              <Route path="/admin" element={<ListAdmin />} />
              <Route path="/register_admin" element={<RegisterAdmin />} />
              <Route path="/tour_detail" element={<EditTour />} />
              <Route path="/admin/tour_list" element={<ListTour />} />
              {/* <Route path="/admin/tour_list" element={<ProtectedRoute element={<ListTour />} />} /> */}
              <Route path="/tour_register" element={<TourCreation />} />
              <Route path="/" element={<StartMainGuide />} />
              <Route path="/guide" element={<StartLiveSession />} />
              <Route path="/sub-speaker" element={<LiveSubSpeaker />} />
              <Route path="/viewer" element={<LiveViewer />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </>

  );
};

export default App;
