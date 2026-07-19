// src/pages/Success.jsx
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const Success = () => {
  const [searchParams] = useSearchParams();
  const paymentIntentId = searchParams.get('paymentIntentId');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/login';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-sans text-white p-6">
      <div className="w-full max-w-lg border border-zinc-800 bg-zinc-950 p-10 rounded-3xl text-center">
        <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="text-3xl font-bold tracking-tight mb-4">Payment Successful</h2>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Your transaction is complete. An account has been provisioned using the email address you provided.
        </p>
        
        {paymentIntentId && (
          <div className="bg-black border border-zinc-900 rounded-lg p-3 mb-8 flex justify-center items-center gap-2">
             <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Receipt ID</span>
             <code className="text-xs text-zinc-400 font-mono">{paymentIntentId}</code>
          </div>
        )}
        
        <p className="text-sm font-bold text-zinc-500 mb-8">
          Redirecting securely in <span className="text-white">{countdown}</span> seconds
        </p>
        
        <Link 
          to="/login" 
          className="w-full block bg-white text-black px-6 py-4 rounded-full font-bold hover:bg-zinc-200 transition-colors"
        >
          Proceed to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Success;