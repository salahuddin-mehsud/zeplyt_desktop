// src/pages/PublicWebsite.jsx
import { useEffect, useState } from 'react';

const PublicWebsite = ({ domainOrId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [activePage, setActivePage] = useState('home');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '' });
  const [orderStatus, setOrderStatus] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/website/public/${domainOrId}`)
      .then(res => res.json())
      .then(resData => { setData(resData); setLoading(false); })
      .catch(() => setLoading(false));
  }, [domainOrId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  if (!data || !data.site) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Website Not Configured.</div>;

  const { site, products: posProducts } = data;
  const theme = site.theme || { background: '#ffffff', headings: '#111827', paragraphs: '#4b5563', buttons: '#3b82f6', navbarBg: '#ffffff', navbarText: '#111827', footerBg: '#111827', footerText: '#ffffff', headingFont: 'Inter', paragraphFont: 'Inter' };
  const nav = site.navbar || { showAbout: true, showContact: true, siteName: 'Restaurant', logoUrl: '' };
  
  const fontUrl = `https://fonts.googleapis.com/css2?family=${theme.headingFont.replace(' ', '+')}:wght@400;700;900&family=${theme.paragraphFont.replace(' ', '+')}:wght@400;500;700&display=swap`;

  const allProducts = [...(site.customProducts || []), ...(posProducts || [])];
  
  // FIX 1: Calculate the total price
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  // FIX 2: Calculate the true number of items (sum of all quantities)
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(p => p.name === product.name);
      
      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingIndex] = { ...newCart[existingIndex], qty: newCart[existingIndex].qty + 1 };
        return newCart;
      } else {
        return [...prevCart, { _id: product._id || Date.now(), name: product.name, price: Number(product.price), qty: 1 }];
      }
    });
  };

  const submitCheckout = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/website/public/order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ domain: domainOrId, customerName: checkoutForm.name, phone: checkoutForm.phone, address: checkoutForm.address, items: cart, total: cartTotal })
      });
      setOrderStatus('SUCCESS');
      setCart([]);
    } catch (err) { alert('Checkout failed. Please try again.'); }
  };

  return (
    <>
      <link href={fontUrl} rel="stylesheet" />
      <div style={{ backgroundColor: theme.background, color: theme.paragraphs, fontFamily: `"${theme.paragraphFont}", sans-serif`, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* CUSTOM NAVBAR */}
        <nav style={{ backgroundColor: theme.navbarBg, borderBottom: `1px solid ${theme.navbarText}20` }} className="fixed w-full top-0 z-40 px-6 py-4 flex justify-between items-center shadow-md">
          <div className="flex items-center cursor-pointer" onClick={() => setActivePage('home')}>
            {nav.logoUrl ? (
              <img src={nav.logoUrl} alt="Logo" className="h-10 object-contain" />
            ) : (
              <h1 style={{ color: theme.navbarText, fontFamily: `"${theme.headingFont}", sans-serif` }} className="text-2xl font-black tracking-tight">{nav.siteName || site.user?.restaurantName}</h1>
            )}
          </div>
          
          <div className="flex items-center gap-8">
            <div className="hidden md:flex gap-6 text-sm font-bold uppercase tracking-widest">
              <button onClick={() => setActivePage('home')} style={{ color: theme.navbarText, opacity: activePage === 'home' ? 1 : 0.8 }}>Menu</button>
              {nav.showAbout && <button onClick={() => setActivePage('about')} style={{ color: theme.navbarText, opacity: activePage === 'about' ? 1 : 0.8 }}>About</button>}
              {nav.showContact && <button onClick={() => setActivePage('contact')} style={{ color: theme.navbarText, opacity: activePage === 'contact' ? 1 : 0.8 }}>Contact</button>}
            </div>
            
            <button onClick={() => setIsCartOpen(true)} style={{ color: theme.navbarText }} className="relative p-2 rounded-full">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              {/* FIX 3: Display cartItemCount instead of cart.length */}
              {cartItemCount > 0 && <span style={{ backgroundColor: theme.buttons, color: '#fff' }} className="absolute -top-1 -right-1 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md">{cartItemCount}</span>}
            </button>
          </div>
        </nav>

        {/* DYNAMIC COMPONENT RENDERER */}
        <main className="flex-1 pt-20">
          
          {/* VIEW 1: HOME & MENU */}
          {activePage === 'home' && (
            <div>
              <div className="relative h-[60vh] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50 z-10"></div>
                {site.hero?.imageUrl && <img src={site.hero.imageUrl} alt="Hero" className="absolute inset-0 w-full h-full object-cover" />}
                <div className="relative z-20 text-center text-white px-4 max-w-4xl">
                  <h1 style={{ fontFamily: `"${theme.headingFont}", sans-serif` }} className="text-5xl md:text-7xl font-black mb-6 drop-shadow-lg">{site.hero?.title}</h1>
                  <p className="text-xl font-medium drop-shadow-md">{site.hero?.subtitle}</p>
                </div>
              </div>

              <div className="py-20 px-6 max-w-6xl mx-auto">
                <h2 style={{ color: theme.headings, fontFamily: `"${theme.headingFont}", sans-serif` }} className="text-4xl font-black tracking-tight mb-12 text-center">Our Menu</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {allProducts.map((p, idx) => (
                    <div key={idx} style={{ borderColor: `${theme.headings}20`, backgroundColor: theme.background }} className="rounded-3xl overflow-hidden shadow-sm border flex flex-col">
                      {p.imageUrl && <div className="h-48 overflow-hidden"><img src={p.imageUrl} className="w-full h-full object-cover" /></div>}
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 style={{ color: theme.headings, fontFamily: `"${theme.headingFont}", sans-serif` }} className="font-bold text-xl pr-4">{p.name}</h3>
                          <span style={{ color: theme.buttons }} className="font-black text-lg">${Number(p.price).toFixed(2)}</span>
                        </div>
                        {p.description && <p className="text-sm mb-6 flex-1 opacity-80">{p.description}</p>}
                        <button onClick={() => addToCart(p)} style={{ backgroundColor: theme.buttons, color: '#ffffff' }} className="w-full font-bold py-3 rounded-xl uppercase tracking-widest text-xs mt-auto">Add to Cart</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: ABOUT PAGE */}
          {activePage === 'about' && nav.showAbout && (
            <div className="py-20 px-6 max-w-5xl mx-auto flex flex-col md:flex-row gap-16 items-center min-h-[70vh]">
              <div className="flex-1 space-y-6">
                <h2 style={{ color: theme.headings, fontFamily: `"${theme.headingFont}", sans-serif` }} className="text-4xl md:text-5xl font-black tracking-tight">{site.about?.title || 'Our Story'}</h2>
                <div style={{ backgroundColor: theme.buttons, width: '60px', height: '6px', borderRadius: '4px' }}></div>
                <p className="text-lg leading-relaxed opacity-90 whitespace-pre-wrap">{site.about?.text}</p>
              </div>
              <div className="flex-1 w-full">
                {site.about?.imageUrl && <img src={site.about.imageUrl} className="w-full h-[400px] md:h-[500px] object-cover rounded-3xl shadow-lg" />}
              </div>
            </div>
          )}

          {/* VIEW 3: CONTACT PAGE */}
          {activePage === 'contact' && nav.showContact && (
            <div className="py-20 px-6 max-w-4xl mx-auto min-h-[70vh]">
              <div className="text-center mb-16">
                <h2 style={{ color: theme.headings, fontFamily: `"${theme.headingFont}", sans-serif` }} className="text-4xl md:text-5xl font-black tracking-tight mb-6">Contact Us</h2>
                <div style={{ backgroundColor: theme.buttons, width: '60px', height: '6px', borderRadius: '4px', margin: '0 auto' }}></div>
              </div>
              
              <div style={{ borderColor: `${theme.headings}20`, backgroundColor: theme.background }} className="grid grid-cols-1 md:grid-cols-2 gap-8 border p-10 rounded-3xl shadow-lg">
                <div>
                  <h3 style={{ color: theme.headings, fontFamily: `"${theme.headingFont}", sans-serif` }} className="text-xl font-bold mb-2">Location</h3>
                  <p className="opacity-80 mb-8">{site.contact?.address}</p>
                  <h3 style={{ color: theme.headings, fontFamily: `"${theme.headingFont}", sans-serif` }} className="text-xl font-bold mb-2">Get in Touch</h3>
                  <p className="opacity-80">{site.contact?.phone}</p>
                  <p className="opacity-80">{site.contact?.email}</p>
                </div>
                <div>
                  <h3 style={{ color: theme.headings, fontFamily: `"${theme.headingFont}", sans-serif` }} className="text-xl font-bold mb-2">Opening Hours</h3>
                  <p className="opacity-80 whitespace-pre-wrap">{site.contact?.hours}</p>
                  <button style={{ backgroundColor: theme.buttons, color: '#ffffff' }} className="mt-10 w-full font-bold py-4 rounded-xl uppercase tracking-widest text-sm shadow-sm">Call Us Now</button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* CUSTOM FOOTER */}
        <footer style={{ backgroundColor: theme.footerBg, color: theme.footerText }} className="py-16 text-center px-6 mt-auto border-t border-white/10">
          <h2 style={{ fontFamily: `"${theme.headingFont}", sans-serif` }} className="text-3xl font-black mb-4">{nav.siteName || site.user?.restaurantName}</h2>
          <p className="text-sm opacity-80 mb-8 max-w-md mx-auto">{site.footer?.contact}</p>
          <p className="text-xs font-bold uppercase tracking-widest opacity-60">{site.footer?.text}</p>
        </footer>

        {/* CART CHECKOUT SLIDER */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
            <div style={{ backgroundColor: theme.background, color: theme.paragraphs }} className="relative w-full max-w-md h-full flex flex-col shadow-2xl">
              
              <div style={{ borderColor: `${theme.headings}20` }} className="p-6 border-b flex justify-between items-center">
                <h2 style={{ color: theme.headings, fontFamily: `"${theme.headingFont}", sans-serif` }} className="text-2xl font-black">Your Order</h2>
                <button onClick={() => setIsCartOpen(false)} style={{ color: theme.headings }} className="font-bold text-2xl opacity-80">✕</button>
              </div>

              {orderStatus === 'SUCCESS' ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div style={{ color: theme.buttons, backgroundColor: `${theme.buttons}20` }} className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-6">✓</div>
                  <h3 style={{ color: theme.headings, fontFamily: `"${theme.headingFont}", sans-serif` }} className="text-2xl font-black mb-2">Order Received!</h3>
                  <p className="opacity-80">Your order is being sent to our kitchen. You will pay with Cash on Delivery.</p>
                  <button onClick={() => { setOrderStatus(null); setIsCartOpen(false); }} style={{ backgroundColor: theme.buttons, color: '#ffffff' }} className="mt-8 px-8 py-3 rounded-full font-bold uppercase tracking-widest text-sm">Close</button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.length === 0 ? <p className="text-center pt-10 font-bold uppercase tracking-widest opacity-50">Cart is empty</p> :
                      cart.map((item, idx) => (
                        <div key={idx} style={{ borderColor: `${theme.headings}10` }} className="flex justify-between items-center border-b pb-4">
                          <div>
                            <p style={{ color: theme.headings }} className="font-bold">{item.name}</p>
                            <p className="text-sm opacity-70">Qty: {item.qty}</p>
                          </div>
                          <p style={{ color: theme.headings }} className="font-black">${(item.price * item.qty).toFixed(2)}</p>
                        </div>
                      ))
                    }
                  </div>

                  {cart.length > 0 && (
                    <form onSubmit={submitCheckout} style={{ borderColor: `${theme.headings}20` }} className="p-6 border-t space-y-4 bg-black/5">
                      <h3 style={{ color: theme.headings, fontFamily: `"${theme.headingFont}", sans-serif` }} className="font-bold uppercase tracking-widest text-xs mb-4">Delivery Details (COD)</h3>
                      <input type="text" placeholder="Full Name" required value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} style={{ backgroundColor: theme.background, color: theme.paragraphs, borderColor: `${theme.headings}20` }} className="w-full px-4 py-3 rounded-lg border outline-none" />
                      <input type="tel" placeholder="Phone Number" required value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} style={{ backgroundColor: theme.background, color: theme.paragraphs, borderColor: `${theme.headings}20` }} className="w-full px-4 py-3 rounded-lg border outline-none" />
                      <textarea placeholder="Delivery Address" required rows="2" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} style={{ backgroundColor: theme.background, color: theme.paragraphs, borderColor: `${theme.headings}20` }} className="w-full px-4 py-3 rounded-lg border outline-none resize-none"></textarea>
                      
                      <div style={{ borderColor: `${theme.headings}20` }} className="pt-4 mt-4 border-t">
                        <div className="flex justify-between text-sm mb-2 opacity-80"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm mb-4 opacity-80"><span>Tax</span><span>${(cartTotal * 0.1).toFixed(2)}</span></div>
                        <div style={{ color: theme.headings }} className="flex justify-between text-2xl font-black mb-6"><span>Total</span><span>${(cartTotal * 1.1).toFixed(2)}</span></div>
                        <button type="submit" style={{ backgroundColor: theme.buttons, color: '#ffffff' }} className="w-full font-bold py-4 rounded-xl uppercase tracking-widest text-sm">Place COD Order</button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
};
export default PublicWebsite;