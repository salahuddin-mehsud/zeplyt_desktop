// src/components/Sidebar.jsx
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AiOutlineDashboard } from "react-icons/ai";
import { IoSettingsOutline, IoReceiptOutline } from "react-icons/io5";
import { IoIosLogOut, IoIosArrowDown } from "react-icons/io";
import { FaBrain, FaTerminal, FaGlobe, FaHeart, FaCrown, FaMobileAlt, FaBoxes, FaDesktop, FaChartLine, FaChartPie } from "react-icons/fa";
import logoWebp from '../assets/logo.webp';
import zeplytWebp from '../assets/zeplyt.webp';


const iconMap = {
  dashboard: <AiOutlineDashboard size={16} />,
  pos: <FaDesktop size={15} />,
  orders: <IoReceiptOutline size={15} />,
  catalog: <FaBoxes size={15} />,
  ai: <FaBrain size={15} />,
  crm: <FaHeart size={15} />,
  peripherals: <FaMobileAlt size={15} />,
  settings: <IoSettingsOutline size={16} />,
  financials: <FaChartLine size={15} />,
  analytics: <FaChartPie size={15} />,
  website: <FaGlobe size={15} />,
  developers: <FaTerminal size={15} />,
};

const Sidebar = () => {
  const navigate = useNavigate();
  const [navItems, setNavItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenus, setOpenMenus] = useState({});
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/dashboard/navigation')
      .then(res => setNavItems(res.data.navItems))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/settings')) {
      setOpenMenus(prev => ({ ...prev, 'Settings': true }));
    }
    const isCatalogActive = ['/categories', '/products', '/deals', '/dine-in', '/operating-hours'].some(path => location.pathname.includes(path));
    if (isCatalogActive) {
      setOpenMenus(prev => ({ ...prev, 'Catalog': true }));
    }
  }, [location.pathname]);

  const toggleMenu = (label) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (location.pathname.includes('/dashboard/orders') || location.pathname.includes('/dashboard/zeplyt-ai') || location.pathname.includes('/dashboard/public-display') || location.pathname.includes('/dashboard/delivery')) return null;

  const mainNavItems = navItems.filter(item => !['subscriptions', 'settings', 'catalog', 'analytics'].includes(item.iconKey));
  const systemNavItems = navItems.filter(item => ['catalog', 'settings'].includes(item.iconKey));

  const renderNavLink = (item, idx) => {
    if (item.subItems) {
      const isChildActive = item.subItems.some(sub => location.pathname.startsWith(sub.to));
      return (
        <div key={idx} className="mb-0.5 w-full">
          <button
            onClick={() => toggleMenu(item.label)}
            className={`w-[calc(100%-18px)] mx-2.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isChildActive && !openMenus[item.label] ? 'text-gray-800' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center">
              <span className="opacity-80 flex items-center justify-center w-5 h-5 shrink-0">{iconMap[item.iconKey]}</span>
              <span className="ml-2.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.label}</span>
            </div>
            <IoIosArrowDown className={`shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ${openMenus[item.label] ? 'rotate-180' : ''}`} size={13} />
          </button>
          {openMenus[item.label] && (
            <div className="ml-[50px] mt-0.5 space-y-0.5 border-l border-gray-200 pl-2.5 py-0.5 overflow-hidden transition-opacity duration-300 opacity-0 group-hover:opacity-100">
              {item.subItems.map((sub, sIdx) => (
                <NavLink key={sIdx} to={sub.to} className={({isActive}) => `block py-1 text-[11px] transition-colors ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}>
                  {sub.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={idx} className="mb-0.5 w-full">
        <NavLink to={item.to} end={item.to === '/dashboard'} className={({ isActive }) => `w-[calc(100%-18px)] mx-2.5 flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}>
          <span className="opacity-80 flex items-center justify-center w-5 h-5 shrink-0">{iconMap[item.iconKey]}</span>
          <span className="ml-2.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.label}</span>
        </NavLink>
      </div>
    );
  };

  return (
    <aside className="group w-[64px] hover:w-52 bg-white border-r border-gray-200 flex flex-col font-sans h-screen sticky top-0 transition-all duration-300 overflow-x-hidden z-50 shadow-sm">
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="h-[64px] px-2 flex items-center justify-center border-b border-gray-200 shrink-0">
          <img
            src={logoWebp}
            alt="ZEPLYT icon"
            className="w-11 h-11 object-contain block group-hover:hidden transition-all duration-300"
          />
          <img
            src={zeplytWebp}
            alt="ZEPLYT"
            className="h-13 object-contain hidden group-hover:block transition-all duration-300"
          />
        </div>

        {/* Navigation – scrollbar hidden with custom CSS */}
        <nav 
          className="flex-1 py-2.5 space-y-0.5 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 mb-1.5 px-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            Menu
          </div>

          {/* Super Admin */}
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <div className="mb-0.5 w-full">
              <NavLink to="/dashboard/super-admin" className={({ isActive }) => `w-[calc(100%-18px)] mx-2.5 flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${isActive ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'text-gray-600 hover:text-yellow-700 hover:bg-yellow-50'}`}>
                <span className="opacity-80 flex items-center justify-center w-5 h-5 shrink-0"><FaCrown size={15} /></span>
                <span className="ml-2.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Super Admin</span>
              </NavLink>
            </div>
          )}

          {loading ? (
            <div className="px-5 text-gray-400 text-xs whitespace-nowrap">...</div>
          ) : (
            mainNavItems.map(renderNavLink)
          )}
        </nav>

        <div className="shrink-0 bg-white pt-1.5 pb-3">
          {systemNavItems.map(renderNavLink)}
          <div className="my-2 mx-4 border-t border-gray-200"></div>
          <button onClick={handleLogout} className="w-[calc(100%-18px)] mx-2.5 flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
            <span className="opacity-80 flex items-center justify-center w-5 h-5 shrink-0"><IoIosLogOut size={16} /></span>
            <span className="ml-2.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;