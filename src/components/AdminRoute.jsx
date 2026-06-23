import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route wrapper that ensures the logged-in user is an administrator.
 * If not authenticated, redirects to /login.
 * If authenticated but not admin (e.g. teacher), redirects to /dashboard.
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Verifying access...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    // Redirect non-admins (e.g., teachers) to the regular dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
