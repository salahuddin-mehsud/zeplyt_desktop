import api from '../services/api';

function renderLine(lineObj, globalAlignment, globalBold, globalDoubleHeight) {
  if (!lineObj || !lineObj.text) return '';
  const align = lineObj.alignment || globalAlignment || 'left';
  const bold = lineObj.bold || globalBold;
  const doubleH = lineObj.doubleHeight || globalDoubleHeight;
  const style = `text-align:${align}; ${bold ? 'font-weight:bold;' : ''} ${doubleH ? 'font-size:1.6em;' : ''} margin: 1mm 0;`;
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

  const visibleCols = (itemColumns.length ? itemColumns : []).filter(c => c.visible !== false);

  const itemsRowsHTML = items.map((item, idx) => {
    const cells = visibleCols.map(col => {
      let val = '';
      switch (col.key) {
        case 'sr': val = idx + 1; break;
        case 'name': val = item.name; break;
        case 'qty': val = item.qty; break;
        case 'price': val = item.price.toFixed(decimalPlaces); break;
        case 'amount': val = (item.price * item.qty).toFixed(decimalPlaces); break;
        default: val = '';
      }
      return `<td style="padding:1mm; text-align:${col.align || 'left'};">${val}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const headerRowHTML = visibleCols.map(col =>
    `<th style="text-align:${col.align || 'left'}; padding:1mm;">${col.label}</th>`
  ).join('');

  const totalsHTML = (totalsFormat || '')
    .replace(/{subtotal}/g, (subTotal ?? 0).toFixed(decimalPlaces))
    .replace(/{tax}/g, (taxAmount ?? 0).toFixed(decimalPlaces))
    .replace(/{discount}/g, (discountAmount ?? 0).toFixed(decimalPlaces))
    .replace(/{total}/g, (finalAmount ?? 0).toFixed(decimalPlaces))
    .split('\n')
    .filter(l => l.trim())
    .map(l => `<p style="margin:1mm 0; white-space:pre;">${l}</p>`)
    .join('');

  return `
    <div style="font-family: monospace; width: 80mm; margin: 0 auto; padding: 1mm; font-size:${fontMultiplier}em;">
      <div style="text-align:center;">
        ${logoUrl ? `<img src="${logoUrl}" style="width:${logoWidth || 192}px; max-width:100%; margin-bottom:2mm;" />` : ''}
        ${headerLines.map(l => renderLine(l, globalAlignment, globalBold, globalDoubleHeight)).join('')}
      </div>

      ${showToken !== false ? `<p style="margin:1mm 0;"><strong>TOKEN:</strong> #${tokenNo}</p>` : ''}
      ${showOrderNo ? `<p style="margin:1mm 0;"><strong>Order:</strong> ${orderNo}</p>` : ''}
      <p style="margin:1mm 0;"><strong>Type:</strong> ${orderType} ${table?.name ? `- ${table.name}` : ''}</p>
      ${showDateTime !== false ? `<p style="margin:1mm 0;"><strong>${type === 'kitchen' ? 'Time' : 'Date'}:</strong> ${type === 'kitchen' ? new Date(createdAt).toLocaleTimeString() : new Date(createdAt).toLocaleString()}</p>` : ''}
      ${showCustomerName !== false ? `<p style="margin:1mm 0;"><strong>${type === 'kitchen' ? '' : 'Guest:'}</strong> ${customerName || 'Walk-in'}</p>` : ''}
      ${showTable !== false && table?.name ? '' : ''}
      ${showDivider !== false ? '<hr style="margin:1mm 0;"/>' : ''}

      <table style="width:100%; border-collapse:collapse;">
        <thead><tr>${headerRowHTML}</tr></thead>
        <tbody>${itemsRowsHTML}</tbody>
      </table>

      ${instructions ? `<hr style="margin:1mm 0;"/><p style="margin:1mm 0;"><strong>NOTES:</strong> ${instructions}</p>` : ''}
      ${showDivider !== false ? '<hr style="margin:1mm 0;"/>' : ''}

      ${type !== 'kitchen' ? totalsHTML : ''}
      ${type !== 'kitchen' && showTotal !== false && !totalsFormat ? `<p style="margin:1mm 0;"><strong>TOTAL: ${(finalAmount ?? 0).toFixed(decimalPlaces)}</strong></p>` : ''}

      <div style="text-align:center;">
        ${footerLines.map(l => renderLine(l, globalAlignment, globalBold, globalDoubleHeight)).join('')}
      </div>
    </div>
  `;
}

export function printReceiptHTML(order, type, settings) {
  const html = generateReceiptHTML(order, type, settings);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Receipt</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
            margin-top: 0;
            margin-bottom: 0;
          }
          body {
            margin: 0;
            padding: 0;
            width: 80mm;
            font-size: 11pt;
          }
          h1, h2, h3, p, table { margin: 0; padding: 0; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  doc.close();
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => document.body.removeChild(iframe), 1000);
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

  (s.headerLines || []).forEach(l => {
    if (!l.text) return;
    const align = l.alignment || baseAlign;
    pushLine(alignText(l.text, charWidth, align), { align, bold: l.bold ?? s.globalBold, doubleHeight: l.doubleHeight ?? s.globalDoubleHeight });
    if (l.dividerBelow) pushDivider();
  });
  pushSpacing(s.sectionMargin ?? 1);

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

  if (s.footerLines?.length) {
    s.footerLines.forEach(l => {
      if (!l.text) return;
      const align = l.alignment || baseAlign;
      pushLine(alignText(l.text, charWidth, align), { align, bold: l.bold ?? s.globalBold, doubleHeight: l.doubleHeight ?? s.globalDoubleHeight });
      if (l.dividerBelow) pushDivider();
    });
  } else {
    pushLine('Thank you!');
  }

  return lines;
}

export function renderPreviewHTML(lines, fontMultiplier = 1) {
  return lines.map(l => {
    if (l.isLogo) {
      return `<div style="text-align:center; margin: 2px 0;"><img src="${l.logoUrl}" style="width:${Math.min(l.logoWidth, 240)}px; max-width:100%;" /></div>`;
    }
    const escaped = (l.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const style = `white-space:pre; margin:0; text-align:${l.align || 'left'}; ${l.bold ? 'font-weight:bold;' : ''} ${l.doubleHeight ? `font-size:${1.7 * fontMultiplier}em; line-height:1.15;` : ''}`;
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