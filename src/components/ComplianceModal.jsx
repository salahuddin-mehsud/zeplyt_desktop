import { useState, useEffect } from 'react';
import api from '../services/api';

const ComplianceModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState('Your Business');
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkCompliance = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (!token || !userStr) return;

        const user = JSON.parse(userStr);
        if (user.role === 'super_admin') return;

        // Fetch compliance status from backend
        const res = await api.get('/auth/compliance-status');
        if (res.data && res.data.requiresAcceptance) {
          setIsOpen(true);
          if (res.data.businessName) {
            setBusinessName(res.data.businessName);
          }
          if (res.data.branches && Array.isArray(res.data.branches)) {
            setBranches(res.data.branches);
          }
        }
      } catch (err) {
        console.warn('[ComplianceModal] Could not check compliance status:', err);
      }
    };

    checkCompliance();
  }, []);

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!agreed) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post('/auth/accept-compliance', { businessName });
      if (res.data?.success) {
        // Update user in local storage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            user.complianceAgreement = res.data.complianceAgreement;
            localStorage.setItem('user', JSON.stringify(user));
          } catch { }
        }
        setIsOpen(false);
      }
    } catch (err) {
      console.error('[ComplianceModal] Acceptance error:', err);
      setError(err.response?.data?.message || 'Failed to record agreement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 my-auto relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header Badge */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            ⚖️ Mandatory Compliance & Service Agreement
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            🏢 All Branches & Locations Covered
          </span>
          <span className="text-xs text-slate-400 font-mono">v1.0</span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
          Terms of Service & Compliance Acknowledgment
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
          Welcome to <span className="font-bold text-slate-800">ZEPLYT</span>. This agreement is executed by the authorized account owner and legally governs <span className="font-bold text-slate-900">all operational branches and points of sale</span> under your organization:
        </p>

        {/* Covered Branches Chips */}
        {branches.length > 0 && (
          <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3 mb-5 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="font-bold text-slate-600 flex-shrink-0">Covered Branches:</span>
            <div className="flex flex-wrap gap-1.5">
              {branches.map((bName, idx) => (
                <span key={idx} className="bg-white border border-slate-300 text-slate-800 font-semibold px-2 py-0.5 rounded-md shadow-2xs">
                  {bName}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm p-3.5 rounded-xl mb-4 font-medium">
            {error}
          </div>
        )}

        {/* Structured Clauses Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm text-slate-700 max-h-[38vh] overflow-y-auto pr-2 shadow-inner">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mt-0.5">1</span>
            <div>
              <p className="font-bold text-slate-900">Internal Operations & Management Tool</p>
              <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                This platform is provided strictly as an internal point-of-sale, order management, inventory control, and business analytics utility across all branches.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mt-0.5">2</span>
            <div>
              <p className="font-bold text-slate-900">Convenience Calculations Disclaimer</p>
              <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                Our platform provides local arithmetic calculations for operator convenience only and does not constitute official tax-filing, government fiscal software, or auditing counsel.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs mt-0.5">3</span>
            <div>
              <p className="font-bold text-slate-900">100% Tax & Regulatory Responsibility (Organization-Wide)</p>
              <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                <span className="font-semibold text-slate-900">[{businessName} (All Branches & Locations)]</span> assumes sole, complete, and absolute legal, financial, and operational responsibility for its own local tax compliance, bookkeeping, and any mandatory FBR or provincial revenue authority integration/filing requirements across all current and future branches.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mt-0.5">4</span>
            <div>
              <p className="font-bold text-slate-900">IT Service Vendor Relationship</p>
              <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                The client explicitly acknowledges that the platform provider is an IT service vendor with zero legal liability for the client's fiscal filings, tax returns, or local regulatory standing across any branch.
              </p>
            </div>
          </div>
        </div>

        {/* Agreement Checkbox & Action Form */}
        <form onSubmit={handleAccept} className="mt-5 space-y-4">
          <label className="flex items-start gap-3 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
              required
            />
            <span className="text-xs sm:text-sm font-semibold text-indigo-950 leading-snug">
              I, as the authorized administrator, confirm and accept full legal, financial, and operational responsibility for tax, FBR, and regulatory compliance across ALL branches of this business.
            </span>
          </label>

          <button
            type="submit"
            disabled={!agreed || submitting}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Recording Digital Acceptance For All Branches...</span>
              </>
            ) : (
              <span>I Agree For All Branches & Proceed →</span>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <span>🔒 Secure Organization-Wide Signature</span>
            <span>•</span>
            <span>IP address and timestamp logged as permanent legal proof for all branches</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplianceModal;
