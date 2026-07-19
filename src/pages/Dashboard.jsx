import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Analytics from './Analytics';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSecureData = async () => {
      try {
        const { data } = await api.get('/dashboard');
        setDashboardData(data);
      } catch (err) {
        if (err.response?.status === 403) {
          setError('No active subscription found. Please purchase a plan.');
        } else {
          setError('Failed to load dashboard data.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSecureData();
  }, []);

  if (loading) return <div className="p-6 text-gray-400 font-bold uppercase tracking-widest text-sm">Verifying Access...</div>;
  
  if (error) return (
    <div className="p-6 text-center max-w-md mx-auto mt-12 border border-red-200 bg-red-50 rounded-xl">
      <h2 className="text-base font-bold text-red-600 mb-2">Access Restricted</h2>
      <p className="text-gray-600 text-sm mb-4">{error}</p>
      <Link to="/pricing" className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-700 transition-colors">View Plans</Link>
    </div>
  );

  return (
    <div className="font-sans text-gray-800 bg-white p-4 md:p-6 max-w-[1600px] mx-auto min-h-screen">
      
      {/* Embedded Analytics */}
      <div className="">
        <Analytics />
      </div>

      {/* Authorized Modules */}
      <div className="mt-6">
        <h2 className="text-sm font-bold text-gray-700 mb-4 border-b border-gray-200 pb-3">Authorized Modules</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {dashboardData.modules.map(module => (
            <Link 
              key={module.id} 
              to={module.path}
              className="bg-white border border-gray-200 p-4 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group flex flex-col items-center text-center shadow-sm"
            >
              <span className="text-3xl mb-2 grayscale group-hover:grayscale-0 transition-all">{module.icon}</span>
              <h3 className="text-xs font-bold text-gray-600 group-hover:text-blue-600 transition-colors">{module.title}</h3>
            </Link>
          ))}

          <Link 
            to="/dashboard/staff"
            className="bg-white border border-gray-200 p-4 rounded-xl hover:border-emerald-400 hover:shadow-md transition-all group flex flex-col items-center text-center shadow-sm"
          >
            <span className="text-3xl mb-2 grayscale group-hover:grayscale-0 transition-all">👥</span>
            <h3 className="text-xs font-bold text-gray-600 group-hover:text-emerald-600 transition-colors">Staff Management</h3>
          </Link>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;