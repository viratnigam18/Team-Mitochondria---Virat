import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/**
 * ProtectedRoute — guards routes behind authentication.
 *
 * Props:
 *   requiredRole — optional, 'doctor' or 'patient'. If set, redirects
 *                  users with the wrong role to their own dashboard.
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="spinner"
          style={{
            borderTopColor: 'var(--primary-500)',
            borderColor: 'var(--surface-200)',
          }}
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Role-based redirect: if doctor tries to access patient route, send them back
  if (requiredRole && role !== requiredRole) {
    const redirectPath =
      role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
