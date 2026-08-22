import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const DeliveryPortal = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); // "active" | "completed"
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchAssignedOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/pos/orders");
      setOrders(res.data || []);
    } catch (err) {
      console.error("Failed to fetch assigned delivery orders:", err);
      setMessage({ type: "error", text: "Failed to load assigned deliveries." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedOrders();
    const interval = setInterval(fetchAssignedOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeBranch");
    navigate("/login");
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId);
      await api.put(`/pos/orders/${orderId}`, { status: newStatus });
      setMessage({
        type: "success",
        text: `Order updated to "${newStatus}" successfully!`,
      });
      await fetchAssignedOrders();
    } catch (err) {
      console.error("Failed to update delivery status:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update order status.",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const activeOrders = orders.filter(
    (o) =>
      (o.type === "Delivery" || o.type === "Aggregator Delivery") &&
      ["Open Orders", "Accepted", "Cooking", "On Way"].includes(o.status)
  );

  const completedOrders = orders.filter(
    (o) =>
      (o.type === "Delivery" || o.type === "Aggregator Delivery") &&
      ["Delivered", "Closed"].includes(o.status)
  );

  const isBusy = activeOrders.length > 0;
  const currentActiveOrder = activeOrders[0];

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans pb-12">
      {/* Top Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900 leading-tight">
                  {user.name || user.email || "Delivery Driver"}
                </h1>
                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Rider Portal
                </span>
              </div>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAssignedOrders}
              disabled={loading}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-bold transition-colors"
              title="Refresh Orders"
            >
              🔄
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-xs font-bold transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
        {/* Status Indicator Banner */}
        <div
          className={`p-4 rounded-xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isBusy
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isBusy ? "🔴" : "🟢"}</span>
            <div>
              <p className="text-sm font-bold">
                {isBusy
                  ? `Busy — Assigned to ${activeOrders.length} Active Delivery (Order #${currentActiveOrder?.orderNo})`
                  : "Available — Ready for New Deliveries"}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {isBusy
                  ? "Deliver the active order and click 'Complete Delivery' to mark yourself available."
                  : "Orders assigned to you by the cashier or admin will automatically appear here."}
              </p>
            </div>
          </div>
          <div className="text-xs font-mono font-bold shrink-0 self-end sm:self-center bg-white/80 px-3 py-1 rounded-lg border">
            {activeOrders.length} Active • {completedOrders.length} Completed Today
          </div>
        </div>

        {/* Feedback Alert */}
        {message.text && (
          <div
            className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between ${
              message.type === "error"
                ? "bg-red-50 text-red-600 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: "", text: "" })}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex gap-2 border-b border-gray-200 pb-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "active"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-white text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>🛵 Active Deliveries</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "active"
                  ? "bg-purple-800 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {activeOrders.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === "completed"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-white text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>✅ Completed Today</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "completed"
                  ? "bg-purple-800 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {completedOrders.length}
            </span>
          </button>
        </div>

        {/* Content Area */}
        {loading && orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 font-bold">Loading your deliveries...</p>
          </div>
        ) : activeTab === "active" ? (
          /* Active Deliveries List */
          activeOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-xs space-y-2">
              <span className="text-4xl block">✨</span>
              <p className="text-sm font-bold text-gray-700">No active deliveries assigned</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                You are currently marked as available. As soon as an order is assigned to you, it will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white border-2 border-purple-200 rounded-xl p-5 shadow-sm space-y-4 transition-all"
                >
                  {/* Order Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-gray-900">
                        Order #{order.orderNo}
                      </span>
                      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">
                        Token #{order.tokenNo}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          order.status === "On Way"
                            ? "bg-blue-100 text-blue-700 animate-pulse"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <span className="text-xs text-gray-400 font-mono">
                      🕒 {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Customer & Address Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Customer
                        </span>
                        <p className="text-sm font-bold text-gray-800">
                          {order.customerName || "Customer"}
                        </p>
                      </div>

                      {order.customerMobile && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Phone Number
                          </span>
                          <a
                            href={`tel:${order.customerMobile}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg mt-0.5 transition-colors"
                          >
                            📞 Call {order.customerMobile}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Delivery Address
                        </span>
                        <p className="text-xs font-medium text-gray-800 break-words mt-0.5">
                          📍 {order.deliveryAddress || "Address not provided"}
                        </p>
                        {order.deliveryAddress && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              order.deliveryAddress
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 mt-1"
                          >
                            🗺️ Open Navigation in Google Maps ↗
                          </a>
                        )}
                      </div>

                      {(order.deliveryNote || order.instructions || order.driverNotes) && (
                        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-800 font-medium">
                          <strong>Note:</strong>{" "}
                          {order.deliveryNote || order.instructions || order.driverNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items list & Total */}
                  <div className="border border-gray-100 rounded-lg p-3 space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Order Items ({order.items?.length || 0})
                    </span>
                    <div className="divide-y divide-gray-100 text-xs text-gray-700 max-h-32 overflow-y-auto">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="py-1 flex justify-between">
                          <span>
                            <strong className="text-gray-900">{item.qty}x</strong> {item.name}
                          </span>
                          <span className="font-mono text-gray-500">
                            ${(item.price * item.qty).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 font-bold text-sm text-gray-900">
                      <span>Total Amount:</span>
                      <span className="font-mono text-base text-purple-700">
                        ${order.finalAmount?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    {order.status !== "On Way" && (
                      <button
                        onClick={() => handleUpdateStatus(order._id, "On Way")}
                        disabled={updatingOrderId === order._id}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                      >
                        🚀 Start Delivery (On The Way)
                      </button>
                    )}

                    <button
                      onClick={() => handleUpdateStatus(order._id, "Delivered")}
                      disabled={updatingOrderId === order._id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>✅ Complete Delivery (Mark as Delivered)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Completed Deliveries Today */
          completedOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <p className="text-xs text-gray-400 font-bold">No deliveries completed yet today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">
                        Order #{order.orderNo}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Delivered
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Customer: {order.customerName} • 📍 {order.deliveryAddress || "N/A"}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-mono font-bold text-gray-900">
                      ${order.finalAmount?.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-gray-400">
                      {new Date(order.updatedAt || order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default DeliveryPortal;
