// src/pages/Analytics.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import useCurrency from '../hooks/useCurrency';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [basketSize, setBasketSize] = useState(2);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("EXECUTIVE SUMMARY");
  const { currencySymbol } = useCurrency();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [trendGranularity, setTrendGranularity] = useState("Hour");
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);

  const fetchDeepAnalytics = async (options = {}) => {
    setError("");
    const d = new Date();
    const todayStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
    const currentTargetDate =
      options.resetToToday || (isRangeMode ? null : selectedDate);
    const isTodayDefault =
      currentTargetDate === todayStr &&
      !isRangeMode &&
      trendGranularity === "Hour";
    const CACHE_KEY = `pos_analytics_today_${todayStr}`;

    if (isTodayDefault) {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
      } else {
        setLoading(true);
      }
    } else {
      setLoading(true);
    }

    let queryParams = `?timeRange=advanced&trendGranularity=${trendGranularity}`;
    if (options.resetToToday) {
      queryParams += `&startDate=${options.resetToToday}`;
    } else {
      if (isRangeMode) {
        if (startDate && endDate)
          queryParams += `&startDate=${startDate}&endDate=${endDate}`;
      } else {
        if (selectedDate) queryParams += `&startDate=${selectedDate}`;
      }
    }

    try {
      const res = await api.get(`/dashboard/analytics/advanced${queryParams}`);
      if (trendGranularity === "Week" && res.data.trends) {
        res.data.trends = res.data.trends.map((t) => {
          if (t._id.includes("-W")) {
            const [year, weekStr] = t._id.split("-W");
            const week = parseInt(weekStr, 10);
            const simple = new Date(year, 0, 1 + (week - 1) * 7);
            const dow = simple.getDay();
            const isoWeekStart = simple;
            if (dow <= 4)
              isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
            else isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
            const isoWeekEnd = new Date(isoWeekStart);
            isoWeekEnd.setDate(isoWeekStart.getDate() + 6);
            const dateOptions = { month: "short", day: "numeric" };
            const formatted = `${isoWeekStart.toLocaleDateString("en-US", dateOptions)} - ${isoWeekEnd.toLocaleDateString("en-US", dateOptions)}, ${year}`;
            return { ...t, _id: formatted };
          }
          return t;
        });
      }
      setData(res.data);
      if (isTodayDefault)
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
    } catch (err) {
      setError("Failed to query deep analytical database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeepAnalytics();
    setSelectedDataPoint(null);
  }, [trendGranularity]);

  const getPercentage = (itemRev) => {
    if (!data?.restoredSummary?.totalSalesOrdersPreserved || !itemRev)
      return "0.0";
    return (
      (itemRev / data.restoredSummary.totalSalesOrdersPreserved) *
      100
    ).toFixed(1);
  };

  if (error)
    return <div className="p-6 text-red-500 font-bold text-sm">{error}</div>;

  const addons = data?.addonsData?.settings || {};

  return (
    <div
      className={`font-sans text-gray-800 bg-white w-full ${activeTab === "REVENUE TRENDS" ? "fixed inset-0 z-50 bg-white overflow-y-auto p-4 md:p-6" : ""}`}
    >
      {activeTab === "REVENUE TRENDS" && (
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setActiveTab("EXECUTIVE SUMMARY")}
            className="text-gray-500 hover:text-gray-700 font-bold text-xs bg-gray-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            ← Exit
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 mb-4">
        <div className="flex gap-5 border-b border-gray-200 text-xs font-bold text-gray-400 overflow-x-auto hide-scrollbar w-full">
          {[
            "EXECUTIVE SUMMARY",
            "REVENUE TRENDS",
            "MENU INTELLIGENCE",
            ...(addons.performanceMetrics ? ["PERFORMANCE METRICS"] : []),
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 pb-2 uppercase transition-colors ${activeTab === tab ? "text-blue-600 border-b-2 border-blue-500" : "hover:text-gray-600"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap border-b border-gray-200 pb-3">
          <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 text-xs shadow-sm">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setIsRangeMode(false);
                setStartDate("");
                setEndDate("");
              }}
              className="bg-transparent text-gray-700 px-2 py-1 outline-none focus:border-blue-400 transition border-b border-transparent text-xs w-28"
            />
            <button
              onClick={() => setIsRangeMode(!isRangeMode)}
              className={`px-2 py-1 rounded text-[10px] font-bold transition ${isRangeMode ? "bg-gray-200" : "text-gray-400"}`}
            >
              Range
            </button>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setIsRangeMode(true);
                setSelectedDate("");
              }}
              className={`bg-transparent text-gray-700 px-2 py-1 outline-none focus:border-blue-400 transition border-b ${isRangeMode ? "border-gray-300" : "border-transparent text-gray-300"} text-xs w-28`}
              disabled={!isRangeMode}
            />
            <span
              className={`text-gray-400 px-1 ${isRangeMode ? "" : "text-gray-300"}`}
            >
              -
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setIsRangeMode(true);
                setSelectedDate("");
              }}
              className={`bg-transparent text-gray-700 px-2 py-1 outline-none focus:border-blue-400 transition border-b ${isRangeMode ? "border-gray-300" : "border-transparent text-gray-300"} text-xs w-28`}
              disabled={!isRangeMode}
            />
            <button
              onClick={() => fetchDeepAnalytics()}
              disabled={loading}
              className="ml-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm disabled:opacity-70 min-w-[90px] flex justify-center items-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-3 w-3 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Fetching...
                </span>
              ) : (
                "Apply"
              )}
            </button>
            <button
              onClick={() => {
                const d = new Date();
                const todayStr = new Date(
                  d.getTime() - d.getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .split("T")[0];
                setSelectedDate(todayStr);
                setStartDate("");
                setEndDate("");
                setIsRangeMode(false);
                fetchDeepAnalytics({ resetToToday: todayStr });
              }}
              className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 border-l border-gray-200 uppercase ml-1 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-200 text-xs shadow-sm ml-2">
            {["Hour", "Day", "Week", "Year"].map((gran) => (
              <button
                key={gran}
                onClick={() => setTrendGranularity(gran)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition ${trendGranularity === gran ? "bg-blue-600 text-white" : "bg-transparent text-gray-400 hover:text-gray-600"}`}
              >
                {gran}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="text-gray-400 font-bold uppercase tracking-widest mt-6 text-xs">
          Compiling Analytical Console...
        </div>
      ) : (
        <>
          {activeTab === "EXECUTIVE SUMMARY" && (
            <div className="mt-4 space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wider">
                    Gross Sales
                  </p>
                  <p className="text-2xl font-bold text-blue-700 mt-1 tracking-tight">
                    {currencySymbol}
                    {(data.restoredSummary?.grossSalesPreserved || 0).toFixed(
                      2,
                    )}
                  </p>
                  <span className="text-[10px] text-gray-400">
                    Before tax & discounts
                  </span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-medium text-green-700 uppercase tracking-wider">
                    Net Sales
                  </p>
                  <p className="text-2xl font-bold text-green-700 mt-1 tracking-tight">
                    {currencySymbol}
                    {(
                      data.restoredSummary?.netSalesAfterTaxPreserved || 0
                    ).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-gray-400">After tax</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wider">
                    Total Orders
                  </p>
                  <p className="text-2xl font-bold text-amber-700 mt-1 tracking-tight">
                    {data.restoredSummary?.totalOrdersPreserved || 0}
                  </p>
                  <span className="text-[10px] text-gray-400">
                    All transactions
                  </span>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-medium text-purple-700 uppercase tracking-wider">
                    Avg. Order Value
                  </p>
                  <p className="text-2xl font-bold text-purple-700 mt-1 tracking-tight">
                    {currencySymbol}
                    {(
                      data.restoredSummary?.avgOrderValuePreserved || 0
                    ).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-gray-400">
                    Per transaction
                  </span>
                </div>
              </div>

              {/* Three Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Sales Breakdown */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                      Sales Breakdown
                    </h3>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Gross Sales</span>
                      <span className="font-mono font-semibold text-gray-800">
                        {currencySymbol}
                        {(
                          data.restoredSummary?.grossSalesPreserved || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Discount</span>
                      <span className="font-mono text-red-500">
                        -{currencySymbol}
                        {(data.restoredSummary?.discountPreserved || 0).toFixed(
                          2,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Delivery Charges</span>
                      <span className="font-mono text-amber-500">
                        {currencySymbol}
                        {(data.restoredSummary?.deliveryChargesPreserved || 0).toFixed(
                          2,
                        )}
                      </span>
                    </div>
                    {(data.restoredSummary?.chargeBreakdown || []).map((charge) => <div key={`${charge.chargeName}-${charge.chargeType}-${charge.percentage}`} className="flex justify-between py-1.5 border-b border-gray-100"><span className="text-gray-500">{charge.chargeName}{charge.chargeType === 'Fixed' ? '' : ` (${charge.percentage}%)`}</span><span className="font-mono text-amber-500">{currencySymbol}{Number(charge.amount || 0).toFixed(2)}</span></div>)}
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">
                        Net Sales (Before Tax)
                      </span>
                      <span className="font-mono font-semibold text-gray-800">
                        {currencySymbol}
                        {(
                          data.restoredSummary?.netSalesBeforeTaxPreserved || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Tax</span>
                      <span className="font-mono text-amber-500">
                        {currencySymbol}
                        {(
                          data.restoredSummary?.taxAmountPreserved || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 mt-1 bg-blue-50 rounded-lg px-3 border border-blue-100">
                      <span className="text-xs font-semibold text-gray-700">
                        Net Sales (After Tax)
                      </span>
                      <span className="text-sm font-mono font-bold text-blue-600">
                        {currencySymbol}
                        {(
                          data.restoredSummary?.netSalesAfterTaxPreserved || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tax Break-up */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
                      Tax Break‑Up
                    </h3>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    {(data.restoredSummary?.taxBreakdown || []).map((tax) => <div key={`${tax.taxName}-${tax.percentage}-${tax.itemPricing}`} className="flex justify-between py-1.5 border-b border-gray-100"><span className="text-gray-500">{tax.taxName} ({tax.percentage}%)</span><span className="font-mono text-amber-600">{currencySymbol}{Number(tax.amount || 0).toFixed(2)}</span></div>)}
                    {!(data.restoredSummary?.taxBreakdown || []).length && <div className="flex justify-between py-1.5 border-b border-gray-100"><span className="text-gray-500">Tax</span><span className="font-mono text-gray-700">{currencySymbol}0.00</span></div>}
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Taxable Amount</span>
                      <span className="font-mono text-gray-700">
                        {currencySymbol}
                        {(
                          data.restoredSummary?.netSalesBeforeTaxPreserved || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Tax Collected</span>
                      <span className="font-mono font-semibold text-amber-600">
                        {currencySymbol}
                        {(
                          data.restoredSummary?.taxAmountPreserved || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 mt-1 bg-amber-50 rounded-lg px-3 border border-amber-100">
                      <span className="text-xs font-semibold text-gray-700">
                        Total Tax
                      </span>
                      <span className="text-sm font-mono font-bold text-amber-600">
                        {currencySymbol}
                        {(
                          data.restoredSummary?.taxAmountPreserved || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400 text-center border-t border-gray-100 pt-2">
                      Tax totals are grouped from the taxes applied to each order
                    </div>
                  </div>
                </div>

                {/* Collection by Business */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                      Collection by Business
                    </h3>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span className="text-gray-600">Dine In</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-gray-700">
                          {currencySymbol}
                          {(
                            data.restoredSummary?.dineInAmountPreserved || 0
                          ).toFixed(2)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-mono">
                          {data.restoredSummary?.dineInCountPreserved || 0}{" "}
                          orders
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-mono">
                          {(
                            data.restoredSummary?.dineInPercentPreserved || 0
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                        <span className="text-gray-600">Parcel</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-gray-700">
                          {currencySymbol}
                          {(
                            data.restoredSummary?.parcelAmountPreserved || 0
                          ).toFixed(2)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-mono">
                          {data.restoredSummary?.parcelCountPreserved || 0}{" "}
                          orders
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-mono">
                          {(
                            data.restoredSummary?.parcelPercentPreserved || 0
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        <span className="text-gray-600">Delivery</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-gray-700">
                          {currencySymbol}
                          {(
                            data.restoredSummary?.deliveryAmountPreserved || 0
                          ).toFixed(2)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-mono">
                          {data.restoredSummary?.deliveryCountPreserved || 0}{" "}
                          orders
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-mono">
                          {(
                            data.restoredSummary?.deliveryPercentPreserved || 0
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 mt-1 bg-gray-50 rounded-lg px-3 border border-gray-200">
                      <span className="text-xs font-semibold text-gray-700">
                        Total
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono font-bold text-gray-800">
                          {currencySymbol}
                          {(
                            data.restoredSummary?.totalSalesOrdersPreserved || 0
                          ).toFixed(2)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-200 text-gray-600 font-mono">
                          {data.restoredSummary?.totalOrdersPreserved || 0}{" "}
                          orders
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-purple-500 rounded-full"></span>
                    Payment Methods
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.paymentBreakdown?.length > 0 ? (
                      data.paymentBreakdown.map((payment, idx) => {
                        const percentage =
                          data.restoredSummary?.netSalesAfterTaxPreserved > 0
                            ? (
                                (payment.total /
                                  data.restoredSummary
                                    .netSalesAfterTaxPreserved) *
                                100
                              ).toFixed(1)
                            : "0.0";
                        return (
                          <div
                            key={idx}
                            className="bg-gray-50 rounded-xl p-3 border border-gray-200"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-600">
                                {payment._id}
                              </span>
                              <span className="text-xs font-mono text-gray-700">
                                {currencySymbol}
                                {payment.total.toFixed(2)}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(parseFloat(percentage), 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-purple-600 w-10 text-right">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full text-center text-xs text-gray-400 uppercase tracking-widest py-4">
                        No payment data found
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Financial Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Rewards
                  </p>
                  <p className="text-base font-bold text-gray-700 mt-0.5">
                    {currencySymbol}0.00
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Wallet
                  </p>
                  <p className="text-base font-bold text-gray-700 mt-0.5">
                    {currencySymbol}0.00
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Outstanding
                  </p>
                  <p className="text-base font-bold text-amber-600 mt-0.5">
                    {currencySymbol}0.00
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Write Off
                  </p>
                  <p className="text-base font-bold text-red-600 mt-0.5">
                    {currencySymbol}0.00
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "REVENUE TRENDS" && (
  <div className="bg-white border border-gray-200 p-2 rounded-lg shadow-sm min-h-[400px] flex flex-col mt-2">
    <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-1.5">
      <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
        Revenue Evolution Curve
      </h3>
      <div className="flex gap-0.5 bg-gray-50 p-0.5 rounded-lg border border-gray-200 text-[10px]">
        {["Hour", "Day", "Week", "Year"].map((gran) => (
          <button
            key={gran}
            onClick={() => setTrendGranularity(gran)}
            className={`px-2 py-0.5 text-[9px] font-bold rounded transition ${
              trendGranularity === gran
                ? "bg-blue-600 text-white"
                : "bg-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {gran}
          </button>
        ))}
      </div>
    </div>

    {selectedDataPoint && (
      <div className="mb-2 bg-blue-50 border border-blue-200 p-2 rounded-lg flex items-center justify-between text-[10px]">
        <div>
          <p className="text-[9px] text-blue-600 uppercase tracking-wider font-bold mb-0">
            Selected {trendGranularity}
          </p>
          <p className="text-xs font-bold text-gray-800">
            {selectedDataPoint._id}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0">
            Revenue
          </p>
          <p className="text-base font-mono font-black text-green-600">
            {currencySymbol} {selectedDataPoint.revenue.toFixed(3)}
          </p>
        </div>
      </div>
    )}

    <div className="w-full h-[300px] mt-1">
      {data.trends.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400 font-bold text-[10px]">
          No timeline data exists.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data.trends}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload.length > 0)
                setSelectedDataPoint(e.activePayload[0].payload);
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={false}
            />
            <XAxis
              dataKey="_id"
              stroke="#9ca3af"
              fontSize={8}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              minTickGap={30}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={8}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${currencySymbol} ${val.toLocaleString()}`}
            />
            <Tooltip
              cursor={{
                stroke: "#d1d5db",
                strokeWidth: 1,
                strokeDasharray: "3 3",
              }}
              contentStyle={{
                backgroundColor: "#fff",
                borderColor: "#e5e7eb",
                color: "#1f2937",
                borderRadius: "4px",
                padding: "4px 6px",
                fontSize: "9px",
              }}
              labelStyle={{
                color: "#6b7280",
                marginBottom: "2px",
                fontSize: "8px",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
              formatter={(value) => [
                `${currencySymbol} ${value.toFixed(3)}`,
                "Revenue",
              ]}
              labelFormatter={(label) => {
                if (trendGranularity === "Hour")
                  return `Date & Time: ${label}`;
                if (trendGranularity === "Day")
                  return `Date: ${label}`;
                if (trendGranularity === "Week")
                  return `Week: ${label}`;
                return `Year: ${label}`;
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{
                r: 2,
                fill: "#fff",
                stroke: "#3b82f6",
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 5,
                fill: "#3b82f6",
                stroke: "#fff",
                strokeWidth: 1.5,
                cursor: "pointer",
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  </div>
)}

          {activeTab === "MENU INTELLIGENCE" && (
  <div className="space-y-2 mt-2">
    {addons.performanceMetrics && data.addonsData?.marginMetrics && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Highest Volume Item */}
        <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg shadow-sm flex flex-col justify-between">
          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">
            Highest Volume Item
          </p>
          <p className="text-sm font-bold text-gray-800 mb-0.5">
            {data.addonsData.marginMetrics.topSold?.name || "N/A"}
          </p>
          <div className="mt-1.5 pt-1.5 border-t border-gray-200">
            <p className="text-[10px] text-green-600 font-mono font-bold">
              {data.addonsData.marginMetrics.topSold?.qty || 0} Units Sold
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[9px] text-gray-400 font-mono">
                {currencySymbol} {data.addonsData.marginMetrics.topSold?.revenue?.toFixed(3) || "0.000"} Generated
              </p>
              <span className="text-[9px] text-gray-400 bg-gray-200 border border-gray-200 px-1.5 py-0.5 rounded font-mono">
                {getPercentage(data.addonsData.marginMetrics.topSold?.revenue)}% of Total
              </span>
            </div>
          </div>
        </div>

        {/* #1 Revenue Earner */}
        <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-3 -top-3 text-blue-200 text-5xl pointer-events-none">
            🥇
          </div>
          <div className="relative z-10">
            <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider mb-1">
              #1 Revenue Earner
            </p>
            <p className="text-sm font-bold text-gray-800 mb-0.5">
              {data.addonsData.marginMetrics.topRevenue?.name || "N/A"}
            </p>
          </div>
          <div className="relative z-10 mt-1.5 pt-1.5 border-t border-blue-100">
            <p className="text-[10px] text-green-600 font-mono font-bold">
              {currencySymbol} {data.addonsData.marginMetrics.topRevenue?.revenue?.toFixed(3) || "0.000"} Generated
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[9px] text-gray-400 font-mono">
                {data.addonsData.marginMetrics.topRevenue?.qty || 0} Units Sold
              </p>
              <span className="text-[9px] text-blue-600 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded font-mono">
                {getPercentage(data.addonsData.marginMetrics.topRevenue?.revenue)}% of Total
              </span>
            </div>
          </div>
        </div>

        {/* #2 Revenue Earner */}
        <div className="bg-purple-50 border border-purple-200 p-2 rounded-lg shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-3 -top-3 text-purple-200 text-5xl pointer-events-none">
            🥈
          </div>
          <div className="relative z-10">
            <p className="text-[9px] text-purple-600 font-bold uppercase tracking-wider mb-1">
              #2 Revenue Earner
            </p>
            <p className="text-sm font-bold text-gray-800 mb-0.5">
              {data.addonsData.marginMetrics.secondRevenue?.name || "N/A"}
            </p>
          </div>
          <div className="relative z-10 mt-1.5 pt-1.5 border-t border-purple-100">
            <p className="text-[10px] text-green-600 font-mono font-bold">
              {currencySymbol} {data.addonsData.marginMetrics.secondRevenue?.revenue?.toFixed(3) || "0.000"} Generated
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[9px] text-gray-400 font-mono">
                {data.addonsData.marginMetrics.secondRevenue?.qty || 0} Units Sold
              </p>
              <span className="text-[9px] text-purple-600 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded font-mono">
                {getPercentage(data.addonsData.marginMetrics.secondRevenue?.revenue)}% of Total
              </span>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Top Performing Products Table */}
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
          Top Performing Products
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[10px]">
          <thead className="bg-gray-100 text-gray-500 font-mono uppercase tracking-wider">
            <tr>
              <th className="px-2 py-1.5 font-normal">Rank</th>
              <th className="px-2 py-1.5 font-normal">Item Name</th>
              <th className="px-2 py-1.5 font-normal text-right">Units Sold</th>
              <th className="px-2 py-1.5 font-normal text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.topItems.length === 0 && (
              <tr>
                <td colSpan="4" className="px-2 py-4 text-center text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                  No items sold.
                </td>
              </tr>
            )}
            {data.topItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-2 py-1.5 font-mono text-gray-400">#{idx + 1}</td>
                <td className="px-2 py-1.5 font-bold text-gray-800">{item._id}</td>
                <td className="px-2 py-1.5 font-mono text-gray-600 text-right">{item.qtySold}</td>
                <td className="px-2 py-1.5 font-mono text-green-600 font-bold text-right">{currencySymbol} {item.revenue.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Menu Engineering Analytics */}
    {addons.performanceMetrics && data.addonsData?.menuEngineering && (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm mt-2">
        <h3 className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
          <span>✦</span> Menu Engineering Analytics
        </h3>
        <p className="text-[9px] text-gray-400 mb-2 border-b border-gray-200 pb-2">
          Scientifically categorize your menu to optimize pricing, promotions, and profitability.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Stars */}
          <div className="bg-gray-50 border border-yellow-200 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-1.5 border-b border-gray-200 pb-1.5">
              <div className="bg-yellow-100 text-yellow-600 p-1 rounded text-base">⭐</div>
              <div>
                <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[9px]">Stars</h4>
                <p className="text-[8px] text-gray-400">High Profit + High Sales</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {data.addonsData.menuEngineering.stars.slice(0, 4).map((item, i) => (
                <li key={i} className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-600 font-medium">{item.name}</span>
                  <div className="text-right">
                    <span className="block text-yellow-600 font-mono text-[9px] font-bold">{currencySymbol} {item.revenue.toFixed(3)}</span>
                    <span className="block text-gray-400 font-mono text-[7px]">{item.qty} Units</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[9px] text-yellow-600/80 mt-2 bg-yellow-50 p-1.5 rounded-lg border border-yellow-200">
              <strong>Action:</strong> Highly visible items. Do not change prices. Promote heavily.
            </p>
          </div>

          {/* Plowhorses */}
          <div className="bg-gray-50 border border-blue-200 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-1.5 border-b border-gray-200 pb-1.5">
              <div className="bg-blue-100 text-blue-600 p-1 rounded text-base">🐴</div>
              <div>
                <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[9px]">Plowhorses</h4>
                <p className="text-[8px] text-gray-400">Low Profit + High Sales</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {data.addonsData.menuEngineering.plowhorses.slice(0, 4).map((item, i) => (
                <li key={i} className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-600 font-medium">{item.name}</span>
                  <div className="text-right">
                    <span className="block text-blue-600 font-mono text-[9px] font-bold">{currencySymbol} {item.revenue.toFixed(3)}</span>
                    <span className="block text-gray-400 font-mono text-[7px]">{item.qty} Units</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[9px] text-blue-600/80 mt-2 bg-blue-50 p-1.5 rounded-lg border border-blue-200">
              <strong>Action:</strong> Popular but low margin. Increase price slightly or pair in combos.
            </p>
          </div>

          {/* Puzzles */}
          <div className="bg-gray-50 border border-purple-200 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-1.5 border-b border-gray-200 pb-1.5">
              <div className="bg-purple-100 text-purple-600 p-1 rounded text-base">🧩</div>
              <div>
                <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[9px]">Puzzles</h4>
                <p className="text-[8px] text-gray-400">High Profit + Low Sales</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {data.addonsData.menuEngineering.puzzles.slice(0, 4).map((item, i) => (
                <li key={i} className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-600 font-medium">{item.name}</span>
                  <div className="text-right">
                    <span className="block text-purple-600 font-mono text-[9px] font-bold">{currencySymbol} {item.revenue.toFixed(3)}</span>
                    <span className="block text-gray-400 font-mono text-[7px]">{item.qty} Units</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[9px] text-purple-600/80 mt-2 bg-purple-50 p-1.5 rounded-lg border border-purple-200">
              <strong>Action:</strong> Great margin but low volume. Feature prominently. Have staff recommend.
            </p>
          </div>

          {/* Dogs */}
          <div className="bg-gray-50 border border-red-200 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-1.5 border-b border-gray-200 pb-1.5">
              <div className="bg-red-100 text-red-600 p-1 rounded text-base">🐕</div>
              <div>
                <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[9px]">Dogs</h4>
                <p className="text-[8px] text-gray-400">Low Profit + Low Sales</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {data.addonsData.menuEngineering.dogs.slice(0, 4).map((item, i) => (
                <li key={i} className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-600 font-medium">{item.name}</span>
                  <div className="text-right">
                    <span className="block text-red-600 font-mono text-[9px] font-bold">{currencySymbol} {item.revenue.toFixed(3)}</span>
                    <span className="block text-gray-400 font-mono text-[7px]">{item.qty} Units</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[9px] text-red-600/80 mt-2 bg-red-50 p-1.5 rounded-lg border border-red-200">
              <strong>Action:</strong> Wasting resources. Deprioritize, hide, or remove.
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Revenue Concentration Risk */}
    {addons.performanceMetrics && data.addonsData?.concentrationMetrics && (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm relative overflow-hidden mt-2">
        <div className="absolute top-0 right-0 p-2 text-gray-200 text-5xl pointer-events-none">
          ⚖️
        </div>
        <h3 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span>✦</span> Revenue Concentration Risk
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 relative z-10">
          <div>
            <p className="text-2xl font-black text-gray-800 mb-0.5">
              {data.addonsData.concentrationMetrics.revenuePercentage}%{" "}
              <span className="text-xs font-medium text-gray-400">of revenue</span>
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              depends heavily on just{" "}
              <strong className="text-gray-800 text-sm bg-gray-100 px-1 py-0.5 rounded">
                {data.addonsData.concentrationMetrics.topProductsCount}
              </strong>{" "}
              out of {data.addonsData.concentrationMetrics.totalProductsSold} total products.
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider mb-1">
                <span className="text-gray-400">Risk Assessment</span>
                <span className={
                  data.addonsData.concentrationMetrics.riskLevel === "High"
                    ? "text-red-500"
                    : data.addonsData.concentrationMetrics.riskLevel === "Medium"
                    ? "text-orange-500"
                    : "text-green-500"
                }>
                  {data.addonsData.concentrationMetrics.riskLevel} Risk
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    data.addonsData.concentrationMetrics.riskLevel === "High"
                      ? "bg-red-500"
                      : data.addonsData.concentrationMetrics.riskLevel === "Medium"
                      ? "bg-orange-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${100 - (data.addonsData.concentrationMetrics.topProductsCount / Math.max(data.addonsData.concentrationMetrics.totalProductsSold, 1)) * 100}%`,
                  }}
                ></div>
              </div>
              <p className="text-[9px] text-gray-400 mt-2 leading-relaxed bg-gray-50 p-2 rounded-lg border border-gray-200">
                <strong>Insight:</strong>{" "}
                {data.addonsData.concentrationMetrics.riskLevel === "High"
                  ? "Your business is highly dependent on a very small fraction of your menu. A supply chain issue with the top items could severely impact revenue."
                  : "You have a healthy, diversified menu distribution without critical reliance on a single item."}
              </p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Core Menu Contributors
            </h4>
            <ul className="space-y-2">
              {data.addonsData.concentrationMetrics.topContributors.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center border-b border-gray-200 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-indigo-500 font-bold bg-indigo-50 w-4 h-4 flex items-center justify-center rounded text-[9px]">
                      {idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-gray-600">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-mono text-green-600 font-bold">{currencySymbol} {item.revenue.toFixed(3)}</span>
                    <span className="block text-[8px] text-gray-400 font-mono tracking-wider uppercase mt-0">{item.percentage}% of Total</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )}
  </div>
)}

          {activeTab === "PERFORMANCE METRICS" && addons.performanceMetrics && (
  <div className="space-y-2 mt-2">
    {/* Standard Operational Metrics */}
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm max-w-3xl">
      <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2 border-b border-gray-200 pb-2">
        Standard Operational Metrics
      </h3>
      <div className="grid grid-cols-2 gap-3 text-xs font-medium">
        <div>
          <span className="text-gray-400 uppercase tracking-wider text-[9px] block mb-0.5">
            Avg. Order Value
          </span>
          <span className="text-base text-gray-800 font-mono">
            {currencySymbol} {data.restoredSummary.avgOrderValuePreserved.toFixed(3)}
          </span>
        </div>
        <div>
          <span className="text-gray-400 uppercase tracking-wider text-[9px] block mb-0.5">
            Est. Prep Time
          </span>
          <span className="text-base text-gray-800 font-mono">
            {data.restoredSummary.avgOrderTimePreserved}
          </span>
        </div>
      </div>
    </div>

    {/* AI Smart Stock Alerts */}
    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 text-blue-200 text-5xl pointer-events-none">
        🤖
      </div>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-2 border-b border-blue-100 pb-2 flex items-center gap-1.5">
        <span>✦</span> AI Smart Stock Alerts
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 relative z-10">
        <div className="bg-white border border-red-200 p-2 rounded-lg">
          <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mb-0.5">
            Dead Stock Warning
          </p>
          {data.addonsData.smartAlerts?.deadStock?.length > 0 ? (
            <p className="text-[10px] text-gray-600">
              Has <strong className="text-gray-800">not sold once</strong>: <br />
              <span className="text-gray-500 font-mono mt-0.5 block bg-gray-50 p-1 rounded text-[9px]">
                {data.addonsData.smartAlerts.deadStock.join(", ")}
              </span>
            </p>
          ) : (
            <p className="text-[10px] text-gray-400 mt-0.5">
              No dead stock detected.
            </p>
          )}
        </div>
        <div className="bg-white border border-green-200 p-2 rounded-lg">
          <p className="text-[9px] font-bold text-green-500 uppercase tracking-wider mb-0.5">
            Fast-Moving Products
          </p>
          {data.addonsData.smartAlerts?.fastMoving?.length > 0 ? (
            <p className="text-[10px] text-gray-600">
              High velocity: <br />
              <strong className="text-gray-800 mt-0.5 block bg-gray-50 p-1 rounded text-[9px]">
                {data.addonsData.smartAlerts.fastMoving.join(", ")}
              </strong>
            </p>
          ) : (
            <p className="text-[10px] text-gray-400 mt-0.5">
              No fast-moving alerts.
            </p>
          )}
        </div>
      </div>
    </div>

    {/* Market Basket Intelligence */}
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm relative overflow-hidden mt-1">
      <div className="absolute top-0 right-0 p-2 text-purple-200 text-5xl pointer-events-none">
        🛒
      </div>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-purple-700 mb-0.5 flex items-center gap-1.5">
        <span>✦</span> Market Basket Intelligence
      </h3>
      <p className="text-[9px] text-gray-400 mb-2">
        AI analysis of the past 60 days of order combinations.
      </p>
      <div className="flex flex-wrap gap-1 mb-3 relative z-10">
        {[2, 3, 4, 5, 6].map((size) => (
          <button
            key={size}
            onClick={() => setBasketSize(size)}
            className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
              basketSize === size
                ? "bg-purple-600 text-white shadow-sm shadow-purple-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
            }`}
          >
            {size}-Item Bundles
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 relative z-10">
        {data.addonsData.basketAnalysis?.[basketSize]?.length > 0 ? (
          data.addonsData.basketAnalysis[basketSize].map((bundle, idx) => (
            <div
              key={idx}
              className="bg-gray-50 border border-purple-200 rounded-lg p-2 hover:border-purple-400 transition"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="bg-purple-100 text-purple-700 text-[8px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase">
                    Combo #{idx + 1}
                  </span>
                  <span className="text-[9px] font-mono text-gray-400">
                    {bundle.count} Orders
                  </span>
                </div>
                <span className="text-green-600 font-bold font-mono text-xs">
                  +{bundle.confidence}%
                </span>
              </div>
              <div className="space-y-1 mb-2">
                {bundle.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-purple-400"></div>
                    <span className="text-[10px] font-bold text-gray-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-purple-50 border border-purple-200 p-2 rounded-lg">
                <p className="text-[9px] text-purple-700 font-medium leading-relaxed">
                  <strong className="text-gray-800">{bundle.confidence}%</strong>{" "}
                  of customers who buy{" "}
                  <strong className="text-gray-800">{bundle.anchorItem}</strong>{" "}
                  also add the rest.
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-lg">
            <p className="font-bold tracking-wider uppercase text-[9px]">
              No frequent combinations found
            </p>
            <p className="mt-0.5 text-[10px]">Not enough data in the last 60 days.</p>
          </div>
        )}
      </div>
    </div>

    {/* Deep Peak & Flow Detection */}
    {data.addonsData.peakMetrics?.monthlyVolumes?.length > 0 && (
      <div className="space-y-2 mt-2">
        {/* Macro Volume Profile */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="flex justify-between items-start mb-2 border-b border-gray-200 pb-2">
            <div>
              <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                <span>✦</span> Macro Volume Profile
              </h3>
              <p className="text-[9px] text-gray-400 mt-0">
                Comparing each month's sales against your historical average.
              </p>
            </div>
            <div className="text-right bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">
              <p className="text-[8px] text-blue-600 uppercase tracking-wider font-bold">
                Highest Month
              </p>
              <p className="text-xs font-bold text-gray-800">
                {data.addonsData.peakMetrics.highestVolumeMonth?.label}
              </p>
              <p className="text-[9px] text-green-600 font-mono">
                +{data.addonsData.peakMetrics.highestVolumeMonth?.percentageDiff}% vs Avg
              </p>
            </div>
          </div>
          <div className="h-36 w-full relative mt-3">
            {(() => {
              const maxVol = data.addonsData.peakMetrics.highestVolumeMonth?.rawSales || 1;
              const avgVol = data.addonsData.peakMetrics.averageMonthlyVolume;
              const avgY = (avgVol / maxVol) * 100;
              return (
                <>
                  <div
                    className="absolute left-0 w-full border-t border-dashed border-blue-300/70 z-0"
                    style={{ bottom: `${avgY}%` }}
                  >
                    <span className="absolute -top-4 right-0 bg-white px-1.5 py-0.5 rounded text-[8px] text-blue-600 border border-blue-200">
                      Historical Avg: {currencySymbol} {avgVol.toFixed(0)}
                    </span>
                  </div>
                  <div className="absolute inset-0 flex items-end gap-0.5 z-10">
                    {data.addonsData.peakMetrics.monthlyVolumes.map((mv, i) => {
                      const heightPct = (mv.sales / maxVol) * 100;
                      const isPeak = mv.label === data.addonsData.peakMetrics.highestVolumeMonth?.label;
                      return (
                        <div
                          key={i}
                          className="flex-1 h-full flex flex-col justify-end group relative cursor-pointer"
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[8px] py-0.5 px-1 rounded whitespace-nowrap z-20 text-center pointer-events-none">
                            {currencySymbol} {mv.sales.toFixed(0)}
                            <br />
                            <span className={mv.percentageDiff > 0 ? "text-green-400" : "text-red-400"}>
                              {mv.percentageDiff > 0 ? "+" : ""}{mv.percentageDiff}% vs Avg
                            </span>
                          </div>
                          <div
                            className={`w-full rounded-t-sm transition-all ${isPeak ? "bg-green-500" : "bg-blue-500 hover:bg-blue-400"}`}
                            style={{ height: `${heightPct}%` }}
                          ></div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
          <div className="w-full flex gap-0.5 mt-1">
            {data.addonsData.peakMetrics.monthlyVolumes.map((mv, i) => (
              <div key={i} className="flex-1 text-center text-[7px] text-gray-400 uppercase tracking-tighter truncate">
                {mv.label.split(" ")[0]}<br />{mv.label.split(" ")[1]}
              </div>
            ))}
          </div>
        </div>

        {/* Busiest Days */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <span>✦</span> Busiest Days (Weekly Analysis)
          </h3>
          <p className="text-[9px] text-gray-400 mb-2 border-b border-gray-200 pb-2">
            Comparing the peak day of the week against that week's daily average.
          </p>
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
            {data.addonsData.peakMetrics.weeklyPeakDays.map((wpd, i) => {
              const localMax = wpd.peakRev * 1.1;
              const avgWidth = (wpd.avgRev / localMax) * 100;
              const peakWidth = (wpd.peakRev / localMax) * 100;
              return (
                <div key={i} className="bg-gray-50 border border-gray-200 p-2 rounded-lg hover:border-gray-300 transition">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-gray-700">
                      {wpd.weekLabel} <span className="text-gray-400 font-normal">({wpd.dateStr})</span>
                    </span>
                    <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                      Peak: {wpd.peakDay}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-right">
                        Avg Day
                      </div>
                      <div className="flex-1 bg-gray-200 h-3 rounded-full overflow-hidden">
                        <div className="bg-gray-400 h-full rounded-full" style={{ width: `${avgWidth}%` }}></div>
                      </div>
                      <div className="w-14 text-[9px] font-mono text-gray-500">
                        {currencySymbol} {wpd.avgRev.toFixed(0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-[9px] font-bold text-blue-500 uppercase tracking-wider text-right">
                        {wpd.peakDay}
                      </div>
                      <div className="flex-1 bg-gray-200 h-3 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${peakWidth}%` }}></div>
                      </div>
                      <div className="w-14 text-[9px] font-mono text-green-600 font-bold flex flex-col leading-tight">
                        <span>{currencySymbol} {wpd.peakRev.toFixed(0)}</span>
                        <span className="text-[7px]">+{wpd.percentageHigher}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Busiest Hours */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <span>✦</span> Busiest Hours (Monthly Rush Analysis)
          </h3>
          <p className="text-[9px] text-gray-400 mb-2 border-b border-gray-200 pb-2">
            Comparing the busiest time of day against the average hourly traffic for that month.
          </p>
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
            {data.addonsData.peakMetrics.monthlyPeakHours.map((mph, i) => {
              const localMax = mph.peakRev * 1.1;
              const avgWidth = (mph.avgRev / localMax) * 100;
              const peakWidth = (mph.peakRev / localMax) * 100;
              return (
                <div key={i} className="bg-gray-50 border border-gray-200 p-2 rounded-lg hover:border-gray-300 transition">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-gray-700">{mph.label}</span>
                    <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                      Rush Hour: {mph.peakHour}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-right">
                        Avg Hour
                      </div>
                      <div className="flex-1 bg-gray-200 h-3 rounded-full overflow-hidden">
                        <div className="bg-gray-400 h-full rounded-full" style={{ width: `${avgWidth}%` }}></div>
                      </div>
                      <div className="w-14 text-[9px] font-mono text-gray-500">
                        {currencySymbol} {mph.avgRev.toFixed(0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-[9px] font-bold text-orange-500 uppercase tracking-wider text-right">
                        {mph.peakHour}
                      </div>
                      <div className="flex-1 bg-gray-200 h-3 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full" style={{ width: `${peakWidth}%` }}></div>
                      </div>
                      <div className="w-14 text-[9px] font-mono text-green-600 font-bold flex flex-col leading-tight">
                        <span>{currencySymbol} {mph.peakRev.toFixed(0)}</span>
                        <span className="text-[7px]">+{mph.percentageHigher}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}

    {/* Refund & Loss Analytics */}
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-sm relative overflow-hidden mt-1">
      <div className="absolute right-0 bottom-0 text-red-200 text-5xl pointer-events-none translate-x-1/4 translate-y-1/4">
        ⚠
      </div>
      <h3 className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2 border-b border-red-100 pb-2 flex items-center gap-1.5 relative z-10">
        <span>⚠</span> Refund & Loss Analytics
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 relative z-10">
        <div className="bg-white p-2 rounded-lg border border-red-100">
          <p className="text-[9px] font-bold uppercase tracking-wider text-red-500/70 mb-0">
            Cancellation Ratio
          </p>
          <p className="text-xl font-black text-red-600 font-mono">
            {data.addonsData.refundMetrics?.ratio || 0}%
          </p>
        </div>
        <div className="bg-white p-2 rounded-lg border border-red-100">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0">
            Cancelled Tickets
          </p>
          <p className="text-xl font-black text-gray-700 font-mono">
            {data.addonsData.refundMetrics?.count || 0}
          </p>
        </div>
        <div className="bg-white p-2 rounded-lg border border-red-100">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0">
            Lost Revenue
          </p>
          <p className="text-xl font-black text-red-600 font-mono">
            {currencySymbol} {data.addonsData.refundMetrics?.lostRevenue?.toFixed(3) || "0.000"}
          </p>
        </div>
      </div>
      {data.addonsData.refundMetrics?.ratio > 5 && (
        <div className="mt-2 text-[10px] text-red-700 font-medium bg-red-100 border border-red-200 p-2 rounded-lg relative z-10">
          <strong>⚠️ Insight:</strong> Your cancellation rate is unusually high. Please review kitchen fulfillment times or audit for potential staff fraud.
        </div>
      )}
    </div>
  </div>
)}
        </>
      )}
    </div>
  );
};

export default Analytics;
