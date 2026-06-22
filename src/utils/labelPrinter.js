export const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const formatAddress = (row) => [
  row['Deliver To Address Line 1'],
  row['Deliver To Address Line 2'],
  row['Deliver To Suburb'],
  row['Deliver To State'],
  row['Deliver To Postcode']
].filter(Boolean).join(', ');

export const formatSendFrom = (row) => [
  row['Send From Name'],
  row['Send From Business Name'],
  row['Send From Address Line 1'],
  row['Send From Suburb'],
  row['Send From State'],
  row['Send From Postcode']
].filter(Boolean).join(', ');

export const renderPrintLabelHtml = (row, showPhone = false) => {
  const name = escapeHtml(row.sourceRecipientName || row.buyerName || 'Unknown');
  const orderNumber = escapeHtml(row.sourceOrderNumber || row.orderId || '');
  const phone = escapeHtml(row['Deliver To Phone Number'] || '');
  const addr1 = row['Deliver To Address Line 1'];
  const addr2 = row['Deliver To Address Line 2'];
  const suburb = row['Deliver To Suburb'];
  const state = row['Deliver To State'];
  const postcode = row['Deliver To Postcode'];
  const line2Parts = [addr2 ? addr2 : '', suburb, state, postcode].filter(Boolean);
  const line2 = line2Parts.join(' ');
  const addressLines = [
    addr1 ? `<span class="label-address">${escapeHtml(addr1)},</span>` : '',
    line2 ? `<span class="label-address">${escapeHtml(line2)}</span>` : ''
  ].filter(Boolean).join('');

  const itemLines = (row.items || []).map((item) => {
    const label = escapeHtml(item.customLabel || item.sku || item.productName || 'Item');
    return `<div class="item-line">${label} X <b>${item.quantity}</b></div>`;
  }).join('');

  const totalQty = (row.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalLine = totalQty > 1
    ? `<div class="item-line" style="font-weight:700;font-size:9px;color:#333;margin-bottom:2px;text-align:right;">TOTAL ITEMS: ${totalQty}</div>`
    : '';

  return `
    <div class="label-item">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.2em;">
        <span class="label-to">To</span>
        ${showPhone && phone ? `<span class="label-phone">${phone}</span>` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <strong class="label-name">
          ${name} <span class="label-orderID">(${orderNumber})</span>
        </strong>
      </div>
      <div class="label-address-container" style="display:flex;flex-direction:column;position:relative;">
        ${addressLines}
      </div>
      <div style="flex:1;"></div>
      <div class="label-sku">
        ${totalLine}
        ${itemLines}
      </div>
    </div>
  `;
};

export const handlePrintLabel = async (row, showPhone = false, onMarkPrinted) => {
  if (!row) return;

  // Read configured label dimensions and font from DB settings
  let labelWidth = '90mm';
  let labelHeight = '30mm';
  let labelFont = 'Arial';
  try {
    const { getSetting } = await import('../db/database');
    const w = await getSetting('label_width');
    const h = await getSetting('label_height');
    const f = await getSetting('label_font');
    if (w) labelWidth = `${w}mm`;
    if (h) labelHeight = `${h}mm`;
    if (f) labelFont = f;
  } catch (_) { /* fall back to defaults */ }

  // Build Google Fonts import for non-system fonts
  const isSystemFont = ['Arial', 'Arial Black', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New'].includes(labelFont);
  const fontImport = !isSystemFont
    ? `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(labelFont)}:wght@400;700;900&display=swap');`
    : '';
  const fontStack = isSystemFont ? `${labelFont}, sans-serif` : `'${labelFont}', sans-serif`;

  const style = `
    ${fontImport}
    @page { size: ${labelWidth} ${labelHeight}; margin: 0; }
    body { margin: 0; padding: 0; font-family: ${fontStack}; }
    .label-item { width: ${labelWidth}; min-height: ${labelHeight}; border: 1px dashed #aaa; padding: 2mm 3mm; background: white; color: black; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; font-family: ${fontStack}; }
    .label-to { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 0.2em; }
    .label-name { font-size: 15px; font-weight: 700; line-height: 1.25; display: inline-block; }
    .label-orderID { font-size: 10px; font-weight: 400; display: inline-block; margin-left: 6px; }
    .label-phone { font-size: 11px; font-weight: 400; color: #444; }
    .label-address { font-size: 13px; line-height: 1.25; white-space: break-spaces; display: block; overflow: hidden; }
    .label-sku, .label-buyer-note { font-size: 9px; color: #555; text-align: right; line-height: 1.1; white-space: normal; word-break: break-word; }
    .item-line { margin-bottom: 1px; }
    .item-line > b { font-size: 12px; font-weight: 900; }
  `;

  const printWindow = window.open('', '_blank', 'width=500,height=600');
  if (!printWindow) return;
  printWindow.document.write(
    `<!doctype html><html><head><title>Print Label</title><style>${style}</style></head><body>${renderPrintLabelHtml(row, showPhone)}</body></html>`
  );
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    if ('onafterprint' in printWindow) {
      printWindow.onafterprint = () => printWindow.close();
    } else {
      setTimeout(() => printWindow.close(), 500);
    }
  };
  if (onMarkPrinted) {
    onMarkPrinted(row.rowId);
  }
};
