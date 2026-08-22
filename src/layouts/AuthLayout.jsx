import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ConnectivityBanner from '../components/ConnectivityBanner';
import ComplianceModal from '../components/ComplianceModal';

const AuthLayout = () => {
  return (
    <div className="min-h-screen">
      <ComplianceModal />
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
