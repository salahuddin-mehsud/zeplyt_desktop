import api from '../services/api';


function wrapTextForHtml(text, maxChars = 42) {
  const lines = [];
  let currentLine = '';
  const words = text.trim().split(/\s+/);
  for (const word of words) {
    if ((currentLine + ' ' + word).length <= maxChars) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

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

export function buildReceiptTotalsLines(order, s = {}, isKitchen = false) {
  if (isKitchen) return [];
  const decimalPlaces = s.decimalPlaces ?? 2;
  const deliveryFee = Number(order.shippingCost ?? order.deliveryFee ?? 0);
  const discountAmount = Number(order.discountAmount ?? 0);
  const subtotal = Number(order.subTotal ?? 0);
  const finalAmount = Number(order.finalAmount ?? 0);
  const taxBreakdown = Array.isArray(order.taxBreakdown) ? order.taxBreakdown : [];
  const chargeBreakdown = Array.isArray(order.chargeBreakdown) ? order.chargeBreakdown : [];

  const taxLines = [];
  if (s.showTax !== false) {
    if (taxBreakdown.length > 0) {
      taxBreakdown.forEach(tax => {
        taxLines.push(`${tax.taxName || 'Tax'} (${tax.percentage || 0}%): ${Number(tax.amount || 0).toFixed(decimalPlaces)}`);
      });
    } else if (order.taxAmount > 0) {
      taxLines.push(`Tax (${order.taxPercentage || 10}%): ${(order.taxAmount || 0).toFixed(decimalPlaces)}`);
    }
  }

  const chargeLines = [];
  if (chargeBreakdown.length > 0) {
    chargeBreakdown.forEach(charge => {
      const suffix = charge.chargeType === 'Fixed' ? '' : ` (${charge.percentage}%)`;
      chargeLines.push(`${charge.chargeName || 'Charge'}${suffix}: ${Number(charge.amount || 0).toFixed(decimalPlaces)}`);
    });
  }

  const deliveryLines = [];
  if (deliveryFee > 0 && order.type === 'Delivery') {
    deliveryLines.push(`Delivery: ${deliveryFee.toFixed(decimalPlaces)}`);
  }

  const discountLines = [];
  if (discountAmount > 0) {
    discountLines.push(`Discount: ${discountAmount.toFixed(decimalPlaces)}`);
  }

  if (s.totalsFormat) {
    const rawLines = s.totalsFormat.split(/\r?\n/);
    const resultLines = [];
    let taxesHandled = false;
    let chargesHandled = false;
    let deliveryHandled = false;
    let discountHandled = false;

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      if (trimmed.includes('{taxes}') || trimmed.includes('{tax}') || trimmed.toLowerCase().startsWith('tax')) {
        taxLines.forEach(l => resultLines.push(l));
        taxesHandled = true;
        continue;
      }
      if (trimmed.includes('{charges}') || trimmed.includes('{service_charge}')) {
        chargeLines.forEach(l => resultLines.push(l));
        chargesHandled = true;
        continue;
      }
      if (trimmed.includes('{delivery}') || trimmed.toLowerCase().startsWith('delivery')) {
        if (deliveryFee > 0 && order.type === 'Delivery') {
          resultLines.push(trimmed.replace(/{delivery}/g, deliveryFee.toFixed(decimalPlaces)));
          deliveryHandled = true;
        }
        continue;
      }
      if (trimmed.includes('{discount}') || trimmed.toLowerCase().startsWith('discount')) {
        if (discountAmount > 0) {
          resultLines.push(trimmed.replace(/{discount}/g, discountAmount.toFixed(decimalPlaces)));
          discountHandled = true;
        }
        continue;
      }

      // Before Total line, insert any unhandled taxes/charges/delivery/discount
      if (trimmed.includes('{total}') || trimmed.toLowerCase().startsWith('total')) {
        if (!taxesHandled) { taxLines.forEach(l => resultLines.push(l)); taxesHandled = true; }
        if (!chargesHandled) { chargeLines.forEach(l => resultLines.push(l)); chargesHandled = true; }
        if (!discountHandled) { discountLines.forEach(l => resultLines.push(l)); discountHandled = true; }
        if (!deliveryHandled) { deliveryLines.forEach(l => resultLines.push(l)); deliveryHandled = true; }

        if (s.showTotal !== false) {
          resultLines.push(trimmed.replace(/{total}/g, finalAmount.toFixed(decimalPlaces)));
        }
        continue;
      }

      // Other lines (e.g. Subtotal)
      let line = trimmed
        .replace(/{subtotal}/g, subtotal.toFixed(decimalPlaces))
        .replace(/{total}/g, finalAmount.toFixed(decimalPlaces));
      resultLines.push(line);
    }

    if (!taxesHandled) taxLines.forEach(l => resultLines.push(l));
    if (!chargesHandled) chargeLines.forEach(l => resultLines.push(l));
    if (!discountHandled) discountLines.forEach(l => resultLines.push(l));
    if (!deliveryHandled) deliveryLines.forEach(l => resultLines.push(l));

    return resultLines;
  }

  // Fallback if no totalsFormat:
  const lines = [];
  if (s.showSubtotal !== false) lines.push(`Subtotal: ${subtotal.toFixed(decimalPlaces)}`);
  taxLines.forEach(l => lines.push(l));
  chargeLines.forEach(l => lines.push(l));
  discountLines.forEach(l => lines.push(l));
  deliveryLines.forEach(l => lines.push(l));
  if (s.showTotal !== false) lines.push(`TOTAL: ${finalAmount.toFixed(decimalPlaces)}`);
  return lines;
}

export function generateReceiptHTML(order, type = 'kitchen', settings) {
  console.log('[RECEIPT] Full order object:', JSON.stringify(order, null, 2));

  const { tokenNo, orderNo, type: orderType, table, customerName, createdAt, items, subTotal, taxAmount, discountAmount, finalAmount, instructions } = order;

  // ---- Delivery address ----
  let deliveryAddress = order.deliveryAddress || order.delivery_address || '';
  if (!deliveryAddress && order.deliveryLocation) {
    deliveryAddress = order.deliveryLocation.address || order.deliveryLocation.name || '';
  }

  const addressLines = deliveryAddress ? wrapTextForHtml(deliveryAddress, 42) : [];

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
      totalsFormat: 'Subtotal: {subtotal}\nTax: {tax}\nDelivery: {delivery}\nTotal: {total}',
      decimalPlaces: type === 'kitchen' ? 0 : 2,
      fontMultiplier: 1,
      sectionMargin: 1,
    };
  }

  const {
    logoUrl, logoWidth, headerLines, footerLines,
    globalAlignment, globalBold, globalDoubleHeight,
    showDivider, showTax, showSubtotal, showTotal,
    showCustomerName, showTable, showDateTime, showToken, showOrderNo,
    itemColumns, itemFormat, totalsFormat, decimalPlaces,
    fontMultiplier, sectionMargin
  } = settings;

  // ---- Items table ----
  const defaultCols = getDefaultColumns(type);
  const activeCols = (itemColumns && itemColumns.length > 0)
    ? itemColumns.filter(c => c.visible !== false)
    : defaultCols;

  const colPcts = { sr: 8, name: 40, qty: 12, price: 20, amount: 20 };
  const totalPct = activeCols.reduce((sum, c) => sum + (colPcts[c.key] || 20), 0);
  const normalized = activeCols.map(c => ({
    ...c,
    pct: Math.round(((colPcts[c.key] || 20) / totalPct) * 100)
  }));

  const itemsRowsHTML = (items || []).map((item, idx) => {
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

  const totalLines = buildReceiptTotalsLines(order, settings, type === 'kitchen');

  const totalsHTML = totalLines
    .map(line => `<p style="margin:0; padding:0; white-space:pre;">${line}</p>`)
    .join('');

  const fm = Math.max(0.5, Math.min(2.0, fontMultiplier || 1));

  // Determine label for customer: "Customer:" for Delivery, else "Guest:"
  const customerLabel = orderType === 'Delivery' ? 'Customer:' : 'Guest:';

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
      ${showCustomerName !== false ? `<p style="margin:0; padding:0;">${customerLabel} ${customerName || 'Walk-in'}</p>` : ''}
      ${order.waiter?.name ? `<p style="margin:0; padding:0;">Waiter: ${order.waiter.name}</p>` : ''}
      ${addressLines.length > 0 ? `<p style="margin:0; padding:0;">Address: ${addressLines[0]}</p>` : ''}
${addressLines.slice(1).map(line => `<p style="margin:0; padding:0; padding-left: 2em;">${line}</p>`).join('')}
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
        <p style="text-align:center; margin:0; padding:0; font-size:${fm}em; font-weight:normal;">Powered by ZEPLYT POS</p>
      </div>
  `;

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

  iframe.addEventListener('load', printAndCleanup, { once: true });

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

  if (s.showToken !== false) pushLine(`TOKEN: #${order.tokenNo}`);
  if (s.showOrderNo) pushLine(`Order: ${order.orderNo}`);
  pushLine(`Type: ${order.type}${order.table?.name ? ` - ${order.table.name}` : ''}`);
  if (s.showDateTime !== false) {
    const dt = isKitchen ? new Date(order.createdAt).toLocaleTimeString() : new Date(order.createdAt).toLocaleString();
    pushLine(`${isKitchen ? 'Time' : 'Date'}: ${dt}`);
  }
  if (s.showCustomerName !== false) {
    const label = order.type === 'Delivery' ? 'Customer:' : 'Guest:';
    pushLine(`${label} ${order.customerName || 'Walk-in'}`);
  }
  if (order.deliveryAddress) {
  const addressLines = wrapTextForHtml(order.deliveryAddress, charWidth);
  addressLines.forEach((line, idx) => {
    pushLine(idx === 0 ? `Address: ${line}` : `         ${line}`);
  });
}
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
    const totalLines = buildReceiptTotalsLines(order, s, isKitchen);
    totalLines.forEach(line => {
      pushLine(line, { bold: line.startsWith('TOTAL:') });
    });
  }
  pushSpacing(s.sectionMargin ?? 1);

  (s.footerLines || []).forEach(l => {
    if (!l.text) return;
    const align = l.alignment || baseAlign;
    const bold = l.bold ?? s.globalBold;
    const doubleHeight = l.doubleHeight ?? s.globalDoubleHeight;
    const fontSize = l.fontSize || 1;
    const paddingTop = l.paddingTop || 0;
    const paddingBottom = l.paddingBottom || 0;
    pushLine(alignText(l.text, charWidth, align), {
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
