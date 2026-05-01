import { getSetting, getDailyUsage, incrementDailyUsage } from '../db/database.js';

const DAILY_LIMIT = 3000;

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
        if (addr.manualFlag) return { ...addr, status: 'manual', error: validatePostcode(addr.state, addr.postcode) ? null : 'Local Validation Failed' };
        const isLocalValid = validatePostcode(addr.state, addr.postcode);
        return { ...addr, status: isLocalValid ? 'valid' : 'unverified' };
    });
  }

  if (!useGeoApify) {
    return addresses.map(addr => {
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

      return addresses.map((addr, index) => {
        const result = apiResults[index];
        const confidence = result?.rank?.confidence || 0;
        const isApiValid = confidence >= 0.7;
        
        return {
          ...addr,
          geoConfidence: confidence,
          geoFormatted: result?.formatted || null,
          useGeoAddress: isApiValid, // Default to true if confidence is high enough
          status: isApiValid ? 'valid' : 'invalid',
          error: isApiValid ? null : (confidence > 0 ? `API Confidence too low (${confidence.toFixed(2)})` : 'API could not verify')
        };
      });
    } catch (err) {
      console.error("Geoapify Batch API Error", err);
      // Fallback to local validation
    }
  }

  // Fallback / Current Behavior: Local validation first, then API only for unverified if possible
  const valid = [];
  const unverified = [];

  for (const addr of addresses) {
    if (addr.manualFlag) {
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
        useGeoAddress: isApiValid,
        status: isApiValid ? 'valid' : 'invalid',
        error: isApiValid ? null : (confidence > 0 ? `API Confidence too low (${confidence.toFixed(2)})` : 'API could not verify')
      };
    });

    return [...valid, ...finalApiResults];
  } catch (err) {
    console.error("Geoapify Batch API Error", err);
    return [...valid, ...unverified.map(a => ({ ...a, error: 'API Error' }))];
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
    throw new Error('Failed to create batch job');
  }

  const { id: jobId } = await response.json();

  const pollUrl = `${baseUrl}?apiKey=${apiKey}&id=${jobId}`;
  
  let results = null;
  let tries = 0;
  
  // Wait loop
  while (!results && tries < 10) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    tries++;

    const pollResponse = await fetchFn(pollUrl);
    
    if (pollResponse.status === 200) {
      results = await pollResponse.json(); // Usually returns an array of result objects corresponding to the queries
    } else if (pollResponse.status !== 202) {
      throw new Error(`Error while polling for results: HTTP ${pollResponse.status}`);
    }
  }

  if (!results) {
     throw new Error('Timeout while polling for results');
  }

  return results;
}
