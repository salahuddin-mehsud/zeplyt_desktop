import { useEffect, useState } from 'react';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('EXECUTIVE SUMMARY');
  const [trendGranularity, setTrendGranularity] = useState('Day');
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRangeMode, setIsRangeMode] = useState(false);

  const fetchSuperAdminData = async (options = {}) => {
    setLoading(true);
    setError('');
    let queryParams = `?trendGranularity=${trendGranularity}`;
    
    if (isRangeMode && startDate && endDate) {
      queryParams += `&startDate=${startDate}&endDate=${endDate}`;
    } else if (selectedDate && !isRangeMode) {
      queryParams += `&startDate=${selectedDate}`;
    }

    try {
      const res = await api.get(`/dashboard/super-admin/analytics${queryParams}`);
      setData(res.data);
    } catch (err) {
      setError('Failed to load super admin data. Make sure you are logged in as admin.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdminData();
  }, [trendGranularity]);

  if (loading && !data) {
    return <div className="p-8 text-gray-400 font-bold uppercase tracking-widest text-center mt-12 text-sm">Loading Super Admin Console...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500 font-bold text-center mt-12 text-sm">{error}</div>;
  }

  return (
    <div className="font-sans text-gray-800 bg-white p-4 md:p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-bold tracking-tight text-yellow-600">👑 Super Admin Console</h1>
        <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">All Branches</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 text-xs font-bold text-gray-400 overflow-x-auto hide-scrollbar mb-4">
        {['EXECUTIVE SUMMARY', 'REVENUE TRENDS', 'BRANCH BREAKDOWN'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 pb-2 uppercase transition-colors ${activeTab === tab ? 'text-yellow-600 border-b-2 border-yellow-500' : 'hover:text-gray-600'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap border-b border-gray-200 pb-3 mb-4">
        <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 text-xs shadow-sm">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={e => { setSelectedDate(e.target.value); setIsRangeMode(false); setStartDate(''); setEndDate('');}}
            className="bg-transparent text-gray-700 px-2 py-1 outline-none focus:border-blue-400 transition border-b border-transparent text-xs w-28"
          />
          <button onClick={() => setIsRangeMode(!isRangeMode)} className={`px-2 py-1 rounded text-[10px] font-bold transition ${isRangeMode ? 'bg-gray-200' : 'text-gray-400'}`}>Range</button>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => { setStartDate(e.target.value); setIsRangeMode(true); setSelectedDate(''); }}
            className={`bg-transparent text-gray-700 px-2 py-1 outline-none focus:border-blue-400 transition border-b ${isRangeMode ? 'border-gray-300' : 'border-transparent text-gray-300'} text-xs w-28`}
            disabled={!isRangeMode}
          />
          <span className={`text-gray-400 px-1 ${isRangeMode ? '' : 'text-gray-300'}`}>-</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => { setEndDate(e.target.value); setIsRangeMode(true); setSelectedDate(''); }}
            className={`bg-transparent text-gray-700 px-2 py-1 outline-none focus:border-blue-400 transition border-b ${isRangeMode ? 'border-gray-300' : 'border-transparent text-gray-300'} text-xs w-28`}
            disabled={!isRangeMode}
          />
          <button 
            onClick={() => fetchSuperAdminData()}
            disabled={loading}
            className="ml-2 bg-yellow-500 hover:bg-yellow-400 text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-70"
          >
            {loading ? '...' : 'Apply'}
          </button>
          <button 
            onClick={() => { 
              const d = new Date();
              const todayStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
              setSelectedDate(todayStr); setStartDate(''); setEndDate(''); setIsRangeMode(false); 
              fetchSuperAdminData();
            }}
            className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 border-l border-gray-200 uppercase ml-1 transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-200 text-xs shadow-sm ml-2">
          {['Day', 'Week', 'Month', 'Year'].map(gran => (
            <button 
              key={gran} 
              onClick={() => setTrendGranularity(gran)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded transition ${trendGranularity === gran ? 'bg-yellow-500 text-white' : 'bg-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {gran}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-gray-400 font-bold uppercase tracking-widest mt-6 text-xs">Loading...</div>
      ) : (
        <>
          {activeTab === 'EXECUTIVE SUMMARY' && (
            <div className="space-y-4 mt-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-1">Total Branches</p>
                  <p className="text-2xl font-black text-yellow-700">{data.totalBranches || 0}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Total Revenue</p>
                  <p className="text-2xl font-black text-blue-700">BHD {data.restoredSummary?.totalSalesOrdersPreserved?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Total Orders</p>
                  <p className="text-2xl font-black text-green-700">{data.restoredSummary?.totalOrdersPreserved || 0}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">Avg Order Value</p>
                  <p className="text-2xl font-black text-purple-700">BHD {data.restoredSummary?.avgOrderValuePreserved?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              {/* Sales Summary */}
              <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Combined Sales Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-gray-400">Gross Sales:</span> <span className="text-gray-800 font-mono font-medium">BHD {data.restoredSummary?.grossSalesPreserved?.toFixed(2) || '0.00'}</span></div>
                  <div><span className="text-gray-400">Tax:</span> <span className="text-red-500 font-mono font-medium">BHD {data.restoredSummary?.taxAmountPreserved?.toFixed(2) || '0.00'}</span></div>
                  <div><span className="text-gray-400">Net Sales:</span> <span className="text-green-600 font-mono font-bold">BHD {data.restoredSummary?.netSalesAfterTaxPreserved?.toFixed(2) || '0.00'}</span></div>
                  <div><span className="text-gray-400">Total Orders:</span> <span className="text-gray-800 font-mono font-medium">{data.restoredSummary?.totalOrdersPreserved || 0}</span></div>
                </div>
              </div>

              {/* Top Items */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Top Performing Items</h3>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-mono uppercase tracking-wider border-b border-gray-200">
                    <tr><th className="px-4 py-2">Rank</th><th className="px-4 py-2">Item Name</th><th className="px-4 py-2 text-right">Units Sold</th><th className="px-4 py-2 text-right">Revenue</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.topItems?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 font-mono text-gray-400">#{idx + 1}</td>
                        <td className="px-4 py-2 font-medium text-gray-800">{item._id}</td>
                        <td className="px-4 py-2 font-mono text-gray-600 text-right">{item.qtySold}</td>
                        <td className="px-4 py-2 font-mono text-green-600 font-bold text-right">BHD {item.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'REVENUE TRENDS' && (
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm min-h-[400px] flex flex-col mt-4">
              <h3 className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-3">Combined Revenue Trend</h3>
              {selectedDataPoint && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-center justify-between text-xs">
                  <div><p className="text-[10px] text-yellow-600 uppercase tracking-wider font-bold mb-0.5">Selected {trendGranularity}</p><p className="text-sm font-bold text-gray-800">{selectedDataPoint._id}</p></div>
                  <div className="text-right"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Revenue</p><p className="text-lg font-mono font-black text-green-600">BHD {selectedDataPoint.revenue?.toFixed(2) || '0.00'}</p></div>
                </div>
              )}
              <div className="w-full h-[300px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trends || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} onClick={(e) => { if (e?.activePayload?.length > 0) setSelectedDataPoint(e.activePayload[0].payload); }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="_id" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickMargin={6} minTickGap={40} />
                    <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `BHD ${val.toLocaleString()}`} />
                    <Tooltip cursor={{ stroke: '#d1d5db', strokeWidth: 1, strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#1f2937', borderRadius: '6px', padding: '8px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#eab308" strokeWidth={2.5} dot={{ r: 2.5, fill: '#fff', stroke: '#eab308', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#eab308', stroke: '#fff', strokeWidth: 2, cursor: 'pointer' }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'BRANCH BREAKDOWN' && (
            <div className="space-y-4 mt-4">
              {/* Branch Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.branchBreakdown?.map((branch, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-yellow-300 transition">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-800 text-sm">{branch.branchName}</h4>
                      <span className="text-[10px] text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded">{branch.percentage}%</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-400">Revenue</span><span className="text-green-600 font-mono font-medium">BHD {branch.revenue.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Orders</span><span className="text-gray-800 font-mono font-medium">{branch.orders}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Revenue Distribution */}
              <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Revenue Distribution by Branch</h3>
                <div className="space-y-2">
                  {data.branchBreakdown?.map((branch, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-600">{branch.branchName}</span>
                        <span className="text-green-600 font-mono font-medium">BHD {branch.revenue.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${Math.min(branch.percentage, 100)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SuperAdmin;