import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LiveViewer from './components/LiveViewer';
import StartLiveSession2 from './components/StartLiveSession2';
import LiveViewer2 from './components/LiveViewer2';
import LiveViewer3 from './components/LiveViewer3';
import LiveViewer4 from './components/LiveViewer4';
import LiveViewer5 from './components/LiveViewer5';
import LiveViewer6 from './components/LiveViewer6';
import LiveViewerJa from './components/LiveViewerJa';
import LiveSubSpeaker from './components/LiveSubSpeaker';
import StartLiveSession from './components/StartLiveSession';
import StartFindTour from './components/StartFindTour';
import RegisterTour from './components/admin/RegisterTour';
import ListTour from './components/admin/ListTour';
import UpdateTour from './components/admin/UpdateTour';
import './styles/App.css';  // Importing the updated CSS for responsiveness
import '@aws-amplify/ui-react/styles.css';
import RegisterAdmin from './components/admin/RegisterAdmin';
import ListAdmin from './components/admin/ListAdmin';
import UpdateAdmin from './components/admin/UpdateAdmin';
import Login from './components/admin/Login';
//import ProtectedRoute from './components/admin/auth/ProtectedRoute';
import AdminLayout from "./components/admin/AdminLayout";
import { AuthProvider } from './components/admin/auth/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
function App() {
  return (
    <>      
      <ToastContainer position="top-right" autoClose={3000} />
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes - Not wrapped by AuthProvider */}
            <Route path="/" element={<StartFindTour />} />
            <Route path="/guide2/:tourId" element={<StartLiveSession2 />} />
            <Route path="/guide/:tourId" element={<StartLiveSession />} />
            <Route path="/sub-guide/:tourId" element={<LiveSubSpeaker />} />
            <Route path="/viewer/:tourId" element={<LiveViewer />} />
            <Route path="/viewer2/:tourId" element={<LiveViewer2 />} />
            <Route path="/viewer3/:tourId" element={<LiveViewer3 />} />
            <Route path="/viewer4/:tourId" element={<LiveViewer4 />} />
            <Route path="/viewer5/:tourId" element={<LiveViewer5 />} />
            <Route path="/viewer6/:tourId" element={<LiveViewer6 />} />
            <Route path="/viewer_ja/:tourId" element={<LiveViewerJa />} />
            <Route path="/admin/login" element={<Login />} />

            {/* Admin routes - Wrapped by AuthProvider */}
            <Route path="/admin/*" element={
              <AuthProvider>
                <Routes>
                  <Route element={<AdminLayout />}>
                    <Route path="" element={<ListAdmin />} />
                    <Route path="update" element={<UpdateAdmin />} />
                    <Route path="register" element={<RegisterAdmin />} />
                    <Route path="tour" element={<ListTour />} />
                    <Route path="tour/update" element={<UpdateTour />} />
                    <Route path="tour/register" element={<RegisterTour />} />
                  </Route>
                </Routes>
              </AuthProvider>
            } />
          </Routes>
        </div>
      </Router>
    </>
  );
};

export default App;
