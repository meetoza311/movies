import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/common/States';
import { canAccessPath, roleHomePath } from '../utils/roles';

export function ProtectedRoute() {
  const { isAuthenticated, loading, admin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Skeleton className="h-24 w-full max-w-md" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!canAccessPath(admin?.role, location.pathname)) {
    return <Navigate to={roleHomePath(admin?.role)} replace />;
  }

  return <Outlet />;
}
