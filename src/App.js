import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LiveViewer from './components/viewer/LiveViewer';
import LiveViewerJa from './components/viewer/LiveViewerJa';
import LiveSubSpeaker from './components/guide/LiveSubSpeaker';
import StartLiveSession from './components/guide/StartLiveSession';
import StartFindTour from './components/guide/StartFindTour';
import RegisterTour from './components/admin/tours/RegisterTour';
import ListTour from './components/admin/tours/ListTour';
import UpdateTour from './components/admin/tours/UpdateTour';
import './styles/App.css';  // Importing the updated CSS for responsiveness
import '@aws-amplify/ui-react/styles.css';
import RegisterAdmin from './components/admin/users/RegisterAdmin';
import ListAdmin from './components/admin/users/ListAdmin';
import UpdateAdmin from './components/admin/users/UpdateAdmin';
import Login from './components/admin/users/Login';
import AdminLayout from "./components/admin/common/AdminLayout";
import { AuthProvider } from './components/admin/common/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Config from './utils/config'; // Importing the configuration file
//import NotFound from './components/NotFound'; // Importing the NotFound component

function App() {
  // Check if we're at the bare root URL
  // const isRootUrl = window.location.pathname === '/';
  // console.log("pathname: ", window.location.pathname);
  // console.log("isRootUrl: ", isRootUrl);
  // if (isRootUrl) return <NotFound />;
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Router basename={Config.subPath}>
        <div className="App">
          <Routes>
            {/* Public routes - Not wrapped by AuthProvider */}
            <Route path="/" element={<StartFindTour />} />
            <Route path="/guide/:tourId" element={<StartLiveSession />} />
            <Route path="/sub-guide/:tourId" element={<LiveSubSpeaker />} />
            <Route path="/viewer/:tourId" element={<LiveViewer />} />
            <Route path="/viewer_ja/:tourId" element={<LiveViewerJa />} />

            {/* Admin routes - Wrapped by AuthProvider */}
            <Route path="/admin/*" element={
              <AuthProvider>
                <Routes>
                  <Route path="login" element={<Login />} />
                  <Route element={<AdminLayout />}>
                    <Route path="" element={<ListAdmin />} />
                    <Route path="/:userId" element={<UpdateAdmin />} />
                    <Route path="register" element={<RegisterAdmin />} />
                    <Route path="tour" element={<ListTour />} />
                    <Route path="tour/:tourId" element={<UpdateTour />} />
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
