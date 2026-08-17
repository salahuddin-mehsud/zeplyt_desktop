import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ConnectivityBanner from '../components/ConnectivityBanner';

const AuthLayout = () => {
  return (
    <div className="min-h-screen">
      <ConnectivityBanner />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;
