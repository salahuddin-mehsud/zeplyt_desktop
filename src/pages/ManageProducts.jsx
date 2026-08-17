import { useEffect, useState } from 'react';
import api from '../services/api';

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
    setProducts(prodRes.data);
    setCategories(catRes.data);
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
  });
  setImageError('');
  setEditingId(null);
};

  const handleSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('name', form.name);
  formData.append('price', form.price);
  formData.append('description', form.description);
  formData.append('category', form.category);
  formData.append('discountEnabled', form.discountEnabled);
  formData.append('discountType', form.discountType);
  formData.append('discountValue', form.discountValue);
  formData.append('inStock', form.inStock);
  const qty = form.inStock ? (form.stockQuantity === '' ? 0 : parseInt(form.stockQuantity) || 0) : 0;
  formData.append('stockQuantity', qty);
  formData.append('tags', (form.tags || []).join(','));

  if (form.image) {
    formData.append('image', form.image);
  }

  try {
    const url = editingId ? `/pos/products/${editingId}` : '/pos/products';
    const method = editingId ? 'put' : 'post';
    const response = await api({
      method,
      url,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    resetForm();
    fetchData();
  } catch (err) {
    console.error('Error saving product:', err);
    alert('Failed to save product. Check console for details.');
  }
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

    if (file.type !== 'image/webp') {
      e.target.value = '';
      setImageError('Only WebP product images are accepted. Please convert your image to .webp format before uploading it.');
      return;
    }

    setImageError('');
    setForm({ ...form, image: file, imagePreview: URL.createObjectURL(file) });
  };

  return (
    <div className="w-full min-h-screen bg-white text-gray-800 font-sans p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Add/Edit Form */}
        <div className={`border p-4 rounded-xl mb-5 transition-colors shadow-sm ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <h2 className="text-[10px] font-bold uppercase tracking-wider mb-3 text-gray-500">
            {editingId ? 'Update Product' : 'Add New Product'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Item Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
            />
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 pl-7 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <div className="md:col-span-3 flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/webp,.webp"
                onChange={handleImageChange}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500"
              />
              <span className="text-[10px] text-gray-500">WebP only</span>
              {form.imagePreview && (
                <img src={form.imagePreview} alt="Preview" className="w-8 h-8 object-cover rounded border border-gray-200" />
              )}
            </div>
            {imageError && (
              <p role="alert" className="md:col-span-3 -mt-2 text-xs text-red-600">{imageError}</p>
            )}

<div className="md:col-span-3">
  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Description</label>
  <textarea
    rows="3"
    placeholder="Describe the dish, ingredients, serving style..."
    value={form.description}
    onChange={(e) => setForm({ ...form, description: e.target.value })}
    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
  />
</div>

            {/* Stock Control */}
            <div className="md:col-span-3 flex flex-wrap items-center gap-3 mt-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
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
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
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

            <div className="flex gap-2 md:col-span-3 mt-1">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded-lg text-sm transition-colors">
                {editingId ? 'Update' : 'Add'}
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-500 font-mono uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 font-bold">Image</th>
                  <th className="px-3 py-2 font-bold">Product Name</th>
                  <th className="px-3 py-2 font-bold">Category</th>
                  <th className="px-3 py-2 font-bold">Price ({currency})</th>
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
                        <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover rounded border border-gray-200" />
                      ) : (
                        <span className="text-gray-400 text-[10px]">No img</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800">{p.name}</td>
                    <td className="px-3 py-2 text-gray-600">{p.category?.name || 'Uncategorized'}</td>
                    <td className="px-3 py-2 font-mono font-bold text-gray-800">{currencySymbol} {" "} {p.price?.toFixed(2) || '0.00'}</td>
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
                            <span key={idx} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-mono border border-blue-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
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
