import { useState, useEffect } from 'react';
import { FaCopy, FaCheck, FaTrash, FaTimes } from 'react-icons/fa';
import api from '../../services/api';

const ApiKeyManager = () => {
  const [keys, setKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newSecret, setNewSecret] = useState(null);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState(null);

  useEffect(() => {
    loadKeys();
    loadBranches();
  }, []);

  const loadKeys = async () => {
    try {
      const res = await api.get('/dashboard/api-keys');
      setKeys(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load API keys' });
    }
  };

  const loadBranches = async () => {
    try {
      const res = await api.get('/business/branches');
      setBranches(res.data);
      if (res.data.length > 0) setSelectedBranch(res.data[0]._id);
    } catch (err) {
      console.error('Failed to load branches');
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim() || !selectedBranch) {
      setMessage({ type: 'error', text: 'Please provide a name and select a branch' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/dashboard/api-keys', { name: newKeyName, branchId: selectedBranch });
      setNewSecret(res.data.secret);
      setShowSecretModal(true);
      
      const branch = branches.find(b => b._id === selectedBranch);
      
      setKeys([...keys, { 
        id: res.data.id, 
        name: res.data.name, 
        key: res.data.key, 
        active: true,
        branchId: selectedBranch,
        branchName: branch?.name || 'Unknown Branch',
        createdAt: new Date().toISOString() 
      }]);
      setNewKeyName('');
      setMessage({ type: 'success', text: 'API Key generated! The secret is shown in the popup.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to generate API key' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return;
    try {
      await api.delete(`/dashboard/api-keys/${id}`);
      setKeys(keys.filter(k => k.id !== id));
      setMessage({ type: 'success', text: 'API key revoked' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to revoke API key' });
    }
  };

  const copyToClipboard = async (text, type = 'key') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'secret') {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2500);
      } else {
        setCopiedKeyId(text);
        setTimeout(() => setCopiedKeyId(null), 2500);
      }
    } catch (err) {
      alert('Failed to copy to clipboard');
    }
  };

  const closeSecretModal = () => {
    setShowSecretModal(false);
    setNewSecret(null);
    setCopiedSecret(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm max-w-6xl">
      <h2 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-3 mb-4">API Credentials</h2>
      {message.text && (
        <div className={`mb-3 px-3 py-1.5 rounded-lg text-xs font-bold border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
          {message.text}
        </div>
      )}
      <form onSubmit={handleGenerate} className="flex flex-wrap gap-2 mb-5">
        <input
          type="text"
          placeholder="Key name (e.g., My Website)"
          value={newKeyName}
          onChange={e => setNewKeyName(e.target.value)}
          className="flex-1 min-w-[160px] px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-blue-400"
          disabled={loading}
        />
        <select
          value={selectedBranch}
          onChange={e => setSelectedBranch(e.target.value)}
          className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-blue-400"
          disabled={loading}
        >
          <option value="">Select branch</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <button
          type="submit"
          disabled={loading || !newKeyName.trim() || !selectedBranch}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate New Key'}
        </button>
      </form>

      {keys.length === 0 ? (
        <p className="text-xs text-gray-400">No API keys created yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 font-bold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-2 font-bold text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-3 py-2 font-bold text-gray-500 uppercase tracking-wider">API Key</th>
                <th className="px-3 py-2 font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 font-bold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-3 py-2 font-bold text-gray-500 uppercase tracking-wider">Last Used</th>
                <th className="px-3 py-2 font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {keys.map(k => (
                <tr key={k.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-medium text-gray-800">{k.name}</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200">
                      {k.branchName || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <code className="text-[10px] text-gray-500 font-mono">{k.key}</code>
                      <button
                        onClick={() => copyToClipboard(k.key, 'key')}
                        className="p-0.5 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-700"
                        title="Copy API key"
                      >
                        {copiedKeyId === k.key ? (
                          <FaCheck className="text-green-600" size={12} />
                        ) : (
                          <FaCopy size={12} />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${k.active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                      {k.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[10px] text-gray-400">
                    {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-3 py-2 text-[10px] text-gray-400">
                    {k.lastUsed ? new Date(k.lastUsed).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-[10px] font-bold flex items-center gap-1 mx-auto border border-red-200"
                    >
                      <FaTrash size={10} /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECRET MODAL */}
      {showSecretModal && newSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeSecretModal}>
          <div className="bg-white border border-gray-200 rounded-xl max-w-lg w-full p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-sm font-bold text-yellow-700">🔐 New API Key Generated</h3>
                <p className="text-xs text-gray-500 mt-0.5">Copy the secret below. It will not be shown again.</p>
              </div>
              <button
                onClick={closeSecretModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                aria-label="Close"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
              <code className="text-gray-800 font-mono text-xs break-all">{newSecret}</code>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(newSecret, 'secret')}
                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {copiedSecret ? <FaCheck size={14} /> : <FaCopy size={14} />}
                {copiedSecret ? 'Copied!' : 'Copy Secret'}
              </button>
              <button
                onClick={closeSecretModal}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager;