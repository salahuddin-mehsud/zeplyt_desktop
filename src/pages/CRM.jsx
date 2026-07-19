// src/pages/CRM.jsx
import { useEffect, useState } from 'react';
import api from '../services/api';

const CRM = () => {
  const [data, setData] = useState({ customers: [], top3: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/crm/data')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-center text-gray-500 font-bold uppercase tracking-widest text-xs mt-6">Loading Customer Data...</div>;

  const { customers, top3 } = data;

  // Visual configuration for the Top 3 Podium – light theme adjusted
  const podiumStyles = [
    { title: "1ST PLACE VIP", icon: "🏆", bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-700" },
    { title: "2ND PLACE", icon: "🥈", bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-600" },
    { title: "3RD PLACE", icon: "🥉", bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-700" }
  ];

  return (
    <div className="p-2 md:p-3 text-gray-800 font-sans max-w-[1600px] mx-auto min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-5 border-b border-gray-200 pb-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight mb-0.5">CRM & Loyalty</h1>
          <p className="text-xs text-gray-600">Customer analytics and loyalty point tracking.</p>
        </div>
        <div className="bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg text-center">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0">Total Customers</p>
          <p className="text-base font-bold text-gray-800">{customers.length}</p>
        </div>
      </div>

      {/* TOP 3 PODIUM */}
      {top3.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Loyalty Leaders (Top 3)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {top3.map((customer, index) => {
              const style = podiumStyles[index];
              return (
                <div key={index} className={`border rounded-xl p-3 flex flex-col items-center text-center shadow-sm transition-transform hover:-translate-y-0.5 ${style.bg} ${style.border}`}>
                  <div className="text-2xl mb-2">{style.icon}</div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mb-2 ${style.text} ${style.border}`}>
                    {style.title}
                  </span>
                  <h3 className="text-base font-bold text-gray-800 mb-0">{customer.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mb-3">{customer.phone}</p>
                  
                  <div className="w-full bg-white/80 rounded-lg p-2 border border-gray-200">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0">Loyalty Points</p>
                    <p className={`text-xl font-black font-mono ${style.text}`}>{customer.loyaltyPoints.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COMPLETE CUSTOMER DATABASE TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-3 py-2 border-b border-gray-200">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Customer Database</h2>
        </div>
        
        {customers.length === 0 ? (
          <div className="p-6 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
            No customer data found yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-[10px] uppercase tracking-widest">
                  <th className="p-2 font-bold border-b border-gray-200">Rank</th>
                  <th className="p-2 font-bold border-b border-gray-200">Customer Name</th>
                  <th className="p-2 font-bold border-b border-gray-200">Mobile</th>
                  <th className="p-2 font-bold border-b border-gray-200 text-center">Visits</th>
                  <th className="p-2 font-bold border-b border-gray-200 text-right">Lifetime Spend</th>
                  <th className="p-2 font-bold border-b border-gray-200 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {customers.map((c, index) => (
                  <tr key={c.phone} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                    <td className="p-2 text-gray-400 font-mono font-bold">#{index + 1}</td>
                    <td className="p-2 text-gray-800 font-bold">{c.name}</td>
                    <td className="p-2 text-gray-500 font-mono">{c.phone}</td>
                    <td className="p-2 text-gray-700 text-center font-bold">{c.totalOrders}</td>
                    <td className="p-2 text-green-600 font-mono text-right font-bold">${c.totalSpent.toFixed(2)}</td>
                    <td className="p-2 text-blue-600 font-mono text-right font-bold bg-blue-50/50 group-hover:bg-blue-100/50 transition-colors">
                      {c.loyaltyPoints.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default CRM;