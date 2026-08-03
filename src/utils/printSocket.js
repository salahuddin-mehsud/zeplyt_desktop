import { dispatchPrint } from './printDispatcher';

let socket = null;

function getCredentials() {
  return { token: localStorage.getItem('token'), branchId: localStorage.getItem('activeBranch') };
}

export function connectPrintSocket() {
  const isElectron = typeof window.require === 'function';
  if (!isElectron) return console.warn('[SOCKET] Not running in Electron — print relay disabled.');

  const { token, branchId } = getCredentials();
  if (!token || !branchId) {
    console.log('[SOCKET] No token/branch yet — call connectPrintSocket() again right after login.');
    return;
  }

  if (socket) socket.disconnect();

  const { io } = window.require('socket.io-client');
  const SOCKET_URL = new URL(import.meta.env.VITE_API_URL).origin; // strips any /api path, keeps protocol+host

  console.log(`[SOCKET] Connecting to ${SOCKET_URL} for branch=${branchId}...`);
  socket = io(SOCKET_URL, {
    path: '/api/socket.io', // must match the server's `path` option exactly
    auth: { token, branchId },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => console.log(`[SOCKET] ✅ Connected (id: ${socket.id})`));
  socket.on('connect_error', (err) => console.error('[SOCKET] ❌ Connection error:', err.message));
  socket.on('disconnect', (reason) => console.warn('[SOCKET] ⚠️ Disconnected:', reason));

  socket.on('print_order', async ({ order, printType }) => {
    console.log(`[SOCKET] 📥 Received print_order — order #${order.tokenNo}, type=${printType}`);
    try {
      const results = await dispatchPrint(order, printType);
      socket.emit('print_ack', { orderId: order._id, printType, success: true, results });
      console.log(`[SOCKET] ✅ Printed order #${order.tokenNo} (${printType}), ack sent.`);
    } catch (err) {
      console.error(`[SOCKET] ❌ Failed to print order #${order.tokenNo}:`, err);
      socket.emit('print_ack', { orderId: order._id, printType, success: false, error: err.message });
    }
  });
}

export function emitPrintOrder(order, printType) {
  if (!socket) {
    console.warn('[SOCKET] Not connected, cannot emit print_order.');
    return;
  }
  socket.emit('print_order', { order, printType });
}

export function disconnectPrintSocket() {
  socket?.disconnect();
  socket = null;
}

connectPrintSocket(); // fires immediately on module load if already logged in (app relaunch case)