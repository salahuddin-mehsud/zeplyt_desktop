// src/pages/Orders.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import PaymentModal from "../components/PaymentModal";
import * as printer from '../utils/receiptPrinter';
const { printReceiptHTML, getDefaultReceiptSettings } = printer;
import { dispatchPrint } from '../utils/printDispatcher';


const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCacheKeys = () => {
  const activeBranchId = localStorage.getItem("activeBranch") || "";
  const branchSuffix = activeBranchId ? `_${activeBranchId}` : "";
  return {
    DINE_IN: `pos_dine_in_cache${branchSuffix}`,
    PRODUCTS: `pos_products_cache${branchSuffix}`,
    CATEGORIES: `pos_categories_cache${branchSuffix}`,
    PAYMENT_METHODS: `pos_payment_methods_cache${branchSuffix}`,
  };
};

const Orders = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [areas, setAreas] = useState([]);
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [currentOrderForPayment, setCurrentOrderForPayment] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [globalTaxRate, setGlobalTaxRate] = useState(10);

  const [sidebarAreaFilter, setSidebarAreaFilter] = useState("All");
  const [tableStatusFilter, setTableStatusFilter] = useState("All");
  const [mainAreaFilter, setMainAreaFilter] = useState("All");

  const [activeTab, setActiveTab] = useState("Open Orders");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPOS, setShowPOS] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [modifyingOrder, setModifyingOrder] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchToken, setSearchToken] = useState("");
  const [cart, setCart] = useState([]);
  const [formType, setFormType] = useState("Dine In");
  const [form, setForm] = useState({
    customerName: "",
    customerMobile: "",
    instructions: "",
    guests: "",
    area: "",
    table: "",
    deliveryAddress: "",
    driverNotes: "",
    reservationTime: "",
  });

  const [deliveryCities, setDeliveryCities] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [deliveryCost, setDeliveryCost] = useState(0);

  const fetchData = async () => {
    try {
      const cacheKeys = getCacheKeys();

      const getCached = (key) => {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          return data;
        }
        return null;
      };

      const setCached = (key, data) => {
        localStorage.setItem(
          key,
          JSON.stringify({ data, timestamp: Date.now() }),
        );
      };

      let dineInData = getCached(cacheKeys.DINE_IN);
      let productsData = getCached(cacheKeys.PRODUCTS);
      if (
        productsData &&
        productsData.length > 0 &&
        !productsData.some((p) => p.imageUrl)
      ) {
        productsData = null;
      }
      let categoriesData = getCached(cacheKeys.CATEGORIES);
      let paymentMethodsData = getCached(cacheKeys.PAYMENT_METHODS);

      const promises = [];
      if (!dineInData) promises.push(api.get("/pos/dine-in"));
      if (!productsData) promises.push(api.get("/pos/products"));
      if (!categoriesData) promises.push(api.get("/pos/categories"));
      if (!paymentMethodsData)
        promises.push(api.get("/dashboard/settings/payment-methods"));

      if (promises.length > 0) {
        const results = await Promise.all(promises);
        let idx = 0;
        if (!dineInData) {
          dineInData = results[idx++].data;
          setCached(cacheKeys.DINE_IN, dineInData);
        }
        if (!productsData) {
          productsData = results[idx++].data;
          setCached(cacheKeys.PRODUCTS, productsData);
        }
        if (!categoriesData) {
          categoriesData = results[idx++].data;
          setCached(cacheKeys.CATEGORIES, categoriesData);
        }
        if (!paymentMethodsData) {
          paymentMethodsData = results[idx++].data?.paymentMethods || [
            "CASH",
            "CARD",
            "BPAY",
            "TALABAT",
            "JAHEZ",
            "KEETA",
          ];
          setCached(cacheKeys.PAYMENT_METHODS, paymentMethodsData);
        }

        setAreas(dineInData.areas || []);
        setTables(dineInData.tables || []);
        setProducts(productsData || []);
        setCategories(categoriesData || []);
        setPaymentMethods(paymentMethodsData || []);
      }

      const ordRes = await api.get("/pos/orders");
      setOrders(ordRes.data);

      if (dineInData.areas?.length > 0 && !form.area) {
        setForm((prev) => ({ ...prev, area: dineInData.areas[0]._id }));
      }

      if (productsData) {
        const hasImages = productsData.some((p) => p.imageUrl);
        if (!hasImages) {
          productsData = null;
        }
      }
    } catch (err) {
      console.error("Error fetching POS data:", err);
    }
  };


  useEffect(() => {
    const fetchCurrencyAndTax = async () => {
      try {
        const res = await api.get("/dashboard/settings/operating-hours");
        const cur = res.data.settings?.currency || "USD";
        const symbols = {
          USD: "$",
          EUR: "€",
          GBP: "£",
          BHD: "BHD",
          SAR: "SAR",
          AED: "AED",
          KWD: "KWD",
        };
        setCurrencySymbol(symbols[cur] || cur);
        const taxRate = res.data.settings?.taxRate ?? 10;
        setGlobalTaxRate(taxRate);
      } catch (err) {
        console.error("Failed to fetch settings", err);
        setCurrencySymbol("$");
        setGlobalTaxRate(10);
      }
    };
    fetchCurrencyAndTax();
  }, []);

  useEffect(() => {
    const fetchDeliveryCities = async () => {
      try {
        const res = await api.get("/pos/delivery-locations");
        setDeliveryCities(res.data);
      } catch (err) {
        console.error("Failed to fetch delivery cities", err);
      }
    };
    fetchDeliveryCities();
  }, []);

  useEffect(() => {
    const cacheKeys = getCacheKeys();
    const cachedDineIn = localStorage.getItem(cacheKeys.DINE_IN);
    const cachedProducts = localStorage.getItem(cacheKeys.PRODUCTS);
    const cachedCategories = localStorage.getItem(cacheKeys.CATEGORIES);
    const cachedPaymentMethods = localStorage.getItem(
      cacheKeys.PAYMENT_METHODS,
    );

    if (cachedDineIn) {
      const { data } = JSON.parse(cachedDineIn);
      setAreas(data.areas || []);
      setTables(data.tables || []);
    }
    if (cachedProducts) {
      const { data } = JSON.parse(cachedProducts);
      setProducts(data || []);
    }
    if (cachedCategories) {
      const { data } = JSON.parse(cachedCategories);
      setCategories(data || []);
    }
    if (cachedPaymentMethods) {
      const { data } = JSON.parse(cachedPaymentMethods);
      setPaymentMethods(data || []);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const calculateElapsedTime = (createdAt) => {
    if (!createdAt) return "--";
    const start = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffMins = Math.floor((now - start) / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const availableTables = tables.filter((t) => t.area._id === form.area);

  const activeTableIds = orders
    .filter((o) => o.status === "Open Orders" && o.table)
    .map((o) => (typeof o.table === "object" ? o.table._id : o.table));

  const activeTakeawayOrders = orders.filter(
    (o) =>
      o.status === "Open Orders" &&
      ["Parcel", "Delivery"].includes(o.type) &&
      !o.table,
  );
  const takeawayCount = activeTakeawayOrders.length;

  const displayedTables =
    mainAreaFilter === "All"
      ? tables
      : tables.filter(
          (t) => t.area._id === mainAreaFilter || t.area === mainAreaFilter,
        );
  const totalTablesCount =
    mainAreaFilter === "Takeaway" ? 0 : displayedTables.length;
  const occupiedTablesCount =
    mainAreaFilter === "Takeaway"
      ? 0
      : displayedTables.filter((t) => activeTableIds.includes(t._id)).length;
  const freeTablesCount = totalTablesCount - occupiedTablesCount;

  const filteredOrders = orders
    .filter((o) => {
      let matchesTab = false;
      if (activeTab === "Open Orders") {
        matchesTab = [
          "Open Orders",
          "Pending Web Order",
          "Online Open",
        ].includes(o.status);
      } else if (activeTab === "Canceled") {
        matchesTab = ["Cancelled", "Refunded"].includes(o.status);
      } else {
        matchesTab = o.status === activeTab;
      }
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.table && o.table.name && o.table.name.toLowerCase().includes(q));
      const t = searchToken.toLowerCase();
      const matchesToken =
        !t ||
        (o.tokenNo && o.tokenNo.toString().includes(t)) ||
        (o.orderNo && o.orderNo.toLowerCase().includes(t));

      return matchesTab && matchesQuery && matchesToken;
    })
    .sort((a, b) => {
      if (activeTab === "Closed" || activeTab === "Canceled") {
        return (
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt)
        );
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category?._id === selectedCategory);

  const openNewOrder = (type, prefilledArea = null, prefilledTable = null) => {
    setActiveOrderId(null);
    setFormType(type);
    setForm({
      customerName: "",
      customerMobile: "",
      instructions: "",
      guests: "",
      area: prefilledArea || areas[0]?._id || "",
      table: prefilledTable || "",
      deliveryAddress: "",
      driverNotes: "",
      reservationTime: "",
    });
    setSelectedCityId("");
    setDeliveryCost(0);
    setIsModalOpen(true);
  };

  const handleTableClick = (areaId, tableId) => {
    const existingOrder = orders.find(
      (o) =>
        o.status === "Open Orders" &&
        o.table &&
        (o.table._id === tableId || o.table === tableId),
    );

    if (existingOrder) {
      setActiveOrderId(existingOrder._id);
      setFormType(existingOrder.type);
      setCart([]);
      setShowPOS(true);
    } else {
      openNewOrder("Dine In", areaId, tableId);
    }
  };

  const proceedToPOS = () => {
    setIsModalOpen(false);
    setShowPOS(true);
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p._id === product._id);
      if (existing)
        return prev.map((p) =>
          p._id === product._id ? { ...p, qty: p.qty + 1 } : p,
        );
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const triggerPrint = (order, type = 'kitchen') => {
  dispatchPrint(order, type).catch(err => console.error('[PRINT] dispatchPrint failed:', err));
};

  const fireOrderAndOpenPayment = async () => {
    if (cart.length === 0)
      return alert("Cart is empty! Add items before firing.");

    const subTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const taxRate = globalTaxRate;
    const taxAmount = subTotal * (taxRate / 100);
    const shippingCost = formType === "Delivery" ? deliveryCost : 0;
    const finalAmount = subTotal + taxAmount + shippingCost;

    const items = cart.map((c) => ({
      product: c._id,
      name: c.name,
      qty: c.qty,
      price: c.price,
    }));
    let savedOrder;

    try {
      if (activeOrderId) {
        const res = await api.put(`/pos/orders/${activeOrderId}`, {
          action: "ADD_ITEMS",
          newItems: items,
        });
        savedOrder = res.data;
      } else {
        const payload = {
          ...form,
          type: formType,
          items,
          taxAmount: taxAmount,
          taxPercentage: taxRate,
          shippingCost: shippingCost,
        };
        const res = await api.post("/pos/orders", payload);
        savedOrder = res.data;
      }
      setCart([]);
      setShowPOS(false);
      setActiveOrderId(null);
      fetchData();
      setCurrentOrderForPayment(savedOrder);
      setIsPaymentModalOpen(true);
    } catch (error) {
      console.error("Failed to fire order:", error);
      alert("Failed to send order to kitchen.");
    }
  };

  const handleFinalizePayment = async (paymentDetails) => {
    if (!currentOrderForPayment || !currentOrderForPayment._id) return;
    try {
      const res = await api.put(`/pos/orders/${currentOrderForPayment._id}`, {
        ...paymentDetails,
      });
      setIsPaymentModalOpen(false);
      setCurrentOrderForPayment(null);
      fetchData();
    } catch (err) {
      console.error("Payment failed", err);
      alert("Failed to process payment.");
    }
  };

  const cancelPOS = () => {
    setCart([]);
    setShowPOS(false);
    setActiveOrderId(null);
  };

  const updateOrderStatus = async (id, status) => {
    await api.put(`/pos/orders/${id}`, { status });
    fetchData();
  };

  const removeOrderItem = async (orderId, itemIndex) => {
    await api.put(`/pos/orders/${orderId}`, {
      action: "REMOVE_ITEM",
      itemIndex,
    });
    fetchData();
  };

  const cancelOrder = async (id) => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      await api.put(`/pos/orders/${id}`, { status: "Cancelled" });
      fetchData();
    }
  };

  const subTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxAmount = subTotal * (globalTaxRate / 100);
  const shippingCostDisplay = formType === "Delivery" ? deliveryCost : 0;
  const total = subTotal + taxAmount + shippingCostDisplay;

  const getCardStyle = (type, isClosed) => {
    if (isClosed)
      return "border border-gray-200 bg-white hover:border-gray-300 shadow-sm";
    if (type === "Dine In")
      return "border border-gray-200 border-t-4 border-t-blue-500 shadow-sm hover:border-gray-300 bg-white";
    if (type === "Parcel")
      return "border border-gray-200 border-t-4 border-t-teal-500 shadow-sm hover:border-gray-300 bg-white";
    if (type === "Delivery")
      return "border border-gray-200 border-t-4 border-t-purple-500 shadow-sm hover:border-gray-300 bg-white";
    if (type === "Reservation")
      return "border border-gray-200 border-t-4 border-t-amber-500 shadow-sm hover:border-gray-300 bg-white";
    return "border border-gray-200 bg-white";
  };

  const getDynamicBadgeStyle = (displayType, isClosed) => {
    if (isClosed) return "bg-gray-100 text-gray-500 border border-gray-200";
    if (displayType === "Website Order")
      return "bg-purple-100 text-purple-700 border border-purple-200";
    if (displayType === "QR Menu")
      return "bg-pink-100 text-pink-700 border border-pink-200";
    if (displayType === "Dine In")
      return "bg-blue-100 text-blue-700 border border-blue-200";
    if (displayType === "Reservation")
      return "bg-amber-100 text-amber-700 border border-amber-200";
    if (displayType === "Delivery")
      return "bg-purple-100 text-purple-700 border border-purple-200";
    return "bg-teal-100 text-teal-700 border border-teal-200";
  };

  const handleCityChange = (cityId) => {
    setSelectedCityId(cityId);
    const city = deliveryCities.find((c) => c._id === cityId);
    setDeliveryCost(city ? city.deliveryCost : 0);
  };

  return (
    <div className="fixed inset-0 z-40 bg-gray-50 text-gray-800 font-sans flex overflow-hidden">
      {!showPOS && (
        <>
          <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-500 hover:text-gray-700 font-bold text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                ← Go Back
              </button>
              <h1 className="text-lg font-bold tracking-tight">
                Live Orders & POS
              </h1>
            </div>
            <div className="max-w-[1400px] mx-auto">
              <div className="flex flex-wrap gap-2 mb-4 bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                <input
                  type="text"
                  placeholder="Search Customer or Table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg w-56 outline-none text-xs focus:border-blue-400 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Token / Order No"
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                  className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg w-40 outline-none text-xs focus:border-blue-400 transition-colors"
                />

                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => openNewOrder("Parcel")}
                    className="bg-teal-100 text-teal-700 border border-teal-200 hover:bg-teal-200 px-4 py-1.5 rounded-lg font-bold text-xs transition-colors"
                  >
                    + PARCEL
                  </button>
                  <button
                    onClick={() => openNewOrder("Delivery")}
                    className="bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 px-4 py-1.5 rounded-lg font-bold text-xs transition-colors"
                  >
                    + DELIVERY
                  </button>
                  <button
                    onClick={() => openNewOrder("Dine In")}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-1.5 rounded-lg font-bold text-xs transition-colors"
                  >
                    NEW DINE-IN
                  </button>
                </div>
              </div>

              <div className="flex gap-5 border-b border-gray-200 mb-4 text-xs font-bold text-gray-400 overflow-x-auto hide-scrollbar">
                {[
                  "Open Orders",
                  "Closed",
                  "Outstanding Payment",
                  "Canceled",
                  "Table View",
                ].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`shrink-0 pb-2 uppercase tracking-wider transition-colors ${activeTab === tab ? "text-blue-600 border-b-2 border-blue-500" : "hover:text-gray-600"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "Table View" ? (
                <div className="flex flex-col gap-4 pb-16">
                  <div className="bg-white border border-gray-200 rounded-lg p-3 mb-1 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 mb-3 border-b border-gray-200 pb-3">
                      <span className="font-bold text-gray-500 text-[10px] mr-1 uppercase tracking-wider">
                        Select Area :
                      </span>

                      <button
                        onClick={() => setMainAreaFilter("All")}
                        className={`px-3 py-1 rounded font-bold text-[10px] border ${mainAreaFilter === "All" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-100"}`}
                      >
                        ALL
                      </button>

                      {areas.map((area) => {
                        const activeInArea = tables.filter(
                          (t) =>
                            (t.area._id === area._id || t.area === area._id) &&
                            activeTableIds.includes(t._id),
                        ).length;
                        return (
                          <button
                            key={area._id}
                            onClick={() => setMainAreaFilter(area._id)}
                            className={`relative px-3 py-1 rounded font-bold text-[10px] border ${mainAreaFilter === area._id ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-100"}`}
                          >
                            {area.name}
                            {activeInArea > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 bg-gray-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                                {activeInArea}
                              </span>
                            )}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setMainAreaFilter("Takeaway")}
                        className={`relative px-3 py-1 rounded font-bold text-[10px] border ${mainAreaFilter === "Takeaway" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-100"}`}
                      >
                        TAKEAWAY
                        {takeawayCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-gray-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                            {takeawayCount}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button
                        onClick={() => setTableStatusFilter("All")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${tableStatusFilter === "All" ? "bg-gray-200 border-gray-300 text-gray-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-100"}`}
                      >
                        <span className="font-bold uppercase tracking-wider text-[10px]">
                          Total :
                        </span>
                        <span className="font-mono text-sm font-bold">
                          {totalTablesCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setTableStatusFilter("Free")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${tableStatusFilter === "Free" ? "bg-gray-200 border-gray-300 text-gray-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-100"}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-sm bg-gray-400 border border-gray-300"></span>
                        <span className="font-bold uppercase tracking-wider text-[10px]">
                          Free :
                        </span>
                        <span className="font-mono text-sm font-bold">
                          {freeTablesCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setTableStatusFilter("Occupied")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${tableStatusFilter === "Occupied" ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-100"}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                        <span className="font-bold uppercase tracking-wider text-[10px]">
                          Occupied :
                        </span>
                        <span className="font-mono text-sm font-bold">
                          {occupiedTablesCount}
                        </span>
                      </button>
                    </div>
                  </div>

                  {areas.length === 0 && (
                    <p className="text-gray-400 text-xs italic mt-3">
                      No areas configured.
                    </p>
                  )}

                  {areas
                    .filter(
                      (area) =>
                        mainAreaFilter === "All" || mainAreaFilter === area._id,
                    )
                    .map((area) => {
                      const areaTables = tables.filter((t) => {
                        const belongsToArea =
                          t.area._id === area._id || t.area === area._id;
                        if (!belongsToArea) return false;

                        const isOccupied = activeTableIds.includes(t._id);
                        const activeOrder = orders.find(
                          (o) =>
                            o.status === "Open Orders" &&
                            o.table &&
                            (o.table._id === t._id || o.table === t._id),
                        );
                        const isPrinted = activeOrder && activeOrder.isPrinted;

                        if (tableStatusFilter === "Free" && isOccupied)
                          return false;
                        if (tableStatusFilter === "Occupied" && !isOccupied)
                          return false;
                        if (tableStatusFilter === "Printed" && !isPrinted)
                          return false;

                        return true;
                      });

                      if (areaTables.length === 0) return null;

                      return (
                        <div key={area._id}>
                          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-3">
                            {area.name}{" "}
                            <span className="flex-1 h-px bg-gray-200"></span>
                          </h3>

                          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                            {areaTables.map((t) => {
                              const activeOrder = orders.find(
                                (o) =>
                                  o.status === "Open Orders" &&
                                  o.table &&
                                  (o.table._id === t._id || o.table === t._id),
                              );
                              const token = activeOrder
                                ? activeOrder.tokenNo
                                : "--";
                              const time = activeOrder
                                ? calculateElapsedTime(activeOrder.createdAt)
                                : "--";
                              const amount = activeOrder
                                ? `${currencySymbol}${activeOrder.finalAmount.toFixed(2)}`
                                : `${currencySymbol}0.00`;

                              return (
                                <div
                                  key={t._id}
                                  className={`rounded border flex flex-col overflow-hidden bg-white ${activeOrder ? "border-blue-400/60" : "border-gray-200"}`}
                                >
                                  <div
                                    className={`p-1.5 px-2 flex justify-between items-center border-b ${activeOrder ? "border-blue-400/60 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
                                  >
                                    <span
                                      className={`text-[10px] ${activeOrder ? "text-blue-600" : "text-gray-400"}`}
                                    >
                                      🪑
                                    </span>
                                    <span
                                      className={`font-bold text-[10px] tracking-wider ${activeOrder ? "text-blue-600" : "text-gray-400"}`}
                                    >
                                      {t.name}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-3 divide-x divide-gray-200 text-center p-1.5 bg-white">
                                    <div>
                                      <p className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">
                                        #
                                      </p>
                                      <p
                                        className={`font-mono text-xs font-bold ${activeOrder ? "text-gray-800" : "text-gray-400"}`}
                                      >
                                        {token}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">
                                        Time
                                      </p>
                                      <p
                                        className={`text-xs font-bold ${activeOrder ? "text-gray-800" : "text-gray-400"}`}
                                      >
                                        {time}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">
                                        Amount
                                      </p>
                                      <p
                                        className={`font-mono text-xs font-bold ${activeOrder ? "text-green-600" : "text-gray-400"}`}
                                      >
                                        {amount}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-auto flex divide-x divide-gray-200 border-t border-gray-200">
                                    {activeOrder ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            setActiveOrderId(activeOrder._id);
                                            setFormType(activeOrder.type);
                                            proceedToPOS();
                                          }}
                                          className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-[9px] font-bold text-gray-600 hover:text-gray-800 uppercase transition-none"
                                        >
                                          + Add
                                        </button>
                                       <button
  onClick={() => triggerPrint(activeOrder, 'kitchen')}
  className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-[9px] font-bold text-gray-600 hover:text-gray-800 uppercase transition-none"
>
  KOT
</button>
<button
  onClick={() => triggerPrint(activeOrder, 'bill')}
  className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-[9px] font-bold text-gray-600 hover:text-gray-800 uppercase transition-none"
>
  Bill
</button>
                                        {activeOrder.paymentMode ? (
                                          <button
                                            onClick={() =>
                                              updateOrderStatus(
                                                activeOrder._id,
                                                "Closed",
                                              )
                                            }
                                            className="flex-[1.5] py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[9px] font-bold text-emerald-700 hover:text-emerald-900 uppercase transition-none"
                                          >
                                            Complete
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              setCurrentOrderForPayment(
                                                activeOrder,
                                              );
                                              setIsPaymentModalOpen(true);
                                            }}
                                            className="flex-[1.5] py-1.5 bg-blue-50 hover:bg-blue-100 text-[9px] font-bold text-blue-700 hover:text-blue-900 uppercase transition-none"
                                          >
                                            Pay
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          openNewOrder(
                                            "Dine In",
                                            area._id,
                                            t._id,
                                          )
                                        }
                                        className="w-full py-1.5 bg-white hover:bg-gray-50 text-[9px] font-bold text-gray-500 hover:text-gray-700 uppercase tracking-wider transition-none"
                                      >
                                        + New Order
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                  {(mainAreaFilter === "All" ||
                    mainAreaFilter === "Takeaway") &&
                    tableStatusFilter !== "Free" && (
                      <div className="mt-4 border-t border-gray-200 pt-5">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-3">
                          TAKEAWAY & DELIVERY{" "}
                          <span className="flex-1 h-px bg-gray-200"></span>
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                          {activeTakeawayOrders.map((activeOrder) => {
                            const time = calculateElapsedTime(
                              activeOrder.createdAt,
                            );
                            const isDelivery = activeOrder.type === "Delivery";
                            return (
                              <div
                                key={activeOrder._id}
                                className={`rounded border ${isDelivery ? "border-purple-400/60" : "border-teal-400/60"} bg-white flex flex-col overflow-hidden`}
                              >
                                <div
                                  className={`p-1.5 px-2 flex justify-between items-center border-b ${isDelivery ? "border-purple-400/60 bg-purple-50" : "border-teal-400/60 bg-teal-50"}`}
                                >
                                  <span
                                    className={
                                      isDelivery
                                        ? "text-purple-600 text-[10px]"
                                        : "text-teal-600 text-[10px]"
                                    }
                                  >
                                    {isDelivery ? "🚚" : "📦"}
                                  </span>
                                  <span
                                    className={`font-bold text-[10px] tracking-wider ${isDelivery ? "text-purple-600" : "text-teal-600"} truncate max-w-[80px]`}
                                  >
                                    {activeOrder.customerName ||
                                      (isDelivery ? "Delivery" : "Parcel")}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-gray-200 text-center p-1.5 bg-white">
                                  <div>
                                    <p className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">
                                      #
                                    </p>
                                    <p className="font-mono text-xs font-bold text-gray-800">
                                      {activeOrder.tokenNo}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">
                                      Time
                                    </p>
                                    <p className="text-xs font-bold text-gray-800">
                                      {time}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-gray-400 uppercase tracking-wider font-bold">
                                      Amount
                                    </p>
                                    <p className="font-mono text-xs font-bold text-green-600">
                                      {currencySymbol}
                                      {activeOrder.finalAmount.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-auto flex divide-x divide-gray-200 border-t border-gray-200">
                                  <button
                                    onClick={() => {
                                      setActiveOrderId(activeOrder._id);
                                      setFormType(activeOrder.type);
                                      proceedToPOS();
                                    }}
                                    className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-[9px] font-bold text-gray-600 hover:text-gray-800 uppercase transition-none"
                                  >
                                    + Add
                                  </button>
                                  <button
                                    onClick={() => triggerPrint(activeOrder)}
                                    className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-[9px] font-bold text-gray-600 hover:text-gray-800 uppercase transition-none"
                                  >
                                    Print
                                  </button>
                                  {activeOrder.paymentMode ? (
                                    <button
                                      onClick={() =>
                                        updateOrderStatus(
                                          activeOrder._id,
                                          "Closed",
                                        )
                                      }
                                      className="flex-[1.5] py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[9px] font-bold text-emerald-700 hover:text-emerald-900 uppercase transition-none"
                                    >
                                      Complete
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setCurrentOrderForPayment(activeOrder);
                                        setIsPaymentModalOpen(true);
                                      }}
                                      className="flex-[1.5] py-1.5 bg-blue-50 hover:bg-blue-100 text-[9px] font-bold text-blue-700 hover:text-blue-900 uppercase transition-none"
                                    >
                                      Pay
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          <div
                            onClick={() => openNewOrder("Parcel")}
                            className="rounded border border-gray-200 bg-white hover:border-teal-400 hover:bg-teal-50 flex flex-col items-center justify-center p-4 cursor-pointer min-h-[80px] transition-colors"
                          >
                            <span className="text-lg mb-0.5 opacity-60">
                              📦
                            </span>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                              + New Parcel
                            </span>
                          </div>
                          <div
                            onClick={() => openNewOrder("Delivery")}
                            className="rounded border border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50 flex flex-col items-center justify-center p-4 cursor-pointer min-h-[80px] transition-colors"
                          >
                            <span className="text-lg mb-0.5 opacity-60">
                              🚚
                            </span>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                              + New Delivery
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div
                  className={
                    activeTab === "Closed" || activeTab === "Canceled"
                      ? "flex flex-col gap-2 pb-16"
                      : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-16"
                  }
                >
                  {filteredOrders.length === 0 && (
                    <p className="col-span-full text-center text-gray-400 font-bold py-8 uppercase tracking-wider text-xs">
                      No orders found.
                    </p>
                  )}

                  {filteredOrders.map((order) => {
                    const isClosed =
                      order.status === "Closed" ||
                      order.status === "Cancelled" ||
                      order.status === "Refunded";

                    let displayType = order.type;
                    const isDigital =
                      ["Pending Web Order", "Online Open"].includes(
                        order.status,
                      ) ||
                      ["Web", "QR", "Website Order", "QR Menu"].includes(
                        order.type,
                      ) ||
                      ["Web", "QR"].includes(order.source);

                    if (isDigital) {
                      if (
                        order.table ||
                        (order.customerName &&
                          order.customerName.toLowerCase().includes("qr"))
                      ) {
                        displayType = "QR Menu";
                      } else {
                        displayType = "Website Order";
                      }
                    }

                    if (isClosed) {
                      return (
                        <div
                          key={order._id}
                          className="bg-white border border-gray-200 p-3 rounded-xl flex flex-wrap md:flex-nowrap items-center justify-between gap-3 hover:border-gray-300 transition-colors shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <div className="flex flex-col gap-0.5">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider bg-gray-100 text-gray-700 border border-gray-200 text-center">
                                #{order.tokenNo}
                                {order.paymentMode && (
                                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 ml-1.5">
                                    Paid: {order.paymentMode}
                                  </span>
                                )}
                              </span>
                              <span
                                className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-center ${getDynamicBadgeStyle(displayType, true)}`}
                              >
                                {displayType}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 text-xs truncate max-w-[120px]">
                                {order.customerName ||
                                  (order.type === "Dine In" ||
                                  order.type === "Reservation"
                                    ? order.table?.name || "Walk-In"
                                    : "DELIVERY")}
                              </p>
                              <p className="text-gray-400 text-[10px] font-mono mt-0.5">
                                {new Date(order.createdAt).toLocaleDateString()}{" "}
                                •{" "}
                                {new Date(order.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex-1 text-gray-500 text-[10px] truncate px-2 hidden md:block max-w-xl">
                            {order.items
                              .map((i) => `${i.qty}x ${i.name}`)
                              .join(", ")}
                          </div>

                          <div className="flex items-center gap-4 text-right shrink-0">
                            <div>
                              <span className="font-mono text-base font-bold text-gray-700">
                                {currencySymbol}
                                {order.finalAmount.toFixed(2)}
                              </span>
                              <p
                                className={`text-[8px] uppercase tracking-wider mt-0.5 ${order.status === "Cancelled" || order.status === "Refunded" ? "text-red-500" : "text-gray-400"}`}
                              >
                                {order.status === "Cancelled" ||
                                order.status === "Refunded"
                                  ? "Canceled"
                                  : "Paid Total"}
                              </p>
                            </div>

                            <div className="flex flex-col gap-1 border-l border-gray-200 pl-3">
                              <button
                                onClick={() => triggerPrint(order)}
                                className="text-[9px] font-bold uppercase tracking-wider text-blue-600 hover:text-gray-800 transition-colors"
                              >
                                Print
                              </button>
                              <button
                                onClick={() =>
                                  updateOrderStatus(order._id, "Open Orders")
                                }
                                className="text-[9px] font-bold uppercase tracking-wider text-amber-600 hover:text-gray-800 transition-colors"
                              >
                                ⟲ Reopen
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={order._id}
                        className={`rounded-xl overflow-hidden flex flex-col transition-all ${getCardStyle(order.type, isClosed)} ${order.status === "Pending Web Order" ? "border-purple-300 shadow-purple-100" : ""}`}
                      >
                        <div className="bg-gray-50/80 p-2.5 flex justify-between items-center border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider border border-gray-200">
                              #{order.tokenNo}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${getDynamicBadgeStyle(displayType, isClosed)}`}
                            >
                              {displayType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold truncate max-w-[60px] text-gray-500">
                              {order.type === "Dine In" ||
                              order.type === "Reservation" ||
                              displayType === "QR Menu"
                                ? order.table?.name || "Walk-In"
                                : "DELIVERY"}
                            </span>
                            <button
                              onClick={() => cancelOrder(order._id)}
                              className="text-gray-400 hover:bg-red-100 hover:text-red-600 px-1.5 py-0.5 rounded transition-colors text-xs"
                              title="Cancel Order"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col text-xs">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-sm truncate max-w-[120px] text-gray-800">
                                {order.customerName &&
                                order.customerName !== "undefined undefined"
                                  ? order.customerName
                                  : order.type === "Parcel" ||
                                      order.type === "Delivery" ||
                                      displayType === "Website Order"
                                    ? order.type === "Delivery"
                                      ? "Delivery Order"
                                      : "Parcel Order"
                                    : "Walk-in"}
                              </p>
                              <p className="mt-0.5 flex gap-2 text-gray-400 text-[10px]">
                                <span>
                                  {new Date(order.createdAt).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                                <span>•</span>
                                <span className="font-mono">
                                  {order.orderNo}
                                </span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-base font-bold leading-none text-green-600">
                                {currencySymbol}
                                {order.finalAmount.toFixed(2)}
                              </p>
                              <p className="text-[8px] mt-0.5 tracking-wider uppercase text-gray-400">
                                Total
                              </p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg border border-gray-200 p-1.5 mb-2 flex-1 overflow-y-auto max-h-[100px] min-h-[60px] hide-scrollbar">
                            {order.items.length === 0 && (
                              <p className="text-[10px] text-gray-400 text-center py-2">
                                No items.
                              </p>
                            )}
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-start py-1 border-b border-gray-100 last:border-0 text-[10px] group"
                              >
                                <div className="flex-1 pr-1 truncate">
                                  <span className="font-bold mr-0.5 text-gray-400">
                                    {item.qty}x
                                  </span>
                                  <span className="text-gray-700">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono text-gray-500">
                                    {currencySymbol}
                                    {(item.price * item.qty).toFixed(2)}
                                  </span>
                                  {modifyingOrder === order._id && (
                                    <button
                                      onClick={() =>
                                        removeOrderItem(order._id, idx)
                                      }
                                      className="text-white bg-red-400 hover:bg-red-500 px-1 py-0.5 rounded text-[8px] font-bold uppercase transition-colors"
                                    >
                                      Rm
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {/* 🆕 Breakdown */}
                            <div className="mt-1.5 pt-1 border-t border-gray-200 space-y-0.5 text-[10px]">
                              {order.taxAmount > 0 && (
                                <div className="flex justify-between text-gray-500">
                                  <span>
                                    Tax ({order.taxPercentage || globalTaxRate}
                                    %)
                                  </span>
                                  <span className="font-mono">
                                    {currencySymbol}
                                    {order.taxAmount.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {order.shippingCost > 0 && (
                                <div className="flex justify-between text-purple-600">
                                  <span>Shipping</span>
                                  <span className="font-mono">
                                    {currencySymbol}
                                    {order.shippingCost.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold text-gray-800 pt-0.5 border-t border-gray-200">
                                <span>Total</span>
                                <span className="font-mono">
                                  {currencySymbol}
                                  {order.finalAmount.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-auto">
  {order.status === "Pending Web Order" ? (
    // Pending Web Order – single button
    <button
      onClick={() => {
        updateOrderStatus(order._id, "Online Open");
        triggerPrint(order);
      }}
      className={`w-full py-1.5 rounded text-[9px] font-bold tracking-widest uppercase border transition-colors ${
        displayType === "QR Menu"
          ? "bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200"
          : "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
      }`}
    >
      Accept & Process {displayType === "QR Menu" ? "QR" : "Web"} Order
    </button>
  ) : (
    // Normal open order – 4‑col grid + full‑width payment
    <div className="grid grid-cols-4 gap-1.5">
      {/* Modify button */}
      <button
        onClick={() =>
          setModifyingOrder(modifyingOrder === order._id ? null : order._id)
        }
        className={`py-1.5 rounded text-[9px] font-bold tracking-widest uppercase transition-colors border ${
          modifyingOrder === order._id
            ? "bg-gray-200 text-gray-800 border-gray-300"
            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
        }`}
      >
        {modifyingOrder === order._id ? "Done" : "Modify"}
      </button>

      {/* + Add button */}
      <button
        onClick={() => {
          setActiveOrderId(order._id);
          setFormType(order.type);
          proceedToPOS();
        }}
        className="py-1.5 rounded text-[9px] font-bold tracking-widest uppercase bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors"
      >
        + Add
      </button>

      {/* KOT button */}
      <button
        onClick={() => triggerPrint(order, "kitchen")}
        className="py-1.5 rounded text-[9px] font-bold tracking-widest uppercase bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors"
      >
        KOT
      </button>

      {/* Bill button */}
      <button
        onClick={() => triggerPrint(order, "bill")}
        className="py-1.5 rounded text-[9px] font-bold tracking-widest uppercase bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors"
      >
        Bill
      </button>

      {/* Full‑width Pay / Complete */}
      {order.paymentMode ? (
        <button
          onClick={() => updateOrderStatus(order._id, "Closed")}
          className="col-span-4 py-1.5 rounded text-[9px] font-bold tracking-widest uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-colors"
        >
          Complete
        </button>
      ) : (
        <button
          onClick={() => {
            setCurrentOrderForPayment(order);
            setIsPaymentModalOpen(true);
          }}
          className="col-span-4 py-1.5 rounded text-[9px] font-bold tracking-widest uppercase bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors"
        >
          Pay
        </button>
      )}
    </div>
  )}
</div>


                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Toggle Button */}
          <div className="w-6 shrink-0 relative flex flex-col border-l border-gray-200">
            <div className="sticky top-1/2 -translate-y-1/2 z-40">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-500 hover:text-gray-700 w-6 h-24 rounded-l flex items-center justify-center transition-colors"
                title="Toggle Sidebar"
              >
                <span className="-rotate-90 whitespace-nowrap text-[8px] font-bold tracking-widest uppercase">
                  {isSidebarOpen ? "Hide" : "Show"}
                </span>
              </button>
            </div>
          </div>

          {/* Sidebar Panel */}
          <div
            className={`shrink-0 bg-white border-l border-gray-200 h-full flex flex-col transition-all duration-200 ease-out ${isSidebarOpen ? "w-[280px]" : "w-0 overflow-hidden border-none"}`}
          >
            <div className="p-3 flex items-center justify-between border-b border-gray-200">
              <select
                value={sidebarAreaFilter}
                onChange={(e) => setSidebarAreaFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 rounded p-1 text-xs font-medium w-40 outline-none cursor-pointer focus:border-blue-400"
              >
                <option value="All">All Tables</option>
                {areas.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
                <option value="Takeaway">Takeaway / Parcel</option>
              </select>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-gray-400 hover:bg-gray-100 hover:text-gray-700 w-6 h-6 rounded flex items-center justify-center text-base font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-3 pb-1.5">
              <button
                onClick={() =>
                  setTableStatusFilter(
                    tableStatusFilter === "All" ? "Occupied" : "All",
                  )
                }
                className={`w-full font-bold py-1.5 rounded text-[10px] uppercase tracking-wider transition-none border ${
                  tableStatusFilter !== "All"
                    ? "bg-blue-50 text-blue-700 border-blue-300"
                    : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tableStatusFilter !== "All"
                  ? `FILTER: ${tableStatusFilter.toUpperCase()}`
                  : "ALL ORDERS"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 pt-1.5 custom-scrollbar">
              {areas.length === 0 && (
                <p className="text-gray-400 text-xs text-center">
                  No areas configured.
                </p>
              )}

              {areas
                .filter(
                  (area) =>
                    sidebarAreaFilter === "All" ||
                    sidebarAreaFilter === area._id,
                )
                .map((area) => {
                  const areaTables = tables.filter((t) => {
                    const belongsToArea =
                      t.area._id === area._id || t.area === area._id;
                    if (!belongsToArea) return false;
                    const isOccupied = activeTableIds.includes(t._id);
                    const activeOrder = orders.find(
                      (o) =>
                        o.status === "Open Orders" &&
                        o.table &&
                        (o.table._id === t._id || o.table === t._id),
                    );
                    const isPrinted = activeOrder && activeOrder.isPrinted;
                    if (tableStatusFilter === "Free" && isOccupied)
                      return false;
                    if (tableStatusFilter === "Occupied" && !isOccupied)
                      return false;
                    if (tableStatusFilter === "Printed" && !isPrinted)
                      return false;
                    return true;
                  });

                  if (areaTables.length === 0) return null;

                  return (
                    <div key={area._id} className="mb-4">
                      <h3 className="font-bold text-gray-400 uppercase text-[10px] mb-2 tracking-wider">
                        {area.name}
                      </h3>

                      <div className="grid grid-cols-2 gap-1.5">
                        {areaTables.map((t) => {
                          const isOccupied = activeTableIds.includes(t._id);
                          return (
                            <div
                              key={t._id}
                              className={`flex border rounded overflow-hidden h-8 transition-colors ${isOccupied ? "border-red-300" : "border-blue-300"}`}
                            >
                              <button
                                onClick={() =>
                                  handleTableClick(area._id, t._id)
                                }
                                className={`flex-1 font-semibold text-[11px] flex items-center justify-center transition-colors ${isOccupied ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                              >
                                {t.name}
                              </button>
                              <button
                                onClick={() =>
                                  handleTableClick(area._id, t._id)
                                }
                                className={`w-7 border-l flex items-center justify-center text-sm transition-colors ${isOccupied ? "border-red-300 bg-red-100 text-red-600 hover:bg-red-200" : "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
                              >
                                +
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              {tableStatusFilter !== "Free" &&
                (sidebarAreaFilter === "All" ||
                  sidebarAreaFilter === "Takeaway") && (
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <h3 className="font-bold text-gray-400 uppercase text-[10px] mb-2 tracking-wider">
                      TAKEAWAY & DELIVERY
                    </h3>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex border border-blue-300 rounded overflow-hidden h-8">
                        <button
                          onClick={() => openNewOrder("Parcel")}
                          className="flex-1 font-semibold text-[11px] flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Parcel
                        </button>
                        <button
                          onClick={() => openNewOrder("Parcel")}
                          className="w-7 border-l border-blue-300 flex items-center justify-center text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex border border-purple-300 rounded overflow-hidden h-8">
                        <button
                          onClick={() => openNewOrder("Delivery")}
                          className="flex-1 font-semibold text-[11px] flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Delivery
                        </button>
                        <button
                          onClick={() => openNewOrder("Delivery")}
                          className="w-7 border-l border-purple-300 flex items-center justify-center text-sm text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </>
      )}

      {/* Create Order Modal */}
      {isModalOpen && !showPOS && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl overflow-hidden shadow-lg">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-800">
                Start New {formType} Order
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="flex items-center gap-5 pb-3 border-b border-gray-200">
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                  Type:
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs">
                  <input
                    type="radio"
                    checked={formType === "Dine In"}
                    onChange={() => setFormType("Dine In")}
                    className="accent-blue-500 w-3.5 h-3.5"
                  />{" "}
                  Dine In
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs">
                  <input
                    type="radio"
                    checked={formType === "Parcel"}
                    onChange={() => setFormType("Parcel")}
                    className="accent-blue-500 w-3.5 h-3.5"
                  />{" "}
                  Parcel
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs">
                  <input
                    type="radio"
                    checked={formType === "Delivery"}
                    onChange={() => setFormType("Delivery")}
                    className="accent-purple-500 w-3.5 h-3.5"
                  />{" "}
                  Delivery
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs">
                  <input
                    type="radio"
                    checked={formType === "Reservation"}
                    onChange={() => setFormType("Reservation")}
                    className="accent-blue-500 w-3.5 h-3.5"
                  />{" "}
                  Reservation
                </label>
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-3 text-xs">
                <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Optional"
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-sm"
                  value={form.customerName}
                  onChange={(e) =>
                    setForm({ ...form, customerName: e.target.value })
                  }
                />

                <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  Mobile
                </label>
                <input
                  type="text"
                  placeholder="Optional"
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-sm"
                  value={form.customerMobile}
                  onChange={(e) =>
                    setForm({ ...form, customerMobile: e.target.value })
                  }
                />

                <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  Instructions
                </label>
                <input
                  type="text"
                  placeholder="Optional chef instructions"
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 text-sm"
                  value={form.instructions}
                  onChange={(e) =>
                    setForm({ ...form, instructions: e.target.value })
                  }
                />
              </div>

              {formType === "Dine In" || formType === "Reservation" ? (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-1">
                  {formType === "Reservation" && (
                    <div className="mb-3 pb-3 border-b border-blue-100">
                      <label className="text-blue-600 text-[10px] font-bold uppercase tracking-wider block mb-1">
                        Reservation Time
                      </label>
                      <input
                        type="datetime-local"
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 w-full text-sm"
                        value={form.reservationTime}
                        onChange={(e) =>
                          setForm({ ...form, reservationTime: e.target.value })
                        }
                      />
                    </div>
                  )}
                  <div className="mb-3">
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block mb-1.5">
                      Area
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {areas.map((a) => (
                        <label
                          key={a._id}
                          className="flex items-center gap-1.5 cursor-pointer font-bold bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-xs"
                        >
                          <input
                            type="radio"
                            name="area"
                            checked={form.area === a._id}
                            onChange={() =>
                              setForm({ ...form, area: a._id, table: "" })
                            }
                            className="accent-blue-500"
                          />{" "}
                          {a.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block mb-1.5">
                      Table
                    </span>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5">
                      {availableTables.length === 0 ? (
                        <p className="text-gray-400 text-xs col-span-full">
                          No tables found.
                        </p>
                      ) : (
                        availableTables.map((t) => (
                          <button
                            key={t._id}
                            onClick={() => setForm({ ...form, table: t._id })}
                            className={`py-1.5 rounded-lg border font-bold text-center text-[10px] transition-colors ${form.table === t._id ? "border-blue-500 text-blue-600 bg-blue-50" : "border-gray-200 text-gray-500 bg-white hover:border-gray-300"}`}
                          >
                            {t.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : formType === "Delivery" ? (
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mt-1 space-y-3">
                  <div>
                    <label className="text-purple-600 text-[10px] font-bold uppercase tracking-wider block mb-1">
                      Delivery City
                    </label>
                    <select
                      value={selectedCityId}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-purple-400"
                      required
                    >
                      <option value="">Select city</option>
                      {deliveryCities.map((city) => (
                        <option key={city._id} value={city._id}>
                          {city.city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-purple-600 text-[10px] font-bold uppercase tracking-wider block mb-1">
                      Delivery Address
                    </label>
                    <textarea
                      placeholder="Delivery address"
                      rows="2"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-purple-400"
                      value={form.deliveryAddress}
                      onChange={(e) =>
                        setForm({ ...form, deliveryAddress: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-purple-600 text-[10px] font-bold uppercase tracking-wider block mb-1">
                      Driver Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Optional notes"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-purple-400"
                      value={form.driverNotes}
                      onChange={(e) =>
                        setForm({ ...form, driverNotes: e.target.value })
                      }
                    />
                  </div>
                  {selectedCityId && deliveryCost > 0 && (
                    <div className="text-purple-700 text-xs font-medium">
                      Delivery Cost: {currencySymbol}
                      {deliveryCost.toFixed(2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 mt-1">
                  <p className="text-xs text-gray-500">
                    Parcel orders are for takeaway. No address needed.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3 bg-gray-50">
              <button
                onClick={proceedToPOS}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-bold text-sm transition-colors"
              >
                PROCEED TO POS →
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-white hover:bg-gray-100 text-red-600 border border-gray-200 py-2.5 rounded-lg font-bold text-sm transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Terminal */}
      {showPOS && (
        <div className="fixed inset-0 z-50 bg-white text-gray-800 flex flex-col">
          <div className="border-b border-gray-200 p-3 flex justify-between items-center bg-white shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={cancelPOS}
                className="text-gray-500 hover:text-gray-700 font-bold text-xs bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                ← Cancel & Back
              </button>
              <h1 className="text-base font-bold tracking-tight">
                {activeOrderId
                  ? "Add Items to Existing Ticket"
                  : `Create New ${formType} Order`}
              </h1>
            </div>
            <button
              onClick={() => document.documentElement.requestFullscreen()}
              className="text-gray-500 hover:text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              ⛶ Fullscreen
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden p-4 gap-4">
            <div className="flex flex-col flex-1 bg-white border border-gray-200 rounded-xl p-4 overflow-hidden shadow-sm">
              <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar pb-1 shrink-0 border-b border-gray-200">
                <button
                  onClick={() => setSelectedCategory("All")}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${selectedCategory === "All" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`}
                >
                  All Items
                </button>
                {categories.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => setSelectedCategory(c._id)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${selectedCategory === c._id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 content-start">
                {filteredProducts.length === 0 && (
                  <p className="text-gray-400 col-span-full text-center py-6 text-xs">
                    No items available.
                  </p>
                )}
                {filteredProducts.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => addToCart(p)}
                    className="bg-gray-50 hover:border-blue-400 border border-gray-200 p-3 rounded-xl cursor-pointer transition-all flex flex-col items-center gap-1.5 h-40 group shadow-sm"
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-14 h-14 object-cover rounded-full border border-gray-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-[10px]">
                        No img
                      </div>
                    )}
                    <span className="font-bold text-xs text-gray-700 group-hover:text-gray-900 text-center leading-snug line-clamp-2">
                      {p.name}
                    </span>
                    <span className="text-blue-600 font-bold text-xs">
                      {currencySymbol} {" "}
                      {p.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-80 bg-white border border-gray-200 rounded-xl p-4 flex flex-col shrink-0 shadow-sm">
              <div className="mb-3 flex justify-between items-start">
                <h2 className="text-sm font-bold text-gray-800">
                  Current Ticket
                </h2>
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    {formType}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {activeOrderId
                      ? "Adding to Order"
                      : form.customerName || "Walk-in"}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center pb-2 border-b border-gray-100"
                  >
                    <div>
                      <p className="font-bold text-sm text-gray-800">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Qty: {item.qty} x {currencySymbol}
                        {item.price.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-bold text-gray-800 font-mono text-sm">
                      {currencySymbol}
                      {(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
                {cart.length === 0 && (
                  <p className="text-gray-400 text-xs text-center pt-6">
                    Cart is empty
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-gray-200 mt-3 shrink-0">
                <div className="flex justify-between mb-1 text-gray-500 text-xs font-medium">
                  <span>Subtotal</span>
                  <span className="font-mono">
                    {currencySymbol}
                    {subTotal.toFixed(2)}
                  </span>
                </div>
                {formType === "Delivery" &&
                  selectedCityId &&
                  deliveryCost > 0 && (
                    <div className="flex justify-between mb-1 text-purple-600 text-xs font-medium">
                      <span>Shipping</span>
                      <span className="font-mono">
                        {currencySymbol}
                        {deliveryCost.toFixed(2)}
                      </span>
                    </div>
                  )}
                <div className="flex justify-between mb-1 text-gray-500 text-xs font-medium">
                  <span>Tax ({globalTaxRate}%)</span>
                  <span className="font-mono">
                    {currencySymbol}
                    {taxAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between mb-3 text-lg font-bold text-gray-800">
                  <span>Total</span>
                  <span className="font-mono">
                    {currencySymbol}
                    {total.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={fireOrderAndOpenPayment}
                  disabled={cart.length === 0}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm tracking-wide"
                >
                  {activeOrderId
                    ? "ADD & PROCEED TO PAYMENT"
                    : "PAY & FIRE TO KITCHEN"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setCurrentOrderForPayment(null);
        }}
        paymentMethods={paymentMethods}
        onProcessPayment={handleFinalizePayment}
        orderData={currentOrderForPayment}
      />
    </div>
  );
};

export default Orders;
