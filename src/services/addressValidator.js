import { getSetting, getDailyUsage, incrementDailyUsage } from '../db/database.js';

const GEOAPIFY_LIMIT = 3000;
const GOOGLE_LIMIT = 300;

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

  const today = new Date().toISOString().split('T')[0];
  
  // 1. Get API Keys and Preferences
  let geoApiKey = await _getSetting('geoapify_api_key');
  let googleApiKey = await _getSetting('google_api_key');
  let defaultApi = await _getSetting('default_address_api') || 'geoapify';
  
  // If only one key is present, force that one
  if (geoApiKey && !googleApiKey) defaultApi = 'geoapify';
  if (!geoApiKey && googleApiKey) defaultApi = 'google';
  if (!geoApiKey && !googleApiKey) {
    // Fallback to local validation only
    return addresses.map(addr => {
      const isLocalValid = validatePostcode(addr.state, addr.postcode);
      return { 
        ...addr, 
        status: addr.manualFlag ? 'manual' : (isLocalValid ? 'valid' : 'unverified'),
        error: isLocalValid ? null : 'Local Validation Failed'
      };
    });
  }

  // 2. Select API based on preference and availability
  const apiToUse = defaultApi === 'google' ? 'google' : 'geoapify';
  const apiKey = apiToUse === 'google' ? googleApiKey : geoApiKey;
  const dailyLimit = apiToUse === 'google' ? GOOGLE_LIMIT : GEOAPIFY_LIMIT;

  // 3. Check Quota
  const currentUsage = await _getDailyUsage(today, apiToUse);
  const remainingLimit = dailyLimit - currentUsage;

  if (remainingLimit <= 0) {
    return addresses.map(addr => {
      const isLocalValid = validatePostcode(addr.state, addr.postcode);
      return { 
        ...addr, 
        status: addr.manualFlag ? 'manual' : (isLocalValid ? 'valid' : 'unverified'),
        error: 'Daily API Limit Exceeded'
      };
    });
  }

  // 4. Run Validation
  try {
    let results;
    if (apiToUse === 'google') {
      results = await validateWithGoogle(addresses, apiKey, _fetch, _incrementDailyUsage, today);
    } else {
      results = await validateWithGeoapify(addresses, apiKey, _fetch, _incrementDailyUsage, today);
    }
    return results;
  } catch (err) {
    console.error(`Validation failed with ${apiToUse}:`, err);
    // Fallback to local
    return addresses.map(addr => {
      const isLocalValid = validatePostcode(addr.state, addr.postcode);
      return { 
        ...addr, 
        status: addr.manualFlag ? 'manual' : (isLocalValid ? 'valid' : 'unverified'),
        error: 'API Error'
      };
    });
  }
}

async function validateWithGeoapify(addresses, apiKey, fetchFn, incrementFn, today) {
  // Check if we should verify all or just unverified
  // For simplicity and consistency with previous logic, we verify all if they fit in limit
  const currentUsage = await getDailyUsage(today, 'geoapify');
  const queries = addresses.map(addr => {
    const streetAddress = addr.address2 ? addr.address2 : addr.address1;
    return `${streetAddress}, ${addr.city}, ${addr.state} ${addr.postcode}`.trim();
  });

  const apiResults = await runGeoapifyBatch(queries, apiKey, fetchFn);
  await incrementFn(today, addresses.length, 'geoapify');

  return addresses.map((addr, index) => {
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
}

async function validateWithGoogle(addresses, apiKey, fetchFn, incrementFn, today) {
  // Google Address Validation API is single-address, so we loop
  // To avoid hitting rate limits or taking too long, we process in small batches if needed
  // But for 300/day, we can just do them
  
  const results = [];
  for (const addr of addresses) {
    try {
      const streetAddress = addr.address2 ? addr.address2 : addr.address1;
      const addressString = `${streetAddress}, ${addr.city}, ${addr.state} ${addr.postcode}`.trim();
      
      const response = await fetchFn(`https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            addressLines: [streetAddress],
            locality: addr.city,
            administrativeArea: addr.state,
            postalCode: addr.postcode,
            regionCode: 'AU' // Assuming Australia based on postcode logic
          }
        })
      });

      if (!response.ok) throw new Error(`Google API Error: ${response.status}`);
      
      const data = await response.json();
      const verdict = data.result?.verdict;
      const address = data.result?.address;
      
      // Google's "confidence" is more binary: addressComplete, hasUnconfirmedComponents, etc.
      const isApiValid = verdict?.addressComplete && !verdict?.hasUnconfirmedComponents;
      
      results.push({
        ...addr,
        geoConfidence: isApiValid ? 1.0 : 0.5,
        geoFormatted: address?.formattedAddress || null,
        useGeoAddress: false,
        status: isApiValid ? 'valid' : 'invalid',
        error: isApiValid ? null : 'Google could not fully verify address'
      });
      
      await incrementFn(today, 1, 'google');
    } catch (err) {
      console.error("Google Validation Error for", addr.orderIds, err);
      results.push({
        ...addr,
        status: 'unverified',
        error: 'Google API Error'
      });
    }
  }
  return results;
}

async function runGeoapifyBatch(queries, apiKey, fetchFn) {
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
  
  while (!results && tries < 15) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    tries++;

    const pollResponse = await fetchFn(pollUrl);
    if (pollResponse.status === 200) {
      results = await pollResponse.json();
    } else if (pollResponse.status !== 202) {
      throw new Error(`Error while polling: HTTP ${pollResponse.status}`);
    }
  }

  if (!results) throw new Error('Timeout while polling for Geoapify results');
  return results;
}
