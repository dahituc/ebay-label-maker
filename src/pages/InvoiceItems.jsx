import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Papa from 'papaparse';
import { db } from '../db/database.js';
import { PlusCircle, Edit3, Trash2, Search, Upload, X, CheckCircle, Package } from 'lucide-react';

export default function InvoiceItems() {
  const invoiceItems = useLiveQuery(() => db.invoice_items.orderBy('id').toArray(), []);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // CSV Deduplication setting
  const [deduplicateTitles, setDeduplicateTitles] = useState(true);

  // Form states (unified for add/edit)
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const fileInputRef = useRef(null);

  // Reset form helper
  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSku('');
    setPrice('');
    setLocation('');
  };

  // Populate form for editing
  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title || item.description || '');
    setSku(item.sku || '');
    setPrice((item.current_price !== undefined ? item.current_price : item.unitPrice || 0).toString());
    setLocation(item.store_location_identifier || '');
  };

  // Handle submit (handles both add and update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Product Title is required.');
      return;
    }

    const itemData = {
      description: title.trim(), // fallback
      title: title.trim(),
      sku: sku.trim(),
      unitPrice: Number(price) || 0, // fallback
      current_price: Number(price) || 0,
      store_location_identifier: location.trim(),
      sampleData: false
    };

    if (editingId) {
      await db.invoice_items.update(editingId, itemData);
      resetForm();
    } else {
      await db.invoice_items.add(itemData);
      resetForm();
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this product from catalog?')) return;
    await db.invoice_items.delete(id);
    if (editingId === id) {
      resetForm();
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL products in the catalog?')) return;
    await db.invoice_items.clear();
    resetForm();
  };

  // CSV Import function with variation skipping logic and SKU-based duplicate replacement
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: async (results) => {
        if (results.errors && results.errors.length > 0) {
          console.error(results.errors);
          alert('Error parsing CSV file');
          return;
        }

        const parsedData = results.data;
        const seenTitles = new Set();
        const itemsToUpsert = [];

        // Check current database items to build a mapping of SKU -> ID
        const existingItems = invoiceItems || [];
        const skuMap = new Map();
        existingItems.forEach(item => {
          if (item.sku) {
            skuMap.set(item.sku.trim().toLowerCase(), item);
          }
        });

        parsedData.forEach(row => {
          const rowTitle = (row['Title'] || '').trim();
          const rowSku = (row['Custom label (SKU)'] || row['SKU'] || '').trim();
          const priceStr = row['Current price'] || row['Start price'] || '0';
          const priceVal = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;

          if (!rowTitle) return;

          // If deduplication option is enabled, skip variations with duplicate titles in this file
          if (deduplicateTitles) {
            const titleKey = rowTitle.toLowerCase();
            if (seenTitles.has(titleKey)) {
              return;
            }
            seenTitles.add(titleKey);
          }

          itemsToUpsert.push({
            title: rowTitle,
            sku: rowSku,
            price: priceVal
          });
        });

        if (itemsToUpsert.length > 0) {
          let addedCount = 0;
          let updatedCount = 0;

          await db.transaction('rw', db.invoice_items, async () => {
            for (const item of itemsToUpsert) {
              const skuKey = item.sku.trim().toLowerCase();
              const itemData = {
                description: item.title, // fallback
                title: item.title,
                sku: item.sku,
                unitPrice: item.price, // fallback
                current_price: item.price,
                sampleData: false
              };

              if (item.sku && skuMap.has(skuKey)) {
                const existingItem = skuMap.get(skuKey);
                // Preserve existing location identifier if present
                itemData.store_location_identifier = existingItem.store_location_identifier || '';
                await db.invoice_items.update(existingItem.id, itemData);
                updatedCount++;
              } else {
                itemData.store_location_identifier = '';
                await db.invoice_items.add(itemData);
                addedCount++;
              }
            }
          });

          alert(`Import completed successfully:\n- Added: ${addedCount} products\n- Updated/Replaced (by SKU): ${updatedCount} products`);
        } else {
          alert('No new unique products found to import.');
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
  };

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!invoiceItems) return [];
    if (!searchQuery.trim()) return invoiceItems;

    const query = searchQuery.toLowerCase().trim();
    return invoiceItems.filter(item => {
      const itemTitle = (item.title || item.description || '').toLowerCase();
      const itemSku = (item.sku || '').toLowerCase();
      const itemPrice = (item.current_price !== undefined ? item.current_price : item.unitPrice || 0).toString();
      const itemLoc = (item.store_location_identifier || '').toLowerCase();

      return itemTitle.includes(query) ||
        itemSku.includes(query) ||
        itemPrice.includes(query) ||
        itemLoc.includes(query);
    });
  }, [invoiceItems, searchQuery]);

  return (
    <div className="animate-fade-in invoice-items-page" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Package size={28} color="var(--accent)" />
            Product Catalog
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', maxWidth: '700px' }}>
            Manage the reusable item catalog, upload products from eBay CSV formats, and assign store locations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleClearAll}
            className="btn btn-danger"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            disabled={!invoiceItems?.length}
          >
            <Trash2 size={18} />
            Clear Catalog
          </button>
        </div>
      </div>

      {/* Grid: Form & CSV Upload */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', marginBottom: '32px' }}>

        {/* Form Card */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editingId ? <Edit3 size={20} color="var(--accent)" /> : <PlusCircle size={20} color="var(--accent)" />}
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Product Title *</span>
                <input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Waterproof wireless 30000mAh Power Bank"
                  style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>SKU (Custom Label)</span>
                <input
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  placeholder="e.g. SOLARPANEL-202"
                  style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Current Price ($ AUD)</span>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="e.g. 111.11"
                  style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Store Location Identifier</span>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Shelf B4"
                  style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Save Changes' : 'Add Product'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="btn btn-secondary">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* CSV Import Zone */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed var(--border)', background: 'var(--bg-secondary)', textAlign: 'center', padding: '24px' }}>
          <div style={{ padding: '16px', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', marginBottom: '16px' }}>
            <Upload size={32} />
          </div>
          <h3 style={{ marginBottom: '8px' }}>Import Products from CSV</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', maxWidth: '280px' }}>
            Upload eBay items CSV for quick import. SKUs will be used as unique identifiers to replace/update existing items.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            <input
              type="checkbox"
              id="deduplicate-checkbox"
              checked={deduplicateTitles}
              onChange={e => setDeduplicateTitles(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="deduplicate-checkbox" style={{ cursor: 'pointer', userSelect: 'none' }}>
              Skip duplicate titles (no variations imported)
            </label>
          </div>

          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleCsvUpload}
            style={{ display: 'none' }}
            id="csv-file-upload-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            Choose File
          </button>
        </div>
      </div>

      {/* Catalog & Search Section */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ margin: 0 }}>Product Catalog List ({filteredItems.length})</h2>

          {/* Search bar */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search by title, SKU, price, shelf..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
            {searchQuery && (
              <X
                size={16}
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-secondary)' }}
              />
            )}
          </div>
        </div>

        {filteredItems.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>SKU</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: 'var(--text-secondary)', fontWeight: 600, width: '120px' }}>Price</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)', fontWeight: 600, width: '160px' }}>Location</th>
                  <th style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)', fontWeight: 600, width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const displayTitle = item.title || item.description || '—';
                  const displayPrice = item.current_price !== undefined ? item.current_price : item.unitPrice || 0;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{displayTitle}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                        <code>{item.sku || '—'}</code>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>
                        ${displayPrice.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {item.store_location_identifier ? (
                          <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600 }}>
                            {item.store_location_identifier}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>Not set</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleStartEdit(item)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginRight: '10px' }}
                          title="Edit Product"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                          title="Delete Product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>
            No products found matching the criteria. Add new products or upload a CSV file.
          </p>
        )}
      </div>
    </div>
  );
}
