import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import PaymentModal from "../components/PaymentModal";
import * as printer from '../utils/receiptPrinter';
import { emitPrintOrder } from '../utils/printSocket';
import { dispatchPrint } from '../utils/printDispatcher';
import { isConnectionFailure, localOrders, queueOfflineOrder, queueOfflineUpdate } from '../services/offlineStore';

// Local helper for cache keys used by the POS screen
const getCacheKeys = () => ({
  DINE_IN: 'pos:dine_in_cache',
  PRODUCTS: 'pos:products_cache',
  CATEGORIES: 'pos:categories_cache',
  PAYMENT_METHODS: 'pos:payment_methods_cache',
  DRIVERS: 'pos:drivers_cache',
  WAITERS: 'pos:waiters_cache',
});

// Named helpers from printer
const { printReceiptHTML, getDefaultReceiptSettings } = printer;

const Orders = () => {
  // State declarations
  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [deliveryCities, setDeliveryCities] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [globalTaxRate, setGlobalTaxRate] = useState(10);
  const [configuredTaxes, setConfiguredTaxes] = useState([]);
  const [configuredCharges, setConfiguredCharges] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchToken, setSearchToken] = useState("");
  const [activeTab, setActiveTab] = useState("Open Orders");
  const [mainAreaFilter, setMainAreaFilter] = useState("All");
  const [tableStatusFilter, setTableStatusFilter] = useState("All");
  const [cart, setCart] = useState([]);
  const [showPOS, setShowPOS] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [formType, setFormType] = useState("Dine In");
  const [form, setForm] = useState({});
  const [selectedCityId, setSelectedCityId] = useState("");
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modifyingOrder, setModifyingOrder] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentOrderForPayment, setCurrentOrderForPayment] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarAreaFilter, setSidebarAreaFilter] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);

  // Driver selection modal
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [driverList, setDriverList] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [otherDriverName, setOtherDriverName] = useState('');
  const [otherDriverPhone, setOtherDriverPhone] = useState('');
  const [driverSearch, setDriverSearch] = useState('');

  // For driver selection in the Delivery creation modal
  const [deliverySelectedDriverId, setDeliverySelectedDriverId] = useState('');
  const [deliveryOtherDriverName, setDeliveryOtherDriverName] = useState('');
  const [deliveryOtherDriverPhone, setDeliveryOtherDriverPhone] = useState('');
  const [deliveryDriverSearch, setDeliveryDriverSearch] = useState('');
  const [waiterList, setWaiterList] = useState([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState('');
  const [waiterSearch, setWaiterSearch] = useState('');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelStartDate, setCancelStartDate] = useState("");
  const [cancelEndDate, setCancelEndDate] = useState("");

  const [viewDetailsModalOpen, setViewDetailsModalOpen] = useState(false);
  const [viewDetailsOrder, setViewDetailsOrder] = useState(null);

  const navigate = useNavigate();
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isWaiter = loggedInUser.role === 'waiter';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeBranch');
    navigate('/');
  };

  const [deals, setDeals] = useState([]);

  const fetchData = async () => {
    try {
      const [dineRes, prodRes, catRes, payRes, ordersRes, dealsRes] = await Promise.all([
        api.get('/pos/dine-in'),
        api.get('/pos/products'),
        api.get('/pos/categories'),
        api.get('/dashboard/settings/payment-methods'),
        api.get('/pos/orders'),
        api.get('/pos/deals').catch(() => ({ data: [] })),
      ]);

      const dineData = dineRes.data || {};
      setAreas(dineData.areas || []);
      setTables(dineData.tables || []);

      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
      setDeals(dealsRes.data || []);

      setPaymentMethods(payRes.data.paymentMethods || []);

      setOrders([...localOrders(), ...(ordersRes.data || [])]);
    } catch (err) {
      console.error('Failed to load POS data', err);
    }
  };

  const fetchLiveOrders = async () => {
    try {
      const ordersRes = await api.get('/pos/orders');
      setOrders([...localOrders(), ...(ordersRes.data || [])]);
    } catch (err) {
      console.error('Failed to poll live orders', err);
    }
  };

  const fetchCurrencyAndTax = async () => {
    try {
      const res = await api.get("/dashboard/settings/operating-hours");
      const cur = res.data.settings?.currency || "USD";
      const symbols = {
        USD: "$",
        EUR: "€",
        GBP: "£",
        PKR: "PKR",
        INR: "₹",
        BHD: "BHD",
        SAR: "SAR",
        AED: "AED",
        KWD: "KWD",
        CAD: "C$",
        AUD: "A$",
      };
      setCurrencySymbol(symbols[cur] || cur);
      const savedTaxes = res.data.settings?.taxes ?? [];
      setConfiguredTaxes(savedTaxes);
      setConfiguredCharges(res.data.settings?.charges ?? []);
      const taxRate = res.data.settings?.taxRate ?? 0;
      setGlobalTaxRate(taxRate);
    } catch (err) {
      console.error("Failed to fetch settings", err);
      setCurrencySymbol("$");
      setGlobalTaxRate(10);
    }
  };

  useEffect(() => {
    fetchCurrencyAndTax();

    const handleSettingsChange = () => {
      fetchCurrencyAndTax();
      fetchData();
    };

    window.addEventListener('branchChanged', handleSettingsChange);
    window.addEventListener('currencyChanged', handleSettingsChange);
    window.addEventListener('taxesChanged', handleSettingsChange);
    window.addEventListener('chargesChanged', handleSettingsChange);

    return () => {
      window.removeEventListener('branchChanged', handleSettingsChange);
      window.removeEventListener('currencyChanged', handleSettingsChange);
      window.removeEventListener('taxesChanged', handleSettingsChange);
      window.removeEventListener('chargesChanged', handleSettingsChange);
    };
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
    const cachedDrivers = localStorage.getItem(cacheKeys.DRIVERS);
    if (cachedDrivers) {
      try {
        const { data } = JSON.parse(cachedDrivers);
        if (Array.isArray(data) && data.length > 0) setDriverList(data);
      } catch {}
    }
    const cachedWaiters = localStorage.getItem(cacheKeys.WAITERS);
    if (cachedWaiters) {
      try {
        const { data } = JSON.parse(cachedWaiters);
        if (Array.isArray(data) && data.length > 0) setWaiterList(data);
      } catch {}
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchDrivers();
    fetchWaiters();
    const interval = setInterval(fetchLiveOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const refreshAfterSync = () => fetchData();
    window.addEventListener('offlineQueueSynced', refreshAfterSync);
    return () => window.removeEventListener('offlineQueueSynced', refreshAfterSync);
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
        "Pending Web/App Order",
        "Pending Web Order",
        "Online Open",
        "Accepted",
        "Cooking",
        "On Way",
        "Delivered",
      ].includes(o.status);
    } else if (activeTab === "Canceled") {
      matchesTab = ["Cancelled", "Refunded"].includes(o.status);
      // Apply date range filter for canceled orders
      if (cancelStartDate) {
        const start = new Date(cancelStartDate);
        start.setHours(0,0,0,0);
        if (new Date(o.createdAt) < start) return false;
      }
      if (cancelEndDate) {
        const end = new Date(cancelEndDate);
        end.setHours(23,59,59,999);
        if (new Date(o.createdAt) > end) return false;
      }
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
      : selectedCategory === "deals"
        ? []
        : products.filter((p) => p.category?._id === selectedCategory);

  const posFilteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    
    // Normalize deal items for POS grid
    const dealItems = (deals || []).filter(d => d.inStock !== false).map(d => ({
      _id: d._id,
      name: d.name,
      price: Number(d.price) || 0,
      originalPrice: d.originalPrice,
      imageUrl: d.imageUrl,
      badge: d.badge || 'SPECIAL DEAL',
      isDeal: true,
      dealItems: d.items || [],
      category: { _id: 'deals', name: 'Deals' }
    }));

    if (selectedCategory === "deals") {
      return dealItems.filter(d => !q || d.name.toLowerCase().includes(q) || (d.badge && d.badge.toLowerCase().includes(q)));
    }

    const filteredProds = products.filter((p) => {
      const matchesCategory = selectedCategory === "All" || p.category?._id === selectedCategory;
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });

    if (selectedCategory === "All") {
      const matchedDeals = dealItems.filter(d => !q || d.name.toLowerCase().includes(q) || (d.badge && d.badge.toLowerCase().includes(q)));
      return [...matchedDeals, ...filteredProds];
    }

    return filteredProds;
  }, [products, deals, selectedCategory, productSearch]);

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
    driverName: "",   // ← new
    driverPhone: "",  // ← new
    waiterName: "",
    waiterPhone: "",
  });
  setSelectedCityId("");
  setDeliveryCost(0);
  setIsModalOpen(true);

  if (type === 'Delivery') {
    fetchDrivers();
    setDeliverySelectedDriverId('');
    setDeliveryOtherDriverName('');
    setDeliveryOtherDriverPhone('');
    setDeliveryDriverSearch('');
  }
  if (type === 'Dine In' || type === 'Reservation') {
    fetchWaiters();
    setSelectedWaiterId('');
    setWaiterSearch('');
  }
};


  const getDriverAvailability = (driver) => {
    if (!driver || !orders) return { isBusy: false, activeOrder: null };
    const driverNameLower = (driver.name || '').trim().toLowerCase();
    const driverEmailLower = (driver.email || '').trim().toLowerCase();
    const driverPhoneLower = (driver.phone || driver.contact || '').trim().toLowerCase();

    const activeOrder = orders.find((o) => {
      const orderType = (o.type || '').toLowerCase();
      const isDeliveryType = orderType.includes('delivery');
      const isOngoing = ['open orders', 'accepted', 'cooking', 'on way'].includes(
        (o.status || '').toLowerCase()
      );
      if (!isDeliveryType || !isOngoing) return false;
      const assignedDriverName = (o.driver?.name || o.driverName || '').trim().toLowerCase();
      const assignedDriverPhone = (o.driver?.phone || o.driverPhone || '').trim().toLowerCase();
      return (
        (driverNameLower && assignedDriverName === driverNameLower) ||
        (driverEmailLower && assignedDriverName === driverEmailLower) ||
        (driverPhoneLower && assignedDriverPhone && assignedDriverPhone === driverPhoneLower)
      );
    });
    return {
      isBusy: !!activeOrder,
      activeOrder,
      orderNo: activeOrder ? activeOrder.orderNo || activeOrder._id.slice(-4) : null,
    };
  };

  const fetchDrivers = async () => {
    const cacheKeys = getCacheKeys();
    try {
      const activeBranchId = localStorage.getItem('activeBranch') || localStorage.getItem('branchId') || '';
      const res = await api.get('/business/users', { params: { branch: activeBranchId || undefined } });
      const staffUsers = Array.isArray(res.data) ? res.data : (res.data?.users || []);
      const drivers = staffUsers
        .filter((u) => u.role === 'delivery')
        .map((u) => ({
          _id: u._id,
          name: (u.name && u.name.trim()) || u.email || 'Unnamed Driver',
          phone: u.phone || u.contact || '',
          email: u.email || '',
          address: u.address || '',
          branchId: u.branchId?._id || u.branchId || '',
          branchName: u.branchName || ''
        }));
      setDriverList(drivers);
      localStorage.setItem(cacheKeys.DRIVERS, JSON.stringify({ data: drivers, cachedAt: Date.now() }));
    } catch (err) {
      const cached = localStorage.getItem(cacheKeys.DRIVERS);
      if (cached) {
        try {
          const { data } = JSON.parse(cached);
          if (Array.isArray(data) && data.length > 0) {
            setDriverList(data);
            return;
          }
        } catch {}
      }
      console.warn('Could not fetch drivers from network or cache:', err?.message || err);
    }
  };

  const fetchWaiters = async () => {
    const cacheKeys = getCacheKeys();
    try {
      const activeBranchId = localStorage.getItem('activeBranch') || localStorage.getItem('branchId') || '';
      const res = await api.get('/business/users', { params: { branch: activeBranchId || undefined } });
      const staffUsers = Array.isArray(res.data) ? res.data : (res.data?.users || []);
      const waiters = staffUsers
        .filter((u) => u.role === 'waiter')
        .map((u) => ({
          _id: u._id,
          name: (u.name && u.name.trim()) || u.email || 'Unnamed Waiter',
          phone: u.phone || u.contact || '',
          email: u.email || '',
          address: u.address || '',
          branchId: u.branchId?._id || u.branchId || '',
          branchName: u.branchName || ''
        }));
      setWaiterList(waiters);
      localStorage.setItem(cacheKeys.WAITERS, JSON.stringify({ data: waiters, cachedAt: Date.now() }));
    } catch (err) {
      const cached = localStorage.getItem(cacheKeys.WAITERS);
      if (cached) {
        try {
          const { data } = JSON.parse(cached);
          if (Array.isArray(data) && data.length > 0) {
            setWaiterList(data);
            return;
          }
        } catch {}
      }
      console.warn('Could not fetch waiters from network or cache:', err?.message || err);
    }
  };

  const handleMarkOnWay = (orderId) => {
    setPendingOrderId(orderId);
    fetchDrivers();
    setSelectedDriverId('');
    setOtherDriverName('');
    setOtherDriverPhone('');
    setIsDriverModalOpen(true);
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

  const handleProductClick = (product) => {
    if (product.variants && product.variants.length > 0 && !product.isDeal) {
      setSelectedProductForVariant(product);
    } else {
      addToCart(product);
    }
  };

  const addToCart = (product, variant = null) => {
    const itemKey = variant ? `${product._id}_${variant.name}` : (product.cartItemId || product._id);
    const itemName = variant ? `${product.name} (${variant.name})` : product.name;
    const itemPrice = variant ? Number(variant.price) : Number(product.price);
    const variantName = variant ? variant.name : null;
    const portionSize = variant ? (variant.portionSize || variant.name) : null;

    setCart((prev) => {
      const existing = prev.find((p) => (p.cartItemId || p._id) === itemKey);
      if (existing)
        return prev.map((p) =>
          (p.cartItemId || p._id) === itemKey ? { ...p, qty: p.qty + 1 } : p,
        );
      return [
        ...prev,
        {
          ...product,
          cartItemId: itemKey,
          name: itemName,
          price: itemPrice,
          variantName,
          portionSize,
          qty: 1,
        },
      ];
    });
    setSelectedProductForVariant(null);
  };

  const triggerPrint = async (order, type = 'kitchen') => {
    const useBrowserPrint = localStorage.getItem('useBrowserPrint') === 'true';
    console.log(`[Orders] triggerPrint: type=${type}, useBrowserPrint=${useBrowserPrint}`);

    if (useBrowserPrint) {
      // ---- BROWSER PRINT MODE ----
      try {
        const mode = 'browser';
        const res = await api.get(`/pos/receipt-settings/${type}?mode=${mode}`);
        const settings = res.data || getDefaultReceiptSettings(type);
        printReceiptHTML(order, type, settings);
        console.log(`[Orders] Browser print triggered for #${order.tokenNo}`);
      } catch (err) {
        console.error('[Orders] Browser print failed:', err);
        const defaultSettings = getDefaultReceiptSettings(type);
        printReceiptHTML(order, type, defaultSettings);
      }
    } else {
      // ---- SILENT ETHERNET / BLUETOOTH / RELAY PRINT MODE ----
      dispatchPrint(order, type).catch(err => console.error('[PRINT] dispatchPrint failed:', err));
    }
  };

  const calculateCartTaxes = (subtotal) => {
    const taxes = configuredTaxes.length
      ? configuredTaxes
      : (globalTaxRate > 0 ? [{ taxName: 'Tax', percentage: globalTaxRate, itemPricing: 'Exclusive' }] : []);
    const taxBreakdown = taxes.map((tax) => {
      const percentage = Number(tax.percentage) || 0;
      const inclusive = tax.itemPricing === 'Inclusive';
      return {
        taxName: tax.taxName,
        percentage,
        itemPricing: inclusive ? 'Inclusive' : 'Exclusive',
        amount: inclusive ? subtotal * (percentage / (100 + percentage)) : subtotal * (percentage / 100),
      };
    });
    return {
      taxBreakdown,
      taxAmount: taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0),
      exclusiveTaxAmount: taxBreakdown.filter((tax) => tax.itemPricing === 'Exclusive').reduce((sum, tax) => sum + tax.amount, 0),
    };
  };

  const calculateCartCharges = (subtotal, orderType = formType) => {
    const chargeBreakdown = configuredCharges.filter((charge) => {
      const orderTypes = charge.orderTypes;
      return !Array.isArray(orderTypes) || orderTypes.length === 0 || orderTypes.includes(orderType);
    }).map((charge) => {
      const chargeType = charge.chargeType === 'Fixed' ? 'Fixed' : 'Percentage';
      const percentage = Number(charge.percentage) || 0;
      const fixedAmount = Number(charge.amount) || 0;
      const inclusive = charge.itemPricing === 'Inclusive';
      const amount = chargeType === 'Fixed' ? fixedAmount : (inclusive ? subtotal * (percentage / (100 + percentage)) : subtotal * (percentage / 100));
      return { chargeName: charge.chargeName, chargeType, percentage, fixedAmount, itemPricing: inclusive ? 'Inclusive' : 'Exclusive', amount };
    });
    return {
      chargeBreakdown,
      chargeAmount: chargeBreakdown.reduce((sum, charge) => sum + charge.amount, 0),
      exclusiveChargeAmount: chargeBreakdown.filter((charge) => charge.itemPricing === 'Exclusive').reduce((sum, charge) => sum + charge.amount, 0),
    };
  };

  const fireOrderAndOpenPayment = async () => {
    if (cart.length === 0)
      return alert("Cart is empty! Add items before firing.");

    // ✅ Ensure a branch is selected
    const branchId = localStorage.getItem('activeBranch');
    if (!branchId) {
      alert('⚠️ Please select a branch in Settings before placing an order.');
      return;
    }

    const subTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const taxDetails = calculateCartTaxes(subTotal);
    const chargeDetails = calculateCartCharges(subTotal, formType);
    const taxRate = globalTaxRate;
    const taxAmount = taxDetails.taxAmount;
    const shippingCost = formType === "Delivery" ? deliveryCost : 0;
    const finalAmount = subTotal + taxDetails.exclusiveTaxAmount + chargeDetails.exclusiveChargeAmount + shippingCost;

    const useBrowserPrint = localStorage.getItem('useBrowserPrint') === 'true';
    const printMode = useBrowserPrint ? 'browser' : 'ethernet';

    const items = cart.map((c) => ({
      product: c.isDeal ? null : c._id,
      name: c.name,
      variantName: c.variantName || null,
      portionSize: c.portionSize || null,
      qty: c.qty,
      price: c.price,
    }));
    let savedOrder;

    try {
      if (activeOrderId) {
        const res = await api.put(`/pos/orders/${activeOrderId}`, {
          action: "ADD_ITEMS",
          newItems: items,
          printMode,
        });
        savedOrder = res.data;
        if (useBrowserPrint) {
          triggerPrint(savedOrder, "kitchen");
        }
      } else {
        const payload = {
          ...form,
          type: formType,
          items,
          taxAmount: taxAmount,
          taxPercentage: taxRate,
          taxBreakdown: taxDetails.taxBreakdown,
          chargeAmount: chargeDetails.chargeAmount,
          chargeBreakdown: chargeDetails.chargeBreakdown,
          shippingCost: shippingCost,
          finalAmount: finalAmount,
          printMode,
        };
        const res = await api.post("/pos/orders", payload);
        savedOrder = res.data;
        if (useBrowserPrint) {
          triggerPrint(savedOrder, "kitchen");
        }
      }
      setCart([]);
      setShowPOS(false);
      setShowMobileCart(false);
      setActiveOrderId(null);
      fetchData();
      setCurrentOrderForPayment(savedOrder);
      setIsPaymentModalOpen(true);
    } catch (error) {
      if (!activeOrderId && isConnectionFailure(error)) {
        savedOrder = queueOfflineOrder({
          ...form,
          type: formType,
          items,
          taxAmount,
          taxPercentage: taxRate,
          taxBreakdown: taxDetails.taxBreakdown,
          chargeAmount: chargeDetails.chargeAmount,
          chargeBreakdown: chargeDetails.chargeBreakdown,
          shippingCost,
          finalAmount,
          printMode,
        });
        setCart([]);
        setShowPOS(false);
        setShowMobileCart(false);
        setActiveOrderId(null);
        setOrders(current => [savedOrder, ...current]);
        triggerPrint(savedOrder, 'kitchen');
        setCurrentOrderForPayment(savedOrder);
        setIsPaymentModalOpen(true);
        return;
      }
      console.error("Failed to fire order:", error);
      alert("Failed to send order to kitchen.");
    }
  };

  const handleFinalizePayment = async (paymentDetails) => {
    if (!currentOrderForPayment || !currentOrderForPayment._id) return;
    const useBrowserPrint = localStorage.getItem('useBrowserPrint') === 'true';
    try {
      const res = await api.put(`/pos/orders/${currentOrderForPayment._id}`, {
        ...paymentDetails,
        printMode: useBrowserPrint ? 'browser' : 'ethernet',
      });
      setIsPaymentModalOpen(false);
      const paidOrder = res.data || { ...currentOrderForPayment, ...paymentDetails };
      setCurrentOrderForPayment(null);
      fetchData();
      if (paymentDetails.printInvoice && useBrowserPrint) {
        triggerPrint(paidOrder, 'bill');
      }
    } catch (err) {
      if (isConnectionFailure(err)) {
        queueOfflineUpdate(currentOrderForPayment._id, paymentDetails);
        setOrders(current => current.map(order => order._id === currentOrderForPayment._id ? { ...order, ...paymentDetails, syncState: 'pending' } : order));
        setIsPaymentModalOpen(false);
        setCurrentOrderForPayment(null);
        if (paymentDetails.printInvoice) triggerPrint({ ...currentOrderForPayment, ...paymentDetails }, 'bill');
        return;
      }
      console.error("Payment failed", err);
      alert("Failed to process payment.");
    }
  };

  const cancelPOS = () => {
    setCart([]);
    setShowPOS(false);
    setShowMobileCart(false);
    setActiveOrderId(null);
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await api.put(`/pos/orders/${id}`, { status });
      fetchData();
    } catch (error) {
      if (!isConnectionFailure(error)) throw error;
      queueOfflineUpdate(id, { status });
      setOrders(current => current.map(order => order._id === id ? { ...order, status, syncState: 'pending' } : order));
    }
  };

  const getNextWebsiteOrderStatus = (status) => {
    switch (status) {
      case "Pending Web Order":
      case "Online Open":
        return "Accepted";
      case "Accepted":
        return "Cooking";
      case "Cooking":
        return "On Way";
      case "On Way":
        return "Delivered";
      default:
        return null;
    }
  };

  const getWebsiteOrderButtonLabel = (status, displayType) => {
    switch (status) {
      case "Pending Web Order":
        return `Accept & Process ${displayType === "QR Menu" ? "QR" : "Web"} Order`;
      case "Online Open":
        return `Confirm ${displayType === "QR Menu" ? "QR" : "Web"} Order`;
      case "Accepted":
        return "Start Cooking";
      case "Cooking":
        return "Mark On Way";
      case "On Way":
        return "Mark Delivered";
      default:
        return "Update Order";
    }
  };

  const removeOrderItem = async (orderId, itemIndex) => {
    await api.put(`/pos/orders/${orderId}`, {
      action: "REMOVE_ITEM",
      itemIndex,
    });
    fetchData();
  };

  const openCancelModal = (orderId) => {
    setCancelOrderId(orderId);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const confirmCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancellation.");
      return;
    }
    const cancelPayload = {
      status: "Cancelled",
      cancellationReason: cancelReason.trim(),
    };
    try {
      await api.put(`/pos/orders/${cancelOrderId}`, cancelPayload);
      fetchData();
    } catch (err) {
      if (isConnectionFailure(err) || !navigator.onLine || !err?.response) {
        queueOfflineUpdate(cancelOrderId, cancelPayload);
        setOrders(current => current.map(order => order._id === cancelOrderId ? { ...order, ...cancelPayload, syncState: 'pending' } : order));
      } else {
        console.error("Failed to cancel order:", err);
        alert("Failed to cancel order.");
      }
    } finally {
      setCancelModalOpen(false);
      setCancelOrderId(null);
      setCancelReason("");
    }
  };

  const subTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartTaxDetails = calculateCartTaxes(subTotal);
  const cartChargeDetails = calculateCartCharges(subTotal, formType);
  const taxAmount = cartTaxDetails.taxAmount;
  const shippingCostDisplay = formType === "Delivery" ? deliveryCost : 0;
  const total = subTotal + cartTaxDetails.exclusiveTaxAmount + cartChargeDetails.exclusiveChargeAmount + shippingCostDisplay;
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

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

  const openViewDetails = (order) => {
    setViewDetailsOrder(order);
    setViewDetailsModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-40 bg-gray-50 text-gray-800 font-sans flex overflow-hidden">
      {!showPOS && (
        <>
          <div className="flex-1 p-3 md:p-4 overflow-y-auto overflow-x-hidden min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {isWaiter ? (
                  <button
                    onClick={handleLogout}
                    className="text-red-600 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
                  >
                    <span>🚪</span> Log Out
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="text-gray-500 hover:text-gray-700 font-bold text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm shrink-0"
                  >
                    ← Go Back
                  </button>
                )}
                <h1 className="text-base md:text-lg font-bold tracking-tight truncate flex items-center gap-2">
                  <span>Live Orders & POS</span>
                  {isWaiter && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full">
                      Waiter Mode ({loggedInUser.email})
                    </span>
                  )}
                </h1>
              </div>
              {isWaiter && (
                <div className="hidden sm:flex items-center text-xs text-gray-500 font-medium">
                  Logged in as <span className="font-bold text-gray-800 ml-1">{loggedInUser.email}</span>
                </div>
              )}
            </div>
            <div className="max-w-[1400px] mx-auto">
              <div className="flex flex-wrap gap-2 mb-4 bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                <input
                  type="text"
                  placeholder="Search Customer or Table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg w-full sm:w-56 outline-none text-xs focus:border-blue-400 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Token / Order No"
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                  className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg w-full sm:w-40 outline-none text-xs focus:border-blue-400 transition-colors"
                />

                <div className="w-full sm:w-auto sm:ml-auto flex gap-2">
                  <button
                    onClick={() => openNewOrder("Parcel")}
                    className="flex-1 sm:flex-none bg-teal-100 text-teal-700 border border-teal-200 hover:bg-teal-200 px-3 sm:px-4 py-1.5 rounded-lg font-bold text-xs transition-colors"
                  >
                    + PARCEL
                  </button>
                  <button
                    onClick={() => openNewOrder("Delivery")}
                    className="flex-1 sm:flex-none bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 px-3 sm:px-4 py-1.5 rounded-lg font-bold text-xs transition-colors"
                  >
                    + DELIVERY
                  </button>
                  <button
                    onClick={() => openNewOrder("Dine In")}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-5 py-1.5 rounded-lg font-bold text-xs transition-colors"
                  >
                    NEW DINE-IN
                  </button>
                </div>
              </div>

             <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 mb-4 pb-2">
  <div className="flex gap-5 text-xs font-bold text-gray-400 overflow-x-auto hide-scrollbar">
    {["Open Orders", "Closed", "Outstanding Payment", "Canceled", "Table View"].map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`shrink-0 pb-2 uppercase tracking-wider transition-colors ${activeTab === tab ? "text-blue-600 border-b-2 border-blue-500" : "hover:text-gray-600"}`}
      >
        {tab}
      </button>
    ))}
  </div>

  {activeTab === "Canceled" && (
    <div className="flex items-center gap-2 ml-auto">
      <input
        type="date"
        value={cancelStartDate}
        onChange={(e) => setCancelStartDate(e.target.value)}
        className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[10px] text-gray-700 outline-none focus:border-blue-400"
      />
      <span className="text-gray-400 text-[10px]">to</span>
      <input
        type="date"
        value={cancelEndDate}
        onChange={(e) => setCancelEndDate(e.target.value)}
        className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[10px] text-gray-700 outline-none focus:border-blue-400"
      />
      <button
        onClick={() => { setCancelStartDate(""); setCancelEndDate(""); }}
        className="px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
      >
        Clear
      </button>
    </div>
  )}
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
  {order.cancellationReason && (
    <p className="text-[10px] text-red-500 mt-1">
      Reason: {order.cancellationReason}
    </p>
  )}
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

                            {order.status !== 'Cancelled' && order.status !== 'Refunded' && (
  <div className="flex flex-col gap-1 border-l border-gray-200 pl-3">
    <button
      onClick={() => triggerPrint(order)}
      className="text-[9px] font-bold uppercase tracking-wider text-blue-600 hover:text-gray-800 transition-colors"
    >
      Print
    </button>
    <button
      onClick={() => updateOrderStatus(order._id, "Open Orders")}
      className="text-[9px] font-bold uppercase tracking-wider text-amber-600 hover:text-gray-800 transition-colors"
    >
      ⟲ Reopen
    </button>
  </div>
)}



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
  onClick={() => openViewDetails(order)}
  className="text-gray-400 hover:bg-blue-100 hover:text-blue-600 px-1.5 py-0.5 rounded transition-colors text-xs"
  title="View Details"
>
  🔍
</button>
                            <button
                              onClick={() => openCancelModal(order._id)}
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
                              {order.taxBreakdown?.length ? order.taxBreakdown.map((tax, index) => (
                                <div key={`${tax.taxName}-${index}`} className="flex justify-between text-gray-500">
                                  <span>{tax.taxName} ({tax.percentage}%)</span>
                                  <span className="font-mono">{currencySymbol}{Number(tax.amount || 0).toFixed(2)}</span>
                                </div>
                              )) : order.taxAmount > 0 && (
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
                              {order.chargeBreakdown?.map((charge, index) => (
                                <div key={`${charge.chargeName}-${index}`} className="flex justify-between text-blue-600">
                                  <span>{charge.chargeName}{charge.chargeType === 'Fixed' ? '' : ` (${charge.percentage}%)`}</span>
                                  <span className="font-mono">{currencySymbol}{Number(charge.amount || 0).toFixed(2)}</span>
                                </div>
                              ))}
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
 
   {['Pending Web Order', 'Online Open', 'Accepted', 'Cooking', 'On Way'].includes(order.status) && (
    <div className="mb-2">
      <button
        onClick={() => {
          if (order.status === 'Cooking' && order.type === 'Delivery') {
            handleMarkOnWay(order._id);
          } else {
            const nextStatus = getNextWebsiteOrderStatus(order.status);
            if (nextStatus) updateOrderStatus(order._id, nextStatus);
          }
        }}
        className={`w-full py-1.5 rounded text-[9px] font-bold tracking-widest uppercase border transition-colors ${
          displayType === "QR Menu"
            ? "bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200"
            : "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
        }`}
      >
        {getWebsiteOrderButtonLabel(order.status, displayType)}
      </button>
    </div>
  )}

  {/* Always show the POS action grid so users can Modify / + Add / KOT / Bill / Pay */}
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

          {/* Backdrop for the table-list side panel on mobile, where it opens full-screen */}
          {isSidebarOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/40 z-[65]"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar Panel — full-screen overlay on mobile, fixed 280px pane on md+ */}
          <div
            className={`shrink-0 bg-white border-l border-gray-200 h-full flex flex-col transition-all duration-200 ease-out
              ${isSidebarOpen
                ? "fixed inset-0 z-[70] w-full md:static md:z-auto md:w-[280px]"
                : "w-0 overflow-hidden border-none"
              }`}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl overflow-hidden shadow-lg max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 shrink-0">
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

            <div className="p-4 sm:p-5 space-y-4 text-sm overflow-y-auto">
              <div className="flex flex-wrap items-center gap-3 sm:gap-5 pb-3 border-b border-gray-200">
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] w-full sm:w-auto">
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

              <div className="grid grid-cols-1 sm:grid-cols-[110px_1fr] items-center gap-2 sm:gap-3 text-xs">
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
                <div className="bg-blue-50 p-3 sm:p-4 rounded-xl border border-blue-100 mt-1">
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
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
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
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <label className="text-blue-600 text-[10px] font-bold uppercase tracking-wider block mb-1">Assign Waiter (Optional)</label>
                    <input type="text" placeholder="Search waiters..." value={waiterSearch} onChange={(e) => setWaiterSearch(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-400" />
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 mt-2">
                      {waiterList.filter(w => w.name.toLowerCase().includes(waiterSearch.toLowerCase())).map(waiter => (
                        <label key={waiter._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                          <input type="radio" name="waiter" value={waiter._id} checked={selectedWaiterId === waiter._id} onChange={() => { setSelectedWaiterId(waiter._id); setForm(prev => ({ ...prev, waiterName: waiter.name, waiterPhone: waiter.phone || waiter.contact || '' })); }} />
                          <span className="text-xs font-medium">{waiter.name}</span><span className="text-[10px] text-gray-500 ml-auto">{waiter.phone || waiter.contact || waiter.email || 'No phone'}</span>
                        </label>
                      ))}
                      {waiterList.length === 0 && <p className="p-2 text-xs text-gray-400">No waiters found for this branch.</p>}
                    </div>
                  </div>
                </div>
              ) : formType === "Delivery" ? (
                <div className="bg-purple-50 p-3 sm:p-4 rounded-xl border border-purple-100 mt-1 space-y-3">
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
                  {/* Driver selection */}
<div>
  <label className="text-purple-600 text-[10px] font-bold uppercase tracking-wider block mb-1">
    Assign Driver (Optional)
  </label>
  <div className="space-y-2">
    <input
      type="text"
      placeholder="Search drivers..."
      value={deliveryDriverSearch}
      onChange={(e) => setDeliveryDriverSearch(e.target.value)}
      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-purple-400"
    />
    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
      {driverList
        .filter((d) => {
          const q = (deliveryDriverSearch || '').toLowerCase().trim();
          if (!q) return true;
          return (
            (d.name || '').toLowerCase().includes(q) ||
            (d.email || '').toLowerCase().includes(q) ||
            (d.phone || d.contact || '').toLowerCase().includes(q)
          );
        })
        .map((driver) => {
          const avail = getDriverAvailability(driver);
          return (
            <label
              key={driver._id}
              className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="radio"
                name="deliveryDriver"
                value={driver._id}
                checked={deliverySelectedDriverId === driver._id}
                onChange={() => {
                  setDeliverySelectedDriverId(driver._id);
                  setDeliveryOtherDriverName("");
                  setDeliveryOtherDriverPhone("");
                  setForm((prev) => ({
                    ...prev,
                    driverName: driver.name || driver.email || "",
                    driverPhone: driver.phone || driver.contact || "",
                  }));
                }}
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-800">
                  {driver.name || driver.email}
                </span>
                <span className="text-[10px] text-gray-400">
                  {driver.phone || driver.contact || driver.email || "No phone"}
                </span>
              </div>
              <span
                className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  avail.isBusy
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                }`}
              >
                {avail.isBusy ? `🔴 Busy (#${avail.orderNo})` : "🟢 Available"}
              </span>
            </label>
          );
        })}
      {driverList.length === 0 ? (
        <p className="p-2 text-xs text-gray-400">
          No delivery drivers found. Create driver accounts in Settings &gt; Staff Accounts.
        </p>
      ) : (
        driverList.filter((d) => {
          const q = (deliveryDriverSearch || '').toLowerCase().trim();
          if (!q) return true;
          return (
            (d.name || '').toLowerCase().includes(q) ||
            (d.email || '').toLowerCase().includes(q) ||
            (d.phone || d.contact || '').toLowerCase().includes(q)
          );
        }).length === 0 && (
          <p className="p-2 text-xs text-gray-400">
            No matching drivers found.
          </p>
        )
      )}
    </div>
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="deliveryDriver"
        value="other"
        checked={deliverySelectedDriverId === 'other'}
        onChange={() => {
          setDeliverySelectedDriverId('other');
          setDeliveryOtherDriverName('');
          setDeliveryOtherDriverPhone('');
          setForm(prev => ({
            ...prev,
            driverName: '',
            driverPhone: '',
          }));
        }}
      />
      <span className="text-xs font-bold">Other (External Driver)</span>
    </label>
    {deliverySelectedDriverId === 'other' && (
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Driver Name"
          value={deliveryOtherDriverName}
          onChange={(e) => {
            setDeliveryOtherDriverName(e.target.value);
            setForm(prev => ({
              ...prev,
              driverName: e.target.value,
            }));
          }}
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-purple-400"
        />
        <input
          type="text"
          placeholder="Phone Number"
          value={deliveryOtherDriverPhone}
          onChange={(e) => {
            setDeliveryOtherDriverPhone(e.target.value);
            setForm(prev => ({
              ...prev,
              driverPhone: e.target.value,
            }));
          }}
          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-purple-400"
        />
      </div>
    )}
  </div>
</div>
                  {selectedCityId && deliveryCost > 0 && (
                    <div className="text-purple-700 text-xs font-medium">
                      Delivery Cost: {currencySymbol}
                      {deliveryCost.toFixed(2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-teal-50 p-3 sm:p-4 rounded-xl border border-teal-100 mt-1">
                  <p className="text-xs text-gray-500">
                    Parcel orders are for takeaway. No address needed.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3 bg-gray-50 shrink-0">
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
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={cancelPOS}
                className="text-gray-500 hover:text-gray-700 font-bold text-xs bg-gray-100 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                ← Cancel
              </button>
              <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {activeOrderId
                  ? "Add Items to Existing Ticket"
                  : `Create New ${formType} Order`}
              </h1>
            </div>
            <button
              onClick={() => document.documentElement.requestFullscreen()}
              className="hidden sm:inline-block text-gray-500 hover:text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
            >
              ⛶ Fullscreen
            </button>
          </div>

          <div className="flex flex-col md:flex-row flex-1 overflow-hidden p-2 md:p-4 gap-3 md:gap-4 min-h-0">
            {/* Products panel */}
            <div className="flex flex-col flex-1 bg-white border border-gray-200 rounded-xl p-3 md:p-4 overflow-hidden shadow-sm min-h-0">
              <div className="flex flex-wrap items-center gap-2 mb-3 border-b border-gray-200 pb-2">
  <div className="relative flex-1 min-w-[150px]">
    <input
      type="text"
      placeholder="Search products..."
      value={productSearch}
      onChange={(e) => setProductSearch(e.target.value)}
      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-400 transition-colors"
    />
  </div>
  <div className="flex gap-1 overflow-x-auto hide-scrollbar flex-nowrap">
    <button
      onClick={() => setSelectedCategory("All")}
      className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold transition-colors whitespace-nowrap ${
        selectedCategory === "All"
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
      }`}
    >
      All
    </button>
    <button
      onClick={() => setSelectedCategory("deals")}
      className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
        selectedCategory === "deals"
          ? "bg-amber-600 text-white shadow-xs"
          : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
      }`}
    >
      🏷️ Deals & Combos ({deals.filter(d => d.inStock !== false).length})
    </button>
    {categories.map((c) => (
      <button
        key={c._id}
        onClick={() => setSelectedCategory(c._id)}
        className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold transition-colors whitespace-nowrap ${
          selectedCategory === c._id
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
        }`}
      >
        {c.name}
      </button>
    ))}
  </div>
</div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3 overflow-y-auto pr-1 content-start pb-24 md:pb-0">
                {posFilteredProducts.length === 0 && (
                  <p className="text-gray-400 col-span-full text-center py-6 text-xs">
                    No items available.
                  </p>
                )}
                {posFilteredProducts.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => handleProductClick(p)}
                    className={`border p-2.5 md:p-3 rounded-xl cursor-pointer transition-all flex flex-col items-center gap-1.5 h-36 md:h-40 group shadow-xs relative overflow-hidden ${
                      p.isDeal
                        ? "bg-amber-50/40 hover:border-amber-400 border-amber-200"
                        : p.variants && p.variants.length > 0
                        ? "bg-blue-50/30 hover:border-blue-500 border-blue-200"
                        : "bg-gray-50 hover:border-blue-400 border-gray-200"
                    }`}
                  >
                    {p.isDeal && (
                      <span className="absolute top-1.5 left-1.5 bg-rose-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-2xs z-10">
                        {p.badge || 'DEAL'}
                      </span>
                    )}
                    {!p.isDeal && p.variants && p.variants.length > 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-2xs z-10">
                        {p.variants.length} Sizes
                      </span>
                    )}
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-full border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-[10px]">
                        {p.isDeal ? "🏷️" : "No img"}
                      </div>
                    )}
                    <span className="font-bold text-xs text-gray-700 group-hover:text-gray-900 text-center leading-snug line-clamp-2">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`${p.isDeal ? "text-amber-700" : "text-blue-600"} font-bold text-xs`}>
                        {currencySymbol}
                        {p.price.toFixed(2)}
                      </span>
                      {p.originalPrice > p.price && (
                        <span className="text-[10px] text-gray-400 line-through">
                          {currencySymbol}{Number(p.originalPrice).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart panel — normal column on md+, bottom-sheet overlay on mobile */}
            <div
              className={`
                ${showMobileCart ? "fixed inset-0 z-[80] flex" : "hidden"}
                md:flex md:static md:z-auto
                flex-col bg-white border border-gray-200 md:rounded-xl p-4 shadow-sm
                w-full md:w-80 md:shrink-0
              `}
            >
              {/* Mobile-only header with close button */}
              <div className="flex md:hidden justify-between items-center mb-3 pb-3 border-b border-gray-200 shrink-0">
                <h2 className="text-sm font-bold text-gray-800">Current Ticket</h2>
                <button
                  onClick={() => setShowMobileCart(false)}
                  className="text-gray-400 hover:bg-gray-100 hover:text-gray-700 w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="mb-3 hidden md:flex justify-between items-start">
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

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
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
                {cartTaxDetails.taxBreakdown.map((tax, index) => (
                  <div key={`${tax.taxName}-${index}`} className="flex justify-between mb-1 text-gray-500 text-xs font-medium">
                    <span>{tax.taxName} ({tax.percentage}%)</span>
                    <span className="font-mono">
                      {currencySymbol}
                      {tax.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                {cartChargeDetails.chargeBreakdown.map((charge, index) => (
                  <div key={`${charge.chargeName}-${index}`} className="flex justify-between mb-1 text-blue-600 text-xs font-medium">
                    <span>{charge.chargeName}{charge.chargeType === 'Fixed' ? '' : ` (${charge.percentage}%)`}</span>
                    <span className="font-mono">
                      {currencySymbol}
                      {charge.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
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

            {/* Floating "view cart" button — mobile only, hidden once the sheet is open */}
            {!showMobileCart && (
              <button
                onClick={() => setShowMobileCart(true)}
                className="md:hidden fixed bottom-4 left-4 right-4 z-[75] bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg flex justify-between items-center px-5 transition-colors"
              >
                <span className="text-sm">
                  🛒 {cartItemCount} item{cartItemCount !== 1 ? "s" : ""}
                </span>
                <span className="text-sm font-mono">
                  {currencySymbol}
                  {total.toFixed(2)}
                </span>
              </button>
            )}
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

      {/* Cancellation Reason Modal */}
{cancelModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-6 shadow-xl">
      <h3 className="text-base font-bold text-gray-800 mb-2">Cancel Order</h3>
      <p className="text-xs text-gray-500 mb-4">Please provide a reason for cancelling this order.</p>
      <textarea
        value={cancelReason}
        onChange={(e) => setCancelReason(e.target.value)}
        placeholder="Enter cancellation reason..."
        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 outline-none focus:border-red-400 transition-colors resize-none h-20"
        autoFocus
      />
      <div className="flex gap-2 mt-4 justify-end">
        <button
          onClick={() => setCancelModalOpen(false)}
          className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={confirmCancelOrder}
          className="px-4 py-2 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Confirm Cancellation
        </button>
      </div>
    </div>
  </div>
)}

{/* Driver Assignment Modal */}
{isDriverModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200">
      <h3 className="text-base font-bold text-gray-800 mb-2">Assign Delivery Driver</h3>
      <p className="text-xs text-gray-500 mb-4">
        Select a driver for this delivery order, or enter an external driver.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
            Search Drivers
          </label>
          <input
            type="text"
            placeholder="Type to filter drivers..."
            value={driverSearch}
            onChange={(e) => setDriverSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-400"
          />
        </div>

        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {driverList
            .filter((d) => {
              const q = (driverSearch || '').toLowerCase().trim();
              if (!q) return true;
              return (
                (d.name || '').toLowerCase().includes(q) ||
                (d.email || '').toLowerCase().includes(q) ||
                (d.phone || d.contact || '').toLowerCase().includes(q)
              );
            })
            .map((driver) => {
              const avail = getDriverAvailability(driver);
              return (
                <label
                  key={driver._id}
                  className="flex items-center gap-2 p-2.5 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="driver"
                    value={driver._id}
                    checked={selectedDriverId === driver._id}
                    onChange={() => {
                      setSelectedDriverId(driver._id);
                      setOtherDriverName("");
                      setOtherDriverPhone("");
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-800">
                      {driver.name || driver.email}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {driver.phone || driver.contact || driver.email || "No phone"}
                    </span>
                  </div>
                  <span
                    className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      avail.isBusy
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}
                  >
                    {avail.isBusy ? `🔴 Busy (#${avail.orderNo})` : "🟢 Available"}
                  </span>
                </label>
              );
            })}
          {driverList.length === 0 ? (
            <p className="p-2 text-xs text-gray-400">
              No delivery drivers found. Add driver accounts in Settings &gt; Staff Accounts.
            </p>
          ) : (
            driverList.filter((d) => {
              const q = (driverSearch || '').toLowerCase().trim();
              if (!q) return true;
              return (
                (d.name || '').toLowerCase().includes(q) ||
                (d.email || '').toLowerCase().includes(q) ||
                (d.phone || d.contact || '').toLowerCase().includes(q)
              );
            }).length === 0 && (
              <p className="p-2 text-xs text-gray-400">
                No matching drivers found.
              </p>
            )
          )}
        </div>

        <div className="border-t border-gray-200 pt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="driver"
              value="other"
              checked={selectedDriverId === "other"}
              onChange={() => {
                setSelectedDriverId("other");
                setOtherDriverName("");
                setOtherDriverPhone("");
              }}
            />
            <span className="text-xs font-bold">Other (External Driver)</span>
          </label>
          {selectedDriverId === "other" && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                type="text"
                placeholder="Driver Name"
                value={otherDriverName}
                onChange={(e) => setOtherDriverName(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-400"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={otherDriverPhone}
                onChange={(e) => setOtherDriverPhone(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-400"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-6 justify-end">
        <button
          onClick={() => setIsDriverModalOpen(false)}
          className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            let driverName = '';
            let driverPhone = '';
            if (selectedDriverId === 'other') {
              driverName = otherDriverName.trim();
              driverPhone = otherDriverPhone.trim();
              if (!driverName) {
                alert('Please enter driver name.');
                return;
              }
            } else if (selectedDriverId) {
              const driver = driverList.find(d => d._id === selectedDriverId);
              if (driver) {
                driverName = driver.name || driver.email || '';
                driverPhone = driver.phone || driver.contact || '';
              }
            } else {
              alert('Please select a driver.');
              return;
            }
            
            const updatePayload = {
              status: 'On Way',
              driverName,
              driverPhone,
              driver: { name: driverName, phone: driverPhone }
            };

            try {
              await api.put(`/pos/orders/${pendingOrderId}`, updatePayload);
              fetchData();
            } catch (err) {
              if (isConnectionFailure(err) || !navigator.onLine || !err?.response) {
                queueOfflineUpdate(pendingOrderId, updatePayload);
                setOrders((current) =>
                  current.map((order) =>
                    order._id === pendingOrderId
                      ? { ...order, ...updatePayload, syncState: 'pending' }
                      : order
                  )
                );
              } else {
                console.error("Failed to assign driver:", err);
                alert(err.response?.data?.message || "Failed to assign driver.");
              }
            } finally {
              setIsDriverModalOpen(false);
              setPendingOrderId(null);
            }
          }}
          className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-500"
        >
          Confirm & Mark On Way
        </button>
      </div>
    </div>
  </div>
)}


{/* 👇 NEW: View Details Modal */}
{viewDetailsModalOpen && viewDetailsOrder && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-200">
      <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
        <h2 className="text-base font-bold text-gray-800">Order Details</h2>
        <button
          onClick={() => setViewDetailsModalOpen(false)}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Left Column */}
        <div className="space-y-2">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Order #</span>
            <span className="font-bold text-gray-800">{viewDetailsOrder.orderNo}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Token</span>
            <span className="font-mono font-bold">#{viewDetailsOrder.tokenNo}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Status</span>
            <span className={`font-bold ${viewDetailsOrder.status === 'Cancelled' || viewDetailsOrder.status === 'Refunded' ? 'text-red-500' : viewDetailsOrder.status === 'Closed' ? 'text-green-600' : 'text-blue-600'}`}>
              {viewDetailsOrder.status}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Type</span>
            <span className="font-medium">{viewDetailsOrder.type}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Customer</span>
            <span className="font-medium">{viewDetailsOrder.customerName || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Mobile</span>
            <span className="font-medium">{viewDetailsOrder.customerMobile || 'N/A'}</span>
          </div>
          {viewDetailsOrder.deliveryAddress && (
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Delivery Address</span>
              <span className="font-medium">{viewDetailsOrder.deliveryAddress}</span>
            </div>
          )}
          {viewDetailsOrder.area && (
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Area</span>
              <span className="font-medium">{viewDetailsOrder.area?.name || viewDetailsOrder.area}</span>
            </div>
          )}
          {viewDetailsOrder.table && (
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Table</span>
              <span className="font-medium">{viewDetailsOrder.table?.name || viewDetailsOrder.table}</span>
            </div>
          )}
          {viewDetailsOrder.reservationTime && (
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Reservation Time</span>
              <span className="font-medium">{new Date(viewDetailsOrder.reservationTime).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-2">
          {viewDetailsOrder.instructions && (
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Special Instructions</span>
              <span className="font-medium text-gray-700">{viewDetailsOrder.instructions}</span>
            </div>
          )}
          {viewDetailsOrder.driverNotes && (
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Driver Notes</span>
              <span className="font-medium text-gray-700">{viewDetailsOrder.driverNotes}</span>
            </div>
          )}
          {viewDetailsOrder.driver && viewDetailsOrder.driver.name && (
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Driver</span>
              <span className="font-medium">{viewDetailsOrder.driver.name} {viewDetailsOrder.driver.phone && `(${viewDetailsOrder.driver.phone})`}</span>
            </div>
          )}
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Items</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {viewDetailsOrder.items.map((item, i) => (
                <li key={i} className="text-gray-700">
                  {item.qty}x {item.name} – {viewDetailsOrder.currencySymbol || '$'}{(item.price * item.qty).toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-2 border-t border-gray-200 space-y-0.5">
            {viewDetailsOrder.subTotal !== undefined && (
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">{(viewDetailsOrder.currencySymbol || '$')}{viewDetailsOrder.subTotal.toFixed(2)}</span>
              </div>
            )}
            {viewDetailsOrder.taxBreakdown?.length ? viewDetailsOrder.taxBreakdown.map((tax, index) => (
              <div key={`${tax.taxName}-${index}`} className="flex justify-between text-gray-600">
                <span>{tax.taxName} ({tax.percentage}%)</span>
                <span className="font-mono">{(viewDetailsOrder.currencySymbol || '$')}{Number(tax.amount || 0).toFixed(2)}</span>
              </div>
            )) : viewDetailsOrder.taxAmount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax ({viewDetailsOrder.taxPercentage || globalTaxRate}%)</span>
                <span className="font-mono">{(viewDetailsOrder.currencySymbol || '$')}{viewDetailsOrder.taxAmount.toFixed(2)}</span>
              </div>
            )}
            {viewDetailsOrder.chargeBreakdown?.map((charge, index) => (
              <div key={`${charge.chargeName}-${index}`} className="flex justify-between text-blue-600">
                <span>{charge.chargeName}{charge.chargeType === 'Fixed' ? '' : ` (${charge.percentage}%)`}</span>
                <span className="font-mono">{(viewDetailsOrder.currencySymbol || '$')}{Number(charge.amount || 0).toFixed(2)}</span>
              </div>
            ))}
            {viewDetailsOrder.shippingCost > 0 && (
              <div className="flex justify-between text-purple-600">
                <span>Shipping</span>
                <span className="font-mono">{(viewDetailsOrder.currencySymbol || '$')}{viewDetailsOrder.shippingCost.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-200">
              <span>Total</span>
              <span className="font-mono">{(viewDetailsOrder.currencySymbol || '$')}{viewDetailsOrder.finalAmount.toFixed(2)}</span>
            </div>
          </div>
          {viewDetailsOrder.paymentMode && (
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Payment</span>
              <span className="font-medium">{viewDetailsOrder.paymentMode}</span>
            </div>
          )}
          {viewDetailsOrder.createdAt && (
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Created</span>
              <span className="font-medium">{new Date(viewDetailsOrder.createdAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}

      {/* Variant / Portion Size Selection Modal */}
      {selectedProductForVariant && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                {selectedProductForVariant.imageUrl ? (
                  <img
                    src={selectedProductForVariant.imageUrl}
                    alt={selectedProductForVariant.name}
                    className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                    🍲
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-900 text-sm leading-snug">{selectedProductForVariant.name}</h3>
                  <p className="text-[11px] text-gray-500">Choose portion size to add to ticket</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProductForVariant(null)}
                className="text-gray-400 hover:text-gray-600 p-1 font-bold text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {selectedProductForVariant.variants.map((v, idx) => (
                <button
                  key={idx}
                  onClick={() => addToCart(selectedProductForVariant, v)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group"
                >
                  <div>
                    <span className="font-bold text-sm text-gray-800 group-hover:text-blue-700 block">
                      {v.name}
                    </span>
                    {v.portionSize && v.portionSize !== v.name && (
                      <span className="text-[10px] text-gray-400 block">{v.portionSize}</span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-sm text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-100 transition-colors">
                    {currencySymbol}{Number(v.price).toFixed(2)}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectedProductForVariant(null)}
              className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Orders;
