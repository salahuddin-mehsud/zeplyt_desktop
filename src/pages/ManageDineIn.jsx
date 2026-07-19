import { useEffect, useState } from 'react';
import api from '../services/api';
import { QRCodeCanvas } from 'qrcode.react';

const ManageDineIn = () => {
  const [data, setData] = useState({ areas: [], tables: [] });
  const [userId, setUserId] = useState(null);
  const [areaName, setAreaName] = useState('');
  const [tableForm, setTableForm] = useState({ name: '', areaId: '' });

  const fetchData = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) setUserId(user._id || user.id);
    api.get('/pos/dine-in').then(res => setData(res.data)).catch(console.error);
  };
  useEffect(() => { fetchData(); }, []);

  const handleAddArea = async (e) => {
    e.preventDefault();
    await api.post('/pos/areas', { name: areaName });
    setAreaName(''); fetchData();
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    await api.post('/pos/tables', tableForm);
    setTableForm({ name: '', areaId: '' }); fetchData();
  };

  // --- EDIT & DELETE HANDLERS ---
  const handleEditArea = async (area) => {
    const newName = window.prompt("Enter new Area name:", area.name);
    if (newName && newName.trim() !== "") {
      await api.put(`/pos/areas/${area._id}`, { name: newName }); fetchData();
    }
  };

  const handleDeleteArea = async (id) => {
    if(window.confirm("Delete this Area? Warning: This may orphan tables inside it.")) {
      await api.delete(`/pos/areas/${id}`); fetchData();
    }
  };

  const handleEditTable = async (table) => {
    const newName = window.prompt("Enter new Table identifier:", table.name);
    if (newName && newName.trim() !== "") {
      await api.put(`/pos/tables/${table._id}`, { name: newName }); fetchData();
    }
  };

  const handleDeleteTable = async (id) => {
    if(window.confirm("Delete this Table and its QR Code?")) {
      await api.delete(`/pos/tables/${id}`); fetchData();
    }
  };

  return (
    <div className="w-full min-h-screen bg-white text-gray-800 font-sans p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Add Area & Table Forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl shadow-sm">
            <h2 className="text-[10px] uppercase tracking-wider font-bold mb-2 text-gray-500">Add Area (Floor)</h2>
            <form onSubmit={handleAddArea} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., Floor 1, Patio"
                required
                value={areaName}
                onChange={e => setAreaName(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition-colors"
              >
                Add
              </button>
            </form>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl shadow-sm">
            <h2 className="text-[10px] uppercase tracking-wider font-bold mb-2 text-gray-500">Add Table</h2>
            <form onSubmit={handleAddTable} className="flex gap-2">
              <select
                required
                value={tableForm.areaId}
                onChange={e => setTableForm({...tableForm, areaId: e.target.value})}
                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              >
                <option value="">Select Area...</option>
                {data.areas.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="e.g., T-14"
                required
                value={tableForm.name}
                onChange={e => setTableForm({...tableForm, name: e.target.value})}
                className="w-24 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition-colors"
              >
                Add
              </button>
            </form>
          </div>
        </div>

        {/* Areas & Tables List */}
        <div className="space-y-6">
          {data.areas.map(area => {
            const areaTables = data.tables.filter(t => t.area._id === area._id);
            return (
              <div key={area._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                
                <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                  <h3 className="text-base font-bold text-gray-800">{area.name}</h3>
                  <div className="space-x-3">
                    <button
                      onClick={() => handleEditArea(area)}
                      className="text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-800"
                    >
                      Edit Area
                    </button>
                    <button
                      onClick={() => handleDeleteArea(area._id)}
                      className="text-[10px] uppercase font-bold tracking-wider text-red-500 hover:text-red-700"
                    >
                      Delete Area
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {areaTables.length === 0 ? (
                    <p className="text-gray-400 text-xs col-span-full">No tables added to this area.</p>
                  ) : (
                    areaTables.map(t => {
                      const qrUrl = `${window.location.origin}/menu/${userId}/${t._id}`;
                      return (
                        <div
                          key={t._id}
                          className="group bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col items-center text-center relative hover:border-gray-300 transition-colors"
                        >
                          {/* Hover Actions */}
                          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded p-0.5 shadow-sm">
                            <button
                              onClick={() => handleEditTable(t)}
                              className="text-blue-600 hover:text-blue-800 text-xs p-1"
                              title="Edit Table"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteTable(t._id)}
                              className="text-red-500 hover:text-red-700 text-xs p-1"
                              title="Delete Table"
                            >
                              🗑️
                            </button>
                          </div>

                          <span className="text-sm font-bold mb-2 mt-1 text-gray-800">{t.name}</span>
                          <div className="bg-white p-1.5 rounded-lg mb-2 shadow-sm border border-gray-200">
                            {userId && <QRCodeCanvas value={qrUrl} size={80} />}
                          </div>
                          <button
                            onClick={() => window.open(qrUrl, '_blank')}
                            className="text-[9px] uppercase tracking-wider font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-full w-full border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            View Menu
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default ManageDineIn;