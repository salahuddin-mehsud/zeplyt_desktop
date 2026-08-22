// src/pages/DigitalMenu.jsx
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { currencySymbolFor } from '../hooks/useCurrency';

const DigitalMenu = () => {
  const { userId, tableId } = useParams();
  const effectiveTableId = tableId || userId;
  
  const [data, setData] = useState({ 
    products: [], 
    categories: [], 
    table: null, 
    branch: null, 
    currency: 'USD',
    taxes: [],
    charges: [],
    taxRate: 0 
  });
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [instructions, setInstructions] = useState('');

  const currencySymbol = currencySymbolFor(data.currency || 'USD');

  const fetchMenu = () => {
    setLoading(true);
    setErrorMsg('');
    const endpoint = userId && tableId ? `/public/menu/${userId}/${tableId}` : `/public/menu/${effectiveTableId}`;
    
    api.get(endpoint)
      .then(res => {
        setData({
          products: res.data.products || [],
          categories: res.data.categories || [],
          table: res.data.table || null,
          branch: res.data.branch || null,
          currency: res.data.currency || 'USD',
          taxes: res.data.taxes || [],
          charges: res.data.charges || [],
          taxRate: res.data.taxRate || 0
        });
      })
      .catch(err => {
        console.error('Failed to load digital menu:', err);
        setErrorMsg(err.response?.data?.message || 'Could not load menu. Please scan the QR code again or contact staff.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMenu();
  }, [userId, tableId, effectiveTableId]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        return prev.map(p => p._id === product._id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === productId);
      if (!existing) return prev;
      const newQty = existing.qty + delta;
      if (newQty <= 0) {
        return prev.filter(p => p._id !== productId);
      }
      return prev.map(p => p._id === productId ? { ...p, qty: newQty } : p);
    });
  };

  const getProductQtyInCart = (productId) => {
    const item = cart.find(c => c._id === productId);
    return item ? item.qty : 0;
  };

  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * item.qty), 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const placeOrder = async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const items = cart.map(c => ({
        product: c._id,
        name: c.name,
        qty: c.qty,
        price: Number(c.price) || 0
      }));

      const res = await api.post('/public/order', {
        userId: userId || data.table?.ownerId,
        tableId: effectiveTableId,
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim(),
        instructions: instructions.trim(),
        items
      });

      setOrderPlaced(res.data);
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.error('Order placement failed:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to place order. Please try again or alert a waiter.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products by category and search query
  const filteredProducts = useMemo(() => {
    return (data.products || []).filter(p => {
      const categoryMatch = activeCategory === 'All' || 
        (p.category && (p.category._id === activeCategory || p.category === activeCategory));
      
      const searchMatch = !searchQuery.trim() || 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

      return categoryMatch && searchMatch;
    });
  }, [data.products, activeCategory, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Loading Live Menu...</p>
      </div>
    );
  }

  if (errorMsg && !data.table && !orderPlaced) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 bg-red-500/10 text-red-400 border border-red-500/30 rounded-2xl flex items-center justify-center mb-4 text-2xl">⚠️</div>
        <h1 className="text-lg font-bold mb-2">Unable to Load Menu</h1>
        <p className="text-zinc-400 text-xs max-w-xs mb-6">{errorMsg}</p>
        <button 
          onClick={fetchMenu}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen w-full bg-[#09090b] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4 text-3xl shadow-lg shadow-emerald-500/10">
            ✓
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-2">
            Order Sent to Kitchen
          </span>
          <h1 className="text-2xl font-black mb-1">Token #{orderPlaced.tokenNo}</h1>
          <p className="text-zinc-400 text-xs mb-6">
            Table: <span className="text-white font-bold">{data.table?.name || 'Walk-in'}</span> • Order #{orderPlaced.orderNo}
          </p>

          <div className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-left mb-6 space-y-2 max-h-48 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 pb-1 mb-2">Ordered Items</p>
            {orderPlaced.items?.map((it, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-zinc-300"><span className="text-blue-400 font-bold mr-1.5">{it.qty}x</span> {it.name}</span>
                <span className="text-zinc-400 font-mono">{currencySymbol} {(Number(it.price) * it.qty).toFixed(3)}</span>
              </div>
            ))}
            <div className="border-t border-zinc-800 pt-2 mt-2 flex justify-between font-bold text-xs text-white">
              <span>Total Amount</span>
              <span className="text-blue-400 font-mono">{currencySymbol} {Number(orderPlaced.finalAmount || orderPlaced.subTotal || 0).toFixed(3)}</span>
            </div>
          </div>

          <button 
            onClick={() => setOrderPlaced(null)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20"
          >
            Order More Items
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-white flex flex-col font-sans select-none pb-28">
      
      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-30 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              <span>{data.branch?.name || 'Digital Menu'}</span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">
              {data.table?.area?.name ? `${data.table.area.name} • ` : ''}Table <span className="text-blue-400 font-bold">{data.table?.name || 'Dine In'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Ordering
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mt-2.5">
          <div className="relative">
            <input 
              type="text"
              placeholder="Search dishes, drinks, ingredients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-zinc-500 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 2. CATEGORY HORIZONTAL SCROLLER */}
        <div className="max-w-xl mx-auto flex gap-2 overflow-x-auto py-2.5 hide-scrollbar -mx-1 px-1">
          <button 
            onClick={() => setActiveCategory('All')} 
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCategory === 'All' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            All Items ({data.products.length})
          </button>
          {data.categories.map(c => {
            const count = data.products.filter(p => p.category && (p.category._id === c._id || p.category === c._id)).length;
            return (
              <button 
                key={c._id} 
                onClick={() => setActiveCategory(c._id)} 
                className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === c._id 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {c.name} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </header>

      {/* Error banner if order failed */}
      {errorMsg && (
        <div className="max-w-xl mx-auto w-full px-4 pt-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs flex justify-between items-center">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="font-bold text-sm ml-2">✕</button>
          </div>
        </div>
      )}

      {/* 3. PRODUCT LIST / GRID */}
      <main className="max-w-xl mx-auto w-full px-4 pt-4 flex-1">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-zinc-950/60 rounded-2xl border border-dashed border-zinc-800/80 my-4">
            <p className="text-zinc-500 text-sm">No items found in this section.</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-blue-400 text-xs font-bold mt-2">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredProducts.map(p => {
              const qtyInCart = getProductQtyInCart(p._id);
              const priceNum = Number(p.price) || 0;

              return (
                <div 
                  key={p._id} 
                  className="bg-zinc-950/90 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-3.5 flex flex-col justify-between transition-all group"
                >
                  <div className="flex gap-3">
                    {/* Product Image if available */}
                    {p.imageUrl ? (
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        className="w-20 h-20 rounded-xl object-cover bg-zinc-900 shrink-0 border border-zinc-800"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-zinc-900 shrink-0 border border-zinc-800/60 flex items-center justify-center text-zinc-700 text-2xl">
                        🍽️
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-bold text-zinc-100 text-sm leading-snug line-clamp-1 group-hover:text-white">
                          {p.name}
                        </h3>
                      </div>
                      
                      {p.description && (
                        <p className="text-zinc-400 text-[11px] line-clamp-2 mt-0.5 leading-relaxed">
                          {p.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {p.prepTime ? (
                          <span className="text-[10px] text-zinc-500 font-medium">⏱️ {p.prepTime} min</span>
                        ) : null}
                        {p.discountEnabled && p.discountValue > 0 && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {p.discountType === 'percentage' ? `${p.discountValue}% OFF` : `SAVE ${p.discountValue}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Price and Add / Qty Control */}
                  <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center justify-between">
                    <div>
                      <span className="text-blue-400 font-mono font-bold text-sm">
                        {currencySymbol} {priceNum.toFixed(3)}
                      </span>
                    </div>

                    <div>
                      {qtyInCart > 0 ? (
                        <div className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/30 rounded-xl p-1">
                          <button 
                            onClick={() => updateQty(p._id, -1)}
                            className="w-7 h-7 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg flex items-center justify-center font-bold text-sm transition-colors"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs text-blue-400 px-1 font-mono min-w-4 text-center">
                            {qtyInCart}
                          </span>
                          <button 
                            onClick={() => updateQty(p._id, 1)}
                            className="w-7 h-7 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm transition-colors"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(p)}
                          className="bg-zinc-900 hover:bg-blue-600 text-zinc-200 hover:text-white px-4 py-1.5 rounded-xl font-bold text-xs border border-zinc-800 hover:border-blue-500 transition-all shadow-sm flex items-center gap-1"
                        >
                          <span>+ ADD</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. FLOATING BOTTOM CART BAR */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-4 px-4">
          <div className="max-w-xl mx-auto">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3">
              
              <div 
                className="flex items-center gap-3 cursor-pointer pl-1"
                onClick={() => setIsCartOpen(!isCartOpen)}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-600/30">
                  {totalItemsCount}
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Order Total</div>
                  <div className="font-mono text-sm font-bold text-white">
                    {currencySymbol} {subTotal.toFixed(3)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setIsCartOpen(!isCartOpen)}
                  className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-colors"
                >
                  {isCartOpen ? 'Hide' : 'Review'}
                </button>

                <button 
                  onClick={placeOrder}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Place Order →</span>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 5. EXPANDABLE CART DRAWER MODAL */}
      {isCartOpen && cart.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end p-0 sm:p-4">
          <div className="w-full max-w-xl mx-auto bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-white">Review Your Table Order</h2>
                <p className="text-xs text-zinc-400">Table: <span className="text-white font-bold">{data.table?.name || 'Walk-in'}</span></p>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 divide-y divide-zinc-900">
              {cart.map(item => (
                <div key={item._id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-zinc-200 line-clamp-1">{item.name}</h4>
                    <span className="text-[11px] font-mono text-zinc-400">{currencySymbol} {Number(item.price).toFixed(3)} each</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                      <button 
                        onClick={() => updateQty(item._id, -1)}
                        className="w-6 h-6 rounded bg-zinc-800 text-white font-bold text-xs flex items-center justify-center hover:bg-zinc-700"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold px-1 text-white">{item.qty}</span>
                      <button 
                        onClick={() => updateQty(item._id, 1)}
                        className="w-6 h-6 rounded bg-blue-600 text-white font-bold text-xs flex items-center justify-center hover:bg-blue-500"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-mono text-xs font-bold text-blue-400 min-w-16 text-right">
                      {currencySymbol} {(Number(item.price) * item.qty).toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Optional Customer Inputs */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder="Your Name (Optional)" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
                <input 
                  type="tel" 
                  placeholder="Phone (Optional)" 
                  value={customerMobile}
                  onChange={e => setCustomerMobile(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>
              <input 
                type="text" 
                placeholder="Special notes / allergies for Chef (Optional)..." 
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              />
            </div>

            {/* Summary & Checkout */}
            <div className="pt-3 mt-2 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Subtotal</span>
                <span className="font-mono text-base font-bold text-white">{currencySymbol} {subTotal.toFixed(3)}</span>
              </div>

              <button 
                onClick={placeOrder}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                {submitting ? 'Placing Order...' : 'Confirm & Place Order →'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DigitalMenu;
