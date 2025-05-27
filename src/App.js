import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LiveViewer from './components/LiveViewer';
import StartLiveSession2 from './components/StartLiveSession2';
import LiveViewer2 from './components/LiveViewer2';
import LiveViewer3 from './components/LiveViewer3';
import LiveViewer4 from './components/LiveViewer4';
import LiveViewer5 from './components/LiveViewer5';
import LiveViewer6 from './components/LiveViewer6';
import LiveViewer7 from './components/LiveViewer7';
import LiveViewerJa from './components/LiveViewerJa';
import LiveSubSpeaker from './components/LiveSubSpeaker';
import StartLiveSession from './components/StartLiveSession';
import StartFindTour from './components/StartFindTour';
import RegisterTour from './components/admin/tours/RegisterTour';
import ListTour from './components/admin/tours/ListTour';
import UpdateTour from './components/admin/tours/UpdateTour';
import './styles/App.css';  // Importing the updated CSS for responsiveness
import '@aws-amplify/ui-react/styles.css';
import RegisterAdmin from './components/admin/users/RegisterAdmin';
import ListAdmin from './components/admin/users/ListAdmin';
import UpdateAdmin from './components/admin/users/UpdateAdmin';
import Login from './components/admin/users/Login';
import AdminLayout from "./components/admin/commons/AdminLayout";
import { AuthProvider } from './components/admin/commons/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Config from './utils/config'; // Importing the configuration file
import NotFound from './components/NotFound'; // Importing the NotFound component

function App() {
  // Check if we're at the bare root URL
  const isRootUrl = window.location.pathname === '/';
  console.log("pathname: ", window.location.pathname);
  console.log("isRootUrl: ", isRootUrl);
  if (isRootUrl) return <NotFound />;
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Router basename={Config.subPath}>
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
            <Route path="/viewer7/:tourId" element={<LiveViewer7 />} />
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
