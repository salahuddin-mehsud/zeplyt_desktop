import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { QRCodeCanvas } from 'qrcode.react';

const ManageDineIn = () => {
  const [data, setData] = useState({ areas: [], tables: [] });
  const [userId, setUserId] = useState(null);
  const [areaName, setAreaName] = useState('');
  const [tableForm, setTableForm] = useState({ name: '', areaId: '' });
  const [copiedTableId, setCopiedTableId] = useState(null);

  const fetchData = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) setUserId(user.ownerId || user._id || user.id);
    } catch (e) {
      console.error('Error reading user from localStorage', e);
    }
    api.get('/pos/dine-in').then(res => setData(res.data)).catch(console.error);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddArea = async (e) => {
    e.preventDefault();
    if (!areaName.trim()) return;
    await api.post('/pos/areas', { name: areaName.trim() });
    setAreaName(''); 
    fetchData();
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!tableForm.areaId || !tableForm.name.trim()) return;
    await api.post('/pos/tables', { ...tableForm, name: tableForm.name.trim() });
    setTableForm({ name: '', areaId: '' }); 
    fetchData();
  };

  // --- EDIT & DELETE HANDLERS ---
  const handleEditArea = async (area) => {
    const newName = window.prompt("Enter new Area name:", area.name);
    if (newName && newName.trim() !== "") {
      await api.put(`/pos/areas/${area._id}`, { name: newName.trim() }); 
      fetchData();
    }
  };

  const handleDeleteArea = async (id) => {
    if(window.confirm("Delete this Area? Warning: This may orphan tables inside it.")) {
      await api.delete(`/pos/areas/${id}`); 
      fetchData();
    }
  };

  const handleEditTable = async (table) => {
    const newName = window.prompt("Enter new Table identifier:", table.name);
    if (newName && newName.trim() !== "") {
      await api.put(`/pos/tables/${table._id}`, { name: newName.trim() }); 
      fetchData();
    }
  };

  const handleDeleteTable = async (id) => {
    if(window.confirm("Delete this Table and its QR Code?")) {
      await api.delete(`/pos/tables/${id}`); 
      fetchData();
    }
  };

  const getQrUrl = (tableId) => {
    const clientBase = import.meta.env.VITE_CLIENT_URL || (window.location.origin.startsWith('file:') ? 'https://zeplyt.com' : window.location.origin);
    return `${clientBase}/menu/${userId || 'public'}/${tableId}`;
  };

  const handleCopyLink = (tableId) => {
    const url = getQrUrl(tableId);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedTableId(tableId);
      setTimeout(() => setCopiedTableId(null), 2000);
    });
  };

  const handleDownloadQr = (tableId, tableName) => {
    const canvas = document.getElementById(`qr-canvas-${tableId}`);
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `QR_Table_${tableName || tableId}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="w-full min-h-screen bg-white text-gray-800 font-sans p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dine-In & QR Menu Setup</h1>
            <p className="text-xs text-gray-500 mt-1">Manage dining areas, physical tables, and live digital QR menus for your customers.</p>
          </div>
        </div>

        {/* Add Area & Table Forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl shadow-sm">
            <h2 className="text-[10px] uppercase tracking-wider font-bold mb-2 text-gray-500">Add Area (Floor / Section)</h2>
            <form onSubmit={handleAddArea} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., Floor 1, Patio, Rooftop"
                required
                value={areaName}
                onChange={e => setAreaName(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm"
              >
                Add Area
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
                placeholder="e.g., T-14, Table 1"
                required
                value={tableForm.name}
                onChange={e => setTableForm({...tableForm, name: e.target.value})}
                className="w-28 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm"
              >
                Add Table
              </button>
            </form>
          </div>
        </div>

        {/* Areas & Tables List */}
        <div className="space-y-6">
          {data.areas.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">No dining areas configured yet. Add your first area above.</p>
            </div>
          )}

          {data.areas.map(area => {
            const areaTables = data.tables.filter(t => (t.area?._id || t.area) === area._id);
            return (
              <div key={area._id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <h3 className="text-base font-bold text-gray-800">{area.name}</h3>
                    <span className="text-xs text-gray-400">({areaTables.length} tables)</span>
                  </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {areaTables.length === 0 ? (
                    <p className="text-gray-400 text-xs col-span-full py-4 text-center">No tables added to this area yet.</p>
                  ) : (
                    areaTables.map(t => {
                      const qrUrl = getQrUrl(t._id);
                      const isCopied = copiedTableId === t._id;

                      return (
                        <div
                          key={t._id}
                          className="group bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center relative hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          {/* Hover Actions */}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded p-1 shadow-sm z-10">
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

                          <span className="text-sm font-bold mb-2.5 mt-1 text-gray-800">{t.name}</span>
                          
                          <div className="bg-white p-2 rounded-xl mb-3 shadow-sm border border-gray-200 flex items-center justify-center">
                            <QRCodeCanvas id={`qr-canvas-${t._id}`} value={qrUrl} size={110} level="M" />
                          </div>

                          <div className="w-full space-y-1.5">
                            <button
                              onClick={() => window.open(qrUrl, '_blank')}
                              className="text-[10px] uppercase tracking-wider font-bold text-white bg-blue-600 hover:bg-blue-500 py-1.5 rounded-lg w-full transition-colors shadow-sm"
                            >
                              Open Live Menu
                            </button>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleCopyLink(t._id)}
                                className={`flex-1 text-[9px] font-bold py-1 px-2 rounded-md border transition-colors ${isCopied ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                              >
                                {isCopied ? '✓ Copied' : '📋 Copy URL'}
                              </button>
                              <button
                                onClick={() => handleDownloadQr(t._id, t.name)}
                                className="text-[9px] font-bold py-1 px-2 rounded-md bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                                title="Download QR image"
                              >
                                ⬇ QR
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ManageDineIn;