import { useEffect, useState } from 'react';
import api from '../services/api';

const DEFAULT_SCHEDULE = [
  { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
  { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
  { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
  { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
  { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
  { day: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
  { day: 'Sunday', isOpen: true, openTime: '09:00', closeTime: '23:00' }
];

const OperatingHours = () => {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/settings/operating-hours')
      .then(res => {
        if (res.data && res.data.schedule && res.data.schedule.length > 0) {
          setSchedule(res.data.schedule);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDayChange = (index, field, value) => {
    const updated = [...schedule];
    updated[index][field] = value;
    setSchedule(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await api.post('/dashboard/settings/operating-hours', { schedule });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="p-6 text-gray-400 font-bold uppercase tracking-wider text-center mt-12 text-sm">Loading Timeline...</div>;

  return (
    <div className="w-full min-h-screen bg-white text-gray-800 font-sans p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-500 text-xs mb-5">Define your weekly timeline. Leave a day marked as "Closed" for holidays or days off.</p>
        
        <form onSubmit={handleSave} className="bg-gray-50 border border-gray-200 p-5 rounded-xl shadow-sm">
          
          {/* Header */}
          <div className="grid grid-cols-[80px_70px_1fr_1fr] gap-3 mb-3 px-3 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
            <div>Day</div>
            <div>Status</div>
            <div>Opening Time</div>
            <div>Closing Time</div>
          </div>

          {/* Schedule Rows */}
          <div className="space-y-2 mb-6">
            {schedule.map((dayConfig, idx) => (
              <div key={dayConfig.day} className={`grid grid-cols-[80px_70px_1fr_1fr] gap-3 items-center p-3 rounded-lg border transition-colors ${dayConfig.isOpen ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}`}>
                
                <div className={`font-medium text-sm ${dayConfig.isOpen ? 'text-gray-800' : 'text-red-400'}`}>
                  {dayConfig.day}
                </div>
                
                <div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dayConfig.isOpen}
                      onChange={e => handleDayChange(idx, 'isOpen', e.target.checked)}
                      className="accent-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${dayConfig.isOpen ? 'text-green-600' : 'text-red-500'}`}>
                      {dayConfig.isOpen ? 'Open' : 'Off'}
                    </span>
                  </label>
                </div>

                <div>
                  <input
                    type="time"
                    value={dayConfig.openTime}
                    onChange={e => handleDayChange(idx, 'openTime', e.target.value)}
                    disabled={!dayConfig.isOpen}
                    className="w-full bg-white border border-gray-200 px-2 py-1 rounded-lg outline-none focus:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-sm"
                  />
                </div>

                <div>
                  <input
                    type="time"
                    value={dayConfig.closeTime}
                    onChange={e => handleDayChange(idx, 'closeTime', e.target.value)}
                    disabled={!dayConfig.isOpen}
                    className="w-full bg-white border border-gray-200 px-2 py-1 rounded-lg outline-none focus:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-sm"
                  />
                </div>

              </div>
            ))}
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className={`w-full py-2.5 rounded-lg font-bold transition-all tracking-wider uppercase text-sm ${saved ? 'bg-green-600 text-white shadow-sm shadow-green-200' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-200'}`}
          >
            {saved ? '✓ Weekly Schedule Saved' : 'Save Timeline'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OperatingHours;