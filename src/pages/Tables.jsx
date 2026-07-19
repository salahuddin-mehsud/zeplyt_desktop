// src/pages/Tables.jsx
import { useEffect, useState } from 'react';
import api from '../services/api';

const Tables = () => {
  const [data, setData] = useState({ areas: [], tables: [] });
  const [loading, setLoading] = useState(true);

  const fetchTableStatus = () => {
    api.get('/pos/tables-status')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTableStatus();
    // Optional: Refresh every 30 seconds to keep occupancy live
    const interval = setInterval(fetchTableStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-3 text-gray-500 font-bold uppercase tracking-widest text-xs">Scanning Tables...</div>;

  return (
    <div className="p-2 md:p-3 text-gray-800 font-sans max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-lg font-bold mb-0.5 tracking-tight">Table Management</h1>
          <p className="text-xs text-gray-600">Live view of table occupancy and reservations.</p>
        </div>
        <div className="flex gap-3 text-[10px] font-bold">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Available</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Occupied</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Reserved</div>
        </div>
      </div>

      {data.areas.length === 0 ? (
        <div className="bg-gray-100 border border-gray-200 p-6 rounded-xl text-center">
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No Areas Configured</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.areas.map(area => {
            const areaTables = data.tables.filter(t => t.area._id === area._id);
            if (areaTables.length === 0) return null;

            return (
              <div key={area._id}>
                <h2 className="text-sm font-bold mb-2 text-gray-700 border-b border-gray-200 pb-0.5">{area.name}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {areaTables.map(table => {
                    // Determine styling based on dynamic status
                    let statusColors = "bg-green-100 text-green-700 border-green-200";
                    if (table.currentStatus === 'Occupied') statusColors = "bg-red-100 text-red-700 border-red-200";
                    if (table.currentStatus === 'Reserved') statusColors = "bg-amber-100 text-amber-700 border-amber-200";

                    return (
                      <div key={table._id} className="bg-white border border-gray-200 p-2 rounded-lg flex flex-col items-center justify-center relative hover:border-gray-400 transition-colors cursor-default">
                        <span className="text-base font-bold mb-1.5">{table.name}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusColors}`}>
                          {table.currentStatus}
                        </span>
                        
                        {/* If reserved, show time */}
                        {table.currentStatus === 'Reserved' && table.orderInfo?.reservationTime && (
                          <span className="text-[10px] text-amber-600 mt-1 font-medium">
                            {new Date(table.orderInfo.reservationTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        )}
                        
                        {/* If occupied, show order number */}
                        {table.currentStatus === 'Occupied' && table.orderInfo && (
                          <span className="text-[10px] text-gray-500 mt-1 font-mono">
                            Order #{table.orderInfo.orderNo}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};
export default Tables;