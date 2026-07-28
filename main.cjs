const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const net = require('net');
const { SerialPort } = require('serialport');
const EscPosEncoder = require('esc-pos-encoder');
const Jimp = require('jimp');
const isDev = !app.isPackaged;



app.disableHardwareAcceleration();



// ---- Maximum characters per line ----
// CALIBRATE THIS against your actual printer (see calibration script) before relying on it.
const MAX_LINE_WIDTH = 48;
const BOTTOM_MARGIN_LINES = 4;

// ---- Ensure any string fits the line width ----
function fitLine(str, maxWidth) {
  str = String(str ?? '');
  return str.length > maxWidth ? str.slice(0, maxWidth) : str;
}

// ---- Pad a column value to a fixed width ----
function padColumn(str, width, align) {
  str = String(str ?? '');
  if (str.length > width) str = str.slice(0, width);
  if (align === 'center') {
    const totalPad = width - str.length;
    const left = Math.floor(totalPad / 2);
    const right = totalPad - left;
    return ' '.repeat(left) + str + ' '.repeat(right);
  }
  return align === 'right' ? str.padStart(width) : str.padEnd(width);
}

// ---- Software alignment for whole lines (no reliance on ESC/POS align command) ----
function padLine(str, align, width = MAX_LINE_WIDTH) {
  str = fitLine(str, width);
  if (align === 'center') {
    const left = Math.floor((width - str.length) / 2);
    return ' '.repeat(Math.max(0, left)) + str;
  }
  if (align === 'right') {
    return ' '.repeat(Math.max(0, width - str.length)) + str;
  }
  return str; // left
}

// ---- Feed line (LF only — no CR, avoids this printer's double line-advance) ----
function feed(encoder) {
  encoder.raw([0x0A]);
}

// ---- Send text as raw bytes — bypasses any library-level wrapping/formatting ----
function rawText(encoder, str) {
  const s = String(str ?? '');
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    bytes.push(code <= 255 ? code : 0x3F); // non-Latin1 chars fall back to '?'
  }
  encoder.raw(bytes);
}

// ---- Fit column widths to max line width (guarantees exact total) ----
function fitColumnsToWidth(columns, maxWidth) {
  let cols = columns.map(c => ({ ...c, width: c.width || 10 }));
  let total = cols.reduce((sum, c) => sum + c.width, 0);
  if (total <= maxWidth) return cols;
  const scale = maxWidth / total;
  cols = cols.map(c => ({ ...c, width: Math.max(1, Math.floor(c.width * scale)) }));
  total = cols.reduce((sum, c) => sum + c.width, 0);
  if (total !== maxWidth) {
    const diff = maxWidth - total;
    const widest = cols.reduce((a, b) => (a.width >= b.width ? a : b));
    widest.width = Math.max(1, widest.width + diff);
  }
  return cols;
}


function replacePlaceholders(text, order, table, orderType) {
  return (text || '')
    .replace(/{token}/g, order.tokenNo ?? '')
    .replace(/{orderNo}/g, order.orderNo ?? '')
    .replace(/{type}/g, orderType || '')
    .replace(/{table}/g, table?.name ?? '')
    .replace(/{customer}/g, order.customerName || 'Walk-in')
    .replace(/{guest}/g, order.customerName || 'Walk-in')
    .replace(/{date}/g, new Date(order.createdAt).toLocaleDateString())
    .replace(/{time}/g, new Date(order.createdAt).toLocaleTimeString())
    .replace(/{datetime}/g, new Date(order.createdAt).toLocaleString());
}

// ---- Generate ESC/POS data ----
async function generateEscPos(order, type, settings) {
  console.log(`[MAIN] generateEscPos called for type="${type}"`);
  const orderType = order.type;
  const encoder = new EscPosEncoder();
  encoder.initialize();
  encoder.raw([0x1B, 0x33, 0]); // tight line spacing

  const isKitchen = type === 'kitchen';
  const s = settings || {};
  const baseAlign = s.globalAlignment || 'left';

  const printLine = (lineObj) => {
  if (!lineObj || !lineObj.text) return;

  // ── Alignment ──
  const align = lineObj.alignment || baseAlign;

  // ── Bold ──
  const bold = lineObj.bold ?? s.globalBold ?? false;

  // ── Double Height (ESC/POS) ──
  // If fontSize > 1.5, we treat it as double‑height; if > 2.5, double‑height + double‑width.
  const fontSize = lineObj.fontSize || 1;
  let doubleH = lineObj.doubleHeight ?? s.globalDoubleHeight ?? false;
  let doubleW = false;
  if (fontSize > 2.5) {
    doubleH = true;
    doubleW = true;
  } else if (fontSize > 1.5) {
    doubleH = true;
  }
  // If the user explicitly set doubleHeight, honour that, but we keep the computed if not.

  // ── Padding (feeds before and after) ──
  const paddingTop = lineObj.paddingTop || 0;
  const paddingBottom = lineObj.paddingBottom || 0;

  // ── Feed before the line ──
  for (let i = 0; i < Math.round(paddingTop); i++) {
    feed(encoder);
  }

  // ── Print the line itself ──
  const text = padLine(lineObj.text, align);
  if (bold) encoder.bold(true);
  if (doubleH && doubleW) encoder.size(2, 2);   // double width + height
  else if (doubleH) encoder.size(1, 2);         // double height only
  else if (doubleW) encoder.size(2, 1);         // double width only (unlikely)
  else encoder.size(1, 1);                      // normal

  rawText(encoder, text);
  feed(encoder);
  if (bold) encoder.bold(false);
  // reset size after line
  encoder.size(1, 1);

  // ── Divider below ──
  if (lineObj.dividerBelow) {
    rawText(encoder, '-'.repeat(MAX_LINE_WIDTH));
    feed(encoder);
  }

  // ── Feed after the line ──
  for (let i = 0; i < Math.round(paddingBottom); i++) {
    feed(encoder);
  }
};

  const printSpacing = (count) => {
    const n = Math.max(0, Math.min(count ?? 0, 5));
    for (let i = 0; i < n; i++) feed(encoder);
  };

  if (s.logoUrl) {
  encoder.align('center');
  await printLogoImage(encoder, s.logoUrl, s.logoWidth || 192);
  encoder.align('left');
}

  // ---- Header lines ----
  if (s.headerLines?.length) {
  s.headerLines.forEach(lineObj => {
    const processedText = replacePlaceholders(lineObj.text, order, order.table, orderType);
    const processedLine = { ...lineObj, text: processedText };
    printLine(processedLine);
  });
  printSpacing(s.sectionMargin ?? 1);
}

  // ---- Order info — every line software-padded, zero hardware align ----
  if (s.showToken !== false) {
    rawText(encoder, padLine(`TOKEN: #${order.tokenNo}`, baseAlign));
    feed(encoder);
  }
  if (s.showOrderNo) {
    rawText(encoder, padLine(`Order: ${order.orderNo}`, baseAlign));
    feed(encoder);
  }
  rawText(encoder, padLine(`Type: ${order.type}${order.table?.name ? ` - ${order.table.name}` : ''}`, baseAlign));
  feed(encoder);
  if (s.showDateTime !== false) {
    rawText(encoder, padLine(new Date(order.createdAt).toLocaleString(), baseAlign));
    feed(encoder);
  }
  if (s.showCustomerName !== false) {
    rawText(encoder, padLine(`Guest: ${order.customerName || 'Walk-in'}`, baseAlign));
    feed(encoder);
  }
  if (isKitchen && order.instructions) {
    rawText(encoder, padLine(`Notes: ${order.instructions}`, baseAlign));
    feed(encoder);
  }
  printSpacing(s.sectionMargin ?? 1);

  if (!isKitchen && s.showDivider !== false) {
  rawText(encoder, padLine('-'.repeat(MAX_LINE_WIDTH), baseAlign));
  feed(encoder);
}

  // ---- Item columns ----
  const columns = (s.itemColumns?.length ? s.itemColumns : [
    { key: 'sr', label: 'Sr.', width: 4, align: 'left', visible: true },
    { key: 'name', label: 'Item', width: 10, align: 'left', visible: true },
    { key: 'qty', label: 'Qty', width: 5, align: 'right', visible: true },
    { key: 'price', label: 'Price', width: 8, align: 'right', visible: true },
    { key: 'amount', label: 'Amt', width: 8, align: 'right', visible: true },
  ]).filter(c => c.visible !== false);

  const usedColumns = fitColumnsToWidth(columns, MAX_LINE_WIDTH);

  if (usedColumns.length > 0) {
    if (!isKitchen && s.showDivider !== false) {
      const headerText = usedColumns.map(c => padColumn(c.label, c.width, c.align)).join('');
      encoder.bold(true);
      rawText(encoder, headerText);
      feed(encoder);
      encoder.bold(false);
    }

    const ib = s.itemBlock || {};
    const itemAlign = ib.alignment || baseAlign;

    order.items.forEach((item, idx) => {
      if (isKitchen) {
        rawText(encoder, padLine(`${item.qty}x  ${item.name}`, itemAlign));
        feed(encoder);
        return;
      }
      const row = usedColumns.map(c => {
        let val = '';
        switch (c.key) {
          case 'sr': val = (idx + 1).toString(); break;
          case 'name': val = item.name; break;
          case 'qty': val = item.qty.toString(); break;
          case 'price': val = item.price.toFixed(s.decimalPlaces ?? 2); break;
          case 'amount': val = (item.price * item.qty).toFixed(s.decimalPlaces ?? 2); break;
          default: val = '';
        }
        return padColumn(val, c.width, c.align);
      }).join('');

      if (ib.bold) encoder.bold(true);
      if (ib.doubleHeight) encoder.size(1, 2);
      rawText(encoder, row);
      feed(encoder);
      if (ib.doubleHeight) encoder.size(1, 1);
      if (ib.bold) encoder.bold(false);
    });
    printSpacing(s.sectionMargin ?? 1);
  }

  // ---- Totals ----
  if (!isKitchen) {
    if (s.totalsFormat) {
      const formatted = s.totalsFormat
        .replace(/{subtotal}/g, (order.subTotal ?? 0).toFixed(s.decimalPlaces ?? 2))
        .replace(/{tax}/g, (order.taxAmount ?? 0).toFixed(s.decimalPlaces ?? 2))
        .replace(/{discount}/g, (order.discountAmount ?? 0).toFixed(s.decimalPlaces ?? 2))
        .replace(/{total}/g, (order.finalAmount ?? 0).toFixed(s.decimalPlaces ?? 2));
      formatted.split('\n').forEach(line => {
        if (line.trim()) {
          rawText(encoder, padLine(line, baseAlign));
          feed(encoder);
        }
      });
    } else {
      if (s.showSubtotal !== false) {
        rawText(encoder, padLine(`Subtotal: ${(order.subTotal ?? 0).toFixed(s.decimalPlaces ?? 2)}`, baseAlign));
        feed(encoder);
      }
      if (s.showTax !== false) {
        rawText(encoder, padLine(`Tax (${order.taxPercentage || 10}%): ${(order.taxAmount ?? 0).toFixed(s.decimalPlaces ?? 2)}`, baseAlign));
        feed(encoder);
      }
      if (s.showTotal !== false) {
        rawText(encoder, padLine(`TOTAL: ${(order.finalAmount ?? 0).toFixed(s.decimalPlaces ?? 2)}`, baseAlign));
        feed(encoder);
      }
    }
  }
  printSpacing(s.sectionMargin ?? 1);

  // ---- Footer ----
 if (s.footerLines?.length) {
  s.footerLines.forEach(lineObj => {
    const processedText = replacePlaceholders(lineObj.text, order, order.table, orderType);
    const processedLine = { ...lineObj, text: processedText };
    printLine(processedLine);
  });
}

rawText(encoder, padLine('', baseAlign)); // blank line
feed(encoder);
const poweredByText = padLine('Powered by ZEPLYT POS', 'center');
rawText(encoder, poweredByText);
feed(encoder);
// Optional: add a second blank line before cut
rawText(encoder, padLine('', baseAlign));
feed(encoder);

  // ---- Bottom margin — feed extra blank lines so the cutter clears the last printed line ----
  printSpacing(BOTTOM_MARGIN_LINES);

  encoder.cut();
  return encoder.encode();
}

// ---- Send via TCP ----
function sendViaTcp(ip, port, data) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(port, ip, () => {
      client.write(data);
      client.end();
      resolve();
    });
    client.on('error', (err) => reject(err));
    client.setTimeout(5000, () => {
      client.destroy();
      reject(new Error('TCP timeout'));
    });
  });
}

// ---- Send via Serial ----
function sendViaSerial(comPort, data) {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({ path: comPort, baudRate: 9600, autoOpen: false });
    port.open((err) => {
      if (err) return reject(err);
      port.write(data, (writeErr) => {
        if (writeErr) reject(writeErr);
        else resolve();
        port.close();
      });
    });
  });
}

// ---- Print logo image ----
async function printLogoImage(encoder, logoUrl, logoWidth = 192) {
  console.log('[MAIN] Attempting to print logo:', logoUrl);
  try {
    if (!logoUrl) throw new Error('No logo URL provided');
    
    // Load the image
    let image = await Jimp.read(logoUrl);
    
    // Resize to target width, auto height
    image.resize(logoWidth, Jimp.AUTO);
    
    // Ensure height is a multiple of 8 (required by ESC/POS)
    let height = image.bitmap.height;
    if (height % 8 !== 0) {
      const newHeight = Math.ceil(height / 8) * 8;
      console.log(`[MAIN] Adjusting image height from ${height} to ${newHeight} (multiple of 8)`);
      image.resize(image.bitmap.width, newHeight);
    }
    
    // Convert to grayscale for better contrast (optional but recommended)
    image.greyscale();
    
    // Convert to 1-bit (black & white) for ESC/POS
    image.bitmap.data = image.bitmap.data.map((val, idx) => {
      // Only modify every 4th byte (R, G, B, A)
      if (idx % 4 === 0) {
        return val > 128 ? 255 : 0;
      }
      // Keep alpha channel as is, set G and B to match R
      if (idx % 4 === 1 || idx % 4 === 2) {
        return image.bitmap.data[idx - 1]; // copy R value to G and B
      }
      return val;
    });

    const bitmap = {
      width: image.bitmap.width,
      height: image.bitmap.height,
      data: image.bitmap.data,
    };

    encoder.image(bitmap, bitmap.width, bitmap.height, 'atkinson');
    console.log('[MAIN] Logo image encoded successfully.');
  } catch (err) {
    console.error('[MAIN] Failed to print logo image, falling back to text:', err.message);
    rawText(encoder, '=== LOGO ===');
    feed(encoder);
  }
}

// ---------- IPC Handlers ----------

ipcMain.handle('print-receipt', async (event, { order, printType, ethernetPrinters, bluetoothPort, receiptSettings }) => {
  console.log('[MAIN] print-receipt IPC invoked. printType:', printType);
  const results = [];
  const settings = printType === 'kitchen' ? receiptSettings.kitchen : receiptSettings.bill;
  const targetPrinters = ethernetPrinters.filter(p => p.role === (printType === 'kitchen' ? 'Kitchen' : 'Receipt'));

  for (const printer of targetPrinters) {
    try {
      const data = await generateEscPos(order, printType, settings);
      await sendViaTcp(printer.ipAddress, printer.port, data);
      results.push({ printer: printer.name, success: true });
    } catch (err) {
      results.push({ printer: printer.name, success: false, error: err.message });
    }
  }

  if (bluetoothPort) {
    try {
      const data = await generateEscPos(order, printType, settings);
      await sendViaSerial(bluetoothPort, data);
      results.push({ printer: `Bluetooth (${bluetoothPort})`, success: true });
    } catch (err) {
      results.push({ printer: `Bluetooth (${bluetoothPort})`, success: false, error: err.message });
    }
  }
  return results;
});

ipcMain.handle('get-system-printers', async (event) => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return [];
    const printers = await win.webContents.getPrintersAsync();
    return printers.map(p => p.name);
  } catch (err) {
    console.error('Failed to get system printers:', err);
    return [];
  }
});

ipcMain.handle('get-bluetooth-ports', async (event) => {
  try {
    const ports = await SerialPort.list();
    const comPorts = ports
      .filter(p => p.path && p.path.toUpperCase().startsWith('COM'))
      .map(p => ({
        comPort: p.path,
        deviceName: p.friendlyName || p.path,
      }));
    return comPorts;
  } catch (err) {
    console.error('Failed to get Bluetooth ports:', err);
    return [];
  }
});

// ---------- Force window focus (fix for stuck inputs) ----------
let mainWindow = null; // global reference


ipcMain.handle('test-bluetooth-port', async (event, comPort) => {
  return new Promise((resolve) => {
    const port = new SerialPort({ path: comPort, baudRate: 9600, autoOpen: false });
    port.open((err) => {
      if (err) {
        resolve({ success: false, error: err.message });
        return;
      }
      const testData = Buffer.from('\x1B\x40');
      port.write(testData, (writeErr) => {
        if (writeErr) {
          resolve({ success: false, error: writeErr.message });
        } else {
          resolve({ success: true });
        }
        port.close();
      });
    });
  });
});

// ---------- Window Creation ----------

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "ZEPLYT 1.0",
    icon: path.join(__dirname, 'dist', 'logo.png'), 
    webPreferences: {
      nodeIntegration: true,
      backgroundThrottling: false,
      contextIsolation: false,
      webSecurity: false,
    },
  });
  mainWindow = win;

  win.setMenuBarVisibility(false);
  win.show();

  // win.webContents.on('dom-ready', () => {
  //   win.webContents.focus();
  // });

  // win.webContents.on('did-finish-load', () => {
  //   win.webContents.focus();
  // });

  // win.on('focus', () => {
  //    win.webContents.focus();
  // });

  // win.setAlwaysOnTop(true, 'normal');
  // setTimeout(() => {
  //   win.setAlwaysOnTop(false);
  // }, 200);

  win.webContents.session.clearCache().then(() => {

    if (isDev) {
      win.loadURL('http://localhost:5174');
    } else {
      win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  ipcMain.handle('force-window-focus', () => {
  if (!mainWindow) mainWindow = BrowserWindow.getFocusedWindow();
  if (!mainWindow) return false;

  mainWindow.hide();
  setTimeout(() => {
    mainWindow.show();
    mainWindow.focus();
  }, 20); // 20ms – nearly imperceptible

  return true;
});


  globalShortcut.register('CommandOrControl+Shift+I', () => {
    BrowserWindow.getFocusedWindow()?.webContents.toggleDevTools();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});