// src/pages/Financials.jsx
import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import useCurrency from '../hooks/useCurrency';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, 
  Treemap, Radar, RadarChart, PolarGrid, PolarAngleAxis 
} from 'recharts';

const Financials = () => {
  const { currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState('PROFIT & LOSS');
  const [pnlData, setPnlData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const navigate = useNavigate(); 
  // Staff State
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  
  // Editing State
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({ type: 'Utility', description: '', amount: '' });

  // Date Filtering State
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [includeStaffPayroll, setIncludeStaffPayroll] = useState(false);
  const [filterMode, setFilterMode] = useState('month'); 
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  const fetchFinancials = async (options = {}) => {
  setIsLoading(true);
  let query = '';
  
  const modeToUse = options.resetMode || filterMode;
  const monthToUse = options.resetMonth || selectedMonth;

  if (modeToUse === 'month' && monthToUse) {
    const [year, month] = monthToUse.split('-');
    const start = new Date(year, parseInt(month) - 1, 1, 0, 0, 0);
    const end = new Date(year, parseInt(month), 0, 23, 59, 59, 999);
    query = `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
  } else if (modeToUse === 'range' && startDate && endDate) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    query = `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
  }

  // Append staff payroll toggle
  if (query) {
    query += `&includeStaffPayroll=${includeStaffPayroll}`;
  } else {
    query = `?includeStaffPayroll=${includeStaffPayroll}`;
  }

  try {
    const [pnlRes, expRes] = await Promise.all([
      api.get(`/business/financials/pnl${query}`),
      api.get('/business/expenses')
    ]);
    setPnlData(pnlRes.data);
    setExpenses(expRes.data);
  } catch (err) {
    console.error("Failed to fetch financials:", err);
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    api.get('/staff').then(res => setStaffList(res.data)).catch(console.error);
  }, []);

  useEffect(() => { 
    fetchFinancials(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const payload = { type: expenseForm.type, amount: Number(expenseForm.amount), description: expenseForm.description };

    if (payload.type === 'Employee Salary' && selectedStaff) {
      const employee = staffList.find(s => s._id === selectedStaff);
      if (employee) {
        payload.staffId = employee._id;
        payload.staffName = employee.name;
        if (!payload.description) payload.description = `Salary payment for ${employee.name} (${employee.role})`;
      }
    }

    try {
      if (editingExpenseId) {
        await api.put(`/business/expenses/${editingExpenseId}`, payload);
      } else {
        await api.post('/business/expenses', payload);
      }
      
      setExpenseForm({ type: 'Utility', description: '', amount: '' });
      setSelectedStaff('');
      setEditingExpenseId(null);
      fetchFinancials();
    } catch (error) {
      console.error("Failed to log liability:", error);
      alert("Failed to save liability.");
    }
  };

  const handleEditExpense = (exp) => {
    setEditingExpenseId(exp._id);
    setExpenseForm({ type: exp.type, description: exp.description, amount: exp.amount });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditExpense = () => {
    setEditingExpenseId(null);
    setExpenseForm({ type: 'Utility', description: '', amount: '' });
    setSelectedStaff('');
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this liability?')) return;
    try {
      await api.delete(`/business/expenses/${id}`);
      fetchFinancials();
    } catch (err) {
      alert("Failed to delete liability.");
    }
  };

  // --- CHART DATA PREPARATION ---
  const expenseChartData = useMemo(() => {
    if (!pnlData) return [];
    return Object.entries(pnlData.expenses.breakdown).map(([name, value]) => ({ name, value }));
  }, [pnlData]);

  const waterfallData = useMemo(() => {
    if (!pnlData) return [];
    const { revenue, expenses, profitability } = pnlData;
    const directExp = expenses.totalOutflow - expenses.cogs;
    return [
      { name: 'Gross', value: revenue.totalGross, fill: '#3b82f6' }, // Blue
      { name: 'Tax', value: -revenue.totalTax, fill: '#ef4444' }, // Red
      { name: 'Net Rev', value: revenue.totalNet, fill: '#10b981' }, // Green
      { name: 'COGS', value: -expenses.cogs, fill: '#ef4444' }, // Red
      { name: 'Expenses', value: -directExp, fill: '#f97316' }, // Orange
      { name: 'Profit', value: profitability.netProfit, fill: profitability.netProfit >= 0 ? '#10b981' : '#ef4444' }
    ];
  }, [pnlData]);

  const radarData = useMemo(() => {
    if (!pnlData) return [];
    return [
      { subject: 'Gross Rev', A: pnlData.revenue.totalGross, fullMark: Math.max(pnlData.revenue.totalGross, 1000) },
      { subject: 'Net Rev', A: pnlData.revenue.totalNet, fullMark: Math.max(pnlData.revenue.totalGross, 1000) },
      { subject: 'COGS', A: pnlData.expenses.cogs, fullMark: Math.max(pnlData.revenue.totalGross, 1000) },
      { subject: 'Liabilities', A: pnlData.expenses.totalOutflow, fullMark: Math.max(pnlData.revenue.totalGross, 1000) },
      { subject: 'Profit', A: pnlData.profitability.netProfit, fullMark: Math.max(pnlData.revenue.totalGross, 1000) },
    ];
  }, [pnlData]);

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#3b82f6', '#8b5cf6', '#d946ef'];

  const handleExport = (reportType, format) => {
    if (!pnlData) return alert("Data not loaded yet.");

    let period = 'All Time History';
    if (filterMode === 'month') {
      const [year, month] = selectedMonth.split('-');
      const date = new Date(year, parseInt(month) - 1, 1);
      period = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else if (startDate && endDate) {
      period = `${startDate} to ${endDate}`;
    }

    const timestamp = new Date().toLocaleString();

    if (format === 'PDF') {
      const doc = new jsPDF();
      const blue = [37, 99, 235];
      const dark = [24, 24, 27];

      doc.setFontSize(22); doc.setTextColor(blue[0], blue[1], blue[2]);
      doc.text("ZEPLYT POS BUSINESS SOLUTIONS", 14, 20);
      doc.setFontSize(10); doc.setTextColor(100, 100, 100);
      doc.text(`Official Document: ${reportType.toUpperCase()}`, 14, 28);
      doc.text(`Reporting Period: ${period}`, 14, 33);
      doc.text(`System Generated: ${timestamp}`, 14, 38);
      doc.line(14, 42, 196, 42);

      if (reportType === 'Full Financial Ledger') {
        doc.setFontSize(12); doc.setTextColor(0); doc.text("1. Executive Summary", 14, 50);
        autoTable(doc, {
          startY: 55,
          head: [['Metric', `${currencySymbol} Amount`]],
          body: [
            ['Gross Sales (Revenue)', pnlData.revenue.totalGross.toFixed(3)],
            ['VAT Collected (10%)', pnlData.revenue.totalTax.toFixed(3)],
            ['Inventory Cost (COGS Assumption)', pnlData.expenses.cogs.toFixed(3)],
            ['Direct Operational Expenses', (pnlData.expenses.totalOutflow - pnlData.expenses.cogs).toFixed(3)],
            ['NET PROFIT', { content: pnlData.profitability.netProfit.toFixed(3), styles: { fontStyle: 'bold' } }]
          ],
          theme: 'striped', headStyles: { fillColor: blue }
        });

        doc.text("2. Itemized Operational Expenses", 14, doc.lastAutoTable.finalY + 15);
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 20,
          head: [['Date', 'Category', 'Description', 'Amount']],
          body: expenses.map(e => [new Date(e.date).toLocaleDateString(), e.type, e.description, e.amount.toFixed(3)]),
          headStyles: { fillColor: dark }
        });
      }

      else if (reportType === 'Sales & Profit Analysis') {
        doc.setFontSize(12); doc.text("Profitability & Margin Breakdown", 14, 50);
        autoTable(doc, {
          startY: 55,
          head: [['Analysis Component', 'Data Value']],
          body: [
            ['Total Net Sales', `${currencySymbol} ${pnlData.revenue.totalNet.toFixed(3)}`],
            ['Gross Profit Margin', `${currencySymbol} ${pnlData.profitability.grossProfit.toFixed(3)}`],
            ['Return on Investment (ROI)', `${pnlData.profitability.roiMargin.toFixed(2)}%`],
            ['Net Profitability', `${currencySymbol} ${pnlData.profitability.netProfit.toFixed(3)}`]
          ],
          headStyles: { fillColor: [16, 185, 129] }
        });
      }

      else if (reportType === 'Tax Compliance Report') {
        doc.setFontSize(14); doc.text("VAT Return Calculation (Standard Rate 10%)", 14, 50);
        autoTable(doc, {
          startY: 55,
          head: [['VAT Box Reference', 'Taxable Amount', 'VAT Amount']],
          body: [
            ['Box 1: Standard Rated Sales', pnlData.revenue.totalGross.toFixed(3), pnlData.revenue.totalTax.toFixed(3)],
            ['Box 2: Total Adjustments', '0.000', '0.000'],
            ['TOTAL PAYABLE FOR PERIOD', '', { content: `${currencySymbol} ${pnlData.revenue.totalTax.toFixed(3)}`, styles: { fontStyle: 'bold', fillColor: [254, 226, 226] } }]
          ],
          headStyles: { fillColor: [220, 38, 38] }
        });
      }
      doc.save(`ZEPLYT_${reportType.replace(/\s+/g, '_')}.pdf`);
    }

    if (format === 'EXCEL') {
        const wb = XLSX.utils.book_new();
        let sheetData = [
            { "Report": reportType, "Period": period },
            { "Metric": "Gross Sales", "Amount": pnlData.revenue.totalGross },
            { "Metric": "VAT 10%", "Amount": pnlData.revenue.totalTax },
            { "Metric": "Net Profit", "Amount": pnlData.profitability.netProfit }
        ];
        const ws = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, "FinancialData");
        XLSX.writeFile(wb, `ZEPLYT_Excel_Export.xlsx`);
    }
  };

return (
    // 🚨 FIX: fixed inset-0 z-50 completely covers the sidebar
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50 text-gray-800 font-sans">
      <div className="p-4 max-w-[1600px] mx-auto min-h-screen">
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6 mb-6 gap-4">
          <div>
            {/* 🚨 FIX: Added Exit Button next to Title */}
            <div className="flex items-center gap-3 mb-4">
  <button 
    onClick={() => navigate('/dashboard')} 
    className="text-gray-500 hover:text-gray-700 font-bold text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
  >
    ← Exit
  </button>
  <h1 className="text-lg font-bold tracking-tight text-gray-800">Financial Ledger</h1>
</div>


            <div className="flex gap-4 text-xs font-bold text-gray-400 overflow-x-auto hide-scrollbar pb-1">
{['PROFIT & LOSS', 'LIABILITIES & EXPENSES', 'TAX & Reports'].map(tab => (
  <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 pb-2 uppercase tracking-wider transition-colors ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-500' : 'hover:text-gray-600'}`}>
    {tab}
  </button>
))}
</div>

        </div>

        
        <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-xl shadow-sm flex-wrap">
  <select 
    value={filterMode} 
    onChange={(e) => {
      setFilterMode(e.target.value);
      if (e.target.value === 'month') {
        setStartDate(''); setEndDate('');
        setSelectedMonth(currentMonthStr);
      } else {
        setSelectedMonth('');
      }
    }}
    className="bg-transparent text-gray-500 text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer hover:text-gray-700 transition-colors px-2 py-1"
  >
    <option value="month">Specific Month</option>
    <option value="range">Date Range</option>
  </select>
  
  <div className="h-4 w-px bg-gray-200 mx-0.5"></div>

    <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer">
    <input
      type="checkbox"
      checked={includeStaffPayroll}
      onChange={(e) => {
        setIncludeStaffPayroll(e.target.checked);
        // Refetch after toggle
        setTimeout(() => fetchFinancials({ resetMode: filterMode, resetMonth: selectedMonth }), 100);
      }}
      className="w-8 h-4 rounded-full bg-gray-300 checked:bg-blue-600 transition-colors appearance-none cursor-pointer relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:bg-white after:rounded-full after:shadow after:transition-transform checked:after:translate-x-4"
    />
    Include Staff Payroll
  </label>

  {filterMode === 'month' ? (
    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-50 text-gray-700 px-2 py-1 rounded-lg outline-none border border-gray-200 text-xs focus:border-blue-400" />
  ) : (
    <div className="flex items-center gap-1.5">
      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-50 text-gray-700 px-2 py-1 rounded-lg outline-none border border-gray-200 text-xs focus:border-blue-400" />
      <span className="text-gray-300 text-xs">-</span>
      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-50 text-gray-700 px-2 py-1 rounded-lg outline-none border border-gray-200 text-xs focus:border-blue-400" />
    </div>
  )}

  <button onClick={() => fetchFinancials()} disabled={isLoading} className="ml-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm disabled:opacity-70 min-w-[90px] flex justify-center items-center">
    {isLoading ? 'Fetching...' : 'Apply'}
  </button>

  <button onClick={() => { 
      setFilterMode('month'); setSelectedMonth(currentMonthStr); setStartDate(''); setEndDate('');
      fetchFinancials({ resetMode: 'month', resetMonth: currentMonthStr });
    }}
    className="px-2 py-1 text-[9px] font-bold text-gray-400 hover:text-gray-600 border-l border-gray-200 uppercase ml-1 transition-colors"
  >
    Clear
  </button>
</div>


      </div>

      {/* 🚨 HIGHLY VISUAL PROFIT & LOSS DASHBOARD 🚨 */}
      {activeTab === 'PROFIT & LOSS' && pnlData && (
        <div className="space-y-6">
          
          {/* Top KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Gross Revenue</p>
    <p className="text-xl font-black font-mono text-blue-600">{currencySymbol} {pnlData.revenue.totalGross.toFixed(2)}</p>
  </div>
  <div className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm">
  <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider mb-0.5">Pending Payroll</p>
  <p className="text-xl font-black font-mono text-yellow-600">
    {currencySymbol} {pnlData.staffPayroll?.pendingPayroll?.toFixed(2) || '0.00'}
  </p>
  <p className="text-[8px] text-gray-400 mt-0.5">Unpaid salaries this month</p>
</div>
  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Expenses</p>
    <p className="text-xl font-black font-mono text-orange-500">{currencySymbol} {pnlData.expenses.totalOutflow.toFixed(2)}</p>
  </div>
  <div className={`border rounded-xl p-4 shadow-sm ${pnlData.profitability.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
    <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${pnlData.profitability.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net Profit</p>
    <p className={`text-2xl font-black font-mono ${pnlData.profitability.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currencySymbol} {pnlData.profitability.netProfit.toFixed(2)}</p>
  </div>

</div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            
            {/* Waterfall P&L Flow */}
           <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 h-[320px] shadow-sm">
  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">P&L Waterfall Flow</h3>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={waterfallData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
      <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
      <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${currencySymbol} ${val}`} />
      <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#1f2937', fontSize: '11px', borderRadius: '6px' }} formatter={(val) => `${currencySymbol} ${val.toFixed(2)}`} />
      <Bar dataKey="value" radius={[3, 3, 3, 3]} isAnimationActive={false}>
        {waterfallData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.fill} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>

            {/* Radar Comparison */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 h-[320px] shadow-sm">
  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Health Radar</h3>
  <ResponsiveContainer width="100%" height="100%">
    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
      <PolarGrid stroke="#e5e7eb" />
      <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 9 }} />
      <Radar name="Metrics" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} isAnimationActive={false} />
      <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#1f2937', fontSize: '11px', borderRadius: '6px' }} />
    </RadarChart>
  </ResponsiveContainer>
</div>

            {/* Expense Donut Chart */}
           <div className="bg-white border border-gray-200 rounded-xl p-4 h-[320px] shadow-sm">
  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Expense Breakdown</h3>
  {expenseChartData.length > 0 ? (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={expenseChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" stroke="#fff" strokeWidth={1} isAnimationActive={false}>
          {expenseChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#1f2937', borderRadius: '6px', fontSize: '11px' }} formatter={(val) => `${currencySymbol} ${val.toFixed(2)}`} />
        <Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: '9px', color: '#6b7280' }}/>
      </PieChart>
    </ResponsiveContainer>
  ) : (
    <div className="flex h-full items-center justify-center text-gray-400 font-bold uppercase tracking-wider text-xs">No expenses logged</div>
  )}
</div>

            {/* Expense Hierarchy Treemap */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 h-[320px] shadow-sm">
  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Liability Hierarchy (Treemap)</h3>
  {expenseChartData.length > 0 ? (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap data={expenseChartData} dataKey="value" stroke="#fff" fill="#e5e7eb" isAnimationActive={false}>
        <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#1f2937', fontSize: '11px', borderRadius: '6px' }} formatter={(val) => `${currencySymbol} ${val.toFixed(2)}`} />
      </Treemap>
    </ResponsiveContainer>
  ) : (
    <div className="flex h-full items-center justify-center text-gray-400 font-bold uppercase tracking-wider text-xs">No liabilities to map</div>
  )}
</div>

          </div>
        </div>
      )}

      {/* LIABILITIES & EXPENSES */}
      {activeTab === 'LIABILITIES & EXPENSES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <div className="lg:col-span-1 bg-white border border-gray-200 p-5 rounded-xl shadow-sm h-fit">
  <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
    <h2 className={`text-xs uppercase tracking-wider font-bold ${editingExpenseId ? 'text-blue-600' : 'text-gray-500'}`}>
      {editingExpenseId ? '✏️ Edit Liability' : 'Log New Liability'}
    </h2>
    {editingExpenseId && (
      <button onClick={cancelEditExpense} className="text-[10px] text-gray-400 hover:text-gray-600 font-bold uppercase tracking-wider">Cancel</button>
    )}
  </div>
  
  <form onSubmit={handleAddExpense} className="space-y-3">
    <select required value={expenseForm.type} onChange={e => setExpenseForm({...expenseForm, type: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-sm text-gray-700">
      <option value="Employee Salary">Employee Salary</option>
      <option value="Rent">Real Estate Rent</option>
      <option value="Utility">Utility</option>
      <option value="Software/Subscription">Software</option>
      <option value="Equipment">Equipment</option>
      <option value="Marketing">Marketing</option>
      <option value="Other">Other</option>
    </select>

    {expenseForm.type === 'Employee Salary' && (
      <div>
        <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-sm text-blue-600 font-bold">
          <option value="">-- Choose Employee --</option>
          {staffList.map(emp => (
            <option key={emp._id} value={emp._id}>{emp.name} ({emp.role}) - Base: {currencySymbol} {emp.baseSalaryBHD?.toFixed(2) || '0.00'}</option>
          ))}
        </select>
      </div>
    )}

    <input type="text" placeholder={expenseForm.type === 'Employee Salary' ? "Description (auto-fills)" : "Description"} value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-sm text-gray-700" required={expenseForm.type !== 'Employee Salary'} />
    <input type="number" step="0.01" placeholder={`Amount (${currencySymbol})`} required value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-sm text-gray-700" />
    
    <button type="submit" className={`w-full text-white font-bold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-colors ${editingExpenseId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'}`}>
      {editingExpenseId ? 'Update Liability' : 'Record Liability'}
    </button>
  </form>
</div>
          
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
  <div className="p-3 border-b border-gray-200 bg-gray-50"><h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Logged Liabilities Ledger</h3></div>
  <div className="overflow-x-auto">
    <table className="w-full text-left text-xs">
      <thead className="bg-gray-100 text-gray-500 font-mono uppercase tracking-wider border-b border-gray-200">
        <tr><th className="px-3 py-2 font-bold">Date</th><th className="px-3 py-2 font-bold">Type</th><th className="px-3 py-2 font-bold">Description</th><th className="px-3 py-2 font-bold text-right">Amount Outflow</th><th className="px-3 py-2 font-bold text-right">Actions</th></tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {expenses.map(exp => (
          <tr key={exp._id} className={`transition-colors group ${editingExpenseId === exp._id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
            <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">{new Date(exp.date).toLocaleDateString()}</td>
            <td className="px-3 py-2"><span className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-[9px] text-gray-600 font-bold uppercase">{exp.type}</span></td>
            <td className="px-3 py-2 text-gray-700 font-medium">{exp.description}</td>
            <td className="px-3 py-2 font-mono text-red-500 font-bold text-right">- {currencySymbol} {exp.amount.toFixed(2)}</td>
            <td className="px-3 py-2 text-right">
              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEditExpense(exp)} className="text-gray-400 hover:text-blue-600 text-[9px] font-bold uppercase tracking-wider transition-colors">Edit</button>
                <button onClick={() => handleDeleteExpense(exp._id)} className="text-gray-400 hover:text-red-500 text-[9px] font-bold uppercase tracking-wider transition-colors">Del</button>
              </div>
            </td>
          </tr>
        ))}
        {expenses.length === 0 && <tr><td colSpan="5" className="text-center py-6 text-gray-400 font-bold uppercase tracking-wider text-[10px]">No liabilities logged for this period.</td></tr>}
      </tbody>
    </table>
  </div>
</div>


        </div>
      )}

      {/* TAX & Reports */}
      {activeTab === 'TAX & Reports' && pnlData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
         <div className="bg-white border border-gray-200 rounded-xl p-5 font-mono text-xs font-medium shadow-sm h-fit">
  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider font-sans mb-5 border-b border-gray-200 pb-3">Standard VAT Declaration</h3>
  <div className="divide-y divide-gray-100">
    <div className="flex justify-between py-3 border-b border-dashed border-gray-200 text-gray-500"><span>Total Taxable Revenue</span><span className="text-gray-800">{currencySymbol} {pnlData.revenue.totalGross.toFixed(2)}</span></div>
    <div className="flex justify-between py-3 border-b border-dashed border-gray-200 text-gray-500"><span>Standard VAT (10%)</span><span className="text-red-500">{currencySymbol} {pnlData.revenue.totalTax.toFixed(2)}</span></div>
    <div className="flex justify-between py-4 mt-2 border-t-2 border-gray-300 text-sm font-bold text-gray-700 font-sans uppercase"><span>TOTAL TAX PAYABLE</span><span className="text-green-600">{currencySymbol} {pnlData.revenue.totalTax.toFixed(2)}</span></div>
  </div>
</div>

         <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-5 border-b border-gray-200 pb-3">Reports Intelligence Console</h3>
  <div className="space-y-3">
    {[
      { title: 'Full Financial Ledger', desc: 'Complete audit of every sale and expense logged.', icon: '📑' },
      { title: 'Sales & Profit Analysis', desc: 'Deep dive into revenue, COGS, and ROI performance.', icon: '📈' },
      { title: 'Tax Compliance Report', desc: 'Government-ready VAT calculation summary.', icon: '🏛️' }
    ].map((report, i) => (
      <div key={i} className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex items-center justify-between hover:border-blue-300 transition-all">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{report.icon}</span>
          <div><h4 className="text-xs font-bold text-gray-700 tracking-wide">{report.title}</h4><p className="text-[9px] text-gray-400 mt-0.5">{report.desc}</p></div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => handleExport(report.title, 'PDF')} className="bg-gray-200 hover:bg-blue-600 hover:text-white text-gray-700 p-1.5 rounded-lg border border-gray-300 text-[9px] font-bold transition-colors">PDF</button>
          <button onClick={() => handleExport(report.title, 'EXCEL')} className="bg-gray-200 hover:bg-emerald-600 hover:text-white text-gray-700 p-1.5 rounded-lg border border-gray-300 text-[9px] font-bold transition-colors">XLSX</button>
        </div>
      </div>
    ))}
  </div>
</div>


        </div>
      )}
    </div>
    </div>
  );
};

export default Financials;
