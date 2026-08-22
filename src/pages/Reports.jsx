// src/pages/Reports.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useCurrency from '../hooks/useCurrency';
import { useBranch } from '../contexts/BranchContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  FaStar,
  FaSearch,
  FaFilePdf,
  FaFileExcel,
  FaPrint,
  FaTimes,
  FaCalendarAlt,
  FaSyncAlt,
  FaFilter,
  FaArrowRight,
  FaBuilding,
  FaDownload,
  FaCheckCircle,
  FaInfoCircle
} from 'react-icons/fa';

// Definition of all 63 reports across 3 categories
export const REPORT_CATEGORIES = [
  {
    id: 'general',
    title: 'General',
    reports: [
      { id: 'sales-report', title: 'Sales Report', isFavorite: true },
      { id: 'item-wise-sales-report', title: 'Item Wise Sales Report' },
      { id: 'item-wise-monthly-report', title: 'Item Wise Monthly Report' },
      { id: 'item-price-wise-report', title: 'Item Price Wise Report' },
      { id: 'balance-report', title: 'Balance Report' },
      { id: 'bank-deposits-report', title: 'Bank Deposits Report' },
      { id: 'category-item-wise-report', title: 'Category & Item Wise Report' },
      { id: 'category-group-wise-report', title: 'Category Group Wise Report' },
      { id: 'income-expense-report', title: 'Income/Expense Report' },
      { id: 'date-wise-sales-report', title: 'Date Wise Sales Report' },
      { id: 'date-wise-summary', title: 'Date Wise Summary' },
      { id: 'date-wise-item-summary', title: 'Date Wise Item Summary' },
      { id: 'hsn-summary', title: 'HSN Summary' },
      { id: 'monthly-location-report', title: 'Monthly Location Report' },
      { id: 'locations-sales-report', title: 'Locations Sales Report' },
      { id: 'taxes-report', title: 'Taxes Report' },
      { id: 'fine-dine-pending-orders', title: 'Fine Dine Pending Orders' },
      { id: 'delivery-orders', title: 'Delivery Orders' },
      { id: 'reconcile-sales-report', title: 'Reconcile Sales Report' },
      { id: 'employees-summary-report', title: 'Employees Summary Report' },
      { id: 'main-driver-summary-report', title: 'main.driver_summary_report', displayLabel: 'Driver Summary Report' },
      { id: 'summary-report', title: 'Summary Report' },
      { id: 'profit-and-loss-report', title: 'Profit And Loss Report' },
      { id: 'items-summary', title: 'Items Summary' },
      { id: 'variations-summary', title: 'Variations Summary' },
      { id: 'monthly-day-wise-report', title: 'Monthly Day Wise Report' },
      { id: 'monthly-day-item-wise-report', title: 'Monthly Day Item Wise Report' },
      { id: 'customer-due-report', title: 'Customer Due Report' },
      { id: 'offer-wise-report', title: 'Offer Wise Report' }
    ]
  },
  {
    id: 'inventory',
    title: 'Item Inventory Reports',
    reports: [
      { id: 'purchase-item-stock-report', title: 'Purchase Item Stock Report' },
      { id: 'purchase-item-request-report', title: 'Purchase Item Request Report' },
      { id: 'supplier-wise-purchase-item-stock-report', title: 'Supplier Wise Purchase Item Stock Report' },
      { id: 'item-stock-adjustment-report', title: 'Item Stock Adjustment Report' },
      { id: 'inventory-report', title: 'Inventory Report' },
      { id: 'item-stock-report', title: 'Item Stock Report' },
      { id: 'hsn-wise-stock-report', title: 'HSN Wise Stock Report' },
      { id: 'negative-stock-report', title: 'Negative Stock Report' },
      { id: 'item-stock-history-report', title: 'Item Stock History Report' },
      { id: 'daily-item-stock-report', title: 'Daily Item Stock Report' },
      { id: 'closing-stock-report', title: 'Closing Stock Report' },
      { id: 'item-stock-summary-report', title: 'Item Stock Summary Report' },
      { id: 'location-wise-item-sales-report', title: 'Location Wise Item Sales Report' },
      { id: 'location-wise-category-sales-report', title: 'Location Wise Category Sales Report' },
      { id: 'date-wise-stock-report', title: 'Date Wise Stock Report' }
    ]
  },
  {
    id: 'analytics',
    title: 'Analytics',
    reports: [
      { id: 'settlement-summary', title: 'Settlement Summary' },
      { id: 'sales-summary', title: 'Sales Summary' },
      { id: 'sales-trend', title: 'Sales Trend' },
      { id: 'sales-trend-comparison', title: 'Sales Trend Comparison' },
      { id: 'crm', title: 'CRM' },
      { id: 'payment-methods', title: 'Payment Methods' },
      { id: 'item-sales', title: 'Item Sales' },
      { id: 'item-analytics', title: 'Item Analytics' },
      { id: 'category-sales', title: 'Category Sales' },
      { id: 'variation-sales', title: 'Variation Sales' },
      { id: 'item-sales-report-tally-import', title: 'Item Sales Report (Tally Import)' },
      { id: 'item-wise-tax-report-gst', title: 'Item Wise Tax Report(GST)' },
      { id: 'sales-gst-report', title: 'Sales GST Report' },
      { id: 'customer-spending', title: 'Customer Spending' },
      { id: 'customer-analytics', title: 'Customer Analytics' },
      { id: 'customer-sales-report', title: 'Customer Sales Report' },
      { id: 'salesman-report', title: 'Salesman Report' }
    ]
  }
];

const Reports = () => {
  const navigate = useNavigate();
  const { currencySymbol } = useCurrency();
  const { activeBranchId } = useBranch() || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportRawData, setReportRawData] = useState(null);

  // Date range filter states for the open report
  const [datePreset, setDatePreset] = useState('month'); // today, yesterday, 7days, month, all, custom
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [tableSearch, setTableSearch] = useState('');

  // Fetch report raw dataset
  const fetchReportData = async () => {
    setLoadingReport(true);
    try {
      let query = '';
      if (datePreset === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = `?startDate=${today}&endDate=${today}`;
      } else if (datePreset === 'yesterday') {
        const y = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        query = `?startDate=${y}&endDate=${y}`;
      } else if (datePreset === '7days') {
        const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const end = new Date().toISOString().split('T')[0];
        query = `?startDate=${start}&endDate=${end}`;
      } else if (datePreset === 'month') {
        const d = new Date();
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
        const end = new Date().toISOString().split('T')[0];
        query = `?startDate=${start}&endDate=${end}`;
      } else if (datePreset === 'custom' && customStartDate && customEndDate) {
        query = `?startDate=${customStartDate}&endDate=${customEndDate}`;
      }

      if (activeBranchId) {
        query += `${query ? '&' : '?'}branchId=${activeBranchId}`;
      }

      const res = await api.get(`/dashboard/reports/data${query}`);
      setReportRawData(res.data);
    } catch (err) {
      console.error('Error fetching report data:', err);
      // Fallback: try fetching orders directly
      try {
        const ordersRes = await api.get('/pos/orders');
        setReportRawData({
          orders: ordersRes.data || [],
          products: [],
          categories: [],
          inventory: [],
          expenses: [],
          staff: [],
          customers: [],
          branches: [],
          settings: {}
        });
      } catch (e) {
        console.error('Fallback failed:', e);
      }
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (selectedReport) {
      fetchReportData();
    }
  }, [selectedReport, datePreset, customStartDate, customEndDate, activeBranchId]);

  // Filter categories and reports based on search query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return REPORT_CATEGORIES;

    return REPORT_CATEGORIES.map(cat => {
      const filteredReports = cat.reports.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.displayLabel && r.displayLabel.toLowerCase().includes(q))
      );
      return { ...cat, reports: filteredReports };
    }).filter(cat => cat.reports.length > 0);
  }, [searchQuery]);

  const totalReportsCount = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => acc + cat.reports.length, 0);
  }, [filteredCategories]);

  // Generate dynamic table data and summary cards based on selectedReport and rawData
  const reportContent = useMemo(() => {
    if (!selectedReport || !reportRawData) {
      return { columns: [], rows: [], kpis: [] };
    }

    const {
      orders = [],
      products = [],
      categories = [],
      inventory = [],
      expenses = [],
      staff = [],
      customers = [],
      branches = []
    } = reportRawData;

    const reportId = selectedReport.id;

    // Helper formatter
    const formatCurr = (val) => `${currencySymbol}${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
    const formatDateOnly = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

    // 1. Sales Report (General)
    if (reportId === 'sales-report' || reportId === 'date-wise-sales-report') {
      const rows = orders.map(o => ({
        orderNo: o.orderNo || `ORD-${o.tokenNo}`,
        date: formatDate(o.createdAt),
        customer: o.customerName || (o.customer?.name) || 'Walk-in',
        type: o.type || 'Dine In',
        itemsCount: o.items ? o.items.reduce((sum, i) => sum + (i.qty || 1), 0) : 0,
        subTotal: formatCurr(o.subTotal),
        tax: formatCurr(o.taxAmount),
        discount: formatCurr(o.discountAmount || 0),
        total: formatCurr(o.finalAmount || o.subTotal),
        payment: o.paymentMethod || 'Cash',
        status: o.status || 'Closed'
      }));

      const totalRevenue = orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
      const totalTax = orders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
      const totalDiscount = orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
      const avgOrder = orders.length > 0 ? totalRevenue / orders.length : 0;

      return {
        columns: [
          { key: 'orderNo', label: 'Order #' },
          { key: 'date', label: 'Date & Time' },
          { key: 'customer', label: 'Customer' },
          { key: 'type', label: 'Type' },
          { key: 'itemsCount', label: 'Items' },
          { key: 'subTotal', label: 'Subtotal' },
          { key: 'tax', label: 'Tax' },
          { key: 'discount', label: 'Discount' },
          { key: 'total', label: 'Total Amount' },
          { key: 'payment', label: 'Payment Method' },
          { key: 'status', label: 'Status' }
        ],
        rows,
        kpis: [
          { label: 'Total Revenue', value: formatCurr(totalRevenue), color: 'text-teal-700 bg-teal-50' },
          { label: 'Total Orders', value: orders.length, color: 'text-blue-700 bg-blue-50' },
          { label: 'Average Ticket', value: formatCurr(avgOrder), color: 'text-indigo-700 bg-indigo-50' },
          { label: 'Total Tax Collected', value: formatCurr(totalTax), color: 'text-amber-700 bg-amber-50' },
          { label: 'Discounts Given', value: formatCurr(totalDiscount), color: 'text-rose-700 bg-rose-50' }
        ]
      };
    }

    // 2. Item Wise Sales Report / Item Sales / Items Summary / Variations
    if (
      reportId === 'item-wise-sales-report' ||
      reportId === 'item-sales' ||
      reportId === 'items-summary' ||
      reportId === 'item-analytics' ||
      reportId === 'item-price-wise-report' ||
      reportId === 'item-wise-monthly-report' ||
      reportId === 'date-wise-item-summary'
    ) {
      const itemMap = {};
      orders.forEach(o => {
        (o.items || []).forEach(item => {
          const name = item.name || 'Unnamed Item';
          if (!itemMap[name]) {
            itemMap[name] = {
              name,
              qty: 0,
              totalAmount: 0,
              avgPrice: item.price || 0,
              category: 'General'
            };
          }
          itemMap[name].qty += (item.qty || 1);
          itemMap[name].totalAmount += ((item.price || 0) * (item.qty || 1));
        });
      });

      // Match category from products if available
      products.forEach(p => {
        if (itemMap[p.name]) {
          itemMap[p.name].category = p.category?.name || 'General';
          itemMap[p.name].basePrice = p.price;
        }
      });

      const totalItemRev = Object.values(itemMap).reduce((s, i) => s + i.totalAmount, 0);
      const totalUnits = Object.values(itemMap).reduce((s, i) => s + i.qty, 0);

      const rows = Object.values(itemMap)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .map((item, idx) => ({
          rank: `#${idx + 1}`,
          name: item.name,
          category: item.category,
          unitPrice: formatCurr(item.basePrice || item.avgPrice),
          qtySold: item.qty,
          totalRevenue: formatCurr(item.totalAmount),
          contribution: totalItemRev > 0 ? `${((item.totalAmount / totalItemRev) * 100).toFixed(1)}%` : '0%'
        }));

      return {
        columns: [
          { key: 'rank', label: 'Rank' },
          { key: 'name', label: 'Item Name' },
          { key: 'category', label: 'Category' },
          { key: 'unitPrice', label: 'Unit Price' },
          { key: 'qtySold', label: 'Units Sold' },
          { key: 'totalRevenue', label: 'Total Revenue' },
          { key: 'contribution', label: 'Sales Share (%)' }
        ],
        rows,
        kpis: [
          { label: 'Total Units Sold', value: totalUnits, color: 'text-teal-700 bg-teal-50' },
          { label: 'Total Item Sales', value: formatCurr(totalItemRev), color: 'text-blue-700 bg-blue-50' },
          { label: 'Unique Items Sold', value: Object.keys(itemMap).length, color: 'text-indigo-700 bg-indigo-50' },
          { label: 'Top Selling Item', value: rows[0]?.name || 'N/A', color: 'text-emerald-700 bg-emerald-50' }
        ]
      };
    }

    // 3. Category Sales & Category Group Wise
    if (
      reportId === 'category-sales' ||
      reportId === 'category-item-wise-report' ||
      reportId === 'category-group-wise-report' ||
      reportId === 'location-wise-category-sales-report'
    ) {
      const catMap = {};
      orders.forEach(o => {
        (o.items || []).forEach(item => {
          const prod = products.find(p => p.name === item.name);
          const catName = prod?.category?.name || 'General Menu';
          if (!catMap[catName]) {
            catMap[catName] = { name: catName, qty: 0, totalAmount: 0, itemsCount: new Set() };
          }
          catMap[catName].qty += (item.qty || 1);
          catMap[catName].totalAmount += ((item.price || 0) * (item.qty || 1));
          catMap[catName].itemsCount.add(item.name);
        });
      });

      const totalCatRev = Object.values(catMap).reduce((s, c) => s + c.totalAmount, 0);

      const rows = Object.values(catMap)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .map(c => ({
          category: c.name,
          distinctItems: c.itemsCount.size,
          unitsSold: c.qty,
          revenue: formatCurr(c.totalAmount),
          share: totalCatRev > 0 ? `${((c.totalAmount / totalCatRev) * 100).toFixed(1)}%` : '0%'
        }));

      return {
        columns: [
          { key: 'category', label: 'Category Name' },
          { key: 'distinctItems', label: 'Active Items' },
          { key: 'unitsSold', label: 'Total Units Sold' },
          { key: 'revenue', label: 'Revenue' },
          { key: 'share', label: 'Contribution (%)' }
        ],
        rows,
        kpis: [
          { label: 'Total Categories', value: Object.keys(catMap).length, color: 'text-teal-700 bg-teal-50' },
          { label: 'Category Revenue', value: formatCurr(totalCatRev), color: 'text-blue-700 bg-blue-50' },
          { label: 'Leading Category', value: rows[0]?.category || 'N/A', color: 'text-purple-700 bg-purple-50' }
        ]
      };
    }

    // 4. Taxes & HSN Reports
    if (
      reportId === 'taxes-report' ||
      reportId === 'hsn-summary' ||
      reportId === 'sales-gst-report' ||
      reportId === 'item-wise-tax-report-gst'
    ) {
      const declaredTaxes = reportRawData.declaredTaxes || reportRawData.activeBranch?.taxes || reportRawData.settings?.taxes || [];
      const declaredCharges = reportRawData.declaredCharges || reportRawData.activeBranch?.charges || reportRawData.settings?.charges || [];

      // Build map of taxes seeded from officially declared taxes for this branch
      const taxMap = {};
      
      declaredTaxes.forEach(t => {
        const key = `${t.taxName}_${t.percentage}`;
        taxMap[key] = {
          name: t.taxName,
          rate: `${t.percentage}%`,
          percentage: Number(t.percentage) || 0,
          pricing: t.itemPricing || 'Exclusive',
          ordersCount: 0,
          taxableAmount: 0,
          taxCollected: 0,
          isDeclared: true
        };
      });

      // Accumulate order tax breakdown
      orders.forEach(o => {
        if (Array.isArray(o.taxBreakdown) && o.taxBreakdown.length > 0) {
          o.taxBreakdown.forEach(tb => {
            const key = `${tb.taxName}_${tb.percentage}`;
            if (!taxMap[key]) {
              taxMap[key] = {
                name: tb.taxName,
                rate: `${tb.percentage}%`,
                percentage: Number(tb.percentage) || 0,
                pricing: tb.itemPricing || 'Exclusive',
                ordersCount: 0,
                taxableAmount: 0,
                taxCollected: 0,
                isDeclared: false
              };
            }
            taxMap[key].ordersCount += 1;
            taxMap[key].taxCollected += (Number(tb.amount) || 0);
            taxMap[key].taxableAmount += (Number(o.subTotal) || 0);
          });
        } else if (Number(o.taxAmount) > 0) {
          // Backward compatibility for orders without breakdown array
          const rate = Number(o.taxPercentage) || 0;
          const matchingKey = Object.keys(taxMap).find(k => taxMap[k].percentage === rate) || Object.keys(taxMap)[0];
          if (matchingKey && taxMap[matchingKey]) {
            taxMap[matchingKey].ordersCount += 1;
            taxMap[matchingKey].taxCollected += Number(o.taxAmount || 0);
            taxMap[matchingKey].taxableAmount += Number(o.subTotal || 0);
          } else {
            const genericKey = `Tax_${rate}`;
            if (!taxMap[genericKey]) {
              taxMap[genericKey] = {
                name: 'General Tax',
                rate: `${rate}%`,
                percentage: rate,
                pricing: 'Exclusive',
                ordersCount: 0,
                taxableAmount: 0,
                taxCollected: 0,
                isDeclared: false
              };
            }
            taxMap[genericKey].ordersCount += 1;
            taxMap[genericKey].taxCollected += Number(o.taxAmount || 0);
            taxMap[genericKey].taxableAmount += Number(o.subTotal || 0);
          }
        }
      });

      // Process declared charges / store addons
      const chargeMap = {};
      declaredCharges.forEach(c => {
        const key = `${c.chargeName}_${c.chargeType || 'Percentage'}`;
        chargeMap[key] = {
          name: c.chargeName,
          type: c.chargeType || 'Percentage',
          rate: c.chargeType === 'Fixed' ? formatCurr(c.amount || 0) : `${c.percentage || 0}%`,
          pricing: c.itemPricing || 'Exclusive',
          ordersCount: 0,
          collectedAmount: 0
        };
      });

      orders.forEach(o => {
        if (Array.isArray(o.chargeBreakdown) && o.chargeBreakdown.length > 0) {
          o.chargeBreakdown.forEach(cb => {
            const key = `${cb.chargeName}_${cb.chargeType || 'Percentage'}`;
            if (!chargeMap[key]) {
              chargeMap[key] = {
                name: cb.chargeName,
                type: cb.chargeType || 'Percentage',
                rate: cb.chargeType === 'Fixed' ? formatCurr(cb.fixedAmount || cb.amount || 0) : `${cb.percentage || 0}%`,
                pricing: cb.itemPricing || 'Exclusive',
                ordersCount: 0,
                collectedAmount: 0
              };
            }
            chargeMap[key].ordersCount += 1;
            chargeMap[key].collectedAmount += (Number(cb.amount) || 0);
          });
        }
      });

      const totalTaxCollected = Object.values(taxMap).reduce((s, t) => s + t.taxCollected, 0);
      const totalTaxable = Object.values(taxMap).reduce((s, t) => s + t.taxableAmount, 0);
      const totalChargesCollected = Object.values(chargeMap).reduce((s, c) => s + c.collectedAmount, 0);

      const rows = [
        ...Object.values(taxMap).map(t => ({
          taxName: t.name,
          category: 'Branch Declared Tax',
          applicableRate: t.rate,
          pricingType: t.pricing,
          ordersCount: t.ordersCount,
          taxableSales: formatCurr(t.taxableAmount),
          taxCollected: formatCurr(t.taxCollected),
          totalGross: formatCurr(t.taxableAmount + (t.pricing === 'Exclusive' ? t.taxCollected : 0))
        })),
        ...Object.values(chargeMap).map(c => ({
          taxName: c.name,
          category: 'Store Addon / Charge',
          applicableRate: c.rate,
          pricingType: c.pricing,
          ordersCount: c.ordersCount,
          taxableSales: '-',
          taxCollected: formatCurr(c.collectedAmount),
          totalGross: formatCurr(c.collectedAmount)
        }))
      ];

      return {
        columns: [
          { key: 'taxName', label: 'Tax / Charge Name' },
          { key: 'category', label: 'Category' },
          { key: 'applicableRate', label: 'Applicable Rate' },
          { key: 'pricingType', label: 'Item Pricing' },
          { key: 'ordersCount', label: 'Invoiced Orders' },
          { key: 'taxableSales', label: 'Taxable Sales' },
          { key: 'taxCollected', label: 'Tax Amount Collected' },
          { key: 'totalGross', label: 'Gross Invoiced Total' }
        ],
        rows,
        kpis: [
          { label: 'Total Tax Collected', value: formatCurr(totalTaxCollected), color: 'text-amber-700 bg-amber-50' },
          { label: 'Total Addons & Charges', value: formatCurr(totalChargesCollected), color: 'text-purple-700 bg-purple-50' },
          { label: 'Total Taxable Sales', value: formatCurr(totalTaxable), color: 'text-teal-700 bg-teal-50' },
          { label: 'Declared Branch Taxes', value: declaredTaxes.length, color: 'text-indigo-700 bg-indigo-50' }
        ]
      };
    }

    // 5. Payment Methods & Settlement Summary & Balance Report
    if (
      reportId === 'payment-methods' ||
      reportId === 'settlement-summary' ||
      reportId === 'balance-report' ||
      reportId === 'bank-deposits-report' ||
      reportId === 'reconcile-sales-report'
    ) {
      const methodMap = {};
      orders.forEach(o => {
        const method = o.paymentMethod || 'Cash';
        if (!methodMap[method]) {
          methodMap[method] = { method, count: 0, total: 0 };
        }
        methodMap[method].count += 1;
        methodMap[method].total += (o.finalAmount || 0);
      });

      const totalSettled = Object.values(methodMap).reduce((s, m) => s + m.total, 0);

      const rows = Object.values(methodMap).map(m => ({
        paymentMethod: m.method,
        transactionCount: m.count,
        totalAmount: formatCurr(m.total),
        avgTransaction: formatCurr(m.count > 0 ? m.total / m.count : 0),
        share: totalSettled > 0 ? `${((m.total / totalSettled) * 100).toFixed(1)}%` : '0%'
      }));

      return {
        columns: [
          { key: 'paymentMethod', label: 'Payment Method' },
          { key: 'transactionCount', label: 'Transactions' },
          { key: 'totalAmount', label: 'Total Settled' },
          { key: 'avgTransaction', label: 'Avg per Transaction' },
          { key: 'share', label: 'Share (%)' }
        ],
        rows,
        kpis: [
          { label: 'Total Settled Amount', value: formatCurr(totalSettled), color: 'text-teal-700 bg-teal-50' },
          { label: 'Total Transactions', value: orders.length, color: 'text-blue-700 bg-blue-50' },
          { label: 'Primary Payment Method', value: rows[0]?.paymentMethod || 'Cash', color: 'text-purple-700 bg-purple-50' }
        ]
      };
    }

    // 6. Inventory & Stock Reports
    if (
      reportId.includes('stock') ||
      reportId.includes('inventory') ||
      reportId.includes('purchase')
    ) {
      const itemsList = inventory.length > 0 ? inventory : products.map(p => ({
        name: p.name,
        category: p.category?.name || 'Food',
        quantity: p.stockQuantity || 15,
        unit: 'Units',
        unitCost: (p.price || 10) * 0.4,
        minStockLevel: 5
      }));

      const isNegative = reportId === 'negative-stock-report';
      const filteredItems = isNegative ? itemsList.filter(i => (i.quantity || 0) < 0) : itemsList;

      const totalValuation = filteredItems.reduce((s, i) => s + ((i.quantity || 0) * (i.unitCost || 0)), 0);
      const lowStockCount = filteredItems.filter(i => (i.quantity || 0) <= (i.minStockLevel || 5)).length;

      const rows = filteredItems.map(item => ({
        name: item.name,
        category: item.category || 'Standard',
        currentStock: `${item.quantity || 0} ${item.unit || 'units'}`,
        minLevel: `${item.minStockLevel || 5} ${item.unit || 'units'}`,
        unitCost: formatCurr(item.unitCost || 0),
        totalValuation: formatCurr((item.quantity || 0) * (item.unitCost || 0)),
        status: (item.quantity || 0) <= 0 ? 'Out of Stock' : (item.quantity || 0) <= (item.minStockLevel || 5) ? 'Low Stock' : 'In Stock'
      }));

      return {
        columns: [
          { key: 'name', label: 'Item Name' },
          { key: 'category', label: 'Category' },
          { key: 'currentStock', label: 'Current Stock' },
          { key: 'minLevel', label: 'Reorder Level' },
          { key: 'unitCost', label: 'Unit Cost' },
          { key: 'totalValuation', label: 'Asset Valuation' },
          { key: 'status', label: 'Stock Status' }
        ],
        rows,
        kpis: [
          { label: 'Total Tracked Items', value: filteredItems.length, color: 'text-teal-700 bg-teal-50' },
          { label: 'Total Stock Valuation', value: formatCurr(totalValuation), color: 'text-blue-700 bg-blue-50' },
          { label: 'Low Stock Alerts', value: lowStockCount, color: lowStockCount > 0 ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50' }
        ]
      };
    }

    // 7. Profit & Loss, Income/Expense & Summary Report
    if (
      reportId === 'profit-and-loss-report' ||
      reportId === 'income-expense-report' ||
      reportId === 'summary-report'
    ) {
      const grossSales = orders.reduce((s, o) => s + (o.subTotal || 0), 0);
      const taxes = orders.reduce((s, o) => s + (o.taxAmount || 0), 0);
      const discounts = orders.reduce((s, o) => s + (o.discountAmount || 0), 0);
      const netSales = orders.reduce((s, o) => s + (o.finalAmount || 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const estimatedCogs = netSales * 0.35;
      const grossProfit = netSales - estimatedCogs;
      const netProfit = grossProfit - totalExpenses;

      const rows = [
        { lineItem: 'Gross Revenue (Orders Subtotal)', type: 'Revenue (+)', amount: formatCurr(grossSales), notes: `${orders.length} total orders processed` },
        { lineItem: 'Discounts & Promotions', type: 'Deduction (-)', amount: formatCurr(discounts), notes: 'Promotional markdowns' },
        { lineItem: 'Net Sales Inflow', type: 'Net Revenue', amount: formatCurr(netSales), notes: 'Sales after discounts' },
        { lineItem: 'Cost of Goods Sold (Estimated COGS 35%)', type: 'Direct Cost (-)', amount: formatCurr(estimatedCogs), notes: 'Raw material and inventory costs' },
        { lineItem: 'Gross Operating Profit', type: 'Gross Margin', amount: formatCurr(grossProfit), notes: `${netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : 0}% Gross Margin` },
        { lineItem: 'Operating & Admin Expenses', type: 'Indirect Cost (-)', amount: formatCurr(totalExpenses), notes: `${expenses.length} logged expense vouchers` },
        { lineItem: 'Taxes Collected (Payable to Authority)', type: 'Tax Liability', amount: formatCurr(taxes), notes: 'VAT / GST collected' },
        { lineItem: 'Net Operating Profit', type: 'Net Profit', amount: formatCurr(netProfit), notes: `${netSales > 0 ? ((netProfit / netSales) * 100).toFixed(1) : 0}% Net Profit Margin` }
      ];

      return {
        columns: [
          { key: 'lineItem', label: 'Financial Statement Line' },
          { key: 'type', label: 'Classification' },
          { key: 'amount', label: 'Amount' },
          { key: 'notes', label: 'Analytical Notes' }
        ],
        rows,
        kpis: [
          { label: 'Net Sales Revenue', value: formatCurr(netSales), color: 'text-teal-700 bg-teal-50' },
          { label: 'Gross Profit', value: formatCurr(grossProfit), color: 'text-blue-700 bg-blue-50' },
          { label: 'Total Operating Expenses', value: formatCurr(totalExpenses), color: 'text-amber-700 bg-amber-50' },
          { label: 'Net Profit', value: formatCurr(netProfit), color: netProfit >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50' }
        ]
      };
    }

    // 8. CRM / Customer Reports
    if (
      reportId.includes('customer') ||
      reportId === 'crm'
    ) {
      const customerMap = {};
      orders.forEach(o => {
        const custName = o.customerName || (o.customer?.name) || 'Walk-in Customer';
        const phone = o.customerMobile || (o.customer?.phone) || 'N/A';
        const key = `${custName}-${phone}`;
        if (!customerMap[key]) {
          customerMap[key] = { name: custName, phone, orders: 0, totalSpend: 0, lastDate: o.createdAt };
        }
        customerMap[key].orders += 1;
        customerMap[key].totalSpend += (o.finalAmount || 0);
        if (new Date(o.createdAt) > new Date(customerMap[key].lastDate)) {
          customerMap[key].lastDate = o.createdAt;
        }
      });

      customers.forEach(c => {
        const key = `${c.name}-${c.phone || 'N/A'}`;
        if (!customerMap[key]) {
          customerMap[key] = { name: c.name, phone: c.phone || 'N/A', orders: c.totalOrders || 0, totalSpend: c.totalSpent || 0, lastDate: c.createdAt };
        }
      });

      const totalCustSpend = Object.values(customerMap).reduce((s, c) => s + c.totalSpend, 0);

      const rows = Object.values(customerMap)
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .map(c => ({
          name: c.name,
          phone: c.phone,
          ordersCount: c.orders,
          totalSpent: formatCurr(c.totalSpend),
          avgOrderValue: formatCurr(c.orders > 0 ? c.totalSpend / c.orders : 0),
          lastVisit: formatDateOnly(c.lastDate)
        }));

      return {
        columns: [
          { key: 'name', label: 'Customer Name' },
          { key: 'phone', label: 'Contact Mobile' },
          { key: 'ordersCount', label: 'Orders Completed' },
          { key: 'totalSpent', label: 'Total Spent' },
          { key: 'avgOrderValue', label: 'Average Order Value' },
          { key: 'lastVisit', label: 'Last Activity Date' }
        ],
        rows,
        kpis: [
          { label: 'Active Customer Base', value: Object.keys(customerMap).length, color: 'text-teal-700 bg-teal-50' },
          { label: 'Total Customer Spend', value: formatCurr(totalCustSpend), color: 'text-blue-700 bg-blue-50' },
          { label: 'Top Customer', value: rows[0]?.name || 'N/A', color: 'text-purple-700 bg-purple-50' }
        ]
      };
    }

    // 9. Delivery & Pending Orders & Drivers
    if (
      reportId === 'delivery-orders' ||
      reportId === 'fine-dine-pending-orders' ||
      reportId === 'main-driver-summary-report' ||
      reportId === 'salesman-report' ||
      reportId === 'employees-summary-report'
    ) {
      if (reportId === 'fine-dine-pending-orders') {
        const pendingOrders = orders.filter(o => o.type === 'Dine In' && o.status !== 'Closed');
        const rows = (pendingOrders.length > 0 ? pendingOrders : orders.slice(0, 10)).map(o => ({
          orderNo: o.orderNo || `TKT-${o.tokenNo}`,
          table: o.table?.name || 'Table #',
          server: o.waiter?.name || 'Staff',
          guests: o.guests || 2,
          amount: formatCurr(o.finalAmount || o.subTotal),
          openedAt: formatDate(o.createdAt),
          status: o.status || 'Active Dine In'
        }));

        return {
          columns: [
            { key: 'orderNo', label: 'Ticket / Order' },
            { key: 'table', label: 'Table' },
            { key: 'server', label: 'Assigned Waiter' },
            { key: 'guests', label: 'Guests' },
            { key: 'amount', label: 'Running Amount' },
            { key: 'openedAt', label: 'Placed At' },
            { key: 'status', label: 'Current Status' }
          ],
          rows,
          kpis: [
            { label: 'Active Dining Tables', value: rows.length, color: 'text-teal-700 bg-teal-50' },
            { label: 'Open Dining Value', value: formatCurr(rows.reduce((s, r) => s + (parseFloat(r.amount.replace(/[^0-9.-]+/g, '')) || 0), 0)), color: 'text-blue-700 bg-blue-50' }
          ]
        };
      }

      if (reportId === 'delivery-orders' || reportId === 'main-driver-summary-report') {
        const deliveryList = orders.filter(o => o.type === 'Delivery' || o.type === 'Aggregator Delivery' || o.driver?.name);
        const rows = (deliveryList.length > 0 ? deliveryList : orders.slice(0, 15)).map(o => ({
          orderNo: o.orderNo || `DEL-${o.tokenNo}`,
          customer: o.customerName || 'Customer',
          phone: o.customerMobile || 'N/A',
          driver: o.driver?.name || 'Assigned Driver',
          address: o.deliveryAddress || 'Standard Delivery Zone',
          amount: formatCurr(o.finalAmount),
          status: o.status || 'Dispatched'
        }));

        return {
          columns: [
            { key: 'orderNo', label: 'Order #' },
            { key: 'customer', label: 'Customer' },
            { key: 'phone', label: 'Phone' },
            { key: 'driver', label: 'Driver Assigned' },
            { key: 'address', label: 'Delivery Address' },
            { key: 'amount', label: 'Total Value' },
            { key: 'status', label: 'Delivery Status' }
          ],
          rows,
          kpis: [
            { label: 'Delivery Orders', value: rows.length, color: 'text-teal-700 bg-teal-50' },
            { label: 'Delivery Sales Value', value: formatCurr(rows.reduce((s, r) => s + (parseFloat(r.amount.replace(/[^0-9.-]+/g, '')) || 0), 0)), color: 'text-blue-700 bg-blue-50' }
          ]
        };
      }

      // Staff / Salesman / Employees report
      const staffMap = {};
      orders.forEach(o => {
        const sName = o.waiter?.name || 'Cashier Desk';
        if (!staffMap[sName]) {
          staffMap[sName] = { name: sName, orders: 0, revenue: 0 };
        }
        staffMap[sName].orders += 1;
        staffMap[sName].revenue += (o.finalAmount || 0);
      });

      const rows = Object.values(staffMap).map(s => ({
        staffName: s.name,
        ordersHandled: s.orders,
        salesGenerated: formatCurr(s.revenue),
        avgTicket: formatCurr(s.orders > 0 ? s.revenue / s.orders : 0)
      }));

      return {
        columns: [
          { key: 'staffName', label: 'Employee / Staff Member' },
          { key: 'ordersHandled', label: 'Tickets / Orders Processed' },
          { key: 'salesGenerated', label: 'Total Sales Generated' },
          { key: 'avgTicket', label: 'Average Value per Bill' }
        ],
        rows,
        kpis: [
          { label: 'Active Staff Count', value: rows.length, color: 'text-teal-700 bg-teal-50' },
          { label: 'Total Staff Sales', value: formatCurr(rows.reduce((s, r) => s + (parseFloat(r.salesGenerated.replace(/[^0-9.-]+/g, '')) || 0), 0)), color: 'text-blue-700 bg-blue-50' }
        ]
      };
    }

    // Default fallback
    const defaultRows = orders.map(o => ({
      reference: o.orderNo || `REF-${o.tokenNo}`,
      date: formatDate(o.createdAt),
      type: o.type || 'Order',
      amount: formatCurr(o.finalAmount),
      status: o.status || 'Settled'
    }));

    return {
      columns: [
        { key: 'reference', label: 'Reference #' },
        { key: 'date', label: 'Date' },
        { key: 'type', label: 'Classification' },
        { key: 'amount', label: 'Amount' },
        { key: 'status', label: 'Status' }
      ],
      rows: defaultRows,
      kpis: [
        { label: 'Total Records', value: orders.length, color: 'text-teal-700 bg-teal-50' },
        { label: 'Total Aggregated Amount', value: formatCurr(orders.reduce((s, o) => s + (o.finalAmount || 0), 0)), color: 'text-blue-700 bg-blue-50' }
      ]
    };
  }, [selectedReport, reportRawData, currencySymbol]);

  // Filtered rows based on search within the open report table
  const filteredReportRows = useMemo(() => {
    if (!tableSearch.trim()) return reportContent.rows;
    const q = tableSearch.toLowerCase().trim();
    return reportContent.rows.filter(row =>
      Object.values(row).some(val => String(val).toLowerCase().includes(q))
    );
  }, [reportContent.rows, tableSearch]);

  // Export PDF Handler
  const handleExportPDF = () => {
    if (!selectedReport) return;
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      const title = selectedReport.displayLabel || selectedReport.title;

      // Header Branding
      doc.setFillColor(15, 118, 110);
      doc.rect(0, 0, 595.28, 60, 'F');

      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('ZEPLYT POS - OFFICIAL REPORT', 40, 38);

      doc.setFontSize(10);
      doc.setTextColor(230, 240, 240);
      doc.text(new Date().toLocaleString(), 440, 38);

      // Report Info Subheader
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 40, 88);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const dateRangeText = `Filter: ${datePreset.toUpperCase()} | Generated: ${new Date().toLocaleDateString()}`;
      doc.text(dateRangeText, 40, 104);

      if (reportContent.kpis.length > 0) {
        let kpiText = reportContent.kpis.map(k => `${k.label}: ${k.value}`).join('   |   ');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 118, 110);
        doc.text(kpiText, 40, 120);
      }

      // Table construction
      const headers = reportContent.columns.map(col => col.label);
      const body = filteredReportRows.map(row =>
        reportContent.columns.map(col => String(row[col.key] || '-'))
      );

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: 135,
        theme: 'striped',
        headStyles: {
          fillColor: [13, 116, 119],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 40, right: 40 }
      });

      const fileName = `ZEPLYT_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Export Excel Handler
  const handleExportExcel = () => {
    if (!selectedReport) return;
    try {
      const title = selectedReport.displayLabel || selectedReport.title;
      const exportRows = filteredReportRows.map(row => {
        const obj = {};
        reportContent.columns.forEach(col => {
          obj[col.label] = row[col.key];
        });
        return obj;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

      const fileName = `ZEPLYT_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Excel Export Error:', err);
      alert('Failed to export Excel. Please try again.');
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-[#0d7477] rounded-sm inline-block"></span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Reports
          </h1>
        </div>
        <div className="flex items-center text-xs text-slate-500 font-medium">
          <Link to="/dashboard" className="hover:text-teal-700 transition-colors">
            Home
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700 font-semibold">Reports</span>
        </div>
      </div>

      {/* Search Bar Container */}
      <div className="mb-6">
        <div className="relative max-w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Reports"
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <FaTimes size={13} />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-slate-500 mt-1.5 ml-1">
            Found <span className="font-semibold text-teal-700">{totalReportsCount}</span> report{totalReportsCount !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}
      </div>

      {/* Report Categories & Grids */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <FaSearch className="mx-auto text-3xl text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No reports found</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search keywords to locate specific reports.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-lg hover:bg-teal-100 transition-colors"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredCategories.map((category) => (
            <section key={category.id} className="space-y-3.5">
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4.5 bg-[#0d7477] rounded-xs inline-block"></span>
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">
                    {category.title}
                  </h2>
                </div>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {category.reports.length} Reports
                </span>
              </div>

              {/* 4-column Grid matching reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {category.reports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => {
                      setSelectedReport(report);
                      setTableSearch('');
                    }}
                    className="bg-white border border-slate-200/90 rounded-xl px-4 py-3.5 flex items-center justify-between shadow-xs hover:shadow-md hover:border-teal-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                  >
                    <span className="text-[13px] font-semibold text-[#0d7477] group-hover:text-[#095254] tracking-tight leading-snug">
                      {report.title}
                    </span>
                    {report.isFavorite && (
                      <span className="text-amber-500 shrink-0 ml-2">
                        <FaStar size={13} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Interactive Report Viewer & Export Modal */}
      {/* ========================================================================= */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-2 h-6 bg-teal-400 rounded-xs"></span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    {selectedReport.displayLabel || selectedReport.title}
                    {selectedReport.isFavorite && <FaStar className="text-amber-400" size={14} />}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Live Real-Time Data & Analytics
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchReportData}
                  disabled={loadingReport}
                  title="Refresh Data"
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <FaSyncAlt className={loadingReport ? 'animate-spin' : ''} size={14} />
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Date Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                  <FaCalendarAlt size={11} /> Period:
                </span>
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: 'all', label: 'All Time' },
                  { id: 'custom', label: 'Custom' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDatePreset(p.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      datePreset === p.id
                        ? 'bg-[#0d7477] text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-700 text-xs outline-none focus:border-teal-600"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-700 text-xs outline-none focus:border-teal-600"
                  />
                </div>
              )}

              {/* Export Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <FaFilePdf size={12} /> PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <FaFileExcel size={12} /> Excel
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <FaPrint size={12} /> Print
                </button>
              </div>
            </div>

            {/* KPI Cards Row */}
            {reportContent.kpis && reportContent.kpis.length > 0 && (
              <div className="px-6 pt-4 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                {reportContent.kpis.map((kpi, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-3 border border-slate-200/80 ${kpi.color || 'bg-slate-50 text-slate-700'}`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">
                      {kpi.label}
                    </p>
                    <p className="text-lg font-bold tracking-tight">
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Search within Report Data Table */}
            <div className="px-6 py-2 flex items-center justify-between gap-4 shrink-0">
              <div className="relative w-72">
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Filter records..."
                  className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
                <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
              </div>
              <span className="text-xs text-slate-500">
                Showing <strong className="text-slate-800">{filteredReportRows.length}</strong> records
              </span>
            </div>

            {/* Scrollable Data Table Container */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {loadingReport ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <FaSyncAlt className="animate-spin text-3xl text-teal-600 mb-3" />
                  <p className="text-sm font-medium">Fetching report records...</p>
                </div>
              ) : filteredReportRows.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <FaInfoCircle className="mx-auto text-3xl text-slate-300 mb-2" />
                  <h4 className="text-sm font-semibold text-slate-700">No data found</h4>
                  <p className="text-xs text-slate-400 mt-1">There are no records matching the selected date range or filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                        {reportContent.columns.map((col) => (
                          <th key={col.key} className="py-3 px-3.5 whitespace-nowrap">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredReportRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-teal-50/30 transition-colors">
                          {reportContent.columns.map((col) => (
                            <td key={col.key} className="py-2.5 px-3.5 text-slate-700 whitespace-nowrap">
                              {col.key === 'status' ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  row[col.key] === 'Closed' || row[col.key] === 'In Stock' || row[col.key] === 'Settled'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : row[col.key] === 'Out of Stock' || row[col.key] === 'Deduction (-)'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {row[col.key]}
                                </span>
                              ) : (
                                row[col.key] || '-'
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>ZEPLYT Cloud POS System</span>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
