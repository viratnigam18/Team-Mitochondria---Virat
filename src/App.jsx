import { Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome.jsx';
import DoctorLogin from './pages/DoctorLogin.jsx';
import DoctorSignup from './pages/DoctorSignup.jsx';
import PatientLogin from './pages/PatientLogin.jsx';
import PatientSignup from './pages/PatientSignup.jsx';
import DoctorDashboard from './pages/DoctorDashboard.jsx';
import DoctorProfile from './pages/DoctorProfile.jsx';
import PatientDashboard from './pages/PatientDashboard.jsx';
import TriageChat from './pages/TriageChat.jsx';
import PatientProfile from './pages/PatientProfile.jsx';
import Messages from './pages/Messages.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Welcome />} />
      <Route path="/doctor/login" element={<DoctorLogin />} />
      <Route path="/doctor/signup" element={<DoctorSignup />} />
      <Route path="/patient/login" element={<PatientLogin />} />
      <Route path="/patient/signup" element={<PatientSignup />} />

      {/* Doctor routes */}
      <Route path="/doctor/dashboard" element={<ProtectedRoute requiredRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/doctor/profile" element={<ProtectedRoute requiredRole="doctor"><DoctorProfile /></ProtectedRoute>} />

      {/* Patient routes */}
      <Route path="/patient/dashboard" element={<ProtectedRoute requiredRole="patient"><PatientDashboard /></ProtectedRoute>} />
      <Route path="/patient/profile" element={<ProtectedRoute requiredRole="patient"><PatientProfile /></ProtectedRoute>} />

      {/* Shared messaging route */}
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

      {/* Triage — patients only */}
      <Route path="/triage" element={<ProtectedRoute requiredRole="patient"><TriageChat /></ProtectedRoute>} />
    </Routes>
  );
}
