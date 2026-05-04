import Dexie from 'dexie';

export const db = new Dexie('EbayLabelMakerDB');

db.version(1).stores({
  settings: 'key',
  daily_usage: 'date',
  csv_logs: '++id, filename, processedAt, totalRows, validCount, invalidCount',
  orders: 'orderId, buyerUsername, address, [buyerUsername+address], status'
});

// v3: Add API-specific daily usage tracking
// We rename the store to api_usage to avoid "changing primary key" errors in IndexedDB
db.version(3).stores({
  settings: 'key',
  api_usage: '[date+api], date, api',
  daily_usage: null, 
  csv_logs: '++id, filename, processedAt, totalRows, validCount, invalidCount',
  orders: '++id, orderId, buyerUsername, batchTimestamp, status'
});

// Helper to get a setting
export async function getSetting(key) {
  const setting = await db.settings.get(key);
  return setting ? setting.value : null;
}

// Helper to save a setting
export async function saveSetting(key, value) {
  return await db.settings.put({ key, value });
}

// Helper to get daily usage
export async function getDailyUsage(dateString, api = 'geoapify') {
  const usage = await db.api_usage.get({ date: dateString, api });
  return usage ? usage.count : 0;
}

// Helper to increment daily usage
export async function incrementDailyUsage(dateString, amount = 1, api = 'geoapify') {
  return await db.transaction('rw', db.api_usage, async () => {
    const current = await getDailyUsage(dateString, api);
    await db.api_usage.put({ date: dateString, api, count: current + amount });
    return current + amount;
  });
}
