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

export const normalizeLabelData = (row) => {
  if (!row) return {};
  const name = row.name || row.sourceRecipientName || row.buyerName || row['Deliver To Name'] || 'Unknown';
  const orderId = row.orderId || row.sourceOrderNumber || row['Additional Label Information 1'] || '';
  const phone = row.phone || row['Deliver To Phone Number'] || '';
  const showPhone = row.showPhoneOnLabel !== undefined ? !!row.showPhoneOnLabel : (row.showPhoneOnLabel || false);
  const address1 = row.address1 || row['Deliver To Address Line 1'] || '';
  const address2 = row.address2 || row['Deliver To Address Line 2'] || '';
  const city = row.city || row['Deliver To Suburb'] || '';
  const state = row.state || row['Deliver To State'] || '';
  const postcode = row.postcode || row['Deliver To Postcode'] || '';
  const country = row.country || '';
  const useGeoAddress = !!row.useGeoAddress;
  const geoFormatted = row.geoFormatted || '';
  const geoConfidence = row.geoConfidence || 0;
  const buyerNote = row.buyerNote || '';
  const items = row.items || [];
  
  return {
    name,
    orderId,
    phone,
    showPhone,
    address1,
    address2,
    city,
    state,
    postcode,
    country,
    useGeoAddress,
    geoFormatted,
    geoConfidence,
    buyerNote,
    items,
    id: row.id,
    rowId: row.rowId
  };
};

export const renderSingleLabelHtmlContent = (part) => {
  const name = escapeHtml(part.name);
  const orderNumber = escapeHtml(part.orderId);
  const phone = escapeHtml(part.phone);
  const showPhone = part.showPhone;
  const address1 = escapeHtml(part.address1);
  const address2 = escapeHtml(part.address2);
  const city = escapeHtml(part.city);
  const state = escapeHtml(part.state);
  const postcode = escapeHtml(part.postcode);
  const country = escapeHtml(part.country);
  const useGeoAddress = part.useGeoAddress;
  const geoFormatted = escapeHtml(part.geoFormatted);
  const buyerNote = escapeHtml(part.buyerNote);
  const items = part.items || [];
  const totalParts = part.totalParts || 1;
  const partIndex = part.partIndex || 1;
  const isExtra = part.isExtra || false;
  const totalQuantity = part.totalQuantity || items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const geoConfidence = part.geoConfidence || 0;

  const toLabel = !isExtra ? '<span class="label-to">To</span>' : '';
  
  const phoneHtml = (showPhone && phone) ? `<span class="label-phone" style="display:block;margin-top:2px;font-size:11px;font-weight:normal;color:var(--text-primary);">${phone}</span>` : '';
  const extraHtml = isExtra ? `<span style="margin-left:8px;font-size:0.8em;opacity:0.7;">(Extra Items)</span>` : '';
  const partsHtml = totalParts > 1 ? `<span style="font-size:9px;font-weight:700;background:#eee;padding:1px 4px;border-radius:3px;">${partIndex} / ${totalParts}</span>` : '';
  
  let addressHtml = '';
  if (!isExtra) {
    let addrBody = '';
    if (useGeoAddress && geoFormatted) {
      addrBody = `
        <span class="label-address">${address1}</span>
        <span class="label-address is-api">${geoFormatted}</span>
      `;
    } else {
      const line2Parts = [address2, city, state, postcode].filter(Boolean);
      addrBody = `
        <span class="label-address">${address1}${address1 ? ',' : ''}</span>
        <span class="label-address">${line2Parts.join(' ')}</span>
      `;
    }
    const countryHtml = (country && country.toLowerCase() !== 'australia') ? `<span class="label-address">${country}</span>` : '';
    addressHtml = `
      <div class="label-address-container">
        ${addrBody}
        ${countryHtml}
      </div>
    `;
  }
  
  const totalLineHtml = (partIndex === 1 && (totalParts > 1 || items.length > 1)) 
    ? `<div class="item-line" style="font-weight:700;margin-bottom:2px;text-align:right;font-size:9px;color:var(--text-primary);">TOTAL ITEMS: ${totalQuantity}</div>` 
    : '';
    
  const itemsHtml = items.map(item => {
    const label = escapeHtml(item.customLabel || item.sku || item.productName || 'Item');
    return `<div class="item-line">${label} X <b>${item.quantity}</b></div>`;
  }).join('');
  
  const noteHtml = (buyerNote && !isExtra) ? `<span class="label-buyer-note"> ** ${buyerNote} **</span>` : '';
  const confHtml = (geoConfidence > 0 && !isExtra) ? `<span class="label-conf" style="font-size:7px;opacity:0.5;color:var(--text-secondary);margin-left:8px;">Conf: ${(geoConfidence * 100).toFixed(0)}%</span>` : '';
  
  return `
    ${toLabel}
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <strong class="label-name">
        ${name} <span class="label-orderID">(${orderNumber})</span>
        ${phoneHtml}
        ${extraHtml}
      </strong>
      ${partsHtml}
    </div>
    ${addressHtml}
    <div style="flex:1;"></div>
    <div class="label-sku">
      ${totalLineHtml}
      ${itemsHtml}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:2px;">
      <div style="flex:1;">
        ${noteHtml}
      </div>
      ${confHtml}
    </div>
  `;
};

export const renderSingleLabelHtml = (part) => {
  return `
    <div class="label-item" style="position:relative;">
      ${renderSingleLabelHtmlContent(part)}
    </div>
  `;
};

/**
 * Read the label dimensions from the CSS custom properties that Settings.jsx
 * writes to :root.  Falls back to 90 × 30 mm if the variables are not set.
 */
const getLabelDimensions = () => {
  const style = getComputedStyle(document.documentElement);
  const w = style.getPropertyValue('--label-width').trim() || '90mm';
  const h = style.getPropertyValue('--label-height').trim() || '30mm';
  return { width: w, height: h };
};

export const splitLabel = (order, overrides = {}) => {
  const normalized = { ...normalizeLabelData(order), ...overrides };
  const { width: labelW, height: labelH } = getLabelDimensions();

  // Create a temporary hidden container to measure the label
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.visibility = 'hidden';
  document.body.appendChild(container);
  
  // Add styling to make sure measurement matches exactly
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .label-item { width: ${labelW}; height: ${labelH}; border: 1px dashed #aaa; padding: 2mm 3mm; background: white; color: black; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .label-to { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 0.2em; }
    .label-name { font-size: 15px; font-weight: 700; line-height: 1.25; display: inline-block; }
    .label-orderID { font-size: 10px; font-weight: 400; display: inline-block; margin-left: 6px; }
    .label-phone { font-size: 11px; font-weight: 400; color: #444; margin-top: 2px; display: block; }
    .label-address { font-size: 13px; line-height: 1.25; white-space: break-spaces; display: block; overflow: hidden; }
    .label-sku, .label-buyer-note { font-size: 9px; color: #555; text-align: right; line-height: 1.1; white-space: normal; word-break: break-word; }
    .item-line { margin-bottom: 1px; }
    .item-line > b { font-size: 12px; font-weight: 900; }
  `;
  container.appendChild(styleEl);
  
  // Render the initial full label inside container
  const labelHtml = renderSingleLabelHtml(normalized);
  const labelDiv = document.createElement('div');
  labelDiv.innerHTML = labelHtml;
  container.appendChild(labelDiv);
  
  const node = labelDiv.querySelector('.label-item');
  const isOverflowing = node.scrollHeight > node.clientHeight;
  const labelParts = [];
  
  if (isOverflowing) {
    let remainingItems = [...normalized.items];
    let partNumber = 1;
    const totalSKUs = remainingItems.length;
    const totalQuantity = remainingItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    
    const itemsNode = node.querySelector('.label-sku');
    const itemLineNodes = itemsNode.querySelectorAll('.item-line');
    const availableHeight = node.clientHeight - (node.scrollHeight - itemsNode.offsetHeight);
    
    let firstBatchSize = 0;
    let cumulativeHeight = 0;
    itemLineNodes.forEach((itemNode, idx) => {
      cumulativeHeight += itemNode.offsetHeight;
      if (cumulativeHeight <= availableHeight) {
        firstBatchSize = idx + 1;
      }
    });
    
    if (firstBatchSize === 0 && remainingItems.length > 0) firstBatchSize = 1;
    
    const firstBatch = remainingItems.slice(0, firstBatchSize);
    remainingItems = remainingItems.slice(firstBatchSize);
    
    labelParts.push({
      ...normalized,
      items: firstBatch,
      labelKey: `${normalized.id || normalized.rowId}-part1`,
      partIndex: 1,
      isExtra: false,
      totalSKUs,
      totalQuantity
    });
    
    const ITEMS_PER_EXTRA_LABEL = 14;
    while (remainingItems.length > 0) {
      partNumber++;
      const nextBatch = remainingItems.slice(0, ITEMS_PER_EXTRA_LABEL);
      remainingItems = remainingItems.slice(ITEMS_PER_EXTRA_LABEL);
      labelParts.push({
        ...normalized,
        items: nextBatch,
        labelKey: `${normalized.id || normalized.rowId}-part${partNumber}`,
        partIndex: partNumber,
        isExtra: true,
        totalSKUs,
        totalQuantity
      });
    }
    
    labelParts.forEach(p => p.totalParts = partNumber);
  } else {
    labelParts.push({
      ...normalized,
      labelKey: (normalized.id || normalized.rowId || '').toString(),
      partIndex: 1,
      totalParts: 1,
      isExtra: false,
      totalSKUs: normalized.items.length,
      totalQuantity: normalized.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    });
  }
  
  // Clean up
  document.body.removeChild(container);
  
  return labelParts;
};

// Shared CSS for the print window — built at call-time so it picks up the
// current label dimensions from the CSS custom properties set by Settings.
const buildPrintLabelCss = () => {
  const { width: labelW, height: labelH } = getLabelDimensions();
  return `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .label-item { width: ${labelW}; height: ${labelH}; border: none; padding: 2mm 3mm; background: white; color: black; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; page-break-inside: avoid; }
  .label-item:not(:last-child) { page-break-after: always; }
  .label-to { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 0.2em; }
  .label-name { font-size: 15px; font-weight: 700; line-height: 1.25; display: inline-block; }
  .label-orderID { font-size: 10px; font-weight: 400; display: inline-block; margin-left: 6px; }
  .label-phone { font-size: 11px; font-weight: 400; color: #444; margin-top: 2px; display: block; }
  .label-address { font-size: 13px; line-height: 1.25; white-space: break-spaces; display: block; overflow: hidden; }
  .label-sku, .label-buyer-note { font-size: 9px; color: #555; text-align: right; line-height: 1.1; white-space: normal; word-break: break-word; }
  .item-line { margin-bottom: 1px; }
  .item-line > b { font-size: 12px; font-weight: 900; }
`;
};

/**
 * Print one or many labels in a pop-up print window.
 *
 * @param {Array}    rows        - Array of order/row objects (works for 1 or many).
 * @param {boolean}  showPhone   - Whether to show the phone number on the label.
 * @param {Function} onMarkPrinted - Optional callback called with each row's rowId after printing.
 */
export const printLabels = (rows, showPhone = false, onMarkPrinted = null) => {
  if (!rows || rows.length === 0) return;

  // Collect all label parts across all rows
  const allParts = [];
  for (const row of rows) {
    const parts = splitLabel(row, { showPhone });
    allParts.push(...parts);
  }

  const printWindow = window.open('', '_blank', 'width=500,height=600');
  if (!printWindow) return;

  const labelsHtml = allParts.map(part => renderSingleLabelHtml(part)).join('');

  printWindow.document.write(`<!doctype html><html><head><title>Print Labels</title><style>${buildPrintLabelCss()}</style></head><body>${labelsHtml}</body></html>`);
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
    rows.forEach(row => onMarkPrinted(row.rowId));
  }
};

// Kept for backward compatibility — delegates to printLabels
export const handlePrintLabel = (row, showPhone = false, onMarkPrinted) => {
  printLabels([row], showPhone, onMarkPrinted ? () => onMarkPrinted(row.rowId) : null);
};

// Kept for backward compatibility or simple direct rendering
export const renderPrintLabelHtml = (row, showPhone = false) => {
  const normalized = normalizeLabelData(row);
  normalized.showPhone = showPhone;
  return renderSingleLabelHtml(normalized);
};
