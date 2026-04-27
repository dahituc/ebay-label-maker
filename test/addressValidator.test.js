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

    // Inject a fake unverified order to trigger the API flow
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
      }
    ];

    const results = await validateAddresses(testOrders, mockDeps);

    assert(results.length === testOrders.length, 'Should return same number of items');
    
    // Check that original items are valid
    const validOrders = results.filter(r => r.status === 'valid');
    assert(validOrders.length === testOrders.length, 'All items should end up valid (including the mocked API resolved one)');

    // Verify DB bounds checks and batch fetch were called
    assert(usageChecked, 'Should have checked daily usage');
    assert(apiKeyChecked, 'Should have checked API key');
    assert(batchCalled, 'Should have called batch geocode endpoint');
    assert(fetchPollCount === 2, 'Should have polled exactly 2 times');

    const invalidOriginal = results.find(r => r.buyerUsername === 'test_invalid');
    assert.strictEqual(invalidOriginal.status, 'valid', 'The mocked API should have converted the invalid order to valid based on 0.9 confidence');

    console.log('✅ ALL TESTS PASSED: Postcodes verified, Geoapify Batch mocked successfully.\n');
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

runTest();
