// src/pages/DigitalMenu.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const DigitalMenu = () => {
  const { userId, tableId } = useParams();
  const [data, setData] = useState({ products: [], categories: [], table: null });
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [customerName, setCustomerName] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    // Lock the entire app to the mobile screen, preventing native browser bouncing
    document.body.style.backgroundColor = '#000000';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    
    api.get(`/public/menu/${userId}/${tableId}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
      
    return () => { 
      document.body.style.backgroundColor = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
    }
  }, [userId, tableId]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) return prev.map(p => p._id === product._id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === productId);
      if (existing.qty > 1) {
        return prev.map(p => p._id === productId ? { ...p, qty: p.qty - 1 } : p);
      }
      return prev.filter(p => p._id !== productId);
    });
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    
    const items = cart.map(c => ({ product: c._id, name: c.name, qty: c.qty, price: c.price }));
    const subTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    await api.post('/public/order', {
      userId, tableId, customerName, instructions, items, total: subTotal
    });
    
    setOrderPlaced(true);
  };

  if (loading) return <div className="h-[100dvh] flex items-center justify-center bg-black text-zinc-500 text-xs font-bold uppercase tracking-widest">Loading...</div>;
  
  if (orderPlaced) return (
    <div className="h-[100dvh] w-full bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-green-500/20 text-green-400 border border-green-500/50 rounded-full flex items-center justify-center mb-4 text-3xl shadow-lg shadow-green-500/10">✓</div>
      <h1 className="text-xl font-bold mb-2">Order Placed</h1>
      <p className="text-zinc-500 text-xs text-center">Your order has been sent to the kitchen.</p>
    </div>
  );

  const filteredProducts = activeCategory === 'All' ? data.products : data.products.filter(p => p.category?._id === activeCategory);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    // h-[100dvh] forces it to fit the exact mobile screen height, flex-col sets up the top/bottom split
    <div className="h-[100dvh] w-full max-w-md mx-auto bg-[#09090b] text-white flex flex-col font-sans overflow-hidden">
      
      {/* 1. ULTRA COMPACT HEADER (Shrinks to fit) */}
      <div className="bg-black px-4 py-3 border-b border-zinc-800 flex justify-between items-center shrink-0">
        <h1 className="text-sm font-bold tracking-tight">Menu</h1>
        <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
          Table: {data.table?.name || 'Walk-in'}
        </span>
      </div>

      {/* 2. COMPACT CATEGORY SCROLLER */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar px-3 py-2 shrink-0 border-b border-zinc-800/50">
        <button onClick={() => setActiveCategory('All')} className={`shrink-0 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${activeCategory === 'All' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>All</button>
        {data.categories.map(c => (
          <button key={c._id} onClick={() => setActiveCategory(c._id)} className={`shrink-0 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${activeCategory === c._id ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>{c.name}</button>
        ))}
      </div>

      {/* 3. TINY PRODUCT GRID (Takes remaining available space) */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start pb-4 hide-scrollbar">
        {filteredProducts.length === 0 && <p className="text-zinc-600 text-xs col-span-2 text-center py-4">No items.</p>}
        
        {filteredProducts.map(p => (
          <div key={p._id} className="bg-black border border-zinc-800/80 p-3 rounded-xl flex flex-col justify-between hover:border-zinc-700 active:bg-zinc-900 transition-all">
            <div>
              <h3 className="font-bold text-zinc-200 text-[11px] leading-snug line-clamp-2">{p.name}</h3>
              <p className="text-blue-400 font-mono text-[10px] font-bold mt-1">BHD {p.price.toFixed(3)}</p>
            </div>
            <button onClick={() => addToCart(p)} className="mt-3 w-full bg-zinc-900 text-white py-1.5 rounded-lg font-bold text-[10px] border border-zinc-800 hover:bg-blue-600 hover:border-blue-500 transition-all">
              ADD
            </button>
          </div>
        ))}
      </div>

      {/* 4. PINNED COMPACT CART (Only shows if items exist, takes up max 45% of screen) */}
      {cart.length > 0 && (
        <div className="shrink-0 bg-zinc-950 border-t border-zinc-800 flex flex-col max-h-[45dvh] shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          
          {/* Cart Header */}
          <div className="px-4 py-2 border-b border-zinc-800 flex justify-between items-center shrink-0">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Your Order</h2>
            <span className="text-[10px] font-mono text-zinc-500">{cart.length} items</span>
          </div>
          
          {/* Cart Items (Scrollable internally if there are many items) */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 hide-scrollbar">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[11px]">
                <div className="flex-1 pr-2 flex items-center">
                  <span className="text-blue-400 font-bold mr-2">{item.qty}x</span> 
                  <span className="text-zinc-200 line-clamp-1">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-zinc-400">BHD {(item.price * item.qty).toFixed(3)}</span>
                  <button onClick={() => removeFromCart(item._id)} className="w-5 h-5 bg-red-500/10 text-red-500 rounded flex items-center justify-center font-bold pb-0.5 hover:bg-red-500 hover:text-white transition-colors">-</button>
                </div>
              </div>
            ))}
          </div>

          {/* Tiny Inputs & Checkout Button */}
          <div className="p-3 border-t border-zinc-800 shrink-0 bg-black">
            <div className="flex gap-2 mb-3">
              <input type="text" placeholder="Name (Opt)" className="w-1/2 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg outline-none focus:border-blue-500 text-[10px] text-white" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              <input type="text" placeholder="Chef Note (Opt)" className="w-1/2 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg outline-none focus:border-blue-500 text-[10px] text-white" value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>
            
            <button onClick={placeOrder} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold text-[11px] tracking-widest uppercase transition-colors flex justify-between px-4 items-center shadow-lg shadow-blue-500/20">
              <span>PLACE ORDER</span>
              <span className="font-mono bg-black/20 px-2 py-1 rounded">BHD {(cartTotal * 1.1).toFixed(3)}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

export default DigitalMenu;