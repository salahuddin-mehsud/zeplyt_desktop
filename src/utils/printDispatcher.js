// desktop-app/src/utils/printDispatcher.js
import api from '../services/api';
import { getDefaultReceiptSettings, printReceiptHTML } from './receiptPrinter';

export async function dispatchPrint(order, type = 'kitchen') {
  console.log(`[PRINT] dispatchPrint called for type="${type}", order #${order.tokenNo}`);

  // ------------------------------------------------------------
  // 1. If this is a web order that already used browser print, skip entirely.
  //    (The web app already printed via its own browser dialog.)
  // ------------------------------------------------------------
  if (order.printMode === 'browser') {
    console.log('[PRINT] Web order with browser print – skipping on desktop.');
    return { success: true, skipped: true };
  }

  // ------------------------------------------------------------
  // 2. Determine if we should force silent printing (web ethernet orders)
  // ------------------------------------------------------------
  const isWebEthernet = order.printMode === 'ethernet';
  const useBrowserPrint = localStorage.getItem('useBrowserPrint') === 'true';

  // ------------------------------------------------------------
  // 3. Browser print path – only if:
  //    - NOT forced silent (i.e. not a web ethernet order), AND
  //    - local setting is true (useBrowserPrint)
  // ------------------------------------------------------------
  if (!isWebEthernet && useBrowserPrint) {
    console.log('[PRINT] Browser print mode enabled – opening print dialog.');
    let receiptSettings = { bill: null, kitchen: null };

    try {
      const mode = 'browser';
      const [billRes, kitchenRes] = await Promise.all([
        api.get(`/pos/receipt-settings/bill?mode=${mode}`),
        api.get(`/pos/receipt-settings/kitchen?mode=${mode}`),
      ]);
      receiptSettings.bill = billRes.data;
      receiptSettings.kitchen = kitchenRes.data;
    } catch (err) {
      console.warn('[PRINT] Failed to fetch receipt settings, using defaults:', err);
      receiptSettings.bill = getDefaultReceiptSettings('bill');
      receiptSettings.kitchen = getDefaultReceiptSettings('kitchen');
    }

    const settings = type === 'kitchen' ? receiptSettings.kitchen : receiptSettings.bill;
    printReceiptHTML(order, type, settings);
    return { success: true, method: 'browser' };
  }

  // ------------------------------------------------------------
  // 4. Silent printing (Ethernet / Bluetooth)
  //    This path is used for:
  //    - Desktop orders when useBrowserPrint is false
  //    - Web ethernet orders (forced silent)
  //    - Any other case that falls through
  // ------------------------------------------------------------
  console.log('[PRINT] Silent printing (Ethernet/Bluetooth) – for',
    isWebEthernet ? 'web ethernet order' : 'desktop silent order');

  let ethernetPrinters = [];
  let bluetoothPort = null;

  try {
    ethernetPrinters = JSON.parse(localStorage.getItem('ethernetPrinters') || '[]');
    bluetoothPort = localStorage.getItem('bluetoothPort') || null;
  } catch (e) {
    console.warn('[PRINT] Failed to parse printer settings from localStorage');
  }

  console.log('[PRINT] ethernetPrinters:', ethernetPrinters, 'bluetoothPort:', bluetoothPort);

  // Fetch receipt settings for silent mode (ethernet)
  let receiptSettings = { bill: null, kitchen: null };
  try {
    const mode = 'ethernet';
    const [billRes, kitchenRes] = await Promise.all([
      api.get(`/pos/receipt-settings/bill?mode=${mode}`),
      api.get(`/pos/receipt-settings/kitchen?mode=${mode}`),
    ]);
    receiptSettings.bill = billRes.data;
    receiptSettings.kitchen = kitchenRes.data;
  } catch (err) {
    console.error('[PRINT] Failed to fetch receipt settings, using local defaults:', err);
    receiptSettings.bill = getDefaultReceiptSettings('bill');
    receiptSettings.kitchen = getDefaultReceiptSettings('kitchen');
  }

  // Check if we are running inside Electron (required for IPC)
  const isElectron = typeof window.require === 'function';
  if (!isElectron) {
    console.warn('[PRINT] Electron IPC not available – cannot print.');
    return { success: false, error: 'Not running in Electron' };
  }

  // Invoke the main process via IPC to handle actual printer communication
  const { ipcRenderer } = window.require('electron');
  console.log('[PRINT] Invoking IPC print-receipt...');
  const results = await ipcRenderer.invoke('print-receipt', {
    order,
    printType: type,
    ethernetPrinters,
    bluetoothPort,
    receiptSettings,
  });

  console.log('[PRINT] IPC results:', results);
  return results;
}