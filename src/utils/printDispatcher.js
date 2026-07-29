// desktop-app/src/utils/printDispatcher.js
import api from '../services/api';
import { getDefaultReceiptSettings, printReceiptHTML } from './receiptPrinter';

export async function dispatchPrint(order, type = 'kitchen') {
  console.log(`[PRINT] dispatchPrint called for type="${type}", order #${order.tokenNo}`);

  // ------------------------------------------------------------
  // 1. If this is a web order that already used browser print, skip entirely.
  // ------------------------------------------------------------
  if (order.printMode === 'browser') {
    console.log('[PRINT] Web order with browser print – skipping on desktop.');
    return { success: true, skipped: true };
  }

  // ------------------------------------------------------------
  // 2. Determine printing mode:
  //    - If order.printMode is 'ethernet' → force silent (web order)
  //    - If order.printMode is undefined → use desktop's own setting
  // ------------------------------------------------------------
  const isWebEthernet = order.printMode === 'ethernet';
  const useBrowserPrint = localStorage.getItem('useBrowserPrint') === 'true';

  // Browser print path: only if it's NOT a web ethernet order AND the local toggle is ON
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
  // 3. Silent printing (Ethernet / Bluetooth)
  //    This path covers:
  //    - Web orders with printMode: 'ethernet' (forced silent)
  //    - Desktop orders when useBrowserPrint is false
  //    - Orders with printMode undefined and useBrowserPrint false
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