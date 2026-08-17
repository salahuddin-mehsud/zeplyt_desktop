import { useState, useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import useCurrency from '../hooks/useCurrency';

const PaymentModal = ({ isOpen, onClose, orderData, paymentMethods, onProcessPayment }) => {
  const { currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState('FINAL BILL');
  
  // Discount State
  const [discountMode, setDiscountMode] = useState('Order Level');
  const [discountType, setDiscountType] = useState('%');
  const [discountValue, setDiscountValue] = useState('');

  // Billing State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [cashGiven, setCashGiven] = useState('');
  const [printInvoice, setPrintInvoice] = useState(true);

  useEffect(() => {
    if (isOpen && orderData) {
      setActiveTab('FINAL BILL');
      setDiscountType('%');
      setDiscountValue('');
      setPaymentMode(paymentMethods.length > 0 ? paymentMethods[0] : 'CASH');
      setCashGiven('');
      setCustomerName(orderData.customerName || '');
      setCustomerMobile(orderData.customerMobile || '');
    }
  }, [isOpen, orderData?.orderNo]); 

  if (!isOpen || !orderData) return null;

  const subTotal = orderData.subTotal || 0;
  const taxBreakdown = orderData.taxBreakdown || [];
  const chargeBreakdown = orderData.chargeBreakdown || [];
  const exclusiveTaxAmount = taxBreakdown.length > 0
    ? taxBreakdown.filter(t => t.itemPricing === 'Exclusive').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    : (orderData.taxAmount || 0);
  const exclusiveChargeAmount = chargeBreakdown
    ? chargeBreakdown.filter(c => c.itemPricing === 'Exclusive').reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
    : 0;
  const shippingCost = orderData.shippingCost || 0;
  const baseFinalAmount = subTotal + exclusiveTaxAmount + exclusiveChargeAmount + shippingCost;

  let discountAmount = 0;
  const val = parseFloat(discountValue) || 0;
  
  if (discountType === '%') discountAmount = (subTotal * val) / 100;
  else if (discountType === 'Amt') discountAmount = val;
  else if (discountType === 'Complimentary' || discountType === 'Non Chargeable') discountAmount = baseFinalAmount;

  const finalAmount = Math.max(baseFinalAmount - discountAmount, 0);
  
  const parsedCash = parseFloat(cashGiven) || 0;
  const toBePaidBack = Math.max(parsedCash - finalAmount, 0);

  const handleProcess = () => {
    onProcessPayment({
      finalAmount,
      discountAmount,
      paymentMode,
      customerName,
      customerMobile,
      cashGiven: paymentMode === 'CASH' ? parsedCash : finalAmount,
      printInvoice
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-white border border-gray-200 text-gray-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-sm font-bold">Payment Details</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono mt-0">Order No: {orderData.orderNo || 'NEW'}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
              DUE: {currencySymbol} {finalAmount.toFixed(3)}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><IoClose size={20} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-3 border-b border-gray-200 text-[10px] font-bold text-gray-500 pt-2 bg-gray-50/50">
          <button onClick={() => setActiveTab('DISCOUNT')} className={`pb-1.5 px-3 uppercase tracking-widest transition-colors ${activeTab === 'DISCOUNT' ? 'text-gray-900 border-b-2 border-blue-500' : 'hover:text-gray-700'}`}>
            DISCOUNT
          </button>
          <button onClick={() => setActiveTab('FINAL BILL')} className={`pb-1.5 px-3 uppercase tracking-widest transition-colors ${activeTab === 'FINAL BILL' ? 'text-gray-900 border-b-2 border-blue-500' : 'hover:text-gray-700'}`}>
            FINAL BILL
          </button>
        </div>

        {/* Content */}
        <div className="p-3 overflow-y-auto custom-scrollbar flex-1">
          
          {activeTab === 'DISCOUNT' && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold mb-3">Order Discount</h3>
              
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="radio" autoFocus checked={discountMode === 'Order Level'} onChange={() => setDiscountMode('Order Level')} className="accent-blue-500" />Order Level</label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="radio" checked={discountMode === 'Coupon'} onChange={() => setDiscountMode('Coupon')} className="accent-blue-500" />Coupon</label>
              </div>

              <div className="flex flex-wrap gap-3 mb-3">
                <span className="text-xs text-gray-400 w-16 pt-0.5">Type:</span>
                {['%', 'Amt', 'Complimentary', 'Non Chargeable'].map(type => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input type="radio" checked={discountType === type} onChange={() => setDiscountType(type)} className="accent-blue-500" />{type}
                  </label>
                ))}
              </div>

              {discountType !== 'Complimentary' && discountType !== 'Non Chargeable' && (
                <div className="flex gap-3 items-center">
                  <span className="text-xs text-gray-400 w-16">Value:</span>
                  <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={`Enter ${discountType === '%' ? 'Percentage' : 'Amount'}`} className="bg-white border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-sm font-mono w-full max-w-xs" />
                </div>
              )}
              
              {discountAmount > 0 && (
                <div className="mt-3 bg-green-50 border border-green-200 text-green-700 p-1.5 rounded-lg text-xs font-mono text-center">
                  Discount Applied: {currencySymbol} {discountAmount.toFixed(3)}
                </div>
              )}
            </div>
          )}

          {activeTab === 'FINAL BILL' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-sm" />
                <input type="text" placeholder="Customer Mobile" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">SUB TOTAL:</span><span className="font-mono">{currencySymbol} {subTotal.toFixed(3)}</span></div>
                  {taxBreakdown.length > 0 ? (
                    taxBreakdown.map((t, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-gray-500">{t.taxName?.toUpperCase() || 'TAX'} ({t.percentage}%):</span>
                        <span className="font-mono">{currencySymbol} {(Number(t.amount) || 0).toFixed(3)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between"><span className="text-gray-500">TAX:</span><span className="font-mono">{currencySymbol} {(orderData.taxAmount || 0).toFixed(3)}</span></div>
                  )}
                  {chargeBreakdown.map((c, idx) => (
                    <div key={idx} className="flex justify-between text-blue-600">
                      <span className="text-blue-500">{c.chargeName?.toUpperCase() || 'CHARGE'}{c.chargeType === 'Fixed' ? '' : ` (${c.percentage}%)`}:</span>
                      <span className="font-mono">{currencySymbol} {(Number(c.amount) || 0).toFixed(3)}</span>
                    </div>
                  ))}
                  {shippingCost > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span className="text-purple-500">DELIVERY CHARGES:</span>
                      <span className="font-mono">{currencySymbol} {shippingCost.toFixed(3)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="text-green-500">DISCOUNT:</span>
                      <span className="font-mono">- {currencySymbol} {discountAmount.toFixed(3)}</span>
                    </div>
                  )}
                </div>
                <div className="bg-blue-600 rounded-lg p-2 text-center shadow-sm">
                  <span className="block text-[9px] font-bold tracking-widest uppercase text-blue-100 mb-0.5">Final Amount</span>
                  <span className="text-lg font-black font-mono text-white">{currencySymbol} {finalAmount.toFixed(3)}</span>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1.5">Payment Mode:</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {paymentMethods.map((method) => (
                    <label key={method} className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer transition-all text-[10px] font-bold tracking-widest uppercase ${paymentMode === method ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-100 border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                      <input type="radio" className="hidden" checked={paymentMode === method} onChange={() => setPaymentMode(method)} />
                      {method}
                    </label>
                  ))}
                </div>
              </div>

              {paymentMode === 'CASH' && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="block text-[10px] text-gray-500 uppercase tracking-widest">CASH GIVEN:</span>
                        <button onClick={() => setCashGiven(finalAmount.toFixed(3))} className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-colors tracking-widest uppercase">
                          Exact
                        </button>
                      </div>
                      <input type="number" value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="0.000" className="bg-white border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500 text-sm font-mono w-full" />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-500 uppercase tracking-widest mb-0.5 pt-0.5">TO BE PAID BACK:</span>
                      <div className="bg-white/80 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono text-amber-600">
                        {toBePaidBack > 0 ? `${currencySymbol} ${toBePaidBack.toFixed(3)}` : '0.000'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center pt-0.5">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={printInvoice} onChange={() => setPrintInvoice(!printInvoice)} className="w-3.5 h-3.5 accent-blue-500 bg-white border-gray-300 rounded" />
                  Print Invoice
                </label>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
          <button onClick={handleProcess} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition-colors tracking-widest uppercase text-xs shadow-sm">
            PROCESS PAYMENT
          </button>
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;
