// PrivateRoute.js
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};