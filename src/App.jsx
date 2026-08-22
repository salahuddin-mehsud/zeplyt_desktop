import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { BranchProvider, useBranch } from './contexts/BranchContext';
import PublicLayout from './layouts/PublicLayout';
import AuthLayout from './layouts/AuthLayout';
import Success from './pages/Success';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings'; 
import PrivateRoute from './components/PrivateRoute';
import Orders from './pages/Orders';
import ManageCategories from './pages/ManageCategories';
import ManageProducts from './pages/ManageProducts';
import ManageDeals from './pages/ManageDeals';
import ManageDineIn from './pages/ManageDineIn'; 
import Tables from './pages/Tables';
import Inventory from './pages/Inventory';
import Warehouse from './pages/Warehouse';
import Peripherals from './pages/Peripherals';
import OperatingHours from './pages/OperatingHours';
import DigitalMenu from './pages/DigitalMenu';
import Financials from './pages/Financials';
import CRM from './pages/CRM';
import StaffManagement from './pages/StaffManagement';
import PublicOrderDisplay from './pages/PublicOrderDisplay';
import SuperAdmin from './pages/SuperAdmin';
import WebsiteOverview from './pages/WebsiteOverview';
import Developers from './pages/Developers';
import ZeplytAi from './pages/ZeplytAi';
import DeliveryPortal from './pages/DeliveryPortal';
import Reports from './pages/Reports';

// Listener component that triggers refetch on branch change
const BranchChangeListener = ({ children }) => {
  const { activeBranchId } = useBranch();

  useEffect(() => {
    // Dispatch event whenever branch changes
    window.dispatchEvent(new CustomEvent('branchChanged', { detail: { branchId: activeBranchId } }));
  }, [activeBranchId]);


  useEffect(() => {
  console.log('[FocusFix] Listener registered');

  // Only run in Electron
  let ipcRenderer = null;
  if (typeof window.require === 'function') {
    const { ipcRenderer: ipc } = window.require('electron');
    ipcRenderer = ipc;
  }

const handleMouseDown = (e) => {
  const target = e.target;
  const isEditable = target.matches('input, textarea, [contenteditable="true"]');
  if (!isEditable) return;

  if (ipcRenderer) {
    ipcRenderer.invoke('force-window-focus')
  .then(() => {
    setTimeout(() => {
      target.focus();
    }, 50);
  })
      .catch(err => console.error('[FocusFix] IPC error:', err));
  } else {
    setTimeout(() => target.focus(), 0);
  }
};

  document.addEventListener('mousedown', handleMouseDown, true);

  return () => {
    document.removeEventListener('mousedown', handleMouseDown, true);
  };
}, []);

  return children;
};

// Automatically route authenticated users to dashboard upon opening the desktop app
const RootRoute = () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user?.role === 'delivery') {
        return <Navigate to="/dashboard/delivery" replace />;
      } else if (user?.role === 'waiter') {
        return <Navigate to="/dashboard/orders" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    } catch {
      // ignore invalid user JSON
    }
  }

  return <Login />;
};

function AppContent() {
  return (
    <BranchChangeListener>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<RootRoute />} />
        </Route>

        <Route path="/menu/:userId/:tableId" element={<DigitalMenu />} />

        <Route element={<PrivateRoute><AuthLayout /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          
          <Route path="/settings/developers" element={<Developers />} />
          <Route path="/dashboard/super-admin" element={<SuperAdmin />} />
          <Route path="/dashboard/orders" element={<Orders />} />
          <Route path="/dashboard/delivery" element={<DeliveryPortal />} />
          <Route path="/dashboard/categories" element={<ManageCategories />} />
          <Route path="/dashboard/products" element={<ManageProducts />} />
          <Route path="/dashboard/deals" element={<ManageDeals />} />
          <Route path="/dashboard/dine-in" element={<ManageDineIn />} /> 
          <Route path="/dashboard/operating-hours" element={<OperatingHours />} />
          <Route path="/dashboard/tables" element={<Tables />} />
          <Route path="/dashboard/warehouse" element={<Warehouse />} />
          <Route path="/dashboard/inventory" element={<Inventory />} />
          <Route path="/dashboard/financials" element={<Financials />} />
          <Route path="/dashboard/public-display" element={<PublicOrderDisplay />} />
          <Route path="/dashboard/zeplyt-ai" element={<ZeplytAi />} />
          <Route path="/dashboard/crm" element={<CRM />} />
          <Route path="/dashboard/staff" element={<StaffManagement />} />
          <Route path="/dashboard/website-overview" element={<WebsiteOverview />} />
          
          {/* 🚨 UPDATED: New Setting Routes */}
          <Route path="/settings/general" element={<Settings />} />
          <Route path="/settings/peripherals" element={<Peripherals />} />
          <Route path="/settings/reports" element={<Reports />} />
          <Route path="/dashboard/reports" element={<Navigate to="/settings/reports" replace />} />
          <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
        </Route>

        <Route path="/success" element={<Success />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BranchChangeListener>
  );
}

function App() {
  const currentHost = window.location.hostname;
  const urlParams = new URLSearchParams(window.location.search);
  const previewId = urlParams.get('preview'); 

  return (
    <HashRouter>
      <BranchProvider>
        <AppContent />
      </BranchProvider>
    </HashRouter>
  );
}

export default App;