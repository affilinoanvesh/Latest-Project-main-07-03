import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log('ProtectedRoute: Current path:', location.pathname);
    console.log('ProtectedRoute: Auth state -', { isAuthenticated, loading });
  }, [isAuthenticated, loading, location]);

  // Show loading state while checking authentication
  if (loading) {
    console.log('ProtectedRoute: Still loading, showing spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-t-4 border-gray-200 rounded-full animate-spin border-t-indigo-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    // Save the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render the protected content
  console.log('ProtectedRoute: Authenticated, rendering protected content');
  return <Outlet />;
};

export default ProtectedRoute; 