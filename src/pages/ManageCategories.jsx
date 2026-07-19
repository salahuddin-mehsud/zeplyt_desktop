import { useEffect, useState } from 'react';
import api from '../services/api';

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const fetchCategories = () => {
    api.get('/pos/categories').then(res => setCategories(res.data)).catch(console.error);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name) return;
    await api.post('/pos/categories', { name });
    setName('');
    fetchCategories();
  };

  const handleSaveEdit = async (id) => {
    if (!editName) return;
    await api.put(`/pos/categories/${id}`, { name: editName });
    setEditingId(null);
    fetchCategories();
  };

  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to delete this category?")) {
      await api.delete(`/pos/categories/${id}`);
      fetchCategories();
    }
  };

  return (
    <div className="w-full min-h-screen bg-white text-gray-800 font-sans p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Add Category Form */}
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl shadow-sm mb-5">
          <form onSubmit={handleAdd} className="flex gap-3">
            <input 
              type="text"
              placeholder="Category Name (e.g., Starters, Mains)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-bold text-xs transition-colors"
            >
              Add Category
            </button>
          </form>
        </div>

        {/* Category List */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {categories.length === 0 && (
            <p className="p-5 text-gray-400 font-bold uppercase tracking-wider text-xs text-center">No categories yet.</p>
          )}
          {categories.map((c) => (
            <div
              key={c._id}
              className="px-4 py-3 border-b border-gray-100 last:border-0 flex justify-between items-center group hover:bg-gray-50 transition-colors"
            >
              
              {editingId === c._id ? (
                <div className="flex gap-2 flex-1 mr-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 outline-none text-sm focus:border-blue-400"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(c._id)}
                    className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded font-bold text-[10px] uppercase tracking-wider transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1 rounded font-bold text-[10px] uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="font-medium text-gray-800 text-sm">{c.name}</div>
              )}

              {editingId !== c._id && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingId(c._id); setEditName(c.name); }}
                    className="text-blue-600 hover:text-blue-800 text-[10px] font-bold uppercase tracking-wider"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageCategories;