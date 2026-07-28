import api from '../services/api';

function renderLine(lineObj, globalAlignment, globalBold, globalDoubleHeight) {
  if (!lineObj || !lineObj.text) return '';
  const align = lineObj.alignment || globalAlignment || 'left';
  const bold = lineObj.bold ?? globalBold;
  const doubleH = lineObj.doubleHeight ?? globalDoubleHeight;
  const fontSize = lineObj.fontSize || 1;
  const paddingTop = lineObj.paddingTop || 0;
  const paddingBottom = lineObj.paddingBottom || 0;

  let style = `text-align:${align};`;
  if (bold) style += ' font-weight:bold;';
  if (doubleH) {
    style += ' font-size:1.6em;';
  } else {
    style += ` font-size:${fontSize}em;`;
  }
  if (paddingTop > 0) {
    style += ` margin-top:${paddingTop}mm;`;
  }
  if (paddingBottom > 0) {
    style += ` margin-bottom:${paddingBottom}mm;`;
  }

  let html = `<p style="${style}">${lineObj.text}</p>`;
  if (lineObj.dividerBelow) html += `<hr style="margin:1mm 0;"/>`;
  return html;
}

function formatItemLine(item, format, decimalPlaces) {
  const total = (item.price * item.qty).toFixed(decimalPlaces);
  return format
    .replace(/{name}/g, item.name)
    .replace(/{qty}/g, item.qty)
    .replace(/{price}/g, item.price.toFixed(decimalPlaces))
    .replace(/{total}/g, total);
}

export function generateReceiptHTML(order, type = 'kitchen', settings) {
  const { tokenNo, orderNo, type: orderType, table, customerName, createdAt, items, subTotal, taxAmount, discountAmount, finalAmount, instructions } = order;



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

  if (!settings) {
    settings = {
      logoUrl: '', logoWidth: 192, headerLines: [], footerLines: [],
      globalAlignment: 'left', globalBold: false, globalDoubleHeight: false,
      showDivider: true, showTax: true, showSubtotal: true, showTotal: true,
      showCustomerName: true, showTable: true, showDateTime: true, showToken: true, showOrderNo: false,
      itemColumns: [
        { key: 'sr', label: 'Sr.', align: 'left', visible: true },
        { key: 'name', label: 'Item', align: 'left', visible: true },
        { key: 'qty', label: 'Qty', align: 'right', visible: true },
        { key: 'price', label: 'Price', align: 'right', visible: true },
        { key: 'amount', label: 'Amt', align: 'right', visible: true },
      ],
      itemFormat: '{name}  {qty} x {price} = {total}',
      totalsFormat: 'Subtotal: {subtotal}\nTax: {tax}\nTotal: {total}',
      decimalPlaces: type === 'kitchen' ? 0 : 2,
      fontMultiplier: 1,
      sectionMargin: 1,
    };
  }

  const {
    logoUrl, logoWidth, headerLines = [], footerLines = [],
    globalAlignment, globalBold, globalDoubleHeight,
    showDivider, showTax, showSubtotal, showTotal, showCustomerName,
    showTable, showDateTime, showToken, showOrderNo,
    itemColumns = [], totalsFormat, decimalPlaces = 2, fontMultiplier = 1,
  } = settings;

  // ── Define default width percentages for each column ──
  const defaultWidths = {
    sr: 5,
    name: 45,
    qty: 10,
    price: 15,
    amount: 25,
  };
  // For kitchen, we use only sr, name, qty – adjust proportions
  const kitchenWidths = {
    sr: 10,
    name: 70,
    qty: 20,
  };

  // Get visible columns, use settings widths if provided, else fallback
  let cols = itemColumns.length ? itemColumns : getDefaultColumns(type);
  if (type === 'kitchen') {
    cols = cols.filter(col => col.key !== 'price' && col.key !== 'amount');
  }
  const visibleCols = cols.filter(c => c.visible !== false);

  // Assign width percentages
  const widths = type === 'kitchen' ? kitchenWidths : defaultWidths;
  let totalWidth = 0;
  const colsWithWidth = visibleCols.map(col => {
    let w = col.width && col.width > 0 ? col.width : (widths[col.key] || 10);
    // Convert to percentage; if width is numeric but less than 100, treat as percentage already (if > 1)
    // But our defaults are percentages, so use as is.
    totalWidth += w;
    return { ...col, width: w };
  });
  // Normalize so they sum to 100
  const normalized = colsWithWidth.map(col => ({
    ...col,
    pct: ((col.width / totalWidth) * 100).toFixed(2)
  }));

  // Build item rows
  const itemsRowsHTML = items.map((item, idx) => {
    const cells = normalized.map(col => {
      let val = '';
      switch (col.key) {
        case 'sr': val = idx + 1; break;
        case 'name': val = item.name; break;
        case 'qty': val = item.qty; break;
        case 'price': val = item.price.toFixed(decimalPlaces); break;
        case 'amount': val = (item.price * item.qty).toFixed(decimalPlaces); break;
        default: val = '';
      }
      return `<td style="padding:0; text-align:${col.align || 'left'}; width:${col.pct}%;">${val}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const headerRowHTML = normalized.map(col =>
    `<th style="padding:0; text-align:${col.align || 'left'}; width:${col.pct}%;">${col.label}</th>`
  ).join('');

  // Totals lines – no extra padding, full width
  const totalsHTML = (totalsFormat || '')
    .replace(/{subtotal}/g, (subTotal ?? 0).toFixed(decimalPlaces))
    .replace(/{tax}/g, (taxAmount ?? 0).toFixed(decimalPlaces))
    .replace(/{discount}/g, (discountAmount ?? 0).toFixed(decimalPlaces))
    .replace(/{total}/g, (finalAmount ?? 0).toFixed(decimalPlaces))
    .split('\n')
    .filter(l => l.trim())
    .map(l => `<p style="margin:0; padding:0; white-space:pre;">${l}</p>`)
    .join('');

  const fm = Math.max(0.5, Math.min(2.0, fontMultiplier || 1));

  // Build full HTML with explicit body and container styling
  const html = `
    <div style="font-family: monospace; width:100%; margin:0; padding:0; box-sizing:border-box; font-size:${fm}em;">
      <div style="text-align:center;">
        ${logoUrl ? `<img src="${logoUrl}" style="width:${logoWidth || 192}px; max-width:100%; margin-bottom:1mm;" />` : ''}
       ${headerLines.map(l => {
  const processedLine = {
    ...l,
    text: replacePlaceholders(l.text, order, table, orderType)
  };
  return renderLine(processedLine, globalAlignment, globalBold, globalDoubleHeight);
}).join('')}
      </div>

      ${showToken !== false ? `<p style="margin:0; padding:0;">TOKEN: #${tokenNo}</p>` : ''}
      ${showOrderNo ? `<p style="margin:0; padding:0;">Order: ${orderNo}</p>` : ''}
      <p style="margin:0; padding:0;">Type: ${orderType} ${table?.name ? `- ${table.name}` : ''}</p>
      ${showDateTime !== false ? `<p style="margin:0; padding:0;">${type === 'kitchen' ? 'Time' : 'Date'}: ${type === 'kitchen' ? new Date(createdAt).toLocaleTimeString() : new Date(createdAt).toLocaleString()}</p>` : ''}
      ${showCustomerName !== false ? `<p style="margin:0; padding:0;">${type === 'kitchen' ? '' : 'Guest:'} ${customerName || 'Walk-in'}</p>` : ''}
      ${showDivider !== false ? '<hr style="margin:0.5mm 0; border:0; border-top:1px solid #000;"/>' : ''}

      <table style="width:100%; border-collapse:collapse; table-layout:fixed; margin:0; padding:0; font-size:${fm}em;">
        <thead><tr>${headerRowHTML}</tr></thead>
        <tbody>${itemsRowsHTML}</tbody>
      </table>

      ${instructions ? `<hr style="margin:0.5mm 0; border:0; border-top:1px solid #000;"/><p style="margin:0; padding:0;"><strong>NOTES:</strong> ${instructions}</p>` : ''}
      ${showDivider !== false ? '<hr style="margin:0.5mm 0; border:0; border-top:1px solid #000;"/>' : ''}

      ${type !== 'kitchen' ? totalsHTML : ''}
      ${type !== 'kitchen' && showTotal !== false && !totalsFormat ? `<p style="margin:0; padding:0; font-weight:bold;">TOTAL: ${(finalAmount ?? 0).toFixed(decimalPlaces)}</p>` : ''}

            <div style="text-align:center; margin:0; padding:0;">
        ${footerLines.map(l => {
          const processedLine = {
            ...l,
            text: replacePlaceholders(l.text, order, table, orderType)
          };
          return renderLine(processedLine, globalAlignment, globalBold, globalDoubleHeight);
        }).join('')}
        <!-- 🔒 HARDCODED FOOTER: Powered by ZEPLYT POS -->
        <p style="text-align:center; margin:0; padding:0; font-size:${fm}em; font-weight:normal;">Powered by ZEPLYT POS</p>
      </div>
  `;

  // 🔍 LOG the HTML so you can inspect it in the browser console
  console.log('[RECEIPT] Generated HTML:\n', html);
  return html;
}

// Helper to get default columns (for fallback)
function getDefaultColumns(type) {
  if (type === 'kitchen') {
    return [
      { key: 'sr', label: 'Sr.', align: 'left', visible: true },
      { key: 'name', label: 'Item', align: 'left', visible: true },
      { key: 'qty', label: 'Qty', align: 'right', visible: true },
    ];
  }
  return [
    { key: 'sr', label: 'Sr.', align: 'left', visible: true },
    { key: 'name', label: 'Item', align: 'left', visible: true },
    { key: 'qty', label: 'Qty', align: 'right', visible: true },
    { key: 'price', label: 'Price', align: 'right', visible: true },
    { key: 'amount', label: 'Amt', align: 'right', visible: true },
  ];
}

export function printReceiptHTML(order, type, settings) {
  const html = generateReceiptHTML(order, type, settings);
  const fullDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Receipt</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          @page { size: 85mm auto; margin: 0; }
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            font-family: 'Courier New', Courier, monospace;
          }
          table, p, div, hr {
            margin: 0;
            padding: 0;
            width: 100%;
            box-sizing: border-box;
          }
          hr { border: none; border-top: 1px solid #000; }
          @media print { body { margin: 0; padding: 0; width: 100%; } }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(fullDoc);
  doc.close();

  let printed = false;

  const printAndCleanup = () => {
    if (printed) return;
    printed = true;
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 2000);
  };

  // Use a one-time event listener
  iframe.addEventListener('load', printAndCleanup, { once: true });

  // Fallback: if onload doesn't fire within 1 second, trigger print anyway
  setTimeout(() => {
    if (!printed && iframe.contentWindow) {
      printAndCleanup();
    }
  }, 1000);
}
function alignText(text, width, align = 'left') {
  text = String(text ?? '');
  if (text.length > width) text = text.slice(0, width);
  if (align === 'center') {
    const totalPad = width - text.length;
    const left = Math.floor(totalPad / 2);
    const right = totalPad - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
  }
  return align === 'right' ? text.padStart(width) : text.padEnd(width);
}

export function generateReceiptPreviewLines(order, type = 'kitchen', settings, charWidth = 42) {
  const s = settings || {};
  const isKitchen = type === 'kitchen';
  const lines = [];
  const baseAlign = s.globalAlignment || 'left';

  const pushLine = (text = '', opts = {}) => lines.push({ text, align: opts.align || baseAlign, ...opts });
  const pushDivider = () => pushLine('-'.repeat(charWidth));
  const pushSpacing = (count) => {
    const n = Math.max(0, Math.min(count ?? 0, 5));
    for (let i = 0; i < n; i++) pushLine('');
  };

  if (s.logoUrl) lines.push({ isLogo: true, logoUrl: s.logoUrl, logoWidth: s.logoWidth || 192 });

  // ---- Header lines ----
  (s.headerLines || []).forEach(l => {
    if (!l.text) return;
    const align = l.alignment || baseAlign;
    const bold = l.bold ?? s.globalBold;
    const doubleHeight = l.doubleHeight ?? s.globalDoubleHeight;
    const fontSize = l.fontSize || 1;
    const paddingTop = l.paddingTop || 0;
    const paddingBottom = l.paddingBottom || 0;
    pushLine(alignText(l.text, charWidth, align), {
      align,
      bold: l.bold ?? s.globalBold,
      doubleHeight: l.doubleHeight ?? s.globalDoubleHeight,
      fontSize: l.fontSize || 1,
      paddingTop: l.paddingTop || 0,
      paddingBottom: l.paddingBottom || 0,
      dividerBelow: l.dividerBelow
    });
    if (l.dividerBelow) pushDivider();
  });
  pushSpacing(s.sectionMargin ?? 1);

  // ---- Order info ----
  if (s.showToken !== false) pushLine(`TOKEN: #${order.tokenNo}`);
  if (s.showOrderNo) pushLine(`Order: ${order.orderNo}`);
  pushLine(`Type: ${order.type}${order.table?.name ? ` - ${order.table.name}` : ''}`);
  if (s.showDateTime !== false) {
    const dt = isKitchen ? new Date(order.createdAt).toLocaleTimeString() : new Date(order.createdAt).toLocaleString();
    pushLine(`${isKitchen ? 'Time' : 'Date'}: ${dt}`);
  }
  if (s.showCustomerName !== false) pushLine(`Guest: ${order.customerName || 'Walk-in'}`);
  if (isKitchen && order.instructions) pushLine(`Notes: ${order.instructions}`);
  pushSpacing(s.sectionMargin ?? 1);

  // ---- Items ----
  const columns = (s.itemColumns?.length ? s.itemColumns : [
    { key: 'sr', label: 'Sr.', width: 4, align: 'left', visible: true },
    { key: 'name', label: 'Item', width: 20, align: 'left', visible: true },
    { key: 'qty', label: 'Qty', width: 5, align: 'right', visible: true },
    { key: 'price', label: 'Price', width: 8, align: 'right', visible: true },
    { key: 'amount', label: 'Amt', width: 8, align: 'right', visible: true },
  ]).filter(c => c.visible !== false);

  const itemAlign = s.itemBlock?.alignment || baseAlign;

  if (!isKitchen && s.showDivider !== false) {
    pushLine(columns.map(c => alignText(c.label, c.width || 10, c.align)).join(''), { bold: true, align: itemAlign });
    pushDivider();
  }

  const ib = s.itemBlock || {};
  order.items.forEach((item, idx) => {
    if (isKitchen) {
      pushLine(`${item.qty}x  ${item.name}`);
      return;
    }
    const row = columns.map(c => {
      let val = '';
      switch (c.key) {
        case 'sr': val = idx + 1; break;
        case 'name': val = item.name; break;
        case 'qty': val = item.qty; break;
        case 'price': val = item.price.toFixed(s.decimalPlaces ?? 2); break;
        case 'amount': val = (item.price * item.qty).toFixed(s.decimalPlaces ?? 2); break;
      }
      return alignText(val, c.width || 10, c.align);
    }).join('');
    pushLine(row, { align: itemAlign, bold: ib.bold, doubleHeight: ib.doubleHeight });
  });
  pushSpacing(s.sectionMargin ?? 1);

  // ---- Totals ----
  if (!isKitchen) {
    if (s.totalsFormat) {
      const formatted = s.totalsFormat
        .replace(/{subtotal}/g, (order.subTotal ?? 0).toFixed(s.decimalPlaces ?? 2))
        .replace(/{tax}/g, (order.taxAmount ?? 0).toFixed(s.decimalPlaces ?? 2))
        .replace(/{discount}/g, (order.discountAmount ?? 0).toFixed(s.decimalPlaces ?? 2))
        .replace(/{total}/g, (order.finalAmount ?? 0).toFixed(s.decimalPlaces ?? 2));
      formatted.split('\n').forEach(l => { if (l.trim()) pushLine(l); });
    } else {
      if (s.showSubtotal !== false) pushLine(`Subtotal: ${(order.subTotal ?? 0).toFixed(s.decimalPlaces ?? 2)}`);
      if (s.showTax !== false) pushLine(`Tax (${order.taxPercentage || 10}%): ${(order.taxAmount ?? 0).toFixed(s.decimalPlaces ?? 2)}`);
      if (s.showTotal !== false) pushLine(`TOTAL: ${(order.finalAmount ?? 0).toFixed(s.decimalPlaces ?? 2)}`, { bold: true });
    }
  }
  pushSpacing(s.sectionMargin ?? 1);

  // ---- Footer lines ----
(s.footerLines || []).forEach(l => {
  if (!l.text) return;
  const align = l.alignment || baseAlign;
  const bold = l.bold ?? s.globalBold;
  const doubleHeight = l.doubleHeight ?? s.globalDoubleHeight;
  const fontSize = l.fontSize || 1;
  const paddingTop = l.paddingTop || 0;
  const paddingBottom = l.paddingBottom || 0;
  pushLine(alignText(l.text, charWidth, align), {  // ← FIXED
    align,
    bold,
    doubleHeight,
    fontSize,
    paddingTop,
    paddingBottom,
    dividerBelow: l.dividerBelow
  });
  if (l.dividerBelow) pushDivider();
});

  if (s.footerLines?.length === 0) pushLine('Thank you!');

  return lines;
}

export function renderPreviewHTML(lines, fontMultiplier = 1) {
  return lines.map(l => {
    if (l.isLogo) {
      return `<div style="text-align:center; margin: 2px 0;"><img src="${l.logoUrl}" style="width:${Math.min(l.logoWidth, 240)}px; max-width:100%;" /></div>`;
    }
    const escaped = (l.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fm = Math.max(0.5, Math.min(2.0, fontMultiplier || 1));
    let style = `white-space:pre; margin:0; text-align:${l.align || 'left'};`;
    if (l.bold) style += ' font-weight:bold;';
    if (l.doubleHeight) {
      style += ` font-size:${1.7 * fm}em; line-height:1.15;`;
    } else {
      const fs = (l.fontSize || 1) * fm;
      style += ` font-size:${fs}em;`;
    }
    if (l.paddingTop && l.paddingTop > 0) {
      style += ` margin-top:${l.paddingTop}mm;`;
    }
    if (l.paddingBottom && l.paddingBottom > 0) {
      style += ` margin-bottom:${l.paddingBottom}mm;`;
    }
    return `<div style="${style}">${escaped || '&nbsp;'}</div>`;
  }).join('');
}

export function getDefaultReceiptSettings(type) {
  if (type === 'bill') {
    return {
      logoUrl: '', logoWidth: 192,
      headerLines: [{ text: 'ZEPLYT RESTAURANT', alignment: 'center', bold: true }],
      footerLines: [{ text: 'Thank you!', alignment: 'center' }],
      globalAlignment: 'left', globalBold: false, globalDoubleHeight: false,
      showDivider: true, showTax: true, showSubtotal: true, showTotal: true,
      showCustomerName: true, showTable: true, showDateTime: true, showToken: true, showOrderNo: false,
      itemColumns: [
        { key: 'sr', label: 'Sr.', align: 'left', visible: true },
        { key: 'name', label: 'Item', align: 'left', visible: true },
        { key: 'qty', label: 'Qty', align: 'right', visible: true },
        { key: 'price', label: 'Price', align: 'right', visible: true },
        { key: 'amount', label: 'Amt', align: 'right', visible: true },
      ],
      totalsFormat: 'Subtotal: {subtotal}\nTax: {tax}\nTotal: {total}',
      decimalPlaces: 2, fontMultiplier: 1, sectionMargin: 1,
    };
  }
  return {
    logoUrl: '', logoWidth: 192,
    headerLines: [{ text: 'KITCHEN TICKET', alignment: 'center', bold: true }],
    footerLines: [{ text: 'Please prepare', alignment: 'center' }],
    globalAlignment: 'left', globalBold: false, globalDoubleHeight: false,
    showDivider: true, showTax: false, showSubtotal: false, showTotal: false,
    showCustomerName: true, showTable: true, showDateTime: true, showToken: true, showOrderNo: false,
    itemColumns: [
      { key: 'sr', label: 'Sr.', align: 'left', visible: true },
      { key: 'name', label: 'Item', align: 'left', visible: true },
      { key: 'qty', label: 'Qty', align: 'right', visible: true },
    ],
    totalsFormat: '', decimalPlaces: 0, fontMultiplier: 1, sectionMargin: 1,
  };
}