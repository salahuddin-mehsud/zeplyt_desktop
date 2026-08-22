import { dispatchPrint } from './printDispatcher';
import api from '../services/api';

let socket = null;

function getCredentials() {
  return {
    token: localStorage.getItem('token'),
    branchId: localStorage.getItem('activeBranch')
  };
}

async function fetchPrintGroupId() {
  try {
    console.log('[SOCKET] Fetching groupId from /admin/print-groups/my-group...');
    const res = await api.get('/admin/print-groups/my-group');
    console.log('[SOCKET] Group API response:', res.data);
    if (res.data && res.data.groupId) {
      localStorage.setItem('printGroupId', res.data.groupId);
      return res.data.groupId;
    } else {
      localStorage.removeItem('printGroupId');
      return null;
    }
  } catch (err) {
    console.warn('[SOCKET] Failed to fetch groupId:', err.message);
    return null;
  }
}

export async function connectPrintSocket() {
  const isElectron = typeof window.require === 'function';
  if (!isElectron) {
    console.warn('[SOCKET] Not running in Electron — print relay disabled.');
    return;
  }

  const { token, branchId } = getCredentials();
  if (!token || !branchId) {
    console.log('[SOCKET] No token/branch yet — call connectPrintSocket() again after login.');
    return;
  }

  // ✅ ALWAYS fetch fresh groupId from the server
  const groupId = await fetchPrintGroupId();
  console.log('[SOCKET] Retrieved groupId:', groupId);

  // Disconnect any existing socket before creating a new one
  if (socket) {
    console.log('[SOCKET] Disconnecting existing socket...');
    socket.disconnect();
    socket = null;
  }

  const { io } = window.require('socket.io-client');
  const SOCKET_URL = new URL(import.meta.env.VITE_API_URL).origin;

  const auth = { token, branchId };
  if (groupId) {
    auth.groupId = groupId;
  } else {
    console.warn('[SOCKET] No groupId found – desktop will connect without group relay.');
  }

  console.log('[SOCKET] Connecting with auth:', { token: !!token, branchId, groupId });

  socket = io(SOCKET_URL, {
    path: '/api/socket.io',
    auth,
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    console.log(`[SOCKET] ✅ Connected (id: ${socket.id}) with groupId: ${groupId || 'none'}`);
  });
  socket.on('connect_error', (err) => console.warn('[SOCKET] Offline / connection waiting:', err.message));
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
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Auto-connect if already logged in (but only after login is confirmed)
connectPrintSocket();