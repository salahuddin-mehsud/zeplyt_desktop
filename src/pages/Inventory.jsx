// src/pages/Inventory.jsx
import { useEffect, useState } from 'react';
import api from '../services/api';
import useCurrency from '../hooks/useCurrency';

const Inventory = () => {
  const { currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState('STOCK'); 
  
  // Stock State
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', category: '', quantity: '', unit: 'kg', unitCost: '', minStockLevel: '5', logAsExpense: true });
  
  // 🚨 UPDATED Recipe State
  const [recipes, setRecipes] = useState([]);
  const [posProducts, setPosProducts] = useState([]);
  const [recipeForm, setRecipeForm] = useState({ 
    name: '', 
    type: 'Batch',
    linkedProduct: '', 
    ingredients: [{ inventoryItem: '', quantityUsed: '' }] 
  });
  const [editingRecipeId, setEditingRecipeId] = useState(null); 
  
  // Batch Tracking State
  const [batchesCooked, setBatchesCooked] = useState(0);
  const [batchLogs, setBatchLogs] = useState([]); 
  const [batchRange, setBatchRange] = useState('today');

  // Data Fetching
  const fetchInventory = () => api.get('/business/inventory').then(res => setItems(res.data)).catch(console.error);
  const fetchRecipes = () => api.get('/business/recipes').then(res => setRecipes(res.data)).catch(console.error);
  const fetchProducts = () => api.get('/pos/products').then(res => setPosProducts(res.data)).catch(console.error);
  
  const fetchBatchLogs = () => {
    api.get(`/business/recipes/logs?range=${batchRange}`)
       .then(res => {
         setBatchesCooked(res.data.count);
         setBatchLogs(res.data.logs);
       })
       .catch(console.error);
  };
  
  useEffect(() => { 
    fetchInventory(); 
    fetchRecipes();
    fetchProducts();
  }, []);

  useEffect(() => { fetchBatchLogs(); }, [batchRange]);

  // --- STOCK HANDLERS ---
  const handleAddItem = async (e) => {
    e.preventDefault();
    await api.post('/business/inventory', form);
    setForm({ name: '', category: '', quantity: '', unit: 'kg', unitCost: '', minStockLevel: '5', logAsExpense: true });
    fetchInventory();
  };

  const handleRestock = async (id, currentCost) => {
    const qty = prompt("Enter quantity to add:");
    if (!qty) return;
    await api.put(`/business/inventory/${id}/restock`, { qtyToAdd: qty, newUnitCost: currentCost });
    fetchInventory();
  };

  // --- RECIPE HANDLERS ---
  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...recipeForm.ingredients];
    newIngredients[index][field] = value;
    setRecipeForm({ ...recipeForm, ingredients: newIngredients });
  };

  const addIngredientRow = () => {
    setRecipeForm({ ...recipeForm, ingredients: [...recipeForm.ingredients, { inventoryItem: '', quantityUsed: '' }] });
  };

  const removeIngredientRow = (index) => {
    const newIngredients = recipeForm.ingredients.filter((_, i) => i !== index);
    setRecipeForm({ ...recipeForm, ingredients: newIngredients });
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (recipeForm.type === 'A la Carte' && !recipeForm.linkedProduct) {
      return alert("You must link a POS Product to an A la Carte recipe.");
    }
    try {
      if (editingRecipeId) {
        await api.put(`/business/recipes/${editingRecipeId}`, recipeForm);
      } else {
        await api.post('/business/recipes', recipeForm);
      }
      setRecipeForm({ name: '', type: 'Batch', linkedProduct: '', ingredients: [{ inventoryItem: '', quantityUsed: '' }] });
      setEditingRecipeId(null);
      fetchRecipes();
    } catch (err) { alert("Error saving recipe."); }
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipeId(recipe._id);
    const formattedIngredients = recipe.ingredients.map(ing => ({
      inventoryItem: ing.inventoryItem?._id || '',
      quantityUsed: ing.quantityUsed
    }));
    setRecipeForm({
      name: recipe.name,
      type: recipe.type || 'Batch',
      linkedProduct: recipe.linkedProduct || '',
      ingredients: formattedIngredients.length > 0 ? formattedIngredients : [{ inventoryItem: '', quantityUsed: '' }]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveTab('RECIPES');
  };

  const handleCancelEdit = () => {
    setEditingRecipeId(null);
    setRecipeForm({ name: '', type: 'Batch', linkedProduct: '', ingredients: [{ inventoryItem: '', quantityUsed: '' }] });
  };

  const handleCookBatch = async (id, name) => {
    if(!window.confirm(`Are you sure you want to prepare a batch of ${name}? This will permanently deduct the raw materials from the warehouse.`)) return;
    try {
      await api.post(`/business/recipes/${id}/cook`);
      alert("Batch prepared! Stock successfully deducted.");
      fetchInventory(); 
      fetchRecipes(); 
      fetchBatchLogs(); 
    } catch (err) {
      alert(err.response?.data?.message || "Failed to prepare batch.");
    }
  };

  const handleDeleteRecipe = async (id) => {
    if(!window.confirm("Delete this recipe?")) return;
    await api.delete(`/business/recipes/${id}`);
    fetchRecipes();
    if (editingRecipeId === id) handleCancelEdit();
  };

  const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
  const lowStockCount = items.filter(i => i.quantity <= i.minStockLevel).length;

  return (
    <div className="p-4 md:p-6 text-gray-800 font-sans max-w-[1600px] mx-auto min-h-screen bg-gray-50">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-4 mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-4 text-gray-800">Central Warehouse</h1>
          <div className="flex gap-4 text-xs font-bold text-gray-500 overflow-x-auto hide-scrollbar pb-1">
            <button onClick={() => setActiveTab('STOCK')} className={`shrink-0 pb-2 uppercase transition-colors ${activeTab === 'STOCK' ? 'text-gray-900 border-b-2 border-blue-500' : 'hover:text-gray-700'}`}>Raw Materials</button>
            <button onClick={() => setActiveTab('RECIPES')} className={`shrink-0 pb-2 uppercase transition-colors ${activeTab === 'RECIPES' ? 'text-gray-900 border-b-2 border-blue-500' : 'hover:text-gray-700'}`}>Menu Recipes & Cooking</button>
            <button onClick={() => setActiveTab('HISTORY')} className={`shrink-0 pb-2 uppercase transition-colors ${activeTab === 'HISTORY' ? 'text-gray-900 border-b-2 border-emerald-500' : 'hover:text-gray-700'}`}>Production History</button>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 p-4 rounded-xl">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0.5">Total Asset Value</p>
          <p className="text-2xl font-mono font-bold text-green-600">{currencySymbol} {totalValue.toFixed(3)}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-0.5">Items Tracked</p>
          <p className="text-2xl font-bold text-gray-800">{items.length}</p>
        </div>
        <div className={`border p-4 rounded-xl ${lowStockCount > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
          <p className={`text-[10px] uppercase font-bold tracking-widest mb-0.5 ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>Critical Low Stock</p>
          <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>{lowStockCount} Items</p>
        </div>
        
        <div className="bg-white border border-blue-200 p-4 rounded-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-0.5 relative z-10">
            <p className="text-[10px] text-blue-600 uppercase font-bold tracking-widest">Manual Batches</p>
            <select 
              value={batchRange} 
              onChange={(e) => setBatchRange(e.target.value)}
              className="bg-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-600 border border-gray-300 rounded px-2 py-0.5 outline-none cursor-pointer focus:border-blue-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <p className="text-2xl font-bold text-blue-600 relative z-10">{batchesCooked}</p>
        </div>
      </div>

      {/* --- TAB 1: RAW MATERIALS --- */}
      {activeTab === 'STOCK' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white border border-gray-200 p-4 rounded-2xl h-fit">
            <h2 className="text-xs uppercase tracking-widest font-bold mb-4 text-gray-500 border-b border-gray-200 pb-1">Register New Stock Item</h2>
            <form onSubmit={handleAddItem} className="space-y-3">
              <input type="text" placeholder="Item Name (e.g., Basmati Rice)" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" />
              <input type="text" placeholder="Category (e.g., Meat, Veg, Packaging)" required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" />
              <div className="flex gap-2">
                <input type="number" placeholder="Initial Qty" required value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-2/3 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" />
                <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-1/3 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm">
                  <option value="kg">kg</option><option value="L">Liters</option><option value="pcs">Pieces</option><option value="boxes">Boxes</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input type="number" step="0.001" placeholder={`Cost per Unit (${currencySymbol})`} required value={form.unitCost} onChange={e => setForm({...form, unitCost: e.target.value})} className="w-1/2 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" />
                <input type="number" placeholder="Alert at Min Qty" required value={form.minStockLevel} onChange={e => setForm({...form, minStockLevel: e.target.value})} className="w-1/2 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                <input type="checkbox" checked={form.logAsExpense} onChange={e => setForm({...form, logAsExpense: e.target.checked})} className="accent-blue-600" />
                Log initial cost directly to Financial Expenses (COGS)
              </label>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs tracking-widest uppercase transition-colors mt-2">Save to Ledger</button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden h-fit">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 font-mono text-[10px] uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-bold">Item Name</th>
                    <th className="px-4 py-3 font-bold">Category</th>
                    <th className="px-4 py-3 font-bold text-right">In Stock</th>
                    <th className="px-4 py-3 font-bold text-right">Unit Value</th>
                    <th className="px-4 py-3 font-bold text-right">Total Value</th>
                    <th className="px-4 py-3 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-gray-400 uppercase tracking-widest font-bold">Warehouse is empty.</td></tr>}
                  {items.map(item => {
                    const isLow = item.quantity <= item.minStockLevel;
                    return (
                      <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-800 flex items-center gap-2">
                          {isLow && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.category}</td>
                        <td className={`px-4 py-3 font-mono font-bold text-right ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                          {item.quantity} <span className="text-[10px] text-gray-400 ml-1">{item.unit}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600 text-right">{currencySymbol} {item.unitCost.toFixed(3)}</td>
                        <td className="px-4 py-3 font-mono text-green-600 font-bold text-right">{currencySymbol} {(item.quantity * item.unitCost).toFixed(3)}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleRestock(item._id, item.unitCost)} className="bg-gray-200 hover:bg-blue-600 text-gray-700 hover:text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded transition-colors">
                            Restock
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: RECIPES & BATCH COOKING --- */}
      {activeTab === 'RECIPES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 bg-white border border-gray-200 p-4 rounded-2xl h-fit transition-all duration-300">
            <div className="flex justify-between items-center border-b border-gray-200 pb-1 mb-4">
              <h2 className={`text-xs uppercase tracking-widest font-bold ${editingRecipeId ? 'text-blue-600' : 'text-gray-500'}`}>
                {editingRecipeId ? '✏️ Edit Recipe' : 'Create New Recipe'}
              </h2>
              {editingRecipeId && (
                <button onClick={handleCancelEdit} className="text-xs text-gray-500 hover:text-gray-800 uppercase tracking-widest font-bold">Cancel</button>
              )}
            </div>

            <form onSubmit={handleSaveRecipe} className="space-y-4">
              
              {/* Recipe Type Selection */}
              <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setRecipeForm({...recipeForm, type: 'Batch'})} 
                  className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${recipeForm.type === 'Batch' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Mass Batch
                </button>
                <button 
                  type="button" 
                  onClick={() => setRecipeForm({...recipeForm, type: 'A la Carte'})} 
                  className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${recipeForm.type === 'A la Carte' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Per Order (A la Carte)
                </button>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 block">Recipe Name</label>
                <input type="text" placeholder={recipeForm.type === 'Batch' ? "e.g. Bulk Beef Pulao (120kg)" : "e.g. Half Chicken Karahi"} required value={recipeForm.name} onChange={e => setRecipeForm({...recipeForm, name: e.target.value})} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm" />
              </div>

              {/* POS Link for A la Carte */}
              {recipeForm.type === 'A la Carte' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-1 block">Link to POS Menu Item</label>
                  <select required value={recipeForm.linkedProduct} onChange={e => setRecipeForm({...recipeForm, linkedProduct: e.target.value})} className="w-full bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 outline-none focus:border-amber-500 text-sm">
                    <option value="">-- Select POS Product --</option>
                    {posProducts.map(p => <option key={p._id} value={p._id}>{p.name} ({currencySymbol} {p.price})</option>)}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1 font-mono">When a customer orders this, ingredients will auto-deduct.</p>
                </div>
              )}

              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 block">Ingredients Required</label>
                {recipeForm.ingredients.map((ing, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                    <select required value={ing.inventoryItem} onChange={(e) => handleIngredientChange(index, 'inventoryItem', e.target.value)} className="w-1/2 bg-transparent text-gray-800 outline-none text-sm px-1">
                      <option value="" className="text-gray-400">Select Item...</option>
                      {items.map(i => <option key={i._id} value={i._id}>{i.name} (in {i.unit})</option>)}
                    </select>
                    <input type="number" step="0.001" required placeholder="Qty Used" value={ing.quantityUsed} onChange={(e) => handleIngredientChange(index, 'quantityUsed', e.target.value)} className="w-1/3 bg-white border border-gray-300 rounded p-1 text-gray-800 text-sm outline-none focus:border-blue-500" />
                    {index > 0 && (
                      <button type="button" onClick={() => removeIngredientRow(index)} className="text-red-500 hover:text-red-700 font-bold px-1">✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addIngredientRow} className="text-xs text-blue-600 font-bold uppercase tracking-widest hover:text-blue-800 mt-1">+ Add Another Ingredient</button>
              </div>

              <button type="submit" className={`w-full text-white font-bold py-2 rounded-lg text-xs tracking-widest uppercase transition-colors mt-2 ${editingRecipeId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                {editingRecipeId ? 'Update Recipe' : 'Save Recipe'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
            {recipes.length === 0 && <div className="col-span-full text-center py-8 text-gray-400 uppercase tracking-widest font-bold bg-white border border-gray-200 rounded-2xl">No recipes built yet.</div>}
            
            {recipes.map(recipe => (
              <div key={recipe._id} className={`bg-white border p-4 rounded-2xl relative group flex flex-col justify-between transition-colors ${editingRecipeId === recipe._id ? 'border-blue-400' : 'border-gray-200'}`}>
                
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditRecipe(recipe)} className="text-gray-400 hover:text-blue-600" title="Edit">✏️</button>
                  <button onClick={() => handleDeleteRecipe(recipe._id)} className="text-gray-400 hover:text-red-600" title="Delete">✕</button>
                </div>
                
                <div>
                  <div className="flex justify-between items-start mb-2 pr-12">
                    <h3 className="text-base font-bold text-gray-800 leading-tight">{recipe.name}</h3>
                  </div>
                  
                  {/* Badge */}
                  <div className="mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${recipe.type === 'A la Carte' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                      {recipe.type === 'A la Carte' ? 'Automated / Per Order' : 'Manual Batch'}
                    </span>
                    {recipe.type === 'A la Carte' && <p className="text-[10px] text-gray-500 font-mono mt-1">Deducts automatically on POS checkout.</p>}
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {recipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex justify-between text-sm border-b border-gray-100 pb-0.5">
                        <span className="text-gray-600">{ing.inventoryItem?.name || 'Deleted Item'}</span>
                        <span className="font-mono text-blue-600 font-bold">{ing.quantityUsed} {ing.inventoryItem?.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Only show "Cook Batch" button for Batch recipes! */}
                {recipe.type !== 'A la Carte' && (
                  <button 
                    onClick={() => handleCookBatch(recipe._id, recipe.name)}
                    className="w-full bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 font-bold py-2 rounded-lg text-[10px] tracking-widest uppercase transition-all mt-2"
                  >
                    Cook Batch & Deduct Stock
                  </button>
                )}
              </div>
            ))}
          </div>

        </div>
      )}

      {/* --- TAB 3: PRODUCTION HISTORY --- */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Kitchen Production Log</h3>
            <span className="text-[10px] text-gray-500 font-mono">Filters based on the "Manual Batches" dropdown</span>
          </div>
          <table className="w-full text-left text-sm font-medium">
            <thead className="bg-gray-100 text-gray-600 font-mono text-[10px] uppercase border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Recipe Prepared</th>
                <th className="px-4 py-3 text-right">System Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batchLogs.length === 0 && (
                <tr><td colSpan="3" className="text-center py-8 text-gray-400 uppercase tracking-widest font-bold">No manual batches cooked in this timeframe.</td></tr>
              )}
              {batchLogs.map(log => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-600 text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-800">
                    <span className="bg-emerald-100 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded mr-2 text-[10px] uppercase tracking-widest">Batch</span>
                    {log.recipeName}
                  </td>
                  <td className="px-4 py-3 text-emerald-600 font-bold text-[10px] uppercase tracking-widest text-right">
                    Stock Deducted ✓
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
export default Inventory;
