import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { parseEbayCsv } from '../src/services/csvParser.js';
import { validateAddresses, validatePostcode } from '../src/services/addressValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  console.log('--- Running Address Validator Tests ---');
  // Mock navigator.onLine for Node test environment
  if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = { onLine: true };
  } else {
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, writable: true, configurable: true });
  }
  try {
    // 1. Test local validatePostcode helper
    assert.strictEqual(validatePostcode('WA', '6065'), true);
    assert.strictEqual(validatePostcode('Western Australia', '6258'), true);
    assert.strictEqual(validatePostcode('NSW', '2165'), true);
    assert.strictEqual(validatePostcode('NSW', '0000'), false); // Invalid NSW postcode
    assert.strictEqual(validatePostcode('ZZZ', '6065'), false); // Invalid State

    // 2. Map CSV data through the validator
    const csvContent = fs.readFileSync(path.join(__dirname, 'sample.csv'), 'utf8');
    const parsedOrders = await parseEbayCsv(csvContent);

    // Mock dependencies to avoid actual DB and API calls
    let usageChecked = false;
    let apiKeyChecked = false;
    let batchCalled = false;
    let fetchPollCount = 0;

    const mockDeps = {
      getSetting: async (key) => {
        if (key === 'geoapify_api_key') {
          apiKeyChecked = true;
          return 'TEST_KEY';
        }
        return null;
      },
      getDailyUsage: async (dateStr) => {
        usageChecked = true;
        return 500; // Well below the 3000 limit
      },
      incrementDailyUsage: async (dateStr, amount) => {
         assert.strictEqual(amount, 1, 'Should only increment by 1 for our single invalid mock');
      },
      fetch: async (url, options) => {
        if (options && options.method === 'POST' && url.includes('/v1/batch/geocode/search')) {
          batchCalled = true;
          return {
            status: 202,
            json: async () => ({ id: 'mock-job-123' })
          };
        }
        if (url.includes('id=mock-job-123')) {
          fetchPollCount++;
          if (fetchPollCount < 2) {
            return {
              status: 202, // Still processing
              json: async () => ({})
            };
          }
          // Done processing
          return {
            status: 200,
            json: async () => ([
              { 
                query: { text: "mock invalid address" },
                features: [{ properties: { rank: { confidence: 0.9 } } }] 
              }
            ])
          };
        }
        throw new Error('Unexpected fetch call');
      }
    };

    // Inject a fake unverified order to trigger the API flow, and a parcel address order
    const testOrders = [
      ...parsedOrders,
      {
        orderIds: '99-99999',
        buyerUsername: 'test_invalid',
        name: 'Test Name',
        address1: '123 Fake Street',
        city: 'Nowhere',
        state: 'ZZZ', // Invalid state will cause local check to fail
        postcode: '0000',
        country: 'Australia'
      },
      {
        orderIds: '99-88888',
        buyerUsername: 'test_parcel',
        name: 'Parcel Recipient',
        address1: 'Parcel Locker 10128 38294',
        city: 'Landsdale',
        state: 'WA',
        postcode: '6065',
        country: 'Australia',
        phone: '0412345678'
      }
    ];

    const results = await validateAddresses(testOrders, mockDeps);

    assert(results.length === testOrders.length, 'Should return same number of items');
    
    // Check that standard items and standard invalid (now standard API-resolved) items are valid
    const validOrders = results.filter(r => r.status === 'valid');
    // All original items (11) + 1 invalid standard resolved = 12. The 1 parcel address is unverified.
    assert.strictEqual(validOrders.length, testOrders.length - 1, 'All standard items should end up valid');

    // Verify DB bounds checks and batch fetch were called
    assert(usageChecked, 'Should have checked daily usage');
    assert(apiKeyChecked, 'Should have checked API key');
    assert(batchCalled, 'Should have called batch geocode endpoint');
    assert(fetchPollCount === 2, 'Should have polled exactly 2 times');

    const invalidOriginal = results.find(r => r.buyerUsername === 'test_invalid');
    assert.strictEqual(invalidOriginal.status, 'valid', 'The mocked API should have converted the invalid order to valid based on 0.9 confidence');

    const parcelOriginal = results.find(r => r.buyerUsername === 'test_parcel');
    assert.strictEqual(parcelOriginal.status, 'unverified', 'Parcel addresses should be unverified');
    assert.strictEqual(parcelOriginal.error, 'Parcel Address - Needs manual confirmation', 'Parcel addresses should require manual confirmation');
    assert.strictEqual(parcelOriginal.showPhoneOnLabel, true, 'Parcel addresses should default to showing phone on label');

    console.log('✅ ALL TESTS PASSED: Postcodes verified, Geoapify Batch mocked successfully.\n');
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

runTest();
