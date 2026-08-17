import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';
import useCurrency from '../hooks/useCurrency';

const WebsiteOverview = () => {
  const { currencySymbol } = useCurrency();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const [locations, setLocations] = useState([]);
  const [newCity, setNewCity] = useState('');
  const [newArea, setNewArea] = useState('');
  const [editingCityId, setEditingCityId] = useState(null);

  useEffect(() => {
    fetchOverview();
    fetchLocations();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/dashboard/website-overview');
      setData(res.data);
    } catch (err) {
      setError('Failed to load website overview data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/pos/delivery-locations');
      setLocations(res.data);
    } catch (err) {
      console.error('Failed to fetch delivery locations', err);
    }
  };

  const addCity = async (e) => {
    e.preventDefault();
    if (!newCity.trim()) return;
    try {
      const res = await api.post('/pos/delivery-locations', { 
        city: newCity.trim(), 
        deliveryCost: 0
      });
      setLocations([...locations, res.data]);
      setNewCity('');
    } catch (err) {
      alert('Failed to add city');
    }
  };

  const updateCityFields = async (cityId, deliveryCost) => {
    try {
      const res = await api.put(`/pos/delivery-locations/${cityId}`, { deliveryCost });
      setLocations(locations.map(l => l._id === cityId ? res.data : l));
    } catch (err) {
      alert('Failed to update delivery cost');
    }
  };

  const addArea = async (cityId) => {
    if (!newArea.trim()) return;
    const city = locations.find(l => l._id === cityId);
    if (!city) return;
    const updatedAreas = [...city.areas, newArea.trim()];
    try {
      const res = await api.put(`/pos/delivery-locations/${cityId}`, { areas: updatedAreas });
      setLocations(locations.map(l => l._id === cityId ? res.data : l));
      setNewArea('');
    } catch (err) {
      alert('Failed to add area');
    }
  };

  const removeArea = async (cityId, areaIndex) => {
    const city = locations.find(l => l._id === cityId);
    if (!city) return;
    const updatedAreas = city.areas.filter((_, i) => i !== areaIndex);
    try {
      const res = await api.put(`/pos/delivery-locations/${cityId}`, { areas: updatedAreas });
      setLocations(locations.map(l => l._id === cityId ? res.data : l));
    } catch (err) {
      alert('Failed to remove area');
    }
  };

  const deleteCity = async (cityId) => {
    if (!confirm('Delete this city and all its areas?')) return;
    try {
      await api.delete(`/pos/delivery-locations/${cityId}`);
      setLocations(locations.filter(l => l._id !== cityId));
    } catch (err) {
      alert('Failed to delete city');
    }
  };

  if (loading && !data) {
    return (
      <div className="p-3 text-gray-400 font-bold uppercase tracking-wider text-center mt-8 text-xs">
        Loading website overview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 text-red-500 font-bold text-center mt-8 text-xs">{error}</div>
    );
  }

  return (
    <div className="p-2 md:p-3 font-sans text-gray-800 min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-500 hover:text-gray-700 font-bold text-[10px] bg-white border border-gray-200 px-2 py-1 rounded-lg transition-colors shadow-sm"
        >
          ← Dashboard
        </button>
        <h1 className="text-base font-bold tracking-tight text-gray-800">🌐 Website Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-gray-200 mb-3 text-[10px] font-bold text-gray-400 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`shrink-0 pb-1.5 uppercase tracking-wider transition-colors ${
            activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-500' : 'hover:text-gray-600'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`shrink-0 pb-1.5 uppercase tracking-wider transition-colors ${
            activeTab === 'delivery' ? 'text-blue-600 border-b-2 border-blue-500' : 'hover:text-gray-600'
          }`}
        >
          Delivery Locations
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            <div className="bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
              <p className="text-lg font-black text-green-600">
                {currencySymbol} {data.totalRevenue?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Orders</p>
              <p className="text-lg font-black text-gray-800">{data.totalOrders || 0}</p>
            </div>
            <div className="bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Products</p>
              <p className="text-lg font-black text-blue-600">{data.totalProducts || 0}</p>
            </div>
            <div className="bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Low Stock</p>
              <p className="text-lg font-black text-red-500">{data.lowStock || 0}</p>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Recent Website Orders</h2>
            </div>
            <div className="overflow-x-auto">
              {data.recentOrders?.length === 0 ? (
                <div className="p-4 text-center text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                  No website orders yet.
                </div>
              ) : (
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-gray-100 text-gray-500 font-mono uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-1.5 font-bold">Order #</th>
                      <th className="px-2 py-1.5 font-bold">Customer</th>
                      <th className="px-2 py-1.5 font-bold">Date</th>
                      <th className="px-2 py-1.5 font-bold text-right">Total</th>
                      <th className="px-2 py-1.5 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.recentOrders.map((order) => (
                      <tr
                        key={order._id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/dashboard/orders`)}
                      >
                        <td className="px-2 py-1.5 font-mono text-gray-700">{order.orderNo}</td>
                        <td className="px-2 py-1.5 text-gray-600">{order.customerName}</td>
                        <td className="px-2 py-1.5 text-gray-400">
                          {order.date ? format(new Date(order.date), 'MMM d, yyyy h:mm a') : 'N/A'}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-green-600 font-bold text-right">
                          {currencySymbol} {order.total?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              order.status === 'Closed'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : order.status === 'Pending Web Order'
                                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {order.status || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'delivery' && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <h2 className="text-xs font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">Delivery Locations</h2>
          <p className="text-[10px] text-gray-500 mb-3">
            Manage cities where you offer delivery. These will appear in the website's location popup.
          </p>

          {/* Add City */}
          <form onSubmit={addCity} className="flex gap-1.5 mb-3">
            <input
              type="text"
              placeholder="City name"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-400"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg font-bold text-[10px]"
            >
              Add City
            </button>
          </form>

          {locations.length === 0 ? (
            <p className="text-gray-400 text-[10px]">No cities added yet.</p>
          ) : (
            <div className="space-y-2">
              {locations.map((city) => (
                <div key={city._id} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <h3 className="text-xs font-bold text-gray-800">{city.city}</h3>
                    <button onClick={() => deleteCity(city._id)} className="text-red-500 hover:text-red-700 text-[10px] font-medium">
                      Delete City
                    </button>
                  </div>

                  {/* Delivery Cost */}
                  <div className="flex flex-wrap gap-2 items-end mb-2">
                    <div>
                      <label className="text-[9px] text-gray-500">Delivery Cost ({currencySymbol})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={city.deliveryCost ?? 0}
                        onChange={(e) => {
                          const newCost = parseFloat(e.target.value) || 0;
                          setLocations(locations.map(l =>
                            l._id === city._id ? { ...l, deliveryCost: newCost } : l
                          ));
                        }}
                        className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] w-16"
                      />
                    </div>
                    <div>
                      <button
                        onClick={() => updateCityFields(city._id, city.deliveryCost)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-[9px] font-bold"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Areas */}
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {city.areas.map((area, idx) => (
                      <span key={idx} className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[9px] flex items-center gap-0.5">
                        {area}
                        <button onClick={() => removeArea(city._id, idx)} className="text-gray-400 hover:text-red-500 ml-0.5">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Add area (e.g., 'Road 101')"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      className="flex-1 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={() => addArea(city._id)}
                      className="bg-green-600 hover:bg-green-500 text-white px-2 py-0.5 rounded text-[9px] font-bold"
                    >
                      Add Area
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebsiteOverview;
