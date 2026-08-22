// src/pages/ManageDeals.jsx
import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import useCurrency from '../hooks/useCurrency';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaTag,
  FaCheck,
  FaTimes,
  FaImage,
  FaBoxes,
  FaSearch,
  FaPercent,
  FaClock,
  FaLayerGroup,
  FaUtensils,
  FaFire
} from 'react-icons/fa';

const BADGE_PRESETS = [
  'SPECIAL DEAL',
  'HOT COMBO',
  'FAMILY PACK',
  'BESTSELLER',
  'WEEKEND OFFER',
  'LUNCH BOX',
  'SAVE 20%',
  'SAVE 30%'
];

const ManageDeals = () => {
  const { currencySymbol } = useCurrency();
  const [deals, setDeals] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    badge: 'SPECIAL DEAL',
    isAvailable: true,
    inStock: true,
    prepTime: 20,
    imageUrl: '',
    imageFile: null,
    imagePreview: '',
    items: [] // array of { product: id, name: string, qty: number, price: number }
  });

  // Product picker search & category filter inside modal
  const [productSearch, setProductSearch] = useState('');
  const [pickerCategoryFilter, setPickerCategoryFilter] = useState('all');

  const fetchDealsAndProducts = async () => {
    setLoading(true);
    try {
      const [dealsRes, prodRes, catRes] = await Promise.all([
        api.get('/pos/deals'),
        api.get('/pos/products'),
        api.get('/pos/categories').catch(() => ({ data: [] }))
      ]);
      setDeals(dealsRes.data || []);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to load deals or products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealsAndProducts();
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      badge: 'SPECIAL DEAL',
      isAvailable: true,
      inStock: true,
      prepTime: 20,
      imageUrl: '',
      imageFile: null,
      imagePreview: '',
      items: []
    });
    setEditingDealId(null);
    setProductSearch('');
    setPickerCategoryFilter('all');
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (deal) => {
    setEditingDealId(deal._id);
    setForm({
      name: deal.name || '',
      description: deal.description || '',
      price: deal.price || '',
      originalPrice: deal.originalPrice || '',
      badge: deal.badge || 'SPECIAL DEAL',
      isAvailable: deal.isAvailable !== undefined ? deal.isAvailable : true,
      inStock: deal.inStock !== undefined ? deal.inStock : true,
      prepTime: deal.prepTime || 20,
      imageUrl: deal.imageUrl || '',
      imageFile: null,
      imagePreview: deal.imageUrl || '',
      items: (deal.items || []).map(i => ({
        product: i.product?._id || i.product,
        name: i.name || i.product?.name || 'Item',
        qty: i.qty || 1,
        price: i.price !== undefined ? i.price : (i.product?.price || 0)
      }))
    });
    setPickerCategoryFilter('all');
    setProductSearch('');
    setModalOpen(true);
  };

  // Add a product to the deal items bundle
  const handleAddItemToDeal = (product) => {
    const existingIndex = form.items.findIndex(i => i.product === product._id);
    if (existingIndex >= 0) {
      const updated = [...form.items];
      updated[existingIndex].qty += 1;
      setForm(prev => ({ ...prev, items: updated }));
    } else {
      const newItem = {
        product: product._id,
        name: product.name,
        qty: 1,
        price: product.price || 0
      };
      setForm(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }
  };

  const handleUpdateItemQty = (index, delta) => {
    const updated = [...form.items];
    const newQty = updated[index].qty + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].qty = newQty;
    }
    setForm(prev => ({ ...prev, items: updated }));
  };

  const handleRemoveItem = (index) => {
    const updated = form.items.filter((_, idx) => idx !== index);
    setForm(prev => ({ ...prev, items: updated }));
  };

  // Calculate sum of individual item prices
  const calculatedOriginalPrice = useMemo(() => {
    return form.items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 1)), 0);
  }, [form.items]);

  // Savings calculation
  const savings = useMemo(() => {
    const orig = Number(form.originalPrice) || calculatedOriginalPrice;
    const dealP = Number(form.price) || 0;
    if (orig > dealP && dealP > 0) {
      const amount = orig - dealP;
      const percent = Math.round((amount / orig) * 100);
      return { amount, percent };
    }
    return null;
  }, [form.originalPrice, calculatedOriginalPrice, form.price]);

  // Image change handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      alert('Please provide a Deal Name and Deal Price.');
      return;
    }

    if (form.items.length === 0) {
      alert('Please add at least one product into this deal package.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('originalPrice', form.originalPrice || calculatedOriginalPrice);
      formData.append('badge', form.badge);
      formData.append('isAvailable', form.isAvailable);
      formData.append('inStock', form.inStock);
      formData.append('prepTime', form.prepTime);
      formData.append('items', JSON.stringify(form.items));

      if (form.imageFile) {
        formData.append('image', form.imageFile);
      } else if (form.imageUrl) {
        formData.append('imageUrl', form.imageUrl);
      }

      if (editingDealId) {
        await api.put(`/pos/deals/${editingDealId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/pos/deals', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setModalOpen(false);
      resetForm();
      fetchDealsAndProducts();
    } catch (err) {
      console.error('Failed to save deal:', err);
      alert('Failed to save deal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return;
    try {
      await api.delete(`/pos/deals/${id}`);
      fetchDealsAndProducts();
    } catch (err) {
      console.error('Failed to delete deal:', err);
      alert('Failed to delete deal.');
    }
  };

  const handleToggleStock = async (deal) => {
    try {
      const nextStock = !deal.inStock;
      await api.put(`/pos/deals/${deal._id}`, { inStock: nextStock });
      setDeals(prev => prev.map(d => d._id === deal._id ? { ...d, inStock: nextStock } : d));
    } catch (err) {
      console.error('Failed to toggle deal stock:', err);
    }
  };

  // Filtered list of products in the picker modal without limiting count
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return products.filter(p => {
      const matchesCat = pickerCategoryFilter === 'all' || p.category?._id === pickerCategoryFilter || p.category === pickerCategoryFilter;
      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [products, productSearch, pickerCategoryFilter]);

  // Filtered list of deals for display
  const filteredDeals = useMemo(() => {
    if (!searchQuery.trim()) return deals;
    const q = searchQuery.toLowerCase().trim();
    return deals.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.badge?.toLowerCase().includes(q)
    );
  }, [deals, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans text-gray-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <FaFire size={20} />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manage Deals & Combos</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Bundle multiple catalog items into discounted value deals for your POS and online customers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <FaPlus size={13} /> Create New Deal
          </button>
        </div>
      </div>

      {/* Search and stats bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-blue-500"
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Total Deals: <strong>{deals.length}</strong></span>
          <span>•</span>
          <span className="text-emerald-600 font-semibold">{deals.filter(d => d.inStock).length} Active</span>
        </div>
      </div>

      {/* Deals Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading deals...</div>
      ) : filteredDeals.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <FaLayerGroup className="mx-auto text-4xl text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-700">No deals found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Create your first combo deal to boost sales by offering bundled items at special promotional rates.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            + Create First Deal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDeals.map((deal) => {
            const originalVal = deal.originalPrice || (deal.items || []).reduce((s, i) => s + (i.price * i.qty), 0);
            const discountPct = originalVal > deal.price ? Math.round(((originalVal - deal.price) / originalVal) * 100) : 0;

            return (
              <div
                key={deal._id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col ${
                  deal.inStock ? 'border-gray-200' : 'border-gray-200 opacity-70 bg-gray-50/50'
                }`}
              >
                {/* Image Banner */}
                <div className="h-44 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                  {deal.imageUrl ? (
                    <img
                      src={deal.imageUrl}
                      alt={deal.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <FaUtensils size={32} />
                      <span className="text-[11px] mt-1 font-medium">No Image</span>
                    </div>
                  )}

                  {/* Badge */}
                  {deal.badge && (
                    <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
                      {deal.badge}
                    </span>
                  )}

                  {/* Discount percentage tag */}
                  {discountPct > 0 && (
                    <span className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-xs flex items-center gap-1">
                      <FaPercent size={9} /> {discountPct}% OFF
                    </span>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-bold text-gray-900 text-base leading-snug">
                        {deal.name}
                      </h3>
                      <div className="text-right shrink-0">
                        <span className="text-base font-bold text-blue-600">
                          {currencySymbol}{Number(deal.price).toFixed(2)}
                        </span>
                        {originalVal > deal.price && (
                          <p className="text-[11px] text-gray-400 line-through">
                            {currencySymbol}{Number(originalVal).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    {deal.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                        {deal.description}
                      </p>
                    )}

                    {/* Included Items Pill List */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 mb-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <FaBoxes size={10} /> Included Items ({deal.items?.length || 0})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(deal.items || []).map((item, idx) => (
                          <span
                            key={idx}
                            className="bg-white border border-gray-200 text-gray-700 text-[11px] font-medium px-2 py-0.5 rounded-lg shadow-2xs"
                          >
                            <strong className="text-blue-600">{item.qty}x</strong> {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleStock(deal)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        deal.inStock
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {deal.inStock ? '● In Stock' : '○ Out of Stock'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(deal)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Deal"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteDeal(deal._id)}
                        className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Deal"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-amber-500 text-gray-900 rounded-lg">
                  <FaFire size={14} />
                </span>
                <h2 className="text-base sm:text-lg font-bold">
                  {editingDealId ? 'Edit Deal / Combo' : 'Create New Deal / Combo'}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Deal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Mega Family Feast"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Promotional Badge / Tag
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.badge}
                      onChange={(e) => setForm({ ...form, badge: e.target.value })}
                      placeholder="e.g. HOT DEAL"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {BADGE_PRESETS.slice(0, 4).map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setForm({ ...form, badge: b })}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
                          form.badge === b ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe what is included in this bundle deal..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5">
                      Deal Price ({currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-white border border-blue-200 rounded-xl px-3.5 py-2 text-sm font-bold text-blue-700 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Calculated Regular Price
                    </label>
                    <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-600 font-semibold flex items-center justify-between">
                      <span>{currencySymbol}{calculatedOriginalPrice.toFixed(2)}</span>
                      {savings && (
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          Save {currencySymbol}{savings.amount.toFixed(2)} ({savings.percent}% OFF)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Included Items in Package ({form.items.length})
                  </label>
                  <span className="text-[11px] text-gray-400">Pick from menu below</span>
                </div>

                {form.items.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-400 bg-gray-50/50 mb-3">
                    No products added to this deal yet. Select items from the catalog picker below.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-600 font-bold">
                        <tr>
                          <th className="p-2.5">Product Name</th>
                          <th className="p-2.5">Unit Price</th>
                          <th className="p-2.5 text-center">Quantity</th>
                          <th className="p-2.5 text-right">Subtotal</th>
                          <th className="p-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {form.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-semibold text-gray-800">{item.name}</td>
                            <td className="p-2.5 text-gray-500">{currencySymbol}{Number(item.price).toFixed(2)}</td>
                            <td className="p-2.5 text-center">
                              <div className="inline-flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 bg-gray-50">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(idx, -1)}
                                  className="w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center font-bold">{item.qty}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(idx, 1)}
                                  className="w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-bold text-gray-700">
                              {currencySymbol}{(Number(item.price) * Number(item.qty)).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <FaTrash size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Catalog Product Picker */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="flex flex-col sm:flex-row gap-2 mb-2.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search all products by name or category..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                      />
                      <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={11} />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex gap-1 overflow-x-auto hide-scrollbar shrink-0 py-0.5">
                      <button
                        type="button"
                        onClick={() => setPickerCategoryFilter('all')}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors whitespace-nowrap ${
                          pickerCategoryFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        All ({products.length})
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => setPickerCategoryFilter(c._id)}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors whitespace-nowrap ${
                            pickerCategoryFilter === c._id
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 bg-white rounded-lg border border-gray-200">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">
                        No products match your search or filter.
                      </div>
                    ) : (
                      filteredProducts.map((prod) => (
                        <div
                          key={prod._id}
                          className="px-3 py-2 flex items-center justify-between text-xs hover:bg-blue-50/50 transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-gray-800">{prod.name}</p>
                            <p className="text-[10px] text-gray-400">{prod.category?.name || 'General'} • {currencySymbol}{Number(prod.price).toFixed(2)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddItemToDeal(prod)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <FaPlus size={9} /> Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-1.5 flex justify-between items-center text-[10px] text-gray-400">
                    <span>Showing {filteredProducts.length} of {products.length} products</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Deal Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {form.imagePreview && (
                    <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                      <img src={form.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Status & Availability
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.inStock}
                      onChange={(e) => setForm({ ...form, inStock: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Available / In Stock for POS & Online Orders
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingDealId ? 'Update Deal' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDeals;
