import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const PublicOrderDisplay = () => {
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState([]);
  const [tick, setTick] = useState(0);

  // Force re‑render every second for countdowns
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/pos/orders');
      setAllOrders(res.data);
    } catch (error) {
      console.error("Error fetching display orders:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const visibleOrders = allOrders.filter(o => {
    if (o.status === 'Pending Web Order') return false;
    if (o.deliveryAddress) return false;

    const isActive = ['Open Orders', 'Online Open'].includes(o.status);
    if (isActive) return true;

    if (o.status === 'Closed') {
      const closedTime = new Date(o.updatedAt || o.createdAt).getTime();
      const ageInMs = Date.now() - closedTime;
      if (ageInMs >= 0 && ageInMs <= 60000) return true;
    }
    return false;
  });

  const getCountdown = (createdAt, items) => {
    const maxPrepMins = Math.max(...items.map(i => i.product?.prepTime || 15));
    const targetTime = new Date(createdAt).getTime() + (maxPrepMins * 60000);
    const diff = targetTime - Date.now();

    if (diff <= 0) return <span className="text-red-500 animate-pulse font-black">Due Now</span>;

    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return <span className="text-blue-400">{mins}m {secs.toString().padStart(2, '0')}s</span>;
  };

  const getPrimaryHeading = (order) => {
    let name = order.customerName || '';
    if (name.length > 15) {
      name = name.substring(0, 15) + '...';
    }
    return name ? `${name} #${order.tokenNo}` : `Order #${order.tokenNo}`;
  };

  const getSecondarySubtext = (order) => {
    if (order.area?.name && order.table?.name) {
      return `${order.area.name} — ${order.table.name}`;
    } else if (order.table?.name) {
      return `Table: ${order.table.name}`;
    } else {
      return order.type === 'Parcel' ? 'Takeaway' : 'Walk-In';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#09090b] text-white font-sans flex flex-col overflow-hidden">
      
      {/* Top TV Navbar – reduced padding & font sizes */}
      <div className="bg-black border-b border-zinc-800 p-2 lg:p-3 flex justify-between items-center shadow-md shrink-0">
        <button onClick={() => navigate('/dashboard')} className="text-zinc-500 hover:text-white font-bold text-[10px] bg-zinc-900 px-2 py-1 rounded-lg transition-colors">
          ← Exit
        </button>
        <h1 className="text-lg lg:text-xl font-black tracking-widest uppercase">Live Order Status</h1>
        <button onClick={() => document.documentElement.requestFullscreen()} className="text-zinc-500 hover:text-white bg-zinc-900 px-2 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase">
          ⛶ Fullscreen
        </button>
      </div>

      <div className="flex-1 p-2 lg:p-4 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5 custom-scrollbar">
        
        {visibleOrders.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-zinc-600 font-bold text-base uppercase tracking-widest animate-pulse">Waiting for orders...</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2 content-start">
          {visibleOrders.map(order => {
            const isClosed = order.status === 'Closed';

            return (
              <div 
                key={order._id} 
                className={`
                  relative p-2 rounded-lg flex flex-col justify-between transition-all duration-700 ease-in-out transform
                  ${isClosed 
                    ? 'bg-green-500/10 border border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-105 z-10' 
                    : 'bg-black border-l-4 border-blue-500 border-y border-r border-zinc-800 shadow-sm scale-100'
                  }
                  animate-in fade-in slide-in-from-bottom-2
                `}
              >
                {/* Top Half: Name & Token – smaller text */}
                <div className="truncate mb-1.5">
                  <p className={`text-xs lg:text-sm font-black tracking-tight truncate ${isClosed ? 'text-green-400' : 'text-white'}`} title={order.customerName}>
                    {getPrimaryHeading(order)}
                  </p>
                </div>
                
                {/* Bottom Half: Location & Timer/Ready side-by-side */}
                <div className="flex justify-between items-end gap-1.5">
                  <p className={`text-[8px] lg:text-[9px] font-bold uppercase tracking-widest truncate leading-tight flex-1 ${isClosed ? 'text-green-500/80' : 'text-zinc-500'}`}>
                    {getSecondarySubtext(order)}
                  </p>

                  <div className="text-right shrink-0">
                    {isClosed ? (
                      <div className="flex items-center gap-1 animate-in zoom-in duration-300">
                        <p className="text-xs font-black uppercase tracking-widest text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">READY</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[7px] uppercase tracking-widest text-zinc-500 mb-0 font-bold">Est. Time</p>
                        <p className="text-[10px] lg:text-xs font-mono font-black">
                          {getCountdown(order.createdAt, order.items)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default PublicOrderDisplay;