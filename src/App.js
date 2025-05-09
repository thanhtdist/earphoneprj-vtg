import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LiveViewer from './components/LiveViewer';
import StartLiveSession2 from './components/StartLiveSession2';
import LiveViewer2 from './components/LiveViewer2';
import LiveViewer3 from './components/LiveViewer3';
import LiveViewer4 from './components/LiveViewer4';
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
      <AuthProvider>
        <Router>
          <div className="App">
            {/* <SettingMenu></SettingMenu> */}
            <Routes>
              {/* Admin Router */}
              {/* <Route path="/admin" element={<ProtectedRoute element={<ListAdmin />} />} /> */}
              {/* <Route path="/admin" element={<ListAdmin />} /> */}
              {/* <Route path="/admin/login" element={<Login />} /> */}
              {/* <Route path="/admin/register" element={<RegisterAdmin />} /> */}
              {/* <Route path="/update_admin" element={<ProtectedRoute element={<UpdateAdmin />} />} /> */}
              {/* <Route path="/admin/update" element={<UpdateAdmin />} /> */}
              {/* Tour Router */}
              {/* <Route path="/admin/tour" element={<ProtectedRoute element={<ListTour />} />} /> */}
              {/* <Route path="/admin/tour" element={<ListTour />} /> */}
              {/* <Route path="/admin/tour" element={<ListTour />} /> */}
              {/* <Route path="/admin/tour/register" element={<ProtectedRoute element={<RegisterTour />} />} /> */}
              {/* <Route path="/admin/tour/register" element={<RegisterTour />} /> */}
              {/* <Route path="/admin/tour/update/" element={<UpdateTour />} /> */}
              {/* Puplic router */}
              <Route path="/" element={<StartFindTour />} />
              <Route path="/guide2/:tourId" element={<StartLiveSession2 />} />
              <Route path="/guide/:tourId" element={<StartLiveSession />} />
              <Route path="/sub-guide/:tourId" element={<LiveSubSpeaker />} />
              <Route path="/viewer/:tourId" element={<LiveViewer />} />
              <Route path="/viewer2/:tourId" element={<LiveViewer2 />} />
              <Route path="/viewer3/:tourId" element={<LiveViewer3 />} />
              <Route path="/viewer4/:tourId" element={<LiveViewer4 />} />
              {/* Wrap these routes with AdminLayout */}
              <Route path="/admin/login" element={<Login />} />
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<ListAdmin />} />
                <Route path="/admin/update" element={<UpdateAdmin />} />
                <Route path="/admin/register" element={<RegisterAdmin />} />
                <Route path="/admin/tour" element={<ListTour />} />
                <Route path="/admin/tour/update" element={<UpdateTour />} />
                <Route path="/admin/tour/register" element={<RegisterTour />} />
              </Route>

              {/* <Route element={<AdminLayout />}>
                <Route path="/admin" element={<ProtectedRoute element={<ListAdmin />} />} />
                <Route path="/admin/tour" element={<ProtectedRoute element={<ListTour />} />} />
                <Route path="/admin/tour/updatex" element={<UpdateTour />} />
              </Route> */}


            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </>

  );
};

export default App;
