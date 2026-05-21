import { db, getSetting, getDailyUsage, incrementDailyUsage } from '../db/database.js';
import { NotificationService } from './notificationService.js';

const DAILY_LIMIT = 3000;

export const isParcelAddress = (addr) => {
  const a1 = (addr.address1 || '').trim().toLowerCase();
  const a2 = (addr.address2 || '').trim().toLowerCase();
  return a1.startsWith('parcel') || a2.startsWith('parcel');
};

export const validatePostcode = (state, postcode) => {
  if (!state || !postcode) return false;
  const pc = parseInt(postcode, 10);
  if (isNaN(pc)) return false;

  const s = state.toUpperCase().trim();
  
  // Normalize states
  let normalizedState = s;
  if (s === 'WESTERN AUSTRALIA') normalizedState = 'WA';
  else if (s === 'SOUTH AUSTRALIA') normalizedState = 'SA';
  else if (s === 'VICTORIA') normalizedState = 'VIC';
  else if (s === 'QUEENSLAND') normalizedState = 'QLD';
  else if (s === 'NEW SOUTH WALES') normalizedState = 'NSW';
  else if (s === 'TASMANIA') normalizedState = 'TAS';
  else if (s === 'NORTHERN TERRITORY') normalizedState = 'NT';
  else if (s === 'AUSTRALIAN CAPITAL TERRITORY') normalizedState = 'ACT';

  switch (normalizedState) {
    case 'NSW':
      return (pc >= 1000 && pc <= 2999);
    case 'ACT':
      return (pc >= 200 && pc <= 299) || (pc >= 2600 && pc <= 2618) || (pc >= 2900 && pc <= 2920);
    case 'VIC':
      return (pc >= 3000 && pc <= 3999) || (pc >= 8000 && pc <= 8999);
    case 'QLD':
      return (pc >= 4000 && pc <= 4999) || (pc >= 9000 && pc <= 9999);
    case 'SA':
      return (pc >= 5000 && pc <= 5999);
    case 'WA':
      return (pc >= 6000 && pc <= 6999);
    case 'TAS':
      return (pc >= 7000 && pc <= 7999);
    case 'NT':
      return (pc >= 800 && pc <= 899);
    default:
      return false; // Unknown state
  }
};

export async function validateAddresses(addresses, deps = {}) {
  const _getSetting = deps.getSetting || getSetting;
  const _getDailyUsage = deps.getDailyUsage || getDailyUsage;
  const _incrementDailyUsage = deps.incrementDailyUsage || incrementDailyUsage;
  const _fetch = deps.fetch || globalThis.fetch;

  // 2. Check Daily Quota
  const today = new Date().toISOString().split('T')[0];
  let currentUsage = 0;
  let apiKey = null;
  let useGeoApify = true;

  try {
    currentUsage = await _getDailyUsage(today);
    apiKey = await _getSetting('geoapify_api_key');
    const savedUseGeo = await _getSetting('use_geoapify');
    if (savedUseGeo !== null) useGeoApify = savedUseGeo === 'true';
  } catch (err) {
    console.warn("DB access failed, skipping API validation.", err);
    return addresses.map(addr => {
        if (isParcelAddress(addr)) return { ...addr, status: 'unverified', error: 'Parcel Address - Needs manual confirmation', showPhoneOnLabel: addr.showPhoneOnLabel !== undefined ? addr.showPhoneOnLabel : true };
        if (addr.manualFlag) return { ...addr, status: 'manual', error: validatePostcode(addr.state, addr.postcode) ? null : 'Local Validation Failed' };
        const isLocalValid = validatePostcode(addr.state, addr.postcode);
        return { ...addr, status: isLocalValid ? 'valid' : 'unverified' };
    });
  }

  // Phase 5d: Check if offline
  if (!navigator.onLine) {
    console.log("App is offline, skipping API address validation.");
    return addresses.map(addr => {
      if (isParcelAddress(addr)) return { ...addr, status: 'unverified', error: 'Parcel Address - Needs manual confirmation', showPhoneOnLabel: addr.showPhoneOnLabel !== undefined ? addr.showPhoneOnLabel : true };
      if (addr.manualFlag) return { ...addr, status: 'manual', error: validatePostcode(addr.state, addr.postcode) ? null : 'Local Validation Failed' };
      const isLocalValid = validatePostcode(addr.state, addr.postcode);
      return { ...addr, status: isLocalValid ? 'valid' : 'unverified', error: 'Skipped: Offline' };
    });
  }


  if (!useGeoApify) {
    return addresses.map(addr => {
        if (isParcelAddress(addr)) return { ...addr, status: 'unverified', error: 'Parcel Address - Needs manual confirmation', showPhoneOnLabel: addr.showPhoneOnLabel !== undefined ? addr.showPhoneOnLabel : true };
        if (addr.manualFlag) return { ...addr, status: 'manual', error: validatePostcode(addr.state, addr.postcode) ? null : 'Local Validation Failed' };
        const isLocalValid = validatePostcode(addr.state, addr.postcode);
        return { ...addr, status: isLocalValid ? 'valid' : 'unverified' };
    });
  }

  const remainingLimit = DAILY_LIMIT - currentUsage;
  const canVerifyAll = apiKey && addresses.length <= remainingLimit;

  if (canVerifyAll) {
    // 3. Batch API Geocoding for ALL addresses
    try {
      const apiResults = await runGeoapifyBatch(addresses, apiKey, _fetch);
      await _incrementDailyUsage(today, addresses.length);

      const results = addresses.map((addr, index) => {
        if (isParcelAddress(addr)) {
          return {
            ...addr,
            status: 'unverified',
            error: 'Parcel Address - Needs manual confirmation',
            showPhoneOnLabel: addr.showPhoneOnLabel !== undefined ? addr.showPhoneOnLabel : true
          };
        }
        const result = apiResults[index];
        const confidence = result?.rank?.confidence || 0;
        const isApiValid = confidence >= 0.7;
        
        return {
          ...addr,
          geoConfidence: confidence,
          geoFormatted: result?.formatted || null,
          useGeoAddress: false, // Default to CSV address as requested
          status: isApiValid ? 'valid' : 'invalid',
          error: isApiValid ? null : (confidence > 0 ? `API Confidence too low (${confidence.toFixed(2)})` : 'API could not verify')
        };
      });
      
      // Notify with number of verified addresses
      const verifiedCount = results.filter(r => r.status === 'valid').length;
      NotificationService.showValidationComplete(verifiedCount);
      
      return results;
    } catch (err) {
      console.error("Geoapify Batch API Error", err);
      // Fallback to local validation
    }
  }

  // Fallback / Current Behavior: Local validation first, then API only for unverified if possible
  const valid = [];
  const unverified = [];

  for (const addr of addresses) {
    if (isParcelAddress(addr)) {
      unverified.push({
        ...addr,
        status: 'unverified',
        error: 'Parcel Address - Needs manual confirmation',
        showPhoneOnLabel: addr.showPhoneOnLabel !== undefined ? addr.showPhoneOnLabel : true
      });
    } else if (addr.manualFlag) {
      const isLocalValid = validatePostcode(addr.state, addr.postcode);
      valid.push({ 
        ...addr, 
        status: 'manual', 
        error: isLocalValid ? null : 'Local Validation Failed: State/Postcode mismatch.' 
      });
    } else if (validatePostcode(addr.state, addr.postcode)) {
      valid.push({ ...addr, status: 'valid' });
    } else {
      unverified.push({ ...addr, status: 'unverified' });
    }
  }

  if (unverified.length === 0 || !apiKey || (currentUsage + unverified.length > DAILY_LIMIT)) {
    return [...valid, ...unverified.map(a => ({ ...a, error: !apiKey ? 'No API Key' : 'Daily Limit Exceeded' }))];
  }

  // Batch API Geocoding for unverified only
  try {
    const apiResults = await runGeoapifyBatch(unverified, apiKey, _fetch);
    await _incrementDailyUsage(today, unverified.length);

    const finalApiResults = unverified.map((addr, index) => {
      const result = apiResults[index];
      const confidence = result?.rank?.confidence || 0;
      const isApiValid = confidence >= 0.7; // User specified 0.7
      
      return {
        ...addr,
          geoConfidence: confidence,
          geoFormatted: result?.formatted || null,
          useGeoAddress: false, // Default to CSV address as requested
          status: isApiValid ? 'valid' : 'invalid',
          error: isApiValid ? null : (confidence < 0.7 ? `API Confidence too low (${confidence.toFixed(2)})` : 'API could not verify')
      };
    });

    const results = [...valid, ...finalApiResults];
    
    // Notify with total number of verified addresses
    const verifiedCount = results.filter(r => r.status === 'valid').length;
    NotificationService.showValidationComplete(verifiedCount);
    
    return results;
  } catch (err) {
    console.error("Geoapify Batch API Error", err);
    return [...valid, ...unverified.map(a => ({ ...a, error: 'API Error' }))];
  }
}

/**
 * Background Validation Runner
 * Kicks off validation and updates the DB asynchronously.
 */
export async function startBackgroundValidation(batchTimestamp, deps = {}) {
  const _getSetting = deps.getSetting || getSetting;
  const _getDailyUsage = deps.getDailyUsage || getDailyUsage;
  const _incrementDailyUsage = deps.incrementDailyUsage || incrementDailyUsage;
  const _fetch = deps.fetch || globalThis.fetch;

  try {
    // 1. Get orders for this batch
    const allBatchOrders = await db.orders.where('batchTimestamp').equals(batchTimestamp).toArray();
    const unverified = allBatchOrders.filter(o => o.status === 'verifying');
    
    if (unverified.length === 0) return;

    // 2. Check API Key and Usage
    const today = new Date().toISOString().split('T')[0];
    const apiKey = await _getSetting('geoapify_api_key');
    const currentUsage = await _getDailyUsage(today);
    
    // Phase 5d: Check if offline
    if (!navigator.onLine) {
      await db.orders.bulkPut(unverified.map(o => ({ 
        ...o, 
        status: 'unverified', 
        error: 'Skipped: Offline' 
      })));
      return;
    }

    if (!apiKey || (currentUsage + unverified.length > DAILY_LIMIT)) {

      await db.orders.bulkPut(unverified.map(o => ({ 
        ...o, 
        status: 'unverified', 
        error: !apiKey ? 'No API Key' : 'Daily Limit Exceeded' 
      })));
      return;
    }

    // 3. Run Batch
    const apiResults = await runGeoapifyBatch(unverified, apiKey, _fetch);
    await _incrementDailyUsage(today, unverified.length);

    // 4. Update Orders
    const updates = unverified.map((addr, index) => {
      if (isParcelAddress(addr)) {
        return {
          ...addr,
          status: 'unverified',
          error: 'Parcel Address - Needs manual confirmation',
          showPhoneOnLabel: addr.showPhoneOnLabel !== undefined ? addr.showPhoneOnLabel : true
        };
      }
      const result = apiResults[index];
      const confidence = result?.rank?.confidence || 0;
      const isApiValid = confidence >= 0.7;
      
      return {
        ...addr,
        geoConfidence: confidence,
        geoFormatted: result?.formatted || null,
        useGeoAddress: false,
        status: isApiValid ? 'valid' : 'invalid',
        error: isApiValid ? null : (confidence > 0 ? `API Confidence too low (${confidence.toFixed(2)})` : 'API could not verify')
      };
    });

    await db.orders.bulkPut(updates);

    // 5. Notify UI
    window.dispatchEvent(new CustomEvent('validation-complete', { 
      detail: { batchTimestamp, count: updates.length } 
    }));

    // Send browser notification
    NotificationService.showValidationComplete(updates.length);

  } catch (err) {
    console.error("Background Validation Error:", err);    NotificationService.showParsingError('API verification failed. Please try again.');    // Reset status so user can retry or see error
    const orders = await db.orders.where('batchTimestamp').equals(batchTimestamp).toArray();
    const toReset = orders.filter(o => o.status === 'verifying');
    await db.orders.bulkPut(toReset.map(o => ({ ...o, status: 'unverified', error: 'API Error: ' + err.message })));
  }
}

async function runGeoapifyBatch(unverified, apiKey, fetchFn) {
  const queries = unverified.map(addr => {
    const streetAddress = addr.address2 ? addr.address2 : addr.address1;
    return `${streetAddress}, ${addr.city}, ${addr.state} ${addr.postcode}`.trim();
  });

  const baseUrl = 'https://api.geoapify.com/v1/batch/geocode/search';
  const response = await fetchFn(`${baseUrl}?apiKey=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queries)
  });

  if (response.status !== 202) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to create batch job');
  }

  const { id: jobId } = await response.json();
  const pollUrl = `${baseUrl}?apiKey=${apiKey}&id=${jobId}`;
  
  let results = null;
  let delay = 3000;
  const maxDelay = 60000; 
  const startTime = Date.now();
  const maxWaitTime = 15 * 60 * 1000; // 15 minutes max for very large batches

  while (!results && (Date.now() - startTime) < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, delay));

    const pollResponse = await fetchFn(pollUrl);
    
    if (pollResponse.status === 200) {
      results = await pollResponse.json();
    } else if (pollResponse.status === 202) {
      // Exponential backoff
      delay = Math.min(delay * 1.5, maxDelay);
    } else {
      throw new Error(`Polling failed: HTTP ${pollResponse.status}`);
    }
  }

  if (!results) {
     throw new Error('Batch processing timed out');
  }

  return results;
}

