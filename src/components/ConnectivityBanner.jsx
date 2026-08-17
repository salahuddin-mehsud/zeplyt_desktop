import { useEffect, useRef, useState } from 'react';
import { FiCheckCircle, FiRefreshCw, FiWifiOff } from 'react-icons/fi';
import api from '../services/api';
import { offlineQueueSize, syncOfflineQueue } from '../services/offlineStore';

const ConnectivityBanner = () => {
  const [status, setStatus] = useState(() => (navigator.onLine ? null : 'offline'));
  const hideTimer = useRef(null);

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };

    const goOffline = () => {
      clearHideTimer();
      setStatus('offline');
    };

    const goOnline = async () => {
      clearHideTimer();

      if (!offlineQueueSize()) {
        setStatus(null);
        return;
      }

      setStatus('syncing');
      const result = await syncOfflineQueue(api);
      if (!navigator.onLine) return;

      window.dispatchEvent(new CustomEvent('offlineQueueSynced', { detail: result }));
      setStatus(result.pending ? 'syncing' : 'synced');

      if (!result.pending) {
        hideTimer.current = setTimeout(() => setStatus(null), 2500);
      }
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    if (navigator.onLine && offlineQueueSize()) goOnline();

    return () => {
      clearHideTimer();
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!status) return null;

  const isOffline = status === 'offline';
  const isSynced = status === 'synced';
  const message = isOffline
    ? 'Offline mode - orders and changes will be saved on this device.'
    : isSynced
      ? 'Back online - data synced to the cloud.'
      : 'Back online - syncing data to the cloud...';
  const Icon = isOffline ? FiWifiOff : isSynced ? FiCheckCircle : FiRefreshCw;

  return (
    <div
      className={`flex h-9 shrink-0 items-center justify-center gap-2 px-4 text-xs font-semibold text-white ${
        isOffline ? 'bg-amber-600' : 'bg-emerald-600'
      }`}
      role="status"
      aria-live="polite"
    >
      <Icon className={status === 'syncing' ? 'animate-spin' : ''} size={15} />
      <span>{message}</span>
    </div>
  );
};

export default ConnectivityBanner;
