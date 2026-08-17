import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import PaymentMethodsSettings from "../components/settings/PaymentMethodsSettings";
import ApiKeyManager from "../components/settings/ApiKeyManager";
import { useBranch } from '../contexts/BranchContext';


const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Poppins",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "Oswald",
  "Montserrat",
];

const Settings = () => {
  const navigate = useNavigate();


  const { activeBranchId, setBranch } = useBranch();

  const loggedInUser = JSON.parse(localStorage.getItem("user")) || {};
  const isPrivileged =
    loggedInUser.role === "super_admin" || loggedInUser.role === "admin";
  const isSuperAdmin = loggedInUser.role === "super_admin";

  const [location, setLocation] = useState({
    city: "",
    country: "",
    currency: "USD",
    customCurrency: false,
  });

  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    email: "",
    password: "",
    role: "user",
    branchId: "",
  });
  const [showEditUserModal, setShowEditUserModal] = useState(false);

  const [editingBranch, setEditingBranch] = useState(null);
  const [editBranchForm, setEditBranchForm] = useState({
    name: "",
    location: "",
  });
  const [showEditModal, setShowEditModal] = useState(false);

  const [activeTab, setActiveTab] = useState("Security");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [userLevel, setUserLevel] = useState(1);
  const [planName, setPlanName] = useState("Essential");
  const [taxRate, setTaxRate] = useState(0);
  const [taxes, setTaxes] = useState([]);
  const [newTax, setNewTax] = useState({ taxName: "", percentage: "", itemPricing: "Exclusive" });
  const [charges, setCharges] = useState([]);
  const [newCharge, setNewCharge] = useState({ chargeName: "", chargeType: "Percentage", value: "", itemPricing: "Exclusive", orderTypes: [] });
  const [addons, setAddons] = useState({ performanceMetrics: false });

  const [branches, setBranches] = useState([]);
  const [subUsers, setSubUsers] = useState([]);
  const [branchForm, setBranchForm] = useState({ name: "", location: "" });
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    role: "user",
    branchId: "",
  });

  const [webForm, setWebForm] = useState({
    customDomain: "",
    theme: {
      background: "#ffffff",
      headings: "#111827",
      paragraphs: "#4b5563",
      buttons: "#3b82f6",
      navbarBg: "#ffffff",
      navbarText: "#111827",
      footerBg: "#111827",
      footerText: "#ffffff",
      headingFont: "Inter",
      paragraphFont: "Inter",
    },
    navbar: { siteName: "", logoUrl: "", showAbout: true, showContact: true },
    hero: { title: "", subtitle: "", imageUrl: "" },
    about: { title: "", text: "", imageUrl: "" },
    contact: { email: "", phone: "", address: "", hours: "" },
    footer: { text: "", contact: "" },
    customProducts: [],
  });

  const [activeBranchData, setActiveBranchData] = useState(null);

  const fetchSettings = () => {
    api
      .get("/dashboard/settings/operating-hours")
      .then((res) => {
        setUserLevel(res.data.userLevel);
        setPlanName(res.data.planName);
        if (res.data.branch) setActiveBranchData(res.data.branch);
        if (res.data.settings?.addons) setAddons(res.data.settings.addons);
        if (res.data.settings?.location) {
          const loc = res.data.settings.location;
          const currency = res.data.settings.currency || "USD";
          const customCurrency = ![
            "USD",
            "EUR",
            "GBP",
            "PKR",
            "INR",
            "BHD",
            "SAR",
            "AED",
            "KWD",
            "CAD",
            "AUD",
          ].includes(currency);
          setLocation({ ...loc, currency, customCurrency });
        }
        if (res.data.settings) {
          setTaxRate(res.data.settings.taxRate ?? 0);
          setTaxes(res.data.settings.taxes ?? []);
          setCharges(res.data.settings.charges ?? []);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchSettings();
    if (isPrivileged) {
      fetchBranchesAndUsers();
    }
  }, [isPrivileged, activeBranchId]);

  useEffect(() => {
    const handleBranchChange = () => {
      fetchSettings();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, []);

  const fetchBranchesAndUsers = async () => {
    try {
      const [branchesRes, usersRes] = await Promise.all([
        api.get("/business/branches"),
        api.get("/business/users"),
      ]);
      setBranches(branchesRes.data);
      setSubUsers(usersRes.data);

      if (!activeBranchId && branchesRes.data.length > 0) {
        const firstBranchId = branchesRes.data[0]._id;
        setBranch(firstBranchId);
        setMessage({
          type: "info",
          text: `Auto‑selected branch: ${branchesRes.data[0].name}. Reloading...`,
        });
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      console.error("Failed to fetch branch data", err);
    }
  };

  const isLocked = userLevel < 2;

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm)
      return setMessage({ type: "error", text: "Passwords do not match" });
    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });
      setMessage({ type: "success", text: "Password changed successfully" });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to change password" });
    }
    setLoading(false);
  };

  const handleWebsiteSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...webForm };
      if (!payload.customDomain || payload.customDomain.trim() === "")
        delete payload.customDomain;
      await api.put("/website/settings", payload);
      setMessage({ type: "success", text: "Website published successfully!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save website" });
    }
    setLoading(false);
  };

  const previewWebsite = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    window.open(`/?preview=${user.id}`, "_blank");
  };

  const handleStoreSettingsSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post("/dashboard/settings/operating-hours", {
        addons,
        location,
        taxRate,
        taxes,
        charges,
        branchId: activeBranchId || loggedInUser.branchId,
      });
      setMessage({
        type: "success",
        text: "Store settings updated successfully!",
      });
      window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { currency: location.currency || "USD" } }));
      if (response.data?.taxes) setTaxes(response.data.taxes);
      if (response.data?.charges) setCharges(response.data.charges);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update settings" });
    }
    setLoading(false);
  };

  const saveTaxes = async (nextTaxes) => {
    const response = await api.post("/dashboard/settings/operating-hours", { 
      taxes: nextTaxes,
      branchId: activeBranchId || loggedInUser.branchId
    });
    setTaxes(response.data.taxes ?? nextTaxes);
    window.dispatchEvent(new CustomEvent('taxesChanged', { detail: { taxes: response.data.taxes ?? nextTaxes } }));
  };

  const addTax = async () => {
    const taxName = newTax.taxName.trim();
    const percentage = Number(newTax.percentage);
    if (!taxName || !Number.isFinite(percentage) || percentage < 0) {
      setMessage({ type: "error", text: "Enter a tax name and a valid percentage." });
      return;
    }
    const nextTaxes = [...taxes, { taxName, percentage, itemPricing: newTax.itemPricing, createdAt: new Date().toISOString() }];
    setLoading(true);
    try {
      await saveTaxes(nextTaxes);
      setNewTax({ taxName: "", percentage: "", itemPricing: "Exclusive" });
      setMessage({ type: "success", text: "Tax added successfully for this branch." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save tax." });
    } finally {
      setLoading(false);
    }
  };

  const deleteTax = async (index) => {
    const nextTaxes = taxes.filter((_, taxIndex) => taxIndex !== index);
    setLoading(true);
    try {
      await saveTaxes(nextTaxes);
      setMessage({ type: "success", text: "Tax deleted successfully." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to delete tax." });
    } finally {
      setLoading(false);
    }
  };

  const saveCharges = async (nextCharges) => {
    const response = await api.post("/dashboard/settings/operating-hours", { 
      charges: nextCharges,
      branchId: activeBranchId || loggedInUser.branchId
    });
    setCharges(response.data.charges ?? nextCharges);
    window.dispatchEvent(new CustomEvent('chargesChanged', { detail: { charges: response.data.charges ?? nextCharges } }));
  };

  const addCharge = async () => {
    const chargeName = newCharge.chargeName.trim();
    const value = Number(newCharge.value);
    if (!chargeName || !Number.isFinite(value) || value < 0) {
      setMessage({ type: "error", text: "Enter a charge name and a valid amount." });
      return;
    }
    setLoading(true);
    try {
      const isFixed = newCharge.chargeType === "Fixed";
      await saveCharges([...charges, {
        chargeName,
        chargeType: newCharge.chargeType,
        percentage: isFixed ? 0 : value,
        amount: isFixed ? value : 0,
        itemPricing: newCharge.itemPricing,
        orderTypes: newCharge.orderTypes,
        createdAt: new Date().toISOString()
      }]);
      setNewCharge({ chargeName: "", chargeType: "Percentage", value: "", itemPricing: "Exclusive", orderTypes: [] });
      setMessage({ type: "success", text: "Charge added successfully for this branch." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save charge." });
    } finally {
      setLoading(false);
    }
  };

  const deleteCharge = async (index) => {
    setLoading(true);
    try {
      await saveCharges(charges.filter((_, chargeIndex) => chargeIndex !== index));
      setMessage({ type: "success", text: "Charge deleted successfully." });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to delete charge." });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/business/branches", branchForm);
      setBranches([...branches, res.data]);
      setBranchForm({ name: "", location: "" });
      setMessage({ type: "success", text: "Branch created successfully!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to create branch." });
    }
    setLoading(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/business/users", userForm);
      setSubUsers([...subUsers, res.data]);
      setUserForm({ email: "", password: "", role: "user", branchId: "" });
      setMessage({
        type: "success",
        text: "User account created successfully!",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to create user.",
      });
    }
    setLoading(false);
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setEditBranchForm({ name: branch.name, location: branch.location });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingBranch(null);
    setEditBranchForm({ name: "", location: "" });
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    if (!editingBranch) return;
    setLoading(true);
    try {
      const res = await api.put(
        `/business/branches/${editingBranch._id}`,
        editBranchForm,
      );
      setBranches(
        branches.map((b) => (b._id === editingBranch._id ? res.data : b)),
      );
      setMessage({ type: "success", text: "Branch updated successfully!" });
      closeEditModal();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update branch.",
      });
    }
    setLoading(false);
  };

  const openEditUserModal = (user) => {
    setEditingUser(user);
    setEditUserForm({
      email: user.email,
      password: "",
      role: user.role,
      branchId: user.branchId?._id || user.branchId || "",
    });
    setShowEditUserModal(true);
  };

  const closeEditUserModal = () => {
    setShowEditUserModal(false);
    setEditingUser(null);
    setEditUserForm({ email: "", password: "", role: "user", branchId: "" });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      const payload = { ...editUserForm };
      if (!payload.password) delete payload.password;
      const res = await api.put(`/business/users/${editingUser._id}`, payload);
      setSubUsers(
        subUsers.map((u) => (u._id === editingUser._id ? res.data : u)),
      );
      setMessage({ type: "success", text: "User updated successfully!" });
      closeEditUserModal();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update user.",
      });
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    )
      return;
    setLoading(true);
    try {
      await api.delete(`/business/users/${userId}`);
      setSubUsers(subUsers.filter((u) => u._id !== userId));
      setMessage({ type: "success", text: "User deleted successfully!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to delete user.",
      });
    }
    setLoading(false);
  };

  

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeBranch");
    navigate("/");
  };

  const currentBranchName = activeBranchId
    ? branches.find((b) => b._id === activeBranchId)?.name || "Selected Branch"
    : "HQ (Aggregate View)";

  return (
    <div className="w-full min-h-screen bg-white text-gray-800 font-sans p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="flex gap-5 border-b border-gray-200 text-xs font-bold text-gray-400 overflow-x-auto hide-scrollbar">
            {[
              "Security",
              "Subscription",
              "Store & Pro Add-ons",
              "Payment Methods",
              "Credentials",
              ...(isPrivileged ? ["Branch & Team"] : []),
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setMessage({ type: "", text: "" });
                }}
                className={`shrink-0 pb-2 uppercase tracking-wider transition-colors ${activeTab === tab ? "text-blue-600 border-b-2 border-blue-500" : "hover:text-gray-600"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {message.text && (
          <div
            className={`mb-4 px-3 py-2 rounded-lg text-xs font-bold border ${message.type === "error" ? "bg-red-50 text-red-600 border-red-200" : message.type === "info" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-green-50 text-green-600 border-green-200"}`}
          >
            {message.text}
          </div>
        )}

        {/* ----------------- SECURITY TAB ----------------- */}
        {activeTab === "Security" && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-2xl shadow-sm">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-bold text-gray-700">
                Security Details
              </h2>
            </div>
            <div className="px-4 pt-3 pb-0">
              <p className="text-xs text-gray-500">
                Logged in as:{" "}
                <span className="text-gray-700 font-medium">
                  {loggedInUser.email}
                </span>
              </p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current: e.target.value })
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.new}
                    onChange={(e) =>
                      setPasswords({ ...passwords, new: e.target.value })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirm: e.target.value })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                {loading ? "Updating..." : "Save Changes"}
              </button>
            </form>
          </div>
        )}

        {/* ----------------- SUBSCRIPTION TAB ----------------- */}
        {activeTab === "Subscription" && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-3xl shadow-sm">
              <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-800 mb-0.5">
                    Current Plan
                  </h2>
                  <p className="text-xs text-gray-500">
                    Manage your subscription and billing details.
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Active
                </span>
              </div>
              <div className="flex flex-col md:flex-row gap-6 items-center mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-800 mb-1">
                    {planName} Tier
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    You are currently on the {planName} plan. This gives you
                    access to specific POS features, CRM, and AI tools based on
                    your tier.
                  </p>
                </div>
                <div className="w-full md:w-auto">
                  <button
                    onClick={() => navigate("/pricing")}
                    className="w-full md:w-auto bg-gray-800 hover:bg-gray-700 text-white font-bold px-6 py-2 rounded-full text-xs transition-colors"
                  >
                    Upgrade Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- STORE SETTINGS & PRO ADD-ONS TAB --- */}
        {activeTab === "Store & Pro Add-ons" && (
          <div className="space-y-5 max-w-3xl">
            {/* Branch Context Indicator */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  Configuring Settings For Branch
                </span>
                <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mt-0.5">
                  🏢 {activeBranchData?.name || currentBranchName}
                  {activeBranchData?.location ? ` (${activeBranchData.location})` : ""}
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Currency, taxes, charges, and store location configured here apply specifically to this branch.
                </p>
              </div>
              {isPrivileged && branches.length > 1 && (
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs text-gray-600 font-semibold">Branch:</label>
                  <select
                    value={activeBranchId || ""}
                    onChange={(e) => {
                      setBranch(e.target.value);
                      setMessage({ type: "info", text: "Switched branch. Loading branch settings..." });
                    }}
                    className="bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800 outline-none focus:border-blue-500"
                  >
                    <option value="">HQ (Default / Aggregate)</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>{b.name} ({b.location})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <form onSubmit={handleStoreSettingsSave} className="space-y-5">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-3 mb-4 flex items-center gap-2">
                  <span>🌍</span> Store Location & Weather
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                  Set your city to enable the AI Weather-Predictive Analytics
                  engine.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Islamabad"
                      value={location.city}
                      onChange={(e) =>
                        setLocation({ ...location, city: e.target.value })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Pakistan"
                      value={location.country}
                      onChange={(e) =>
                        setLocation({ ...location, country: e.target.value })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                    />
                  </div>
                </div>

                {/* Tax Management (Available to standard users and admin for branch) */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-700">Tax Management</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Exclusive taxes are added to the total; inclusive taxes are already included in item prices.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                    <input type="text" value={newTax.taxName} onChange={(e) => setNewTax({ ...newTax, taxName: e.target.value })} placeholder="Tax name (e.g. VAT, S.T)" className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
                    <input type="number" min="0" step="0.01" value={newTax.percentage} onChange={(e) => setNewTax({ ...newTax, percentage: e.target.value })} placeholder="Percentage (%)" className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
                    <div className="flex gap-2">
                      <select value={newTax.itemPricing} onChange={(e) => setNewTax({ ...newTax, itemPricing: e.target.value })} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400">
                        <option value="Exclusive">Exclusive</option>
                        <option value="Inclusive">Inclusive</option>
                      </select>
                      <button type="button" disabled={loading} onClick={addTax} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Add Tax</button>
                    </div>
                  </div>
                  <div className="mt-3 overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                        <tr>
                          <th className="p-2">SR No.</th>
                          <th className="p-2">Tax Name</th>
                          <th className="p-2">Percentage</th>
                          <th className="p-2">Item Pricing</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxes.length ? taxes.map((tax, index) => (
                          <tr key={tax._id || `${tax.taxName}-${index}`} className="border-t border-gray-100 text-gray-700">
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2 font-medium">{tax.taxName}</td>
                            <td className="p-2 font-mono">{Number(tax.percentage).toFixed(2)}%</td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tax.itemPricing === 'Inclusive' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                {tax.itemPricing}
                              </span>
                            </td>
                            <td className="p-2 text-gray-400">{tax.createdAt ? new Date(tax.createdAt).toLocaleDateString() : "—"}</td>
                            <td className="p-2">
                              <button type="button" disabled={loading} onClick={() => deleteTax(index)} className="text-red-600 hover:text-red-800 disabled:text-red-300 font-bold">Delete</button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan="6" className="p-3 text-center text-gray-400">No custom taxes configured for this branch.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Charges Management (Available to standard users and admin for branch) */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700">Charges Management</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Set a percentage or a fixed amount, then choose the order types it applies to. Leaving all order types unselected applies it to every order.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-3">
                    <input type="text" value={newCharge.chargeName} onChange={(e) => setNewCharge({ ...newCharge, chargeName: e.target.value })} placeholder="Charge name (e.g. Service)" className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
                    <select value={newCharge.chargeType} onChange={(e) => setNewCharge({ ...newCharge, chargeType: e.target.value })} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400">
                      <option value="Percentage">Percentage</option>
                      <option value="Fixed">Fixed amount</option>
                    </select>
                    <input type="number" min="0" step="0.01" value={newCharge.value} onChange={(e) => setNewCharge({ ...newCharge, value: e.target.value })} placeholder={newCharge.chargeType === "Fixed" ? "Amount" : "Percentage (%)"} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
                    <div className="flex gap-2">
                      <select value={newCharge.itemPricing} onChange={(e) => setNewCharge({ ...newCharge, itemPricing: e.target.value })} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400">
                        <option value="Exclusive">Exclusive</option>
                        <option value="Inclusive">Inclusive</option>
                      </select>
                      <button type="button" disabled={loading} onClick={addCharge} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Add Charge</button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                    {["Dine In", "Parcel", "Delivery"].map((orderType) => (
                      <label key={orderType} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCharge.orderTypes.includes(orderType)}
                          onChange={(e) => setNewCharge({ ...newCharge, orderTypes: e.target.checked ? [...newCharge.orderTypes, orderType] : newCharge.orderTypes.filter((type) => type !== orderType) })}
                        />
                        {orderType}
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                        <tr>
                          <th className="p-2">SR No.</th>
                          <th className="p-2">Charge Name</th>
                          <th className="p-2">Value</th>
                          <th className="p-2">Order Types</th>
                          <th className="p-2">Item Pricing</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {charges.length ? charges.map((charge, index) => (
                          <tr key={charge._id || `${charge.chargeName}-${index}`} className="border-t border-gray-100 text-gray-700">
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2 font-medium">{charge.chargeName}</td>
                            <td className="p-2 font-mono">{charge.chargeType === "Fixed" ? Number(charge.amount || 0).toFixed(2) : `${Number(charge.percentage || 0).toFixed(2)}%`}</td>
                            <td className="p-2">{charge.orderTypes?.length ? charge.orderTypes.join(", ") : "All"}</td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${charge.itemPricing === 'Inclusive' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                {charge.itemPricing}
                              </span>
                            </td>
                            <td className="p-2 text-gray-400">{charge.createdAt ? new Date(charge.createdAt).toLocaleDateString() : "—"}</td>
                            <td className="p-2">
                              <button type="button" disabled={loading} onClick={() => deleteCharge(index)} className="text-red-600 hover:text-red-800 disabled:text-red-300 font-bold">Delete</button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan="7" className="p-3 text-center text-gray-400">No charges configured for this branch.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 p-3 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 text-5xl pointer-events-none">
                      ☁️
                    </div>
                    <div className="flex h-2.5 w-2.5 mt-1 shrink-0 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-blue-600 tracking-wider uppercase mb-0.5">
                        Live Auto-Sync Active
                      </h4>
                      <p className="text-[10px] text-gray-500 leading-relaxed max-w-lg">
                        Recording weather every hour from 1:00 PM to 2:00 AM.
                        All logs stored permanently.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Analytics */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                {isLocked && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4">
                    <span className="text-4xl mb-3">🔒</span>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      Professional Feature
                    </h3>
                    <p className="text-xs text-gray-500 mb-4 max-w-md">
                      Your current <b>{planName}</b> plan does not support
                      Advanced Analytics. Upgrade to unlock.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/pricing")}
                      className="bg-gray-800 text-white font-bold px-5 py-2 rounded-full text-xs hover:bg-gray-700 transition-colors"
                    >
                      Upgrade Plan
                    </button>
                  </div>
                )}
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-3 mb-4">
                  Advanced Analytics Integrations
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-blue-200 bg-blue-50 hover:border-blue-300 transition-colors">
                    <div>
                      <h4 className="font-bold text-blue-700 text-sm flex items-center gap-2">
                        <span>✦</span> Performance Metrics Engine
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed max-w-xl">
                        Unlocks Deep Peak & Flow Detection, AI Smart Stock
                        Alerts, Profit Margin Velocity, Refund Analytics, and
                        Weather-Based Prediction.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={addons.performanceMetrics}
                        onChange={(e) =>
                          setAddons({
                            ...addons,
                            performanceMetrics: e.target.checked,
                          })
                        }
                        disabled={isLocked}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isLocked || loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs tracking-wider uppercase transition-colors disabled:opacity-50"
                  >
                    Save Location & Analytics for Branch
                  </button>
                </div>
              </div>
            </form>

            {/* Currency Selector */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-3 mb-4">
                Default Currency
              </h2>
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Choose the currency used for this branch across your POS system.
                </p>
                <div className="flex items-center gap-3">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Currency
                  </label>
                  <select
                    value={location.currency || "USD"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "CUSTOM") {
                        setLocation({
                          ...location,
                          currency: "",
                          customCurrency: true,
                        });
                      } else {
                        setLocation({
                          ...location,
                          currency: val,
                          customCurrency: false,
                        });
                      }
                    }}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-blue-400 w-full max-w-xs"
                  >
                    <option value="PKR">PKR (Pakistani Rupee)</option>
                    <option value="USD">$ (US Dollar)</option>
                    <option value="EUR">€ (Euro)</option>
                    <option value="GBP">£ (British Pound)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="SAR">SAR (Saudi Riyal)</option>
                    <option value="BHD">BHD (Bahraini Dinar)</option>
                    <option value="KWD">KWD (Kuwaiti Dinar)</option>
                    <option value="INR">₹ (Indian Rupee)</option>
                    <option value="CAD">C$ (Canadian Dollar)</option>
                    <option value="AUD">A$ (Australian Dollar)</option>
                    <option value="CUSTOM">✏️ Custom Currency</option>
                  </select>
                </div>
                {location.customCurrency && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      Custom Currency Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., KWD, INR, TRY..."
                      value={location.currency}
                      onChange={(e) =>
                        setLocation({
                          ...location,
                          currency: e.target.value.toUpperCase(),
                        })
                      }
                      className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none w-full max-w-xs"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Enter a 3-letter currency code.
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  The currency symbol will be displayed next to prices.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await api.post("/dashboard/settings/operating-hours", {
                        currency: location.currency || "USD",
                        branchId: activeBranchId || loggedInUser.branchId,
                      });
                      setMessage({
                        type: "success",
                        text: "Branch currency updated successfully!",
                      });
                      window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { currency: location.currency || "USD" } }));
                    } catch (err) {
                      setMessage({
                        type: "error",
                        text: "Failed to update currency.",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs tracking-wider uppercase transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Branch Currency"}
                </button>
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                  Saves currency specifically for this branch.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Payment Methods" && <PaymentMethodsSettings />}
        {activeTab === "Credentials" && <ApiKeyManager />}

        {/* Branch & Team Tab */}
        {activeTab === "Branch & Team" && isPrivileged && (
          <div className="space-y-5 max-w-4xl">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-sm font-bold text-blue-700 mb-0.5">
                    Active Operational Workspace
                  </h2>
                  <p className="text-[10px] text-gray-500">
                    Switch branch to view its data. Click a branch button below.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {branches.map((branch) => (
                  <button
  key={branch._id}
  onClick={() => setBranch(branch._id)}
  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeBranchId === branch._id ? "bg-blue-600 text-white shadow-sm" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
>
                    📍 {branch.name}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded-lg">
                Currently viewing:{" "}
                <span className="text-blue-600 font-mono">
                  {currentBranchName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-3 mb-4">
                  Create New Branch
                </h2>
                <form onSubmit={handleCreateBranch} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      value={branchForm.name}
                      onChange={(e) =>
                        setBranchForm({ ...branchForm, name: e.target.value })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      Location / City
                    </label>
                    <input
                      type="text"
                      value={branchForm.location}
                      onChange={(e) =>
                        setBranchForm({
                          ...branchForm,
                          location: e.target.value,
                        })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                  >
                    Register Branch
                  </button>
                </form>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-3 mb-4">
                  Provision New User
                </h2>
                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      Email Login
                    </label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) =>
                        setUserForm({ ...userForm, email: e.target.value })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      Temporary Password
                    </label>
                    <input
                      type="text"
                      value={userForm.password}
                      onChange={(e) =>
                        setUserForm({ ...userForm, password: e.target.value })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                        Role
                      </label>
                      <select
                        value={userForm.role}
                        onChange={(e) =>
                          setUserForm({ ...userForm, role: e.target.value })
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                      >
                        <option value="user">Standard User</option>
                        {isSuperAdmin && <option value="admin">Admin</option>}
                      </select>
                    </div>
                    {userForm.role === "user" && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                          Assign Branch
                        </label>
                        <select
                          value={userForm.branchId}
                          onChange={(e) =>
                            setUserForm({
                              ...userForm,
                              branchId: e.target.value,
                            })
                          }
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                          required
                        >
                          <option value="">Select...</option>
                          {branches.map((b) => (
                            <option key={b._id} value={b._id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                  >
                    Create Account
                  </button>
                </form>
              </div>
            </div>

            {/* Branch List */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-3 mb-4">
                Branch List
              </h2>
              {branches.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No branches created yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {branches.map((branch) => (
                    <div
                      key={branch._id}
                      className="py-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {branch.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {branch.location}
                        </p>
                      </div>
                      <button
                        onClick={() => openEditModal(branch)}
                        className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-all text-xs font-medium"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Organization Roster */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-3 mb-4">
                Organization Roster
              </h2>
              {subUsers.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No sub-users created yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {subUsers.map((u) => (
                    <div
                      key={u._id}
                      className="py-2.5 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {u.email}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                          {u.role}{" "}
                          {u.branchId
                            ? `• ${u.branchId.name}`
                            : "• Global Access"}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEditUserModal(u)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-all text-[10px] font-medium"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="px-2.5 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-all text-[10px] font-medium"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Branch Modal */}
            {showEditModal && editingBranch && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={closeEditModal}
              >
                <div
                  className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-6 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-base font-bold text-gray-800 mb-4">
                    Edit Branch
                  </h3>
                  <form onSubmit={handleUpdateBranch} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                        Branch Name
                      </label>
                      <input
                        type="text"
                        value={editBranchForm.name}
                        onChange={(e) =>
                          setEditBranchForm({
                            ...editBranchForm,
                            name: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                        Location / City
                      </label>
                      <input
                        type="text"
                        value={editBranchForm.location}
                        onChange={(e) =>
                          setEditBranchForm({
                            ...editBranchForm,
                            location: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                      >
                        {loading ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={closeEditModal}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit User Modal */}
            {showEditUserModal && editingUser && (
              <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={closeEditUserModal}
              >
                <div
                  className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-6 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-base font-bold text-gray-800 mb-4">
                    Edit User
                  </h3>
                  <form onSubmit={handleUpdateUser} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editUserForm.email}
                        onChange={(e) =>
                          setEditUserForm({
                            ...editUserForm,
                            email: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                        New Password (leave blank to keep current)
                      </label>
                      <input
                        type="password"
                        value={editUserForm.password}
                        onChange={(e) =>
                          setEditUserForm({
                            ...editUserForm,
                            password: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                        Role
                      </label>
                      <select
                        value={editUserForm.role}
                        onChange={(e) =>
                          setEditUserForm({
                            ...editUserForm,
                            role: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                      >
                        <option value="user">User</option>
                        {isSuperAdmin && <option value="admin">Admin</option>}
                      </select>
                    </div>
                    {editUserForm.role === "user" && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                          Assign Branch
                        </label>
                        <select
                          value={editUserForm.branchId}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              branchId: e.target.value,
                            })
                          }
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:border-blue-400 outline-none"
                          required
                        >
                          <option value="">Select branch</option>
                          {branches.map((b) => (
                            <option key={b._id} value={b._id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                      >
                        {loading ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={closeEditUserModal}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Logout */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-700 transition-colors font-bold text-xs tracking-wider uppercase"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              ></path>
            </svg>
            Secure Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
