import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const location = useLocation();

  if (!token) return <Navigate to="/" replace />;

  if (user?.role === 'waiter' && !location.pathname.startsWith('/dashboard/orders')) {
    return <Navigate to="/dashboard/orders" replace />;
  }

  if (user?.role === 'delivery' && !location.pathname.startsWith('/dashboard/delivery')) {
    return <Navigate to="/dashboard/delivery" replace />;
  }

  return children;
};

export default PrivateRoute;