import { useState, useEffect } from 'react';
import { FaTrash, FaPlus } from 'react-icons/fa';
import api from '../../services/api';

const PaymentMethodsSettings = () => {
  const [methods, setMethods] = useState([]);
  const [newMethod, setNewMethod] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/settings/payment-methods').then(res => {
      setMethods(res.data.paymentMethods || ['CASH', 'CARD', 'BPAY', 'TALABAT', 'JAHEZ', 'KEETA']);
      setLoading(false);
    });
  }, []);

  const handleSave = async (updatedMethods) => {
    try {
      await api.put('/dashboard/settings/payment-methods', { paymentMethods: updatedMethods });
      setMethods(updatedMethods);
    } catch (err) {
      alert("Failed to save payment methods.");
    }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newMethod.trim()) return;
    const upperMethod = newMethod.trim().toUpperCase();
    if (!methods.includes(upperMethod)) {
      const updated = [...methods, upperMethod];
      handleSave(updated);
    }
    setNewMethod('');
  };

  const handleDelete = (methodToRemove) => {
    const updated = methods.filter(m => m !== methodToRemove);
    handleSave(updated);
  };

  if (loading) return <div className="p-4 text-gray-400 text-sm animate-pulse">Loading...</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm max-w-3xl">
      <h2 className="text-sm font-bold text-gray-700 mb-4 border-b border-gray-200 pb-3">Payment Methods Config</h2>
      
      <div className="space-y-1.5 mb-5">
        {methods.map((method, idx) => (
          <div key={idx} className="flex justify-between items-center bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg group hover:border-gray-300 transition">
            <span className="text-xs font-bold text-gray-700 tracking-wider uppercase">{method}</span>
            <button onClick={() => handleDelete(method)} className="text-gray-400 hover:text-red-500 transition-colors">
              <FaTrash size={13} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input 
          type="text" 
          value={newMethod} 
          onChange={(e) => setNewMethod(e.target.value)} 
          placeholder="e.g. AMEX, STRIPE, CREDIT..." 
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 text-xs font-mono text-gray-700 uppercase"
        />
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
          <FaPlus size={12} /> Add More
        </button>
      </form>
    </div>
  );
};

export default PaymentMethodsSettings;