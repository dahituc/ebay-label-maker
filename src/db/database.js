import Dexie from 'dexie';

export const db = new Dexie('EbayLabelMakerDB');

db.version(1).stores({
  settings: 'key', // e.g., key='geoapify_api_key', value={ key: 'geoapify_api_key', value: '...' }
  daily_usage: 'date', // date='YYYY-MM-DD', count=Number
  csv_logs: '++id, filename, processedAt, totalRows, validCount, invalidCount',
  orders: 'orderId, buyerUsername, address, [buyerUsername+address], status' // status: 'valid', 'invalid', 'merged'
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
export async function getDailyUsage(dateString) {
  const usage = await db.daily_usage.get(dateString);
  return usage ? usage.count : 0;
}

// Helper to increment daily usage
export async function incrementDailyUsage(dateString, amount = 1) {
  return await db.transaction('rw', db.daily_usage, async () => {
    const current = await getDailyUsage(dateString);
    await db.daily_usage.put({ date: dateString, count: current + amount });
    return current + amount;
  });
}
