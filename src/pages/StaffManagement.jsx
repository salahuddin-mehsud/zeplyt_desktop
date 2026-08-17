// src/pages/StaffManagement.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import useCurrency from '../hooks/useCurrency';

const ROLES = ['Manager', 'Cashier', 'Waiter', 'Chef', 'Driver', 'Security', 'Warehouse', 'Other'];

const ROLE_COLORS = {
  Manager: 'text-purple-700 bg-purple-100 border-purple-200',
  Cashier: 'text-emerald-700 bg-emerald-100 border-emerald-200',
  Waiter: 'text-blue-700 bg-blue-100 border-blue-200',
  Chef: 'text-orange-700 bg-orange-100 border-orange-200',
  Driver: 'text-amber-700 bg-amber-100 border-amber-200',
  Security: 'text-slate-700 bg-slate-100 border-slate-200',
  Warehouse: 'text-cyan-700 bg-cyan-100 border-cyan-200',
  Other: 'text-gray-700 bg-gray-100 border-gray-200'
};

// Get user role from JWT
const getUserRole = () => {
  const token = localStorage.getItem('token');
  if (!token) return 'user';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || 'user';
  } catch {
    return 'user';
  }
};

export default function StaffManagement() {
  const { currencySymbol } = useCurrency();
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';          // full access
  const isUser = userRole === 'user';            // read-only

  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState('roster');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Waiter',
    shift: 'Morning',
    contact: '',
    baseSalaryBHD: 0,
    joinedAt: new Date().toISOString().split('T')[0]
  });

  // Payroll states (only for admin)
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [payrollStatus, setPayrollStatus] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payData, setPayData] = useState({
    employeeId: '',
    amount: 0,
    paymentType: 'Cash',
    notes: ''
  });

  const fetchStaff = async () => {
    try {
      const res = await api.get('/staff');
      setStaff(res.data);
    } catch (err) { console.error("Error fetching staff", err); }
  };

  const fetchPayrollSummary = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/staff/payroll-summary');
      setPayrollSummary(res.data);
    } catch (err) { console.error("Error fetching payroll summary", err); }
  };

  const fetchPayrollStatus = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/staff/payroll-status');
      setPayrollStatus(res.data);
    } catch (err) { console.error("Error fetching payroll status", err); }
  };

  useEffect(() => {
    fetchStaff();
    if (isAdmin) {
      fetchPayrollSummary();
      fetchPayrollStatus();
    }
  }, []);

  const refreshPayroll = () => {
    fetchPayrollSummary();
    fetchPayrollStatus();
  };

  // Modal handlers
  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      role: 'Waiter',
      shift: 'Morning',
      contact: '',
      baseSalaryBHD: 0,
      joinedAt: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const openEditModal = (employee) => {
    setEditingId(employee._id);
    setFormData({
      name: employee.name,
      role: employee.role,
      shift: employee.shift || '',
      contact: employee.contact || '',
      baseSalaryBHD: employee.baseSalaryBHD || 0,
      joinedAt: employee.joinedAt ? new Date(employee.joinedAt).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/staff/${editingId}`, formData);
      } else {
        await api.post('/staff', formData);
      }
      setShowModal(false);
      fetchStaff();
    } catch (err) { alert("Failed to save employee data"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently remove this employee?")) return;
    try {
      await api.delete(`/staff/${id}`);
      fetchStaff();
    } catch (err) { console.error(err); }
  };

  // Payment handlers
  const openPayModal = (employeeId, pendingAmount) => {
    setPayData({
      employeeId,
      amount: pendingAmount,
      paymentType: 'Cash',
      notes: ''
    });
    setShowPayModal(true);
  };

  const handlePaySubmit = async (e) => {
  e.preventDefault();
  try {
    await api.post('/staff/pay', {
      employeeId: payData.employeeId,
      amount: payData.amount,
      paymentType: payData.paymentType,
      notes: payData.notes
    });
    setShowPayModal(false);
    // Add a 500ms delay to let the DB commit
    setTimeout(() => {
      refreshPayroll();
      fetchStaff();
    }, 500);
  } catch (err) {
    alert("Payment failed: " + (err.response?.data?.message || err.message));
  }
};

  return (
    <div className="p-3 md:p-4 text-gray-800 font-sans max-w-[1600px] mx-auto min-h-screen bg-gray-50">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-2 mb-4 gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight mb-0.5 text-gray-800">Staff & Personnel</h1>
          <p className="text-xs text-gray-500 font-medium tracking-wide">Manage your team, roles, and payroll.</p>
        </div>
        {isAdmin && (
          <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-1.5 rounded-lg transition-colors text-[10px] uppercase tracking-widest">
            + Add Employee
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'roster' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('roster')}
        >
          Team Roster
        </button>
        {isAdmin && (
          <button
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'pay' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('pay')}
          >
            Pay Staff
          </button>
        )}
      </div>

      {activeTab === 'roster' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0">Total Employees</p>
              <p className="text-2xl font-bold text-gray-800">{staff.length}</p>
            </div>
            <div className="bg-white border border-blue-200 p-3 rounded-xl shadow-sm">
              <p className="text-[10px] text-blue-600 uppercase font-bold tracking-widest mb-0">Monthly Payroll</p>
              <p className="text-2xl font-mono font-bold text-blue-600">
                {currencySymbol} {staff.reduce((sum, emp) => sum + (emp.baseSalaryBHD || 0), 0).toFixed(3)}
              </p>
            </div>
            <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0">Active Roles</p>
              <p className="text-2xl font-bold text-gray-800">{new Set(staff.map(emp => emp.role)).size}</p>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 font-mono text-[10px] uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 font-bold">Employee</th>
                    <th className="px-3 py-2 font-bold">Role</th>
                    <th className="px-3 py-2 font-bold">Shift</th>
                    <th className="px-3 py-2 font-bold">Alloted Salary</th>
                    <th className="px-3 py-2 font-bold">Joined</th>
                    {isAdmin && <th className="px-3 py-2 font-bold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staff.length === 0 && (
                    <tr><td colSpan={isAdmin ? 6 : 5} className="text-center py-6 text-gray-400 uppercase tracking-widest font-bold text-[10px]">No staff registered.</td></tr>
                  )}
                  {staff.map(emp => (
                    <tr key={emp._id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center font-bold text-xs text-gray-600">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-xs">{emp.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0">{emp.contact || 'No Phone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`border px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold ${ROLE_COLORS[emp.role] || ROLE_COLORS['Other']}`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700 text-[10px]">
                        <span className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                          {emp.shift || 'Flexible'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-green-600 font-bold text-right text-xs">
                        {currencySymbol} {emp.baseSalaryBHD.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-[10px]">
                        {emp.joinedAt ? new Date(emp.joinedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(emp)} className="text-gray-500 hover:text-blue-600 text-[10px] uppercase tracking-widest font-bold transition-colors">Edit</button>
                            <button onClick={() => handleDelete(emp._id)} className="text-gray-400 hover:text-red-600 text-[10px] uppercase tracking-widest font-bold transition-colors">Del</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'pay' && isAdmin && (
        <div>
          {/* Payroll Summary Cards */}
          {payrollSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0">Total Monthly Payroll</p>
                <p className="text-2xl font-mono font-bold text-gray-800">{currencySymbol} {payrollSummary.totalDue.toFixed(3)}</p>
              </div>
              <div className="bg-white border border-yellow-200 p-3 rounded-xl shadow-sm">
                <p className="text-[10px] text-yellow-600 uppercase font-bold tracking-widest mb-0">
                  Pending Payroll ({payrollSummary.pendingPercentage?.toFixed(1) || 0}%)
                </p>
                <p className="text-2xl font-mono font-bold text-yellow-600">{currencySymbol} {payrollSummary.totalPending.toFixed(3)}</p>
              </div>
              <div className="bg-white border border-green-200 p-3 rounded-xl shadow-sm">
                <p className="text-[10px] text-green-600 uppercase font-bold tracking-widest mb-0">
                  Paid Payroll ({payrollSummary.paidPercentage?.toFixed(1) || 0}%)
                </p>
                <p className="text-2xl font-mono font-bold text-green-600">{currencySymbol} {payrollSummary.totalPaid.toFixed(3)}</p>
              </div>
            </div>
          )}

          {/* Pending & Paid Lists */}
          {payrollSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white border border-yellow-200 rounded-xl shadow-sm p-3">
                <h4 className="text-xs font-bold text-yellow-700 uppercase tracking-widest mb-2">Pending Employees</h4>
                {payrollSummary.pendingEmployees?.length === 0 ? (
                  <p className="text-xs text-gray-500">All employees are fully paid.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {payrollSummary.pendingEmployees.map(emp => (
                      <li key={emp.employeeId} className="py-1 flex justify-between text-xs">
                        <span><span className="font-bold">{emp.name}</span> ({emp.role})</span>
                        <span className="text-yellow-600 font-mono">{currencySymbol} {emp.pendingAmount.toFixed(3)} pending</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-white border border-green-200 rounded-xl shadow-sm p-3">
                <h4 className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2">Paid Employees</h4>
                {payrollSummary.paidEmployees?.length === 0 ? (
                  <p className="text-xs text-gray-500">No employees fully paid yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {payrollSummary.paidEmployees.map(emp => (
                      <li key={emp.employeeId} className="py-1 flex justify-between text-xs">
                        <span><span className="font-bold">{emp.name}</span> ({emp.role})</span>
                        <span className="text-green-600 font-mono">{currencySymbol} {emp.paidAmount.toFixed(3)} paid</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Payroll Status Table with Pay Buttons */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Employee Payroll Status</h3>
              <button onClick={refreshPayroll} className="text-blue-600 hover:text-blue-800 text-[10px] font-bold uppercase tracking-widest">
                ↻ Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 font-mono text-[10px] uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 font-bold">Employee</th>
                    <th className="px-3 py-2 font-bold">Role</th>
                    <th className="px-3 py-2 font-bold text-right">Alloted Salary</th>
                    <th className="px-3 py-2 font-bold text-right">Paid</th>
                    <th className="px-3 py-2 font-bold text-right">Pending</th>
                    <th className="px-3 py-2 font-bold">Next Payment Date</th>
                    {isAdmin && <th className="px-3 py-2 font-bold text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payrollStatus.length === 0 && (
                    <tr><td colSpan={isAdmin ? 7 : 6} className="text-center py-6 text-gray-400 uppercase tracking-widest font-bold text-[10px]">No active employees.</td></tr>
                  )}
                  {payrollStatus.map(emp => (
                    <tr key={emp.employeeId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 font-bold text-gray-800">{emp.name}</td>
                      <td className="px-3 py-2">
                        <span className={`border px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold ${ROLE_COLORS[emp.role] || ROLE_COLORS['Other']}`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-right text-gray-700">{currencySymbol} {emp.baseSalaryBHD.toFixed(3)}</td>
                      <td className="px-3 py-2 font-mono text-right text-green-600">{currencySymbol} {emp.paidAmount.toFixed(3)}</td>
                      <td className="px-3 py-2 font-mono text-right text-yellow-600">{currencySymbol} {emp.pendingAmount.toFixed(3)}</td>
                      <td className="px-3 py-2 text-gray-500 text-[10px]">{emp.nextPaymentDate}</td>
                      {isAdmin && (
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => openPayModal(emp.employeeId, emp.pendingAmount)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded transition-colors uppercase tracking-widest"
                            disabled={emp.pendingAmount === 0}
                          >
                            Pay
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 p-5 rounded-xl w-full max-w-sm shadow-xl">
            <h2 className="text-base font-bold mb-3 text-gray-800 tracking-tight">
              {editingId ? 'Edit Employee' : 'Add Employee'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5 block">Full Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-sm text-gray-800 transition-colors" placeholder="e.g., Ali Raza" />
              </div>
              
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5 block">Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-sm text-gray-800 transition-colors cursor-pointer">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5 block">Contact</label>
                <input type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-sm text-gray-800 transition-colors font-mono" placeholder="0300-1234567" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5 block">Shift</label>
                  <input type="text" value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-sm text-gray-800 transition-colors" placeholder="Morning" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5 block">Alloted Salary ({currencySymbol})</label>
                  <input type="number" step="0.001" required value={formData.baseSalaryBHD} onChange={e => setFormData({...formData, baseSalaryBHD: Number(e.target.value)})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-sm text-gray-800 transition-colors font-mono" placeholder="0.000" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5 block">Joining Date</label>
                <input type="date" required value={formData.joinedAt} onChange={e => setFormData({...formData, joinedAt: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-sm text-gray-800 transition-colors" />
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-transparent border border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-100 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors">
                  {editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 p-5 rounded-xl w-full max-w-sm shadow-xl">
            <h2 className="text-base font-bold mb-3 text-gray-800 tracking-tight">Record Payment</h2>
            <form onSubmit={handlePaySubmit} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5 block">Amount ({currencySymbol})</label>
                <input type="number" step="0.001" required value={payData.amount} onChange={e => setPayData({...payData, amount: Number(e.target.value)})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-sm text-gray-800 transition-colors font-mono" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5 block">Payment Type</label>
                <select value={payData.paymentType} onChange={e => setPayData({...payData, paymentType: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-sm text-gray-800 transition-colors cursor-pointer">
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5 block">Notes</label>
                <input type="text" value={payData.notes} onChange={e => setPayData({...payData, notes: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-sm text-gray-800 transition-colors" placeholder="Optional" />
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 bg-transparent border border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-100 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 text-white py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors">
                  Pay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
