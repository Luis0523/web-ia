import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="empty">Cargando sesion...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
