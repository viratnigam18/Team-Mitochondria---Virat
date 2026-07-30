import { Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome.jsx';
import DoctorLogin from './pages/DoctorLogin.jsx';
import DoctorSignup from './pages/DoctorSignup.jsx';
import PatientLogin from './pages/PatientLogin.jsx';
import PatientSignup from './pages/PatientSignup.jsx';
import DoctorDashboard from './pages/DoctorDashboard.jsx';
import PatientDashboard from './pages/PatientDashboard.jsx';
import TriageChat from './pages/TriageChat.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Welcome />} />
      <Route path="/doctor/login" element={<DoctorLogin />} />
      <Route path="/doctor/signup" element={<DoctorSignup />} />
      <Route path="/patient/login" element={<PatientLogin />} />
      <Route path="/patient/signup" element={<PatientSignup />} />

      {/* Protected routes — dashboard team will wire auth guard later */}
      <Route
        path="/doctor/dashboard"
        element={
          <ProtectedRoute>
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/dashboard"
        element={
          <ProtectedRoute>
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/triage"
        element={
          <ProtectedRoute>
            <TriageChat />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
