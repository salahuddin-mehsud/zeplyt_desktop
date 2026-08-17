// Durable, branch-scoped offline store for the Electron POS.  localStorage is
// persisted by Electron between launches, so queued tickets survive a restart.
const prefix = 'zeplyt:offline:';
const branch = () => localStorage.getItem('activeBranch') || 'default';
const key = (name) => `${prefix}${branch()}:${name}`;
const read = (name, fallback) => {
  try { return JSON.parse(localStorage.getItem(key(name))) ?? fallback; } catch { return fallback; }
};
const write = (name, value) => localStorage.setItem(key(name), JSON.stringify(value));

export const isConnectionFailure = (error) => !error?.response || error.code === 'ERR_NETWORK';

export function cacheResponse(url, data) { write(`get:${url}`, { data, cachedAt: Date.now() }); }
export function cachedResponse(url) { return read(`get:${url}`, null)?.data; }

export function queueOfflineOrder(payload) {
  const localId = `offline-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const subTotal = (payload.items || []).reduce((total, item) => total + Number(item.price || 0) * Number(item.qty || 0), 0);
  const taxAmount = Number(payload.taxAmount || 0);
  const chargeAmount = Number(payload.chargeAmount || 0);
  const shippingCost = Number(payload.shippingCost || 0);
  const finalAmount = payload.finalAmount !== undefined
    ? Number(payload.finalAmount)
    : subTotal + taxAmount + chargeAmount + shippingCost;
  const order = {
    ...payload,
    // The server turns these form fields into nested receipt fields. Do the
    // same locally so an order printed before syncing shows the assignee.
    ...(payload.driverName ? { driver: { name: payload.driverName, phone: payload.driverPhone || '' } } : {}),
    ...(payload.waiterName ? { waiter: { name: payload.waiterName, phone: payload.waiterPhone || '' } } : {}),
    _id: localId, localId, offline: true, syncState: 'pending',
    tokenNo: `OFF-${Date.now().toString().slice(-5)}`, orderNo: `OFF-${Date.now().toString().slice(-6)}`,
    subTotal, finalAmount, status: 'Open Orders', createdAt: now, updatedAt: now,
  };
  const queue = read('queue', []);
  queue.push({ kind: 'create', localId, payload, queuedAt: now });
  write('queue', queue);
  const orders = read('orders', []);
  write('orders', [order, ...orders]);
  return order;
}

export function localOrders() { return read('orders', []); }

export function offlineQueueSize() { return read('queue', []).length; }

export function queueOfflineUpdate(orderId, payload) {
  const queue = read('queue', []);
  queue.push({ kind: 'update', orderId, payload, queuedAt: new Date().toISOString() });
  write('queue', queue);
  const orders = read('orders', []).map(order => order._id === orderId ? { ...order, ...payload, syncState: 'pending', updatedAt: new Date().toISOString() } : order);
  write('orders', orders);
}

// Replay in order: updates referring to a locally-created ID use the server ID
// returned by the preceding create request.  Failures stop the replay safely.
export async function syncOfflineQueue(api) {
  if (!navigator.onLine) return { synced: 0, pending: read('queue', []).length };
  const queue = read('queue', []);
  const remaining = [];
  const idMap = {};
  let synced = 0;
  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    try {
      if (item.kind === 'create') {
        const result = await api.post('/pos/orders', item.payload, { __offlineReplay: true });
        idMap[item.localId] = result.data._id;
        write('orders', localOrders().filter(order => order._id !== item.localId));
      } else {
        const orderId = idMap[item.orderId] || item.orderId;
        await api.put(`/pos/orders/${orderId}`, item.payload, { __offlineReplay: true });
        write('orders', localOrders().filter(order => order._id !== item.orderId));
      }
      synced += 1;
    } catch (error) {
      remaining.push(...queue.slice(index));
      break;
    }
  }
  write('queue', remaining);
  return { synced, pending: remaining.length };
}
