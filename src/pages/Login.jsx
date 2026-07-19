import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useBranch } from '../contexts/BranchContext';   // import the hook

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setBranch } = useBranch();   // get the setter from context

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      // Save token and user as before
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // ---- BRANCH INITIALISATION ----
      // Extract the default branch ID from the user object.
      // Adjust these property names based on your actual API response.
      let branchId = data.user?.defaultBranchId || data.user?.branchId || data.user?.branch?._id;

      // If no default branch is present, you might fetch the list of branches
      // and pick the first one (optional).
      if (!branchId) {
        try {
          const branchesRes = await api.get('/branches'); // adjust endpoint
          if (branchesRes.data.length > 0) {
            branchId = branchesRes.data[0]._id;
          }
        } catch (err) {
          console.warn('Could not fetch branches:', err);
        }
      }

      // Set the branch – this will save it to localStorage and trigger all data refetches
      if (branchId) {
        setBranch(branchId);
      } else {
        console.warn('No branch available; user must select one manually.');
        // Optionally, you could redirect to a branch selection page.
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Login
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-gray-500">
          Don't have an account? After purchasing a package, you'll receive login credentials by email.
        </p>
      </div>
    </div>
  );
};

export default Login;