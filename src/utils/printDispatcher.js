import api from '../services/api';
import { getDefaultReceiptSettings, printReceiptHTML } from './receiptPrinter';

export async function dispatchPrint(order, type = 'kitchen') {
  console.log(`[PRINT] dispatchPrint called for type="${type}", order #${order.tokenNo}`);

  // ---- Check if browser print is enabled ----
  const useBrowserPrint = localStorage.getItem('useBrowserPrint') === 'true';
  if (useBrowserPrint) {
    console.log('[PRINT] Browser print mode enabled – opening print dialog.');
    let receiptSettings = { bill: null, kitchen: null };
    try {
      const [billRes, kitchenRes] = await Promise.all([
        api.get('/pos/receipt-settings/bill'),
        api.get('/pos/receipt-settings/kitchen'),
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

  // ---- Silent printing (Ethernet / Bluetooth) ----
  let ethernetPrinters = [];
  let bluetoothPort = null;
  try {
    ethernetPrinters = JSON.parse(localStorage.getItem('ethernetPrinters') || '[]');
    bluetoothPort = localStorage.getItem('bluetoothPort') || null;
  } catch (e) {
    console.warn('[PRINT] Failed to parse printer settings from localStorage');
  }
  console.log('[PRINT] ethernetPrinters:', ethernetPrinters, 'bluetoothPort:', bluetoothPort);

  let receiptSettings = { bill: null, kitchen: null };
  try {
    const [billRes, kitchenRes] = await Promise.all([
      api.get('/pos/receipt-settings/bill'),
      api.get('/pos/receipt-settings/kitchen'),
    ]);
    receiptSettings.bill = billRes.data;
    receiptSettings.kitchen = kitchenRes.data;
  } catch (err) {
    console.error('[PRINT] Failed to fetch receipt settings, using local defaults:', err);
    receiptSettings.bill = getDefaultReceiptSettings('bill');
    receiptSettings.kitchen = getDefaultReceiptSettings('kitchen');
  }

  const isElectron = typeof window.require === 'function';
  if (!isElectron) {
    console.warn('[PRINT] Electron IPC not available — cannot print.');
    return { success: false, error: 'Not running in Electron' };
  }

  const { ipcRenderer } = window.require('electron');
  console.log('[PRINT] Invoking IPC print-receipt...');
  const results = await ipcRenderer.invoke('print-receipt', {
    order, printType: type, ethernetPrinters, bluetoothPort, receiptSettings,
  });
  console.log('[PRINT] IPC results:', results);
  return results;
}