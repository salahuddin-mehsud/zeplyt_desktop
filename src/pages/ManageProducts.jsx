import { useEffect, useState } from 'react';
import api from '../services/api';
import { FaPlus, FaTrash, FaLayerGroup, FaFileExport, FaFileImport } from 'react-icons/fa';

const VARIANT_PRESETS = [
  { label: 'Full / Half', variants: [{ name: 'Full', price: '' }, { name: 'Half', price: '' }] },
  { label: 'Small / Large', variants: [{ name: 'Small', price: '' }, { name: 'Large', price: '' }] },
  { label: 'Small / Medium / Large', variants: [{ name: 'Small', price: '' }, { name: 'Medium', price: '' }, { name: 'Large', price: '' }] },
  { label: '1 KG / 500g / 250g', variants: [{ name: '1 KG', price: '' }, { name: '500 Grams', price: '' }, { name: '250 Grams', price: '' }] },
  { label: '(S) / (M) / (L)', variants: [{ name: '(S)', price: '' }, { name: '(M)', price: '' }, { name: '(L)', price: '' }] },
];

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: null,
    imagePreview: '',
    discountEnabled: false,
    discountType: 'percentage',
    discountValue: 0,
    inStock: true,
    stockQuantity: '',
    tags: [],
    variants: [],
  });
  const [editingId, setEditingId] = useState(null);
  const [imageError, setImageError] = useState('');

  const getCurrencySymbol = (code) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      BHD: 'BHD',
      SAR: 'SAR',
      AED: 'AED',
      KWD: 'KWD',
      PKR: 'PKR',
      INR: '₹',
    };
    return symbols[code] || code;
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/dashboard/settings/operating-hours');
        const cur = res.data.settings?.currency || 'USD';
        setCurrency(cur);
        setCurrencySymbol(getCurrencySymbol(cur));
      } catch (err) {
        console.error('Failed to fetch currency settings', err);
      }
    };
    fetchSettings();
  }, []);

  const fetchData = async () => {
    const [prodRes, catRes] = await Promise.all([api.get('/pos/products'), api.get('/pos/categories')]);
    setProducts(prodRes.data || []);
    setCategories(catRes.data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      price: '',
      category: '',
      image: null,
      imagePreview: '',
      discountEnabled: false,
      discountType: 'percentage',
      discountValue: 0,
      inStock: true,
      stockQuantity: '',
      tags: [],
      variants: [],
    });
    setImageError('');
    setEditingId(null);
  };

  const handleAddVariantRow = () => {
    setForm(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        { name: '', price: '', portionSize: '', inStock: true }
      ]
    }));
  };

  const handleApplyPreset = (preset) => {
    const newVariants = preset.variants.map(v => ({
      name: v.name,
      price: form.price || '',
      portionSize: v.name,
      inStock: true
    }));
    setForm(prev => ({ ...prev, variants: newVariants }));
  };

  const handleUpdateVariant = (index, field, value) => {
    const updated = [...form.variants];
    updated[index][field] = value;
    setForm(prev => ({ ...prev, variants: updated }));
  };

  const handleRemoveVariant = (index) => {
    const updated = form.variants.filter((_, idx) => idx !== index);
    setForm(prev => ({ ...prev, variants: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description);

    let effectivePrice = form.price;
    if (form.variants && form.variants.length > 0) {
      const validVariantPrices = form.variants.map(v => Number(v.price)).filter(p => !isNaN(p) && p > 0);
      if (!effectivePrice && validVariantPrices.length > 0) {
        effectivePrice = validVariantPrices[0];
      }
    }
    formData.append('price', effectivePrice || 0);

    formData.append('category', form.category);
    formData.append('discountEnabled', form.discountEnabled);
    formData.append('discountType', form.discountType);
    formData.append('discountValue', form.discountValue);
    formData.append('inStock', form.inStock);
    const qty = form.inStock ? (form.stockQuantity === '' ? 0 : parseInt(form.stockQuantity) || 0) : 0;
    formData.append('stockQuantity', qty);
    formData.append('tags', (form.tags || []).join(','));

    const cleanVariants = (form.variants || [])
      .filter(v => v.name && v.name.trim())
      .map(v => ({
        name: v.name.trim(),
        price: Number(v.price) || 0,
        portionSize: v.portionSize || v.name.trim(),
        inStock: v.inStock !== false
      }));
    formData.append('variants', JSON.stringify(cleanVariants));

    if (form.image) formData.append('image', form.image);

    if (editingId) {
      await api.put(`/pos/products/${editingId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      await api.post('/pos/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    resetForm();
    fetchData();
  };

  const handleEditClick = (p) => {
    setForm({
      name: p.name,
      description: p.description || '',
      price: p.price,
      category: p.category?._id || '',
      image: null,
      imagePreview: p.imageUrl || '',
      discountEnabled: p.discountEnabled || false,
      discountType: p.discountType || 'percentage',
      discountValue: p.discountValue || 0,
      inStock: p.inStock !== undefined ? p.inStock : true,
      stockQuantity: p.stockQuantity ? String(p.stockQuantity) : '',
      tags: p.tags || [],
      variants: (p.variants || []).map(v => ({
        name: v.name || '',
        price: v.price !== undefined ? v.price : '',
        portionSize: v.portionSize || v.name || '',
        inStock: v.inStock !== false
      })),
    });
    setEditingId(p._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await api.delete(`/pos/products/${id}`);
      fetchData();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageError('');
    setForm(prev => ({
      ...prev,
      image: file,
      imagePreview: URL.createObjectURL(file)
    }));
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/pos/products/export');
      if (res.data.success) {
        const dataStr = JSON.stringify(res.data.products, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `products_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Export failed', err);
      alert('Failed to export products');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const res = await api.post('/pos/products/import', { products: json });
        if (res.data.success) {
          alert(res.data.message);
          fetchData();
        }
      } catch (err) {
        console.error('Import failed', err);
        alert('Failed to import products. Ensure the JSON is valid.');
      }
    };
    reader.readAsText(file);
    // Reset the input value so the same file can be selected again
    e.target.value = null;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto font-sans text-gray-800">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Manage Products</h1>
            <p className="text-xs text-gray-500">Add, edit, or configure dish sizes, portion variations, prices, and stock.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-xs"
            >
              <FaFileExport /> Export
            </button>
            <label className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-xs cursor-pointer">
              <FaFileImport /> Import
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Chicken Karahi, Bannu Pulao"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Category *</label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Base Price */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                Base Price ({currencySymbol}) {form.variants.length > 0 ? '(Default/From Price)' : '*'}
              </label>
              <input
                type="number"
                step="any"
                required={form.variants.length === 0}
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 font-bold text-blue-600"
              />
            </div>

            {/* PORTION SIZES & VARIANTS BUILDER */}
            <div className="md:col-span-3 bg-blue-50/40 border border-blue-100 rounded-xl p-3.5 my-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <FaLayerGroup className="text-blue-600" size={13} />
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Portion Sizes & Variations (Optional)
                    </h3>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Define different portions like Full, Half, Small, Large, or 1KG with individual pricing.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Presets:</span>
                  {VARIANT_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2 py-0.5 bg-white border border-blue-200 hover:border-blue-400 text-blue-700 rounded-md text-[10px] font-bold transition-colors shadow-2xs"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variants Table */}
              {form.variants.length > 0 ? (
                <div className="border border-blue-200 bg-white rounded-lg overflow-hidden mb-2">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-blue-50/70 text-blue-900 font-bold border-b border-blue-100">
                      <tr>
                        <th className="p-2">Size / Portion Name (e.g. Full, Half, Large)</th>
                        <th className="p-2 w-32">Price ({currencySymbol})</th>
                        <th className="p-2 w-36">Portion Label (Optional)</th>
                        <th className="p-2 w-24 text-center">In Stock</th>
                        <th className="p-2 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.variants.map((v, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Full Plate, Half, Large, (S)"
                              value={v.name}
                              onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-400 font-semibold text-gray-800"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="any"
                              required
                              placeholder="0.00"
                              value={v.price}
                              onChange={(e) => handleUpdateVariant(idx, 'price', e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-400 font-bold text-blue-600"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="e.g. 500g, 2 Persons"
                              value={v.portionSize || ''}
                              onChange={(e) => handleUpdateVariant(idx, 'portionSize', e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-400 text-gray-600"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={v.inStock !== false}
                              onChange={(e) => handleUpdateVariant(idx, 'inStock', e.target.checked)}
                              className="w-3.5 h-3.5 accent-green-600 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Remove size"
                            >
                              <FaTrash size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white/80 border border-dashed border-blue-200 rounded-lg p-3 text-center text-xs text-gray-500 mb-2">
                  No sizes/variations added. This item will sell at a standard single price.
                </div>
              )}

              <button
                type="button"
                onClick={handleAddVariantRow}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors shadow-2xs"
              >
                <FaPlus size={10} /> Add Custom Size / Portion
              </button>
            </div>

            {/* Image */}
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Product Image</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1 text-xs outline-none focus:border-blue-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {form.imagePreview && (
                  <img src={form.imagePreview} alt="Preview" className="w-9 h-9 object-cover rounded-lg border border-gray-200" />
                )}
              </div>
            </div>
            {imageError && (
              <p role="alert" className="md:col-span-3 -mt-2 text-xs text-red-600">{imageError}</p>
            )}

            {/* Description Input */}
            <div className="md:col-span-3 mt-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Description</label>
              <textarea
                rows="2"
                placeholder="Describe the dish, ingredients, serving style..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              />
            </div>

            {/* Stock Control */}
            <div className="md:col-span-3 flex flex-wrap items-center gap-3 mt-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.inStock}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm({ ...form, inStock: checked, stockQuantity: checked ? form.stockQuantity : '' });
                  }}
                  className="w-3.5 h-3.5 accent-green-500"
                />
                In Stock
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="Qty (optional)"
                value={form.stockQuantity}
                onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-400"
                disabled={!form.inStock}
              />
              <span className="text-[10px] text-gray-400">(leave empty if irrelevant)</span>
            </div>

            {/* Discount Control */}
            <div className="md:col-span-3 flex flex-wrap items-center gap-3 mt-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.discountEnabled}
                  onChange={(e) => setForm({ ...form, discountEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 accent-blue-500"
                />
                Enable Discount
              </label>
              {form.discountEnabled && (
                <div className="flex items-center gap-2">
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">Fixed</option>
                  </select>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Value"
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
                      className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1 pl-5 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tags Input */}
            <div className="md:col-span-3 mt-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. hero, featured, signature"
                value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
                onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
              />
            </div>

            <div className="flex gap-2 md:col-span-3 mt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-sm transition-colors shadow-xs">
                {editingId ? 'Update Product' : 'Add Product'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold text-xs uppercase transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Product Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-500 font-mono uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 font-bold">Image</th>
                  <th className="px-3 py-2 font-bold">Product Name</th>
                  <th className="px-3 py-2 font-bold">Category</th>
                  <th className="px-3 py-2 font-bold">Portion Sizes & Pricing ({currency})</th>
                  <th className="px-3 py-2 font-bold">Stock</th>
                  <th className="px-3 py-2 font-bold">Discount</th>
                  <th className="px-3 py-2 font-bold">Tags</th>
                  <th className="px-3 py-2 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-9 h-9 object-cover rounded-lg border border-gray-200" />
                      ) : (
                        <span className="text-gray-400 text-[10px]">No img</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {p.description && <p className="text-[10px] text-gray-400 line-clamp-1">{p.description}</p>}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{p.category?.name || 'Uncategorized'}</td>
                    
                    {/* Portion Sizes & Pricing */}
                    <td className="px-3 py-2">
                      {p.variants && p.variants.length > 0 ? (
                        <div className="flex flex-wrap gap-1 items-center">
                          {p.variants.map((v, idx) => (
                            <span key={idx} className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold">
                              {v.name}: {currencySymbol}{Number(v.price).toFixed(2)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-gray-800">{currencySymbol}{p.price?.toFixed(2) || '0.00'}</span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold ${p.inStock ? 'text-green-600' : 'text-red-500'}`}>
                        {p.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                      {p.stockQuantity !== undefined && p.stockQuantity > 0 && (
                        <span className="ml-1 text-gray-400 text-[10px]">({p.stockQuantity})</span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      {p.discountEnabled && p.discountValue > 0 ? (
                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border border-green-200">
                          {p.discountType === 'percentage' ? `${p.discountValue}% off` : `${currencySymbol}${p.discountValue}`}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[10px]">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      {p.tags && p.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5">
                          {p.tags.map((tag, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-mono border border-gray-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[10px]">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => handleEditClick(p)} className="text-blue-600 hover:text-blue-800 font-bold uppercase text-[9px] tracking-wider">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p._id)} className="text-red-500 hover:text-red-700 font-bold uppercase text-[9px] tracking-wider">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-3 py-6 text-center text-gray-400 font-bold uppercase tracking-wider text-xs">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageProducts;
