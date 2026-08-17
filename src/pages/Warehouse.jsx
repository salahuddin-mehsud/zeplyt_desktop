// src/pages/Warehouse.jsx
import { useEffect, useState } from 'react';
import api from '../services/api';
import useCurrency from '../hooks/useCurrency';

const Warehouse = () => {
  const { currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  
  // Data States
  const [summary, setSummary] = useState(null);
  const [stock, setStock] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [staff, setStaff] = useState([]);

  // Edit States
  const [editingStockId, setEditingStockId] = useState(null);
  const [editingTxId, setEditingTxId] = useState(null);
  const [editingStaffId, setEditingStaffId] = useState(null);

  // Forms
  const initStockForm = { sku: '', name: '', category: '', unit: 'Pallets', unitValue: '', locationBin: '' };
  const initTxForm = { type: 'INFLOW', itemId: '', quantity: '', reference: '', handledBy: '' };
  const initStaffForm = { name: '', role: 'Picker', shift: 'Morning', contact: '' };

  const [stockForm, setStockForm] = useState(initStockForm);
  const [txForm, setTxForm] = useState(initTxForm);
  const [staffForm, setStaffForm] = useState(initStaffForm);

  const fetchData = async () => {
    try {
      const [sumRes, stkRes, txRes, staffRes] = await Promise.all([
        api.get('/warehouse/summary'), api.get('/warehouse/stock'),
        api.get('/warehouse/transactions'), api.get('/warehouse/staff')
      ]);
      setSummary(sumRes.data); setStock(stkRes.data);
      setTransactions(txRes.data); setStaff(staffRes.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- STOCK ACTIONS ---
  const handleStockSubmit = async (e) => {
    e.preventDefault();
    if (editingStockId) {
      await api.put(`/warehouse/stock/${editingStockId}`, stockForm);
      setEditingStockId(null);
    } else {
      await api.post('/warehouse/stock', stockForm);
    }
    setStockForm(initStockForm);
    fetchData();
  };
  const editStock = (s) => { setStockForm(s); setEditingStockId(s._id); };
  const deleteStock = async (id) => {
    if (window.confirm("Delete this master stock item?")) {
      await api.delete(`/warehouse/stock/${id}`); fetchData();
    }
  };

  // --- TRANSACTION ACTIONS ---
  const handleTxSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTxId) {
        await api.put(`/warehouse/transactions/${editingTxId}`, txForm);
        setEditingTxId(null);
      } else {
        await api.post('/warehouse/transactions', txForm);
      }
      setTxForm(initTxForm);
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Error recording transaction'); }
  };
  const editTx = (tx) => { setTxForm({ ...tx, itemId: tx.item }); setEditingTxId(tx._id); };
  const deleteTx = async (id) => {
    if (window.confirm("Delete this movement? The master stock ledger will automatically recalculate.")) {
      await api.delete(`/warehouse/transactions/${id}`); fetchData();
    }
  };

  // --- STAFF ACTIONS ---
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    if (editingStaffId) {
      await api.put(`/warehouse/staff/${editingStaffId}`, staffForm);
      setEditingStaffId(null);
    } else {
      await api.post('/warehouse/staff', staffForm);
    }
    setStaffForm(initStaffForm);
    fetchData();
  };
  const editStaff = (s) => { setStaffForm(s); setEditingStaffId(s._id); };
  const deleteStaff = async (id) => {
    if (window.confirm("Remove this staff member?")) {
      await api.delete(`/warehouse/staff/${id}`); fetchData();
    }
  };

  if (!summary) return <div className="p-4 text-gray-500 font-bold tracking-widest uppercase text-center text-xs">Loading Warehouse Data...</div>;

  return (
    <div className="p-2 md:p-3 text-gray-800 font-sans max-w-[1600px] mx-auto min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 pb-2 mb-3">
        <h1 className="text-lg font-bold tracking-tight mb-2 text-gray-800">Central Warehouse Command</h1>
        <div className="flex gap-4 text-[10px] font-bold text-gray-500 overflow-x-auto hide-scrollbar">
          {['DASHBOARD', 'MASTER STOCK', 'INFLOW & OUTFLOW', 'PERSONNEL'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-1.5 uppercase transition-colors whitespace-nowrap ${activeTab === tab ? 'text-gray-900 border-b-2 border-blue-500' : 'hover:text-gray-700'}`}>{tab}</button>
          ))}
        </div>
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0">Total Vault Value</p>
              <p className="text-xl font-mono font-bold text-green-600">{currencySymbol} {summary.totalValue.toFixed(3)}</p>
            </div>
            <div className="bg-white border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0">Active SKUs</p>
              <p className="text-xl font-bold text-gray-800">{summary.totalSkus}</p>
            </div>
            <div className="bg-white border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0">On-Duty Staff</p>
              <p className="text-xl font-bold text-blue-600">{summary.staffCount}</p>
            </div>
            <div className={`border p-3 rounded-xl ${summary.lowStockCount > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
              <p className={`text-[10px] uppercase font-bold tracking-widest mb-0 ${summary.lowStockCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>Low Stock Alerts</p>
              <p className={`text-xl font-bold ${summary.lowStockCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>{summary.lowStockCount}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <h2 className="text-[10px] uppercase tracking-widest font-bold mb-2 text-gray-500 border-b border-gray-200 pb-1">Latest Logistics Movements</h2>
            <div className="divide-y divide-gray-100">
              {summary.recentMovements.length === 0 && <p className="py-2 text-gray-400 text-xs">No recent activity.</p>}
              {summary.recentMovements.map(tx => (
                <div key={tx._id} className="py-1.5 flex justify-between items-center text-xs">
                  <div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5 ${tx.type === 'INFLOW' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{tx.type}</span>
                    <span className="font-bold text-gray-800">{tx.itemName}</span>
                    <span className="text-gray-500 ml-1.5">({tx.reference || 'No Ref'})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-gray-800">{tx.quantity} Units</span>
                    <p className="text-[10px] text-gray-500 mt-0">{new Date(tx.date).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MASTER STOCK */}
      {activeTab === 'MASTER STOCK' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white border border-gray-200 p-3 rounded-xl h-fit">
            <h2 className="text-[10px] uppercase tracking-widest font-bold mb-3 text-gray-500 border-b border-gray-200 pb-1">
              {editingStockId ? 'Edit SKU Details' : 'Register New SKU'}
            </h2>
            <form onSubmit={handleStockSubmit} className="space-y-2">
              <input type="text" placeholder="SKU Code" required value={stockForm.sku} onChange={e => setStockForm({...stockForm, sku: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs" />
              <input type="text" placeholder="Item Name" required value={stockForm.name} onChange={e => setStockForm({...stockForm, name: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs" />
              <input type="text" placeholder="Category" required value={stockForm.category} onChange={e => setStockForm({...stockForm, category: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs" />
              <div className="flex gap-2">
                <select value={stockForm.unit} onChange={e => setStockForm({...stockForm, unit: e.target.value})} className="w-1/2 bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs text-gray-700">
                  <option value="Pallets">Pallets</option><option value="Tons">Tons</option><option value="Cartons">Cartons</option><option value="Drums">Drums</option>
                </select>
                <input type="number" step="0.001" placeholder={`Val/Unit (${currencySymbol})`} required value={stockForm.unitValue} onChange={e => setStockForm({...stockForm, unitValue: e.target.value})} className="w-1/2 bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs" />
              </div>
              <input type="text" placeholder="Location Bin" required value={stockForm.locationBin} onChange={e => setStockForm({...stockForm, locationBin: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs" />
              
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded-lg text-[10px] tracking-widest uppercase transition-colors">
                  {editingStockId ? 'Update Master DB' : 'Add to Master DB'}
                </button>
                {editingStockId && (
                  <button type="button" onClick={() => { setEditingStockId(null); setStockForm(initStockForm); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1.5 rounded-lg text-[10px] tracking-widest uppercase transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 font-mono text-[10px] uppercase border-b border-gray-200">
                  <tr><th className="px-3 py-2 font-bold">SKU</th><th className="px-3 py-2 font-bold">Item Details</th><th className="px-3 py-2 font-bold">Location</th><th className="px-3 py-2 font-bold text-right">In Vault</th><th className="px-3 py-2 font-bold text-center">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stock.length === 0 && <tr><td colSpan="5" className="text-center py-6 text-gray-400 uppercase tracking-widest font-bold text-[10px]">No SKUs registered.</td></tr>}
                  {stock.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 font-mono text-blue-600 font-bold text-[10px]">{item.sku}</td>
                      <td className="px-3 py-2">
                        <p className="font-bold text-gray-800 text-xs">{item.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0">{item.category}</p>
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-600 text-[10px]">{item.locationBin}</td>
                      <td className="px-3 py-2 font-mono font-bold text-right text-gray-800 text-xs">
                        {item.quantity} <span className="text-[10px] text-gray-400 ml-1 uppercase">{item.unit}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => editStock(item)} className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-500">Edit</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => deleteStock(item._id)} className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:text-red-500">Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INFLOW & OUTFLOW */}
      {activeTab === 'INFLOW & OUTFLOW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white border border-gray-200 p-3 rounded-xl h-fit">
            <h2 className="text-[10px] uppercase tracking-widest font-bold mb-3 text-gray-500 border-b border-gray-200 pb-1">
              {editingTxId ? 'Edit Movement' : 'Log Dispatch / Delivery'}
            </h2>
            <form onSubmit={handleTxSubmit} className="space-y-2">
              <div className="flex gap-2">
                <button type="button" onClick={() => setTxForm({...txForm, type: 'INFLOW'})} className={`flex-1 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors ${txForm.type === 'INFLOW' ? 'bg-green-600 text-white' : 'bg-gray-100 border border-gray-300 text-gray-500'}`}>Inflow</button>
                <button type="button" onClick={() => setTxForm({...txForm, type: 'OUTFLOW'})} className={`flex-1 py-1 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors ${txForm.type === 'OUTFLOW' ? 'bg-orange-600 text-white' : 'bg-gray-100 border border-gray-300 text-gray-500'}`}>Outflow</button>
              </div>
              <select required value={txForm.itemId} onChange={e => setTxForm({...txForm, itemId: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs text-gray-700">
                <option value="">Select Item...</option>
                {stock.map(s => <option key={s._id} value={s._id}>{s.name} ({s.quantity} {s.unit} in stock)</option>)}
              </select>
              <input type="number" step="0.1" placeholder="Quantity Moved" required value={txForm.quantity} onChange={e => setTxForm({...txForm, quantity: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs" />
              <input type="text" placeholder="Ref No (Invoice/Branch)" required value={txForm.reference} onChange={e => setTxForm({...txForm, reference: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs" />
              <select required value={txForm.handledBy} onChange={e => setTxForm({...txForm, handledBy: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs text-gray-700">
                <option value="">Handled By...</option>
                {staff.map(s => <option key={s._id} value={s.name}>{s.name} ({s.role})</option>)}
              </select>
              
              <div className="flex gap-2 pt-1">
                <button type="submit" className={`flex-1 text-white font-bold py-1.5 rounded-lg text-[10px] tracking-widest uppercase transition-colors ${txForm.type === 'INFLOW' ? 'bg-green-600 hover:bg-green-500' : 'bg-orange-600 hover:bg-orange-500'}`}>
                  {editingTxId ? 'Update Ledger' : 'Record Movement'}
                </button>
                {editingTxId && (
                  <button type="button" onClick={() => { setEditingTxId(null); setTxForm(initTxForm); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1.5 rounded-lg text-[10px] tracking-widest uppercase transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 font-mono text-[10px] uppercase border-b border-gray-200">
                <tr><th className="px-3 py-2 font-bold">Date & Time</th><th className="px-3 py-2 font-bold">Movement</th><th className="px-3 py-2 font-bold">Handler / Ref</th><th className="px-3 py-2 font-bold text-right">Qty</th><th className="px-3 py-2 font-bold text-center">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 && <tr><td colSpan="5" className="text-center py-6 text-gray-400 uppercase tracking-widest font-bold text-[10px]">No movements logged.</td></tr>}
                {transactions.map(tx => (
                  <tr key={tx._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 text-gray-600 font-mono text-[10px]">{new Date(tx.date).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-1 ${tx.type === 'INFLOW' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{tx.type}</span>
                      <span className="text-gray-800 font-bold text-xs">{tx.itemName}</span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-gray-800 text-xs">{tx.handledBy}</p>
                      <p className="text-gray-500 text-[10px] font-mono mt-0">{tx.reference}</p>
                    </td>
                    <td className={`px-3 py-2 font-mono font-bold text-right ${tx.type === 'INFLOW' ? 'text-green-600' : 'text-orange-600'} text-xs`}>
                      {tx.type === 'INFLOW' ? '+' : '-'}{tx.quantity}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <button onClick={() => editTx(tx)} className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-500">Edit</button>
                        <button onClick={() => deleteTx(tx._id)} className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:text-red-500">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PERSONNEL */}
      {activeTab === 'PERSONNEL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white border border-gray-200 p-3 rounded-xl h-fit">
            <h2 className="text-[10px] uppercase tracking-widest font-bold mb-3 text-gray-500 border-b border-gray-200 pb-1">
              {editingStaffId ? 'Edit Logistics Staff' : 'Add Logistics Staff'}
            </h2>
            <form onSubmit={handleStaffSubmit} className="space-y-2">
              <input type="text" placeholder="Full Name" required value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs" />
              <select required value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs text-gray-700">
                <option value="Manager">Warehouse Manager</option>
                <option value="Forklift Operator">Forklift Operator</option>
                <option value="Picker">Order Picker</option>
                <option value="Security">Security Guard</option>
              </select>
              <select required value={staffForm.shift} onChange={e => setStaffForm({...staffForm, shift: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs text-gray-700">
                <option value="Morning">Morning Shift</option>
                <option value="Evening">Evening Shift</option>
                <option value="Night">Night Shift</option>
              </select>
              <input type="text" placeholder="Contact Number" required value={staffForm.contact} onChange={e => setStaffForm({...staffForm, contact: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 text-xs" />
              
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded-lg text-[10px] tracking-widest uppercase transition-colors">
                  {editingStaffId ? 'Update Employee' : 'Add Employee'}
                </button>
                {editingStaffId && (
                  <button type="button" onClick={() => { setEditingStaffId(null); setStaffForm(initStaffForm); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1.5 rounded-lg text-[10px] tracking-widest uppercase transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
            {staff.length === 0 && <p className="col-span-full text-center py-6 text-gray-400 uppercase tracking-widest font-bold text-[10px]">No staff registered.</p>}
            {staff.map(s => (
              <div key={s._id} className="bg-white border border-gray-200 p-3 rounded-xl flex items-center gap-2.5 hover:border-gray-400 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-600 shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 leading-tight text-xs">{s.name}</h3>
                  <p className="text-blue-600 text-[10px] uppercase tracking-widest font-bold mt-0">{s.role}</p>
                  <p className="text-gray-500 text-[10px] mt-0">Shift: {s.shift} • {s.contact}</p>
                </div>
                <div className="flex flex-col gap-0.5 shrink-0 border-l border-gray-200 pl-2">
                  <button onClick={() => editStaff(s)} className="text-[10px] text-blue-600 hover:text-blue-500 uppercase tracking-widest font-bold text-right">Edit</button>
                  <button onClick={() => deleteStaff(s._id)} className="text-[10px] text-red-600 hover:text-red-500 uppercase tracking-widest font-bold text-right">Del</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default Warehouse;
